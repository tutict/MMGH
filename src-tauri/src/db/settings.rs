use super::*;

const PROVIDER_SETTINGS_PENDING_KEY: &str = "provider_settings_pending_v1";
const API_KEYRING_PENDING_ACCOUNT: &str = "provider-api-key-pending";

#[cfg(test)]
static TEST_PENDING_KEYRING_API_KEY: Lazy<Mutex<Option<String>>> = Lazy::new(|| Mutex::new(None));

pub(super) fn default_settings() -> AgentSettings {
  let api_key = std::env::var("OPENAI_API_KEY").unwrap_or_default();
  AgentSettings {
    provider_name: "OpenAI Compatible".to_string(),
    base_url: std::env::var("OPENAI_API_BASE")
      .unwrap_or_else(|_| "https://api.openai.com/v1".to_string()),
    has_api_key: !api_key.trim().is_empty(),
    api_key,
    model: std::env::var("OPENAI_MODEL").unwrap_or_else(|_| "gpt-4.1-mini".to_string()),
    system_prompt: "You are a desktop agent. Clarify the goal, propose an executable plan, and state the next action.".to_string(),
  }
}

pub(super) fn read_runtime_api_key() -> Result<Option<String>> {
  let guard = RUNTIME_API_KEY
    .lock()
    .map_err(|_| anyhow!("runtime api key mutex poisoned"))?;
  Ok(guard.clone())
}

pub(super) fn store_runtime_api_key(value: String) -> Result<()> {
  let mut guard = RUNTIME_API_KEY
    .lock()
    .map_err(|_| anyhow!("runtime api key mutex poisoned"))?;
  *guard = if value.trim().is_empty() {
    None
  } else {
    Some(value)
  };
  Ok(())
}

#[cfg(not(test))]
fn load_api_key_from_account(account: &str) -> Result<Option<String>> {
  let entry = keyring::Entry::new(API_KEYRING_SERVICE, account);
  match entry.get_password() {
    Ok(api_key) if api_key.trim().is_empty() => Ok(None),
    Ok(api_key) => Ok(Some(api_key)),
    Err(keyring::Error::NoEntry) => Ok(None),
    Err(error) => Err(error).context("failed to load api key from system keyring"),
  }
}

#[cfg(test)]
fn test_keyring_slot(account: &str) -> &'static Mutex<Option<String>> {
  if account == API_KEYRING_PENDING_ACCOUNT {
    &TEST_PENDING_KEYRING_API_KEY
  } else {
    &TEST_KEYRING_API_KEY
  }
}

#[cfg(test)]
fn load_api_key_from_account(account: &str) -> Result<Option<String>> {
  let guard = test_keyring_slot(account)
    .lock()
    .map_err(|_| anyhow!("test keyring mutex poisoned"))?;
  Ok(guard.clone())
}

#[cfg(not(test))]
fn store_api_key_in_account(account: &str, value: &str) -> Result<()> {
  let api_key = value.trim();
  if api_key.is_empty() {
    return Ok(());
  }

  keyring::Entry::new(API_KEYRING_SERVICE, account)
    .set_password(api_key)
    .context("failed to store api key in system keyring")
}

#[cfg(test)]
fn store_api_key_in_account(account: &str, value: &str) -> Result<()> {
  let api_key = value.trim();
  if api_key.is_empty() {
    return Ok(());
  }

  let mut guard = test_keyring_slot(account)
    .lock()
    .map_err(|_| anyhow!("test keyring mutex poisoned"))?;
  *guard = Some(api_key.to_string());
  Ok(())
}

#[cfg(not(test))]
fn delete_api_key_from_account(account: &str) -> Result<()> {
  match keyring::Entry::new(API_KEYRING_SERVICE, account).delete_password() {
    Ok(_) | Err(keyring::Error::NoEntry) => Ok(()),
    Err(error) => Err(error).context("failed to delete api key from system keyring"),
  }
}

#[cfg(test)]
fn delete_api_key_from_account(account: &str) -> Result<()> {
  let mut guard = test_keyring_slot(account)
    .lock()
    .map_err(|_| anyhow!("test keyring mutex poisoned"))?;
  *guard = None;
  Ok(())
}

fn replace_api_key_in_account(account: &str, api_key: Option<&str>) -> Result<()> {
  match api_key.map(str::trim).filter(|value| !value.is_empty()) {
    Some(value) => store_api_key_in_account(account, value),
    None => delete_api_key_from_account(account),
  }
}

