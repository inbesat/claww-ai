use crate::error::ApiError;
use crate::providers::openai_compat::{OpenAiCompatClient, OpenAiCompatConfig};
use crate::providers::{detect_provider_kind, resolve_model_alias, ProviderKind};
use crate::types::{MessageRequest, MessageResponse, StreamEvent};

#[derive(Debug, Clone)]
pub struct ProviderClient {
    inner: OpenAiCompatClient,
}

impl ProviderClient {
    pub fn from_model(model: &str) -> Result<Self, ApiError> {
        let resolved_model = resolve_model_alias(model);
        Self::from_env(&resolved_model)
    }

    pub fn from_env(model: &str) -> Result<Self, ApiError> {
        let resolved_model = resolve_model_alias(model);
        let config = Self::config_for_model(&resolved_model)?;
        Ok(Self {
            inner: OpenAiCompatClient::from_env(config)?,
        })
    }

    fn config_for_model(model: &str) -> Result<OpenAiCompatConfig, ApiError> {
        match detect_provider_kind(model) {
            ProviderKind::OpenAi => Ok(OpenAiCompatConfig::openai()),
            ProviderKind::Xai => Ok(OpenAiCompatConfig::xai()),
            ProviderKind::Anthropic => Ok(OpenAiCompatConfig::openai()),
        }
    }

    pub async fn send_message(
        &self,
        request: &MessageRequest,
    ) -> Result<MessageResponse, ApiError> {
        self.inner.send_message(request).await
    }

    pub async fn stream_message(
        &self,
        request: &MessageRequest,
    ) -> Result<MessageStream, ApiError> {
        self.inner
            .stream_message(request)
            .await
            .map(MessageStream)
    }
}

#[derive(Debug)]
pub struct MessageStream(crate::providers::openai_compat::MessageStream);

impl MessageStream {
    #[must_use]
    pub fn request_id(&self) -> Option<&str> {
        self.0.request_id()
    }

    pub async fn next_event(&mut self) -> Result<Option<StreamEvent>, ApiError> {
        self.0.next_event().await
    }
}

#[cfg(test)]
mod tests {
    use crate::providers::{detect_provider_kind, resolve_model_alias, ProviderKind};

    #[test]
    fn resolves_existing_and_grok_aliases() {
        assert_eq!(resolve_model_alias("grok"), "grok-3");
        assert_eq!(resolve_model_alias("grok-mini"), "grok-3-mini");
    }

    #[test]
    fn provider_detection_prefers_model_family() {
        assert_eq!(detect_provider_kind("grok-3"), ProviderKind::Xai);
        assert_eq!(detect_provider_kind("gpt-4"), ProviderKind::OpenAi);
    }
}
