from fastapi import APIRouter

# Create a global API router
api_router = APIRouter()

# Import and include individual routers
from auth.routes import router as auth_router
from api.food_logs import router as food_log
from api.workout_logs import router as workout_log
from api.generate_plans import router as generate_ai_plan
from api.dashboard import router as dashboard_analytics
from api.plans import router as plans
from api.user import router as user
from api.foods import router as foods
from api.workout import router as workouts
from api.tracking import router as tracking
from api.chat import router as chat_coach

# Register routes with their own sub-prefixes
api_router.include_router(auth_router, tags=["Authentication"])
api_router.include_router(food_log, tags=["Food Logs"])
api_router.include_router(workout_log, tags=["Workout Logs"])
api_router.include_router(generate_ai_plan, tags=["Generate AI Plan"])
api_router.include_router(dashboard_analytics, tags=["Dashboard"])
api_router.include_router(plans, tags=["Plans"])
api_router.include_router(user, tags=["User"])
api_router.include_router(foods, tags=["Foods"])
api_router.include_router(workouts, tags=["Workouts"])
api_router.include_router(tracking, tags=["Tracking"])
api_router.include_router(chat_coach, tags=["Chat Coach"])