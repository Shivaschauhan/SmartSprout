from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse
import jwt
from core.config import settings
from db.session import SessionLocal
from db.models.user import User

class AuthAndOnboardingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        public_paths = [
            "/docs",
            "/redoc",
            "/openapi.json",
            "/health",
            "/test-db",
        ]

        try:
            if request.method == "OPTIONS":
                return await call_next(request)

            path = request.url.path
            if path in public_paths or path.startswith("/api/v1/auth"):
                return await call_next(request)

            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                return JSONResponse(status_code=401, content={"detail": "Missing or invalid Authorization header"})

            token = auth_header.split(" ")[1]

            try:
                payload = jwt.decode(
                    token,
                    settings.JWT_SECRET,
                    algorithms=[settings.JWT_ALGORITHM]
                )
            except jwt.ExpiredSignatureError:
                return JSONResponse(status_code=401, content={"detail": "Token has expired"})
            except jwt.InvalidTokenError:
                return JSONResponse(status_code=401, content={"detail": "Invalid token"})

            user_id: int = payload.get("sub")
            if not user_id:
                return JSONResponse(status_code=401, content={"detail": "Invalid token payload"})

            db = SessionLocal()
            try:
                user = db.query(User).filter(User.id == user_id).first()
            finally:
                db.close()

            if not user:
                return JSONResponse(status_code=401, content={"detail": "User not found"})

            if not user.is_onboarded and not request.url.path.startswith("/api/v1/auth/onboarding"):
                return JSONResponse(status_code=403, content={"detail": "Onboarding not completed"})

            request.state.user = user
            return await call_next(request)

        except Exception as e:
            # Always return clean JSON for unexpected errors
            return JSONResponse(status_code=500, content={"detail": str(e)})
