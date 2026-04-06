ALTER TABLE users
    ADD COLUMN organization VARCHAR(200),
    ADD COLUMN specialization VARCHAR(200),
    ADD COLUMN certifications TEXT;

CREATE TABLE user_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(120) NOT NULL UNIQUE,
    device_label VARCHAR(200),
    user_agent TEXT,
    ip_address VARCHAR(120),
    created_at TIMESTAMPTZ NOT NULL,
    last_seen_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_session_id ON user_sessions(session_id);
