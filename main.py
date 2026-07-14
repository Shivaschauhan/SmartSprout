from fastapi import FastAPI
from db.base import get_connection
from core.middleware import AuthAndOnboardingMiddleware
from db.session import engine
from db.models import Base

Base.metadata.create_all(bind=engine)

from api import api_router

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="SmartSprout Backend")

app.add_middleware(AuthAndOnboardingMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the API router under /api
app.include_router(api_router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok", "message": "NutriAI backend running 🚀"}

@app.get("/test-db")
def test_db():
    conn = get_connection()
    cur = conn.cursor()
    try:
        from core.config import settings
        if "sqlite" in settings.DATABASE_URL:
            cur.execute("SELECT sqlite_version();")
        else:
            cur.execute("SELECT version();")
        result = cur.fetchone()
    finally:
        cur.close()
        conn.close()
    return {"db_version": result}
