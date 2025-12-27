"""
Aurastream Backend Configuration

Pydantic settings configuration with environment variable loading,
validation, and singleton pattern support.
"""

from functools import lru_cache
from typing import Literal

from pydantic import field_validator, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    
    All settings can be overridden via environment variables or .env file.
    Required settings (no default) must be provided for the application to start.
    """
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )
    
    # =========================================================================
    # Environment
    # =========================================================================
    APP_ENV: Literal["development", "staging", "production"] = "development"
    DEBUG: bool = True
    
    # =========================================================================
    # Server
    # =========================================================================
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    API_BASE_URL: str = "http://localhost:8000"
    
    # =========================================================================
    # Supabase (required)
    # =========================================================================
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str
    
    # =========================================================================
    # JWT (required)
    # =========================================================================
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24
    
    # =========================================================================
    # Redis
    # =========================================================================
    REDIS_URL: str = "redis://localhost:6379"
    
    # =========================================================================
    # Storage (S3/CDN)
    # =========================================================================
    S3_BUCKET: str = "streamer-studio-assets"
    S3_REGION: str = "us-east-1"
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    CDN_BASE_URL: str = ""
    
    # =========================================================================
    # Nano Banana (Gemini) - AI Generation
    # =========================================================================
    GOOGLE_API_KEY: str = ""
    NANO_BANANA_MODEL: str = "gemini-2.5-flash"
    
    # =========================================================================
    # Stripe Payments
    # =========================================================================
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PRICE_PRO: str = ""
    STRIPE_PRICE_STUDIO: str = ""
    
    # =========================================================================
    # OAuth Providers
    # =========================================================================
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    TWITCH_CLIENT_ID: str = ""
    TWITCH_CLIENT_SECRET: str = ""
    DISCORD_CLIENT_ID: str = ""
    DISCORD_CLIENT_SECRET: str = ""
    YOUTUBE_CLIENT_ID: str = ""
    YOUTUBE_CLIENT_SECRET: str = ""
    
    # =========================================================================
    # CORS
    # =========================================================================
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:19006"
    
    # =========================================================================
    # Monitoring
    # =========================================================================
    SENTRY_DSN: str = ""
    LOG_LEVEL: str = "INFO"
    
    # =========================================================================
    # Validators
    # =========================================================================
    
    @field_validator("JWT_SECRET_KEY")
    @classmethod
    def validate_jwt_secret_length(cls, v: str) -> str:
        """Ensure JWT secret key is at least 32 characters for security."""
        if len(v) < 32:
            raise ValueError(
                "JWT_SECRET_KEY must be at least 32 characters long for security. "
                "Generate a secure key with: python -c \"import secrets; print(secrets.token_urlsafe(32))\""
            )
        return v
    
    @field_validator("SUPABASE_URL")
    @classmethod
    def validate_supabase_url(cls, v: str) -> str:
        """Ensure Supabase URL uses HTTPS protocol."""
        if not v.startswith("https://"):
            raise ValueError(
                "SUPABASE_URL must start with 'https://' for secure communication. "
                "Example: https://your-project.supabase.co"
            )
        return v
    
    @field_validator("APP_ENV")
    @classmethod
    def validate_app_env(cls, v: str) -> str:
        """Validate APP_ENV is one of the allowed values."""
        allowed = {"development", "staging", "production"}
        if v not in allowed:
            raise ValueError(
                f"APP_ENV must be one of: {', '.join(sorted(allowed))}. Got: {v}"
            )
        return v
    
    # =========================================================================
    # Computed Properties
    # =========================================================================
    
    @computed_field
    @property
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.APP_ENV == "production"
    
    @computed_field
    @property
    def allowed_origins_list(self) -> list[str]:
        """Parse ALLOWED_ORIGINS string into a list."""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]
    
    @computed_field
    @property
    def has_stripe_config(self) -> bool:
        """Check if Stripe is configured."""
        return bool(self.STRIPE_SECRET_KEY and self.STRIPE_WEBHOOK_SECRET)
    
    @computed_field
    @property
    def has_s3_config(self) -> bool:
        """Check if S3 storage is configured."""
        return bool(self.AWS_ACCESS_KEY_ID and self.AWS_SECRET_ACCESS_KEY)
    
    @computed_field
    @property
    def has_google_ai_config(self) -> bool:
        """Check if Google AI (Nano Banana) is configured."""
        return bool(self.GOOGLE_API_KEY)


@lru_cache()
def get_settings() -> Settings:
    """
    Get application settings singleton.
    
    Uses lru_cache to ensure settings are only loaded once and reused
    across the application lifecycle. This provides:
    - Consistent configuration across all modules
    - Single point of environment variable loading
    - Efficient memory usage
    
    Returns:
        Settings: The application settings instance
        
    Raises:
        ValidationError: If required settings are missing or invalid
        
    Example:
        ```python
        from api.config import get_settings
        
        settings = get_settings()
        print(f"Running in {settings.APP_ENV} mode")
        print(f"Production: {settings.is_production}")
        ```
    """
    return Settings()


# Convenience alias for direct import
settings = get_settings()
