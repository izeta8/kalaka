-- Add "pending_review" option to the CHECK 

-- Up Migration
ALTER TABLE posts DROP CONSTRAINT posts_moderation_status_options;

ALTER TABLE posts
ADD CONSTRAINT posts_moderation_status_options CHECK (moderation_status IN ('pending', 'approved', 'censored', 'pending_review', 'blocked', 'failed'));


-- Down Migration
UPDATE posts
SET moderation_status = 'pending'
WHERE moderation_status = 'pending_review';

ALTER TABLE posts DROP CONSTRAINT posts_moderation_status_options;

ALTER TABLE posts
ADD CONSTRAINT posts_moderation_status_options CHECK (moderation_status IN ('pending', 'approved', 'censored', 'blocked', 'failed'));
