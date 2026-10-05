
CREATE FUNCTION renew_updated_at()
RETURNS TRIGGER AS $$
BEGIN 
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ###################################################

CREATE TABLE rooms (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trigger_room_update_at 
BEFORE UPDATE ON rooms
FOR EACH ROW
EXECUTE FUNCTION renew_updated_at();

-- ###################################################

CREATE TABLE provinces (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL UNIQUE,
    room_id BIGINT NOT NULL UNIQUE references rooms ON DELETE RESTRICT, -- avoid deleting a room with provinces. rooms should not be deletable, are permanent.
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT provinces_slug_options CHECK (slug IN ('araba', 'bizkaia', 'gipuzkoa', 'nafarroa', 'lapurdi', 'nafarroa-beherea', 'zuberoa')),
    CONSTRAINT provinces_name_options CHECK (name IN ('Araba', 'Bizkaia', 'Gipuzkoa', 'Nafarroa', 'Lapurdi', 'Nafarroa Beherea', 'Zuberoa'))
);

CREATE TRIGGER trigger_provinces_updated_at 
BEFORE UPDATE ON provinces
FOR EACH ROW
EXECUTE FUNCTION renew_updated_at();

-- ###################################################

CREATE TABLE towns (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    slug TEXT NOT NULL,
    name TEXT NOT NULL,
    province_id BIGINT NOT NULL references provinces ON DELETE RESTRICT, -- avoid deleting provinces with towns. provinces should not be deletable, are permantent.
    room_id BIGINT NOT NULL UNIQUE references rooms ON DELETE RESTRICT, -- avoid deleting a room with provinces. rooms should not be deletable, are permanent.
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT towns_slug_prevent_reserved_word CHECK (slug != 'posts'),
    CONSTRAINT towns_unique_slug_plus_province_id UNIQUE (slug, province_id), -- there can't be two towns in the same province. checking the slug is enough, as the slug and name must reference the same.
    CONSTRAINT towns_slug_format CHECK (slug ~ '^[a-z-]+$')

);

CREATE TRIGGER trigger_towns_updated_at
BEFORE UPDATE ON towns
FOR EACH ROW
EXECUTE FUNCTION renew_updated_at();

-- ###################################################

CREATE TABLE users (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    public_id TEXT UNIQUE NOT NULL, 
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL, 
    bio TEXT,
    avatar_url TEXT, 
    email TEXT UNIQUE NOT NULL,
    email_verified_at timestamptz,
    town_id BIGINT references towns ON DELETE RESTRICT,  -- NULLABLE. We want to avoid deleting towns with users.
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT users_public_id_format CHECK (public_id ~ '^[a-z0-9]{8}$'), -- 26+10=36; 36^8=2.821109907×10¹²; de sobra para los usuarios.
    CONSTRAINT users_username_format CHECK (username ~ '^[a-z0-9_]{3,20}$'),
    CONSTRAINT users_display_name_length CHECK (char_length(btrim(display_name)) BETWEEN 1 AND 50),
    CONSTRAINT users_bio_length CHECK (char_length(bio)<=350),
    CONSTRAINT users_email_lowercase CHECK (email = LOWER(email))
);   

-- ###################################################

CREATE TRIGGER trigger_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION renew_updated_at();

CREATE TABLE auth_accounts (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id BIGINT NOT NULL references users ON DELETE CASCADE,
    provider TEXT NOT NULL, -- 'google', 'password', ...
    provider_user_id TEXT,
    password_hash TEXT,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT auths_accounts_unique_provider_user_id UNIQUE (provider, provider_user_id), -- avoid linking the same account to different users
    CONSTRAINT auths_accounts_unique_user_provider UNIQUE (user_id, provider),
    CONSTRAINT auths_accounts_providers_check CHECK (provider IN ('google', 'password')),
    CONSTRAINT auth_accounts_data_consistency CHECK (
        (
            provider = 'password' 
            AND password_hash IS NOT NULL
            AND char_length(btrim(password_hash)) > 0 
            AND provider_user_id IS NULL
        ) 
        OR 
        (
            provider != 'password' 
            AND provider_user_id IS NOT NULL
            AND char_length(btrim(provider_user_id)) > 0 
            AND password_hash IS NULL
        )
    )  
);

-- ###################################################

CREATE TRIGGER trigger_auth_accounts_updated_at
BEFORE UPDATE ON auth_accounts
FOR EACH ROW 
EXECUTE FUNCTION renew_updated_at();

CREATE TABLE posts (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    slug TEXT NOT NULL UNIQUE, -- nanoid of 10 caracers. a-z=26 | 0-9=10 -> 36^10=3.65615844×10¹⁵ posts. i have decided not to use hypens
    content TEXT NOT NULL,
    author_id BIGINT NOT NULL references users ON DELETE CASCADE, -- deleting a user shreds all its posts
    reply_to_id BIGINT references posts ON DELETE SET NULL, -- when the user deletes the post, the row won't be deleted, deleted_at will be set a value and in the UI we will show the post has been deleted. But there must be the row so we can show replies and quotes.
    quote_to_id BIGINT references posts ON DELETE SET NULL, -- when the user deletes the post, the row won't be deleted, deleted_at will be set a value and in the UI we will show the post has been deleted. But there must be the row so we can show replies and quotes.
    room_id BIGINT NOT NULL references rooms ON DELETE RESTRICT, -- avoid deleting a room with posts. rooms should not be deletable, are permanent.
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz,

    CONSTRAINT posts_slug_format CHECK (slug ~ '^[a-z0-9]{10}$'),
    CONSTRAINT posts_content_length CHECK (char_length(btrim(content)) BETWEEN 1 AND 500)
);

CREATE TRIGGER trigger_posts_updated_at
BEFORE UPDATE ON posts
FOR EACH ROW
EXECUTE FUNCTION renew_updated_at();

-- ###################################################

CREATE TABLE retired_usernames (
    username TEXT PRIMARY KEY,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- ###################################################

CREATE TABLE sessions (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    session_hash TEXT NOT NULL UNIQUE,
    user_id BIGINT NOT NULL references users ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,

    CONSTRAINT sessions_hash_format CHECK (session_hash ~ '^[a-f0-9]{64}$')
);

CREATE INDEX sessions_user_id_idx 
ON sessions(user_id);