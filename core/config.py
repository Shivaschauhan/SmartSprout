from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 43200
    GEMINI_API_KEY: str
    # Centralized model names — swap without hunting call sites
    GEMINI_CHAT_MODEL: str = "gemini-3.1-flash-lite"
    GEMINI_VISION_MODEL: str = "gemini-3.1-flash-lite"
    GEMINI_EMBEDDING_MODEL: str = "models/text-embedding-004"
    MAX_CHAT_TOOL_ROUNDS: int = 6
    MAX_PLAN_FOOD_ITEMS: int = 40
    MAX_IMAGE_BYTES: int = 5 * 1024 * 1024

    class Config:
        env_file = ".env"


settings = Settings()
