use once_cell::sync::OnceCell;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[repr(i32)]
pub enum ActivityKind {
    Playing = 0,
    Listening = 2,
    Watching = 3,
    Competing = 5,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PresencePayload {
    pub client_id: String,
    pub state: Option<String>,
    pub details: Option<String>,
    pub activity_type: Option<serde_json::Value>,
    pub start_time: Option<i64>,
    pub image_key: Option<String>,
    pub image_text: Option<String>,
}

pub struct DiscordSession {
    pub client: discord_sdk::Discord,
    pub user: discord_sdk::user::User,
    _wheel: discord_sdk::wheel::Wheel,
}

static ACTIVE_SESSION: OnceCell<Mutex<Option<DiscordSession>>> = OnceCell::new();

fn session_store() -> &'static Mutex<Option<DiscordSession>> {
    ACTIVE_SESSION.get_or_init(|| Mutex::new(None))
}

impl DiscordSession {
    pub async fn open(app_id: i64) -> Result<Self, String> {
        let (wheel, handler) = discord_sdk::wheel::Wheel::new(Box::new(|err| {
            eprintln!("[DRQ Presence] Wheel error: {:?}", err);
        }));

        let mut user_watcher = wheel.user();

        let client = discord_sdk::Discord::new(
            discord_sdk::DiscordApp::PlainId(app_id),
            discord_sdk::Subscriptions::ACTIVITY,
            Box::new(handler),
        )
        .map_err(|err| format!("Failed to initialize Discord client: {:?}", err))?;

        user_watcher
            .0
            .changed()
            .await
            .map_err(|err| format!("Failed to observe Discord user connection: {}", err))?;

        let user = match &*user_watcher.0.borrow() {
            discord_sdk::wheel::UserState::Connected(u) => u.clone(),
            discord_sdk::wheel::UserState::Disconnected(err) => {
                return Err(format!(
                    "Unable to connect to Discord desktop client: {}",
                    err
                ));
            }
        };

        Ok(Self {
            client,
            user,
            _wheel: wheel,
        })
    }

    pub async fn apply_activity(&self, payload: &PresencePayload) -> Result<(), String> {
        let mut builder = discord_sdk::activity::ActivityBuilder::default();

        let kind = match payload.activity_type.as_ref() {
            Some(serde_json::Value::Number(n)) => match n.as_i64() {
                Some(2) => discord_sdk::activity::ActivityKind::Listening,
                Some(3) => discord_sdk::activity::ActivityKind::Watching,
                Some(5) => discord_sdk::activity::ActivityKind::Competing,
                _ => discord_sdk::activity::ActivityKind::Playing,
            },
            Some(serde_json::Value::String(s)) => match s.to_lowercase().as_str() {
                "listening" => discord_sdk::activity::ActivityKind::Listening,
                "watching" => discord_sdk::activity::ActivityKind::Watching,
                "competing" => discord_sdk::activity::ActivityKind::Competing,
                _ => discord_sdk::activity::ActivityKind::Playing,
            },
            _ => discord_sdk::activity::ActivityKind::Playing,
        };
        builder = builder.kind(kind);

        if let Some(details) = payload.details.as_deref().filter(|s| !s.is_empty()) {
            builder = builder.details(details);
        }

        if let Some(state) = payload.state.as_deref().filter(|s| !s.is_empty()) {
            builder = builder.state(state);
        }

        if let Some(ts) = payload.start_time {
            builder = builder.start_timestamp(ts);
        }

        if let Some(img_key) = payload.image_key.as_deref().filter(|s| !s.is_empty()) {
            let assets = discord_sdk::activity::Assets::default()
                .large(img_key, payload.image_text.clone());
            builder = builder.assets(assets);
        }

        self.client
            .update_activity(builder)
            .await
            .map_err(|err| format!("Failed to update Discord presence: {}", err))?;

        Ok(())
    }

    pub async fn close(self) {
        self.client.disconnect().await;
    }
}

pub async fn activate_presence(payload: PresencePayload) -> Result<(), String> {
    let app_id: i64 = payload
        .client_id
        .parse()
        .map_err(|err| format!("Invalid client_id '{}': {}", payload.client_id, err))?;

    // Disconnect any active session before creating a new one
    let previous_session = {
        let mut guard = session_store().lock().unwrap();
        guard.take()
    };

    if let Some(prev) = previous_session {
        prev.close().await;
    }

    let session = DiscordSession::open(app_id).await?;
    session.apply_activity(&payload).await?;

    {
        let mut guard = session_store().lock().unwrap();
        *guard = Some(session);
    }

    Ok(())
}

pub async fn deactivate_presence() -> Result<(), String> {
    let session = {
        let mut guard = session_store().lock().unwrap();
        guard.take()
    };

    if let Some(s) = session {
        s.close().await;
    }

    Ok(())
}
