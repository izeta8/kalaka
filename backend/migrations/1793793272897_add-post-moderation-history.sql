-- Up Migration

CREATE TABLE posts_moderation_history (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    post_id BIGINT NOT NULL references posts ON DELETE CASCADE, 
    from_status TEXT NOT NULL, 
    to_status TEXT NOT NULL,
    actor TEXT NOT NULL,
    tags TEXT[] NOT NULL,
    model TEXT,
    error TEXT,
    created_at timestamptz NOT NULL DEFAULT now(),
 
    CONSTRAINT posts_moderation_history_tags_allowed_values CHECK (
        tags <@ ARRAY['ok', 'insult', 'threat', 'spam', 'personal_data']::text[]
    ),
    CONSTRAINT posts_moderation_history_from_status_value CHECK (from_status IN ('pending', 'approved', 'censored', 'pending_review', 'blocked', 'failed')),
    CONSTRAINT posts_moderation_history_to_status_value CHECK (to_status IN ('pending', 'approved', 'censored', 'pending_review', 'blocked', 'failed')),
    CONSTRAINT posts_moderation_history_actor_value CHECK (actor IN ('human', 'ai'))
);

CREATE INDEX idx_post_moderation_history_post_id ON posts_moderation_history(post_id);


-- Down Migration

DROP TABLE IF EXISTS posts_moderation_history;