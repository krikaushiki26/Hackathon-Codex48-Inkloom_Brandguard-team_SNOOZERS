
from pydantic_settings import BaseSettings, SettingsConfigDict
import psycopg


class Settings(BaseSettings):
    database_url: str

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )


settings = Settings()


def test_connection():
    with psycopg.connect(settings.database_url, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1;")
            print("Database connection successful!")
            print("Test result:", cur.fetchone()[0])


if __name__ == "__main__":
    test_connection()
