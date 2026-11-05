import os

import psycopg
from dotenv import load_dotenv

load_dotenv()

POSTGRES_USER = os.getenv("POSTGRES_USER")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD")
POSTGRES_HOST = os.getenv("POSTGRES_HOST")
POSTGRES_PORT = os.getenv("POSTGRES_PORT")
POSTGRES_DB = os.getenv("POSTGRES_DB")

CONNECTION_STRING = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"


class RecordChanged(Exception):
    """Raised when a post's status was changed by someone else (race condition)."""
    pass


def fetch_oldest_unmoderated_post():
    with psycopg.connect(CONNECTION_STRING) as conn:
        with conn.cursor() as cur:
            cur.execute("""
            SELECT id, content, moderation_status
            FROM posts p
            WHERE moderation_status IN ('pending', 'failed')
            AND 3 > (SELECT COUNT(*)
                     FROM posts_moderation_history
                     WHERE post_id = p.id
                     AND to_status = 'failed'
                     AND NOT infra_failure)
            AND deleted_at IS NULL
            ORDER BY p.created_at
            LIMIT 1
            """)
            return cur.fetchone()


def count_content_failures(post_id):
    # Infrastructure failures are logged too, but they don't spend attempts
    with psycopg.connect(CONNECTION_STRING) as conn:
        with conn.cursor() as cur:
            cur.execute("""
            SELECT COUNT(*)
            FROM posts_moderation_history
            WHERE post_id = %s
            AND to_status = 'failed'
            AND NOT infra_failure
            """,
            (post_id,))
            return cur.fetchone()[0]


def update_post_moderation(post_id, from_status, to_status, actor, tags, model, error, infra_failure=False):
    with psycopg.connect(CONNECTION_STRING) as conn:
        with conn.cursor() as cur:
            # Update moderation_status only if nobody changed it meanwhile
            cur.execute("""
            UPDATE posts
            SET moderation_status = %s
            WHERE id = %s
            AND moderation_status = %s
            """,
            (to_status, post_id, from_status))

            if cur.rowcount == 0:
                raise RecordChanged(
                    f"The post's status is not {from_status}. Something has changed it."
                )

            # Insert the history record
            cur.execute("""
            INSERT INTO public.posts_moderation_history(
                post_id, from_status, to_status, actor, tags, model, error, infra_failure)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *;
            """,
            (post_id, from_status, to_status, actor, tags, model, error, infra_failure))

            return cur.fetchone()


if __name__ == "__main__":
    post = fetch_oldest_unmoderated_post()
    print("Post:", post)
    if post is None:
        raise SystemExit("There is no pending post")

    post_id, _, status = post
    row = update_post_moderation(post_id, status, "approved", "ai", ["ok"], "manual", None)
    print("History:", row)

    # Edge case: post is not pending anymore
    try:
        update_post_moderation(post_id, "pending", "approved", "ai", ["ok"], "manual", None)
        print("FAIL: RecordChanged was not raised")
    except RecordChanged as e:
        print("OK, RecordChanged:", e)