pub(super) fn load_api_key_from_keyring() -> Result<Option<String>> {
  load_api_key_from_account(API_KEYRING_ACCOUNT)
}

pub(super) fn store_api_key_in_keyring(value: &str) -> Result<()> {
  store_api_key_in_account(API_KEYRING_ACCOUNT, value)
}

#[cfg(test)]
pub(super) fn delete_api_key_from_keyring() -> Result<()> {
  delete_api_key_from_account(API_KEYRING_ACCOUNT)
}

#[cfg(test)]
pub(super) fn delete_pending_api_key_from_keyring() -> Result<()> {
  delete_api_key_from_account(API_KEYRING_PENDING_ACCOUNT)
}

pub(super) trait ProviderSecretStore {
  fn load_active(&self) -> Result<Option<String>>;
  fn replace_active(&self, api_key: Option<&str>) -> Result<()>;
  fn load_staged(&self) -> Result<Option<String>>;
  fn replace_staged(&self, api_key: Option<&str>) -> Result<()>;
}

pub(super) struct KeyringProviderSecretStore;

impl ProviderSecretStore for KeyringProviderSecretStore {
  fn load_active(&self) -> Result<Option<String>> {
    load_api_key_from_keyring()
  }

  fn replace_active(&self, api_key: Option<&str>) -> Result<()> {
    replace_api_key_in_account(API_KEYRING_ACCOUNT, api_key)
  }

  fn load_staged(&self) -> Result<Option<String>> {
    load_api_key_from_account(API_KEYRING_PENDING_ACCOUNT)
  }

  fn replace_staged(&self, api_key: Option<&str>) -> Result<()> {
    replace_api_key_in_account(API_KEYRING_PENDING_ACCOUNT, api_key)
  }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct PendingProviderSettingsCommit {
  provider_name: String,
  base_url: String,
  model: String,
  system_prompt: String,
  has_api_key: bool,
}

impl PendingProviderSettingsCommit {
  pub(super) fn from_settings(settings: &AgentSettings) -> Self {
    Self {
      provider_name: settings.provider_name.clone(),
      base_url: settings.base_url.clone(),
      model: settings.model.clone(),
      system_prompt: settings.system_prompt.clone(),
      has_api_key: settings_api_key(settings).is_some(),
    }
  }

