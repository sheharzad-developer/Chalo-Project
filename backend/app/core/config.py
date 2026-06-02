from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str = "redis://localhost:6379/0"

    SUPABASE_URL: str
    SUPABASE_JWT_SECRET: str
    SUPABASE_JWT_ALGORITHM: str = "HS256"

    GOOGLE_MAPS_KEY: str

    SAFEPAY_API_KEY: str
    SAFEPAY_WEBHOOK_SECRET: str
    SAFEPAY_ENV: str = "sandbox"

    class Config:
        env_file = ".env"


settings = Settings()
