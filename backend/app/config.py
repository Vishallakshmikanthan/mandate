import os
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Environment mode: demo | dev | prod
    APP_ENV: str = "demo"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True
    FRONTEND_ORIGIN: str = "http://localhost:3000"

    # Security
    MANDATE_SIGNING_KEY: str = "mandate_super_secure_secret_signing_key_32_bytes_min!"

    # Database
    DATABASE_URL: str = "sqlite:///./mandate.db"

    # PayPal
    PAYPAL_CLIENT_ID: str = ""
    PAYPAL_CLIENT_SECRET: str = ""
    PAYPAL_BASE_URL: str = "https://api-m.sandbox.paypal.com"
    PAYPAL_WEBHOOK_ID: str = ""
    PAYPAL_SIMULATION_MODE: bool = False

    # LLM
    LLM_PROVIDER: str = "mock"
    LLM_API_KEY: str = ""
    LLM_MODEL: str = "gemini-2.5-flash"
    DEMO_REPLAY_MODE: bool = False

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @model_validator(mode="after")
    def validate_security(self) -> "Settings":
        env = self.APP_ENV.lower()
        if env not in ("demo", "dev", "prod"):
            raise ValueError(f"Invalid APP_ENV: '{self.APP_ENV}'. Must be 'demo', 'dev', or 'prod'.")
        if env in ("prod", "dev"):
            default_key = "mandate_super_secure_secret_signing_key_32_bytes_min!"
            if self.MANDATE_SIGNING_KEY == default_key:
                raise ValueError(
                    f"Refusing to start in {env} environment: MANDATE_SIGNING_KEY cannot be the default insecure key. "
                    "Generate a secure key using 'openssl rand -hex 32'."
                )
            if len(self.MANDATE_SIGNING_KEY.encode("utf-8")) < 32:
                raise ValueError(
                    f"Refusing to start in {env} environment: MANDATE_SIGNING_KEY must be at least 32 bytes long."
                )
        return self


settings = Settings()
