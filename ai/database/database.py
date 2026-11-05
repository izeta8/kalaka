
import psycopg
from dotenv import load_dotenv
import os

load_dotenv()

POSTGRES_USER = os.getenv("POSTGRES_USER")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD")
POSTGRES_HOST = os.getenv("POSTGRES_HOST")
POSTGRES_PORT = os.getenv("POSTGRES_PORT")
POSTGRES_DB = os.getenv("POSTGRES_DB")

def fetch_oldest_unmoderated_post():

    conn = psycopg.connect(f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}")
    try:
        # Open a cursor to perform database operations
        with conn.cursor() as cur:

            cur.execute("""
            SELECT id, content, moderation_status
            FROM posts p
            WHERE moderation_status IN ('pending', 'failed')
            AND 3 > (SELECT COUNT(post_id) 
                    FROM posts_moderation_history 
                    WHERE post_id = p.id
                    AND to_status IN ('failed')
                    )
            AND deleted_at IS NULL
            ORDER BY p.created_at
            LIMIT 1
            """)

            record = cur.fetchone()
            return record
        
    except BaseException:
        conn.rollback()
    else:
        conn.commit()
    finally:
        conn.close()


if __name__ == "__main__":
    fetch_oldest_unmoderated_post()