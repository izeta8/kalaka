-- Up Migration

-- # Create `moderation_status` column set the values of the current posts to "approved" 
ALTER TABLE posts
ADD COLUMN moderation_status TEXT NOT NULL DEFAULT 'approved'
CONSTRAINT posts_moderation_status_options CHECK (moderation_status IN ('pending', 'approved', 'censored', 'blocked', 'failed'));

-- # For the posts that will be uploaded in the future set the default value to pending
ALTER TABLE posts
ALTER COLUMN moderation_status SET DEFAULT 'pending';

-- Down Migration
ALTER TABLE posts
DROP COLUMN moderation_status;