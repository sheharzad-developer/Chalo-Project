from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str = "redis://localhost:6379/0"

    SUPABASE_URL: str
    SUPABASE_JWT_SECRET: str
    SUPABASE_JWT_ALGORITHM: str = "HS256"

    GOOGLE_MAPS_KEY: str

    SAFEPAY_API_KEY: str       # public key (sec_...) — checkout + merchant_api_key in payloads
    SAFEPAY_SECRET_KEY: str     # secret key — signs API auth header and webhook HMAC
    SAFEPAY_ENV: str = "sandbox"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
