from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Central app configuration, loaded from environment variables / .env file.
    Using pydantic-settings so every value is validated and typed instead of
    reading os.environ scattered across the codebase.
    """

    # --- Database ---
    POSTGRES_USER: str = "scheduler_user"
    POSTGRES_PASSWORD: str = "scheduler_pass"
    POSTGRES_DB: str = "scheduler_db"
    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: int = 5432

    # --- Auth ---
    JWT_SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # --- App ---
    ENVIRONMENT: str = "development"
    CORS_ORIGINS: str = "*"

    # --- Scheduling rules ---
    CLINIC_OPEN_HOUR: int = 9        # 9 AM
    CLINIC_CLOSE_HOUR: int = 18      # 6 PM
    DEFAULT_SESSION_MINUTES: int = 45
    MIN_SESSION_MINUTES: int = 15
    MAX_SESSION_MINUTES: int = 180
    SLOT_GRANULARITY_MINUTES: int = 15  # appointments must start on a 15-min boundary

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )


settings = Settings()
