import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
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


settings = Settings()
