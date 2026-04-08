use std::ffi::OsString;
use std::sync::{Mutex, OnceLock};

use api::{ApiError, ProviderClient};

#[test]
fn provider_client_routes_grok_aliases_through_xai() {
    let _lock = env_lock();
    let _xai_api_key = EnvVarGuard::set("XAI_API_KEY", Some("xai-test-key"));

    let client = ProviderClient::from_model("grok-mini").expect("grok alias should resolve");

    assert!(matches!(client, ProviderClient { .. }));
}

#[test]
fn provider_client_reports_missing_xai_credentials_for_grok_models() {
    let _lock = env_lock();
    let _xai_api_key = EnvVarGuard::set("XAI_API_KEY", None);

    let error = ProviderClient::from_model("grok-3")
        .expect_err("grok requests without XAI_API_KEY should fail fast");

    match error {
        ApiError::MissingCredentials { provider, env_vars } => {
            assert_eq!(provider, "xAI");
            assert_eq!(env_vars, &["XAI_API_KEY"]);
        }
        other => panic!("expected missing xAI credentials, got {other:?}"),
    }
}

fn env_lock() -> std::sync::MutexGuard<'static, ()> {
    static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
    LOCK.get_or_init(|| Mutex::new(()))
        .lock()
        .unwrap_or_else(std::sync::PoisonError::into_inner)
}

struct EnvVarGuard {
    key: &'static str,
    original: Option<OsString>,
}

impl EnvVarGuard {
    fn set(key: &'static str, value: Option<&str>) -> Self {
        let original = std::env::var_os(key);
        match value {
            Some(value) => std::env::set_var(key, value),
            None => std::env::remove_var(key),
        }
        Self { key, original }
    }
}

impl Drop for EnvVarGuard {
    fn drop(&mut self) {
        match &self.original {
            Some(value) => std::env::set_var(self.key, value),
            None => std::env::remove_var(self.key),
        }
    }
}
