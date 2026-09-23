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

# Fail fast with a clear message when the key is obviously the wrong type.
# Google AI Studio API keys start with "AIza"; OAuth access tokens ("AQ.Ab8...")
# are NOT valid here and cause 401 UNAUTHENTICATED / ACCESS_TOKEN_TYPE_UNSUPPORTED.
if not settings.GEMINI_API_KEY.startswith("AIza"):
    import warnings

    warnings.warn(
        "GEMINI_API_KEY does not look like a Google AI Studio API key "
        "(expected prefix 'AIza...'). It appears to be an OAuth access token, "
        "which is not supported by the Generative Language API. "
        "Generate a proper key at https://aistudio.google.com/apikey and put it in .env",
        stacklevel=1,
    )