  fn into_settings(self, staged_api_key: Option<String>) -> Result<AgentSettings> {
    let api_key = if self.has_api_key {
      staged_api_key.context("pending provider settings commit is missing its staged secret")?
    } else {
      String::new()
    };
    Ok(AgentSettings {
      provider_name: self.provider_name,
      base_url: self.base_url,
      has_api_key: !api_key.trim().is_empty(),
      api_key,
      model: self.model,
      system_prompt: self.system_prompt,
    })
  }
}

pub(super) fn settings_api_key(settings: &AgentSettings) -> Option<&str> {
  let api_key = settings.api_key.trim();
  if api_key.is_empty() {
    None
  } else {
    Some(api_key)
  }
}

fn combine_provider_commit_errors(
  primary: anyhow::Error,
  action: &str,
  secondary: anyhow::Error,
) -> anyhow::Error {
  anyhow!("provider settings commit failed: {primary:#}; {action}: {secondary:#}")
}

pub(super) fn load_pending_provider_settings_commit_in(
  conn: &Connection,
) -> Result<Option<PendingProviderSettingsCommit>> {
  load_setting_value_in(conn, PROVIDER_SETTINGS_PENDING_KEY)?
    .map(|value| serde_json::from_str(&value).context("invalid pending provider settings commit"))
    .transpose()
}

pub(super) fn store_pending_provider_settings_commit_in(
  conn: &Connection,
  pending: &PendingProviderSettingsCommit,
) -> Result<()> {
  upsert_setting_value_in(
    conn,
    PROVIDER_SETTINGS_PENDING_KEY,
    &serde_json::to_string(pending)?,
  )
}

fn clear_pending_provider_settings_commit_in(conn: &Connection) -> Result<()> {
  conn.execute(
    "DELETE FROM app_meta WHERE key = ?1",
    params![PROVIDER_SETTINGS_PENDING_KEY],
  )?;
  Ok(())
}

fn discard_pending_provider_settings_commit_in<S: ProviderSecretStore>(
  conn: &mut Connection,
  secret_store: &S,
) -> Result<()> {
  let tx = conn.transaction_with_behavior(TransactionBehavior::Immediate)?;
  clear_pending_provider_settings_commit_in(&tx)?;
  tx.commit()?;
  secret_store.replace_staged(None)
}

fn publish_committed_settings_state(settings: &AgentSettings) {
  if let Err(error) = publish_settings_state(settings) {
    let _ = clear_settings_cache();
    eprintln!("provider settings committed but cache publication failed: {error:#}");
  }
}

pub(super) fn recover_provider_settings_commit_in<S: ProviderSecretStore>(
  conn: &mut Connection,
  secret_store: &S,
) -> Result<()> {
  let Some(pending) = load_pending_provider_settings_commit_in(conn)? else {
    if let Err(error) = secret_store.replace_staged(None) {
      eprintln!("failed to clear orphaned provider secret stage: {error:#}");
    }
    return Ok(());
  };

  let settings = pending.into_settings(secret_store.load_staged()?)?;
  secret_store.replace_active(settings_api_key(&settings))?;
  let tx = conn.transaction_with_behavior(TransactionBehavior::Immediate)?;
  store_settings_row_in(&tx, &settings)?;
  clear_pending_provider_settings_commit_in(&tx)?;
  tx.commit()?;
  if let Err(error) = secret_store.replace_staged(None) {
    let _ = clear_db_init_path();
    eprintln!("provider settings recovered but staged secret cleanup failed: {error:#}");
  }
  publish_committed_settings_state(&settings);
  Ok(())
}

pub(super) fn commit_provider_settings_in<S: ProviderSecretStore>(
  conn: &mut Connection,
  settings: &AgentSettings,
  secret_store: &S,
) -> Result<()> {
  let previous_secret = secret_store.load_active()?;
  secret_store.replace_staged(settings_api_key(settings))?;

  let pending = PendingProviderSettingsCommit::from_settings(settings);
  let journal_result = (|| -> Result<()> {
    let tx = conn.transaction_with_behavior(TransactionBehavior::Immediate)?;
    store_pending_provider_settings_commit_in(&tx, &pending)?;
    tx.commit()?;
    Ok(())
  })();
  if let Err(error) = journal_result {
    return match secret_store.replace_staged(None) {
      Ok(()) => Err(error),
      Err(cleanup_error) => Err(combine_provider_commit_errors(
        error,
        "staged secret cleanup also failed",
        cleanup_error,
      )),
    };
  }

  if let Err(error) = secret_store.replace_active(settings_api_key(settings)) {
    if let Err(restore_error) = secret_store.replace_active(previous_secret.as_deref()) {
      let _ = clear_db_init_path();
      return Err(combine_provider_commit_errors(
        error,
        "active secret rollback also failed",
        restore_error,
      ));
    }
    return match discard_pending_provider_settings_commit_in(conn, secret_store) {
      Ok(()) => Err(error),
      Err(cleanup_error) => {
        let _ = clear_db_init_path();
        Err(combine_provider_commit_errors(
          error,
          "pending commit cleanup also failed",
          cleanup_error,
        ))
      }
    };
  }

  let durable_commit = (|| -> Result<()> {
    let tx = conn.transaction_with_behavior(TransactionBehavior::Immediate)?;
    store_settings_row_in(&tx, settings)?;
    clear_pending_provider_settings_commit_in(&tx)?;
    tx.commit()?;
    Ok(())
  })();
  if let Err(error) = durable_commit {
    if let Err(restore_error) = secret_store.replace_active(previous_secret.as_deref()) {
      let _ = clear_db_init_path();
      return Err(combine_provider_commit_errors(
        error,
        "active secret rollback also failed",
        restore_error,
      ));
    }
    return match discard_pending_provider_settings_commit_in(conn, secret_store) {
      Ok(()) => Err(error),
      Err(cleanup_error) => {
        let _ = clear_db_init_path();
        Err(combine_provider_commit_errors(
          error,
          "pending commit cleanup also failed",
          cleanup_error,
        ))
      }
    };
  }

  if let Err(error) = secret_store.replace_staged(None) {
    let _ = clear_db_init_path();
    eprintln!("provider settings committed but staged secret cleanup failed: {error:#}");
  }
  publish_committed_settings_state(settings);
  Ok(())
}
pub(super) fn resolve_effective_api_key(stored_api_key: Option<&str>) -> Result<String> {
  if let Some(runtime_api_key) = read_runtime_api_key()? {
    return Ok(runtime_api_key);
  }

  if let Some(api_key) = load_api_key_from_keyring()? {
    store_runtime_api_key(api_key.clone())?;
    return Ok(api_key.trim().to_string());
  }

  if let Some(api_key) = stored_api_key {
    let api_key = api_key.trim().to_string();
    if !api_key.is_empty() {
      store_api_key_in_keyring(&api_key)?;
      store_runtime_api_key(api_key.clone())?;
      return Ok(api_key);
    }
  }

  Ok(std::env::var("OPENAI_API_KEY").unwrap_or_default())
}

pub(super) fn sanitize_settings_for_persistence(settings: &AgentSettings) -> AgentSettings {
  let mut sanitized = settings.clone();
  sanitized.has_api_key = false;
  sanitized.api_key.clear();
  sanitized
}

pub(super) fn configured_trusted_provider_hosts() -> Vec<String> {
  let configured = std::env::var("MMGH_TRUSTED_PROVIDER_HOSTS")
    .unwrap_or_default()
    .split(',')
    .map(normalize_provider_host)
    .filter(|host| !host.is_empty())
    .collect::<Vec<_>>();

  if configured.is_empty() {
    vec!["api.openai.com".to_string()]
  } else {
    configured
  }
}

pub(super) fn enforce_trusted_provider_hosts() -> bool {
  matches!(
    std::env::var("MMGH_ENFORCE_TRUSTED_PROVIDER_HOSTS")
      .unwrap_or_default()
      .trim()
      .to_ascii_lowercase()
      .as_str(),
    "1" | "true" | "yes" | "on"
  )
}

pub(super) fn normalize_provider_host(host: &str) -> String {
  host.trim().trim_end_matches('.').to_ascii_lowercase()
}

pub(super) fn is_ipv4_host(host: &str) -> bool {
  let parts = host.split('.').collect::<Vec<_>>();
  if parts.len() != 4 {
    return false;
  }

  parts.iter().all(|part| part.parse::<u8>().is_ok())
}

pub(super) fn is_private_ipv4_host(host: &str) -> bool {
  if !is_ipv4_host(host) {
    return false;
  }

  let octets = host
    .split('.')
    .filter_map(|part| part.parse::<u8>().ok())
    .collect::<Vec<_>>();

  if matches!(
    octets.as_slice(),
    [10, ..] | [127, ..] | [192, 168, ..] | [169, 254, ..]
  ) {
    return true;
  }

  matches!(octets.as_slice(), [172, second, ..] if (16..=31).contains(second))
}

pub(super) fn is_local_provider_host(host: &str) -> bool {
  let normalized = normalize_provider_host(host);
  normalized == "localhost"
    || normalized == "::1"
    || normalized == "[::1]"
    || normalized.ends_with(".local")
    || is_private_ipv4_host(&normalized)
}

pub(super) fn provider_host_matches_allowlist(host: &str, allowlist: &[String]) -> bool {
  let normalized_host = normalize_provider_host(host);
  allowlist
    .iter()
    .any(|allowed| normalized_host == *allowed || normalized_host.ends_with(&format!(".{allowed}")))
}

pub(super) fn validate_provider_base_url(base_url: &str) -> Result<()> {
  let trimmed = base_url.trim();
  if trimmed.is_empty() {
    return Ok(());
  }

  let parsed = Url::parse(trimmed).context("provider base url must be a valid absolute URL")?;
  let scheme = parsed.scheme();
  if !matches!(scheme, "http" | "https") {
    return Err(anyhow!("provider base url must use http or https"));
  }

  if !parsed.username().is_empty() || parsed.password().is_some() {
    return Err(anyhow!(
      "provider base url must not contain embedded credentials"
    ));
  }

  if parsed.query().is_some() || parsed.fragment().is_some() {
    return Err(anyhow!(
      "provider base url must not contain query params or fragments"
    ));
  }

  let host = parsed
    .host_str()
    .map(normalize_provider_host)
    .filter(|host| !host.is_empty())
    .context("provider base url must include a host")?;
  let is_local_host = is_local_provider_host(&host);

  if scheme == "http" && !is_local_host {
    return Err(anyhow!(
      "provider base url must use https unless it points to localhost or a private network"
    ));
  }

  let allowlist = configured_trusted_provider_hosts();
  if enforce_trusted_provider_hosts()
    && !is_local_host
    && !provider_host_matches_allowlist(&host, &allowlist)
  {
    return Err(anyhow!(
      "provider host '{}' is not on MMGH_TRUSTED_PROVIDER_HOSTS",
      host
    ));
  }

  Ok(())
}

pub(super) fn sanitize_settings_for_client(settings: &AgentSettings) -> AgentSettings {
  let mut sanitized = settings.clone();
  sanitized.has_api_key = !settings.api_key.trim().is_empty();
  sanitized.api_key.clear();
  sanitized
}

pub(super) fn validate_settings_size(settings: &AgentSettings) -> Result<()> {
  ensure_char_limit(&settings.provider_name, MAX_TITLE_CHARS, "provider name")?;
  ensure_char_limit(
    &settings.base_url,
    MAX_SHORT_TEXT_CHARS,
    "provider base url",
  )?;
  ensure_char_limit(&settings.model, MAX_SHORT_TEXT_CHARS, "model")?;
  ensure_char_limit(
    &settings.system_prompt,
    MAX_LONG_TEXT_CHARS,
    "system prompt",
  )
}

pub(super) fn merge_settings_input(
  current: AgentSettings,
  input: AgentSettingsInput,
) -> AgentSettings {
  let next_api_key = input.api_key.trim().to_string();
  let clear_api_key = input.clear_api_key && next_api_key.is_empty();

  AgentSettings {
    provider_name: if input.provider_name.trim().is_empty() {
      current.provider_name
    } else {
      input.provider_name.trim().to_string()
    },
    base_url: if input.base_url.trim().is_empty() {
      current.base_url
    } else {
      input.base_url.trim().trim_end_matches('/').to_string()
    },
    has_api_key: if clear_api_key {
      false
    } else {
      current.has_api_key || !next_api_key.is_empty()
    },
    api_key: if clear_api_key {
      String::new()
    } else if next_api_key.is_empty() {
      current.api_key
    } else {
      next_api_key
    },
    model: if input.model.trim().is_empty() {
      current.model
    } else {
      input.model.trim().to_string()
    },
    system_prompt: if input.system_prompt.trim().is_empty() {
      current.system_prompt
    } else {
      input.system_prompt.trim().to_string()
    },
  }
}

pub(super) fn load_settings_in(conn: &Connection) -> Result<AgentSettings> {
  if let Some(mut cached) = read_settings_cache()? {
    cached.api_key = resolve_effective_api_key(None)?;
    cached.has_api_key = !cached.api_key.trim().is_empty();
    return Ok(cached);
  }

  let mut settings = conn
    .query_row(
      "SELECT provider_name, base_url, model, system_prompt
       FROM provider_settings
       WHERE id = 1",
      [],
      |row| {
        Ok(AgentSettings {
          provider_name: row.get(0)?,
          base_url: row.get(1)?,
          has_api_key: false,
          api_key: String::new(),
          model: row.get(2)?,
          system_prompt: row.get(3)?,
        })
      },
    )
    .optional()?
    .unwrap_or_else(default_settings);

  let sanitized_settings = sanitize_settings_for_persistence(&settings);
  store_settings_cache(&sanitized_settings)?;
  settings.api_key = resolve_effective_api_key(None)?;
  settings.has_api_key = !settings.api_key.trim().is_empty();
  Ok(settings)
}

pub(super) fn publish_settings_state(settings: &AgentSettings) -> Result<()> {
  store_runtime_api_key(settings.api_key.clone())?;
  store_settings_cache(&sanitize_settings_for_persistence(settings))
}

pub(super) fn store_settings_row_in(conn: &Connection, settings: &AgentSettings) -> Result<()> {
  let sanitized = sanitize_settings_for_persistence(settings);
  conn.execute(
    "INSERT INTO provider_settings (id, provider_name, base_url, model, system_prompt, updated_at)
     VALUES (1, ?1, ?2, ?3, ?4, ?5)
     ON CONFLICT(id) DO UPDATE SET
       provider_name = excluded.provider_name,
       base_url = excluded.base_url,
       model = excluded.model,
       system_prompt = excluded.system_prompt,
       updated_at = excluded.updated_at",
    params![
      &sanitized.provider_name,
      &sanitized.base_url,
      &sanitized.model,
      &sanitized.system_prompt,
      now_millis()
    ],
  )?;
  Ok(())
}

#[cfg(test)]
pub(super) fn store_settings_fixture_in(conn: &Connection, settings: &AgentSettings) -> Result<()> {
  KeyringProviderSecretStore.replace_active(settings_api_key(settings))?;
  store_settings_row_in(conn, settings)?;
  publish_settings_state(settings)
}
