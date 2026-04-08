mod client;
mod error;
pub mod providers;
mod sse;
mod types;

pub use client::{MessageStream, ProviderClient};
pub use error::ApiError;
pub use providers::openai_compat::{OpenAiCompatClient, OpenAiCompatConfig};
pub use providers::{detect_provider_kind, max_tokens_for_model, resolve_model_alias, ProviderKind};
pub use sse::{parse_frame, SseParser};
pub use types::{
    ContentBlockDelta, ContentBlockDeltaEvent, ContentBlockStartEvent, ContentBlockStopEvent,
    InputContentBlock, InputMessage, MessageDelta, MessageDeltaEvent, MessageRequest,
    MessageResponse, MessageStartEvent, MessageStopEvent, OutputContentBlock, StreamEvent,
    ToolChoice, ToolDefinition, ToolResultContentBlock, Usage,
};

pub fn read_base_url() -> String {
    std::env::var("OPENAI_BASE_URL")
        .unwrap_or_else(|_| OpenAiCompatConfig::openai().default_base_url.to_string())
}
