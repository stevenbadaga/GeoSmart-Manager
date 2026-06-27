CREATE TABLE conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type VARCHAR(50) NOT NULL,
    created_by BIGINT NOT NULL,
    project_id BIGINT,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    last_message_at TIMESTAMP
);

CREATE TABLE conversation_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id BIGINT NOT NULL REFERENCES conversations(id),
    user_id BIGINT NOT NULL REFERENCES users(id),
    role_at_join VARCHAR(50) NOT NULL,
    joined_at TIMESTAMP NOT NULL,
    last_read_at TIMESTAMP,
    UNIQUE(conversation_id, user_id)
);

CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id BIGINT NOT NULL REFERENCES conversations(id),
    sender_id BIGINT NOT NULL REFERENCES users(id),
    body TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_conversation_participants_user ON conversation_participants(user_id);
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_sender_created ON messages(sender_id, created_at);

ALTER TABLE notifications ADD COLUMN related_conversation_id BIGINT;
CREATE INDEX idx_notifications_related_conversation ON notifications(recipient_id, related_conversation_id, is_read);
