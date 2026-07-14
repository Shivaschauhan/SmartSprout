from fastapi import APIRouter, Request, Depends
from sqlalchemy.orm import Session
from db.session import get_db
from db.models.food import FoodLog, FoodItem
from db.models.workout import WorkoutLog
from sqlalchemy.sql import func
from datetime import datetime, timedelta
from pytz import timezone
from services.nutrition import scale_nutrients, UnitConversionError, sum_scaled_logs

router = APIRouter(
    prefix="/v1/dashboard",
    tags=["Dashboard"]
)


def _sum_food_calories(db: Session, user_id: int, since, until=None):
    q = (
        db.query(FoodLog, FoodItem)
        .join(FoodItem, FoodLog.food_id == FoodItem.id)
        .filter(FoodLog.user_id == user_id, FoodLog.logged_at >= since)
    )
    if until is not None:
        q = q.filter(FoodLog.logged_at < until)
    return sum_scaled_logs(q.all())


@router.get("/today")
def get_dashboard_today(
    request: Request,
    db: Session = Depends(get_db)
):
    current_user = request.state.user
    today_utc = datetime.utcnow().date()
    since_date = datetime.combine(today_utc, datetime.min.time())

    from db.models.tracking import WaterLog
    water_log = (
        db.query(WaterLog)
        .filter(WaterLog.user_id == current_user.id, WaterLog.date == today_utc)
        .first()
    )
    today_water = water_log.amount if water_log else 0

    from db.models.tracking import StepLog
    step_log = (
        db.query(StepLog)
        .filter(StepLog.user_id == current_user.id, StepLog.date == today_utc)
        .first()
    )
    today_steps = step_log.steps if step_log else 0

    food_totals = _sum_food_calories(db, current_user.id, since_date)
    today_calories_in = food_totals["calories"]

    workout_logs = (
        db.query(
            func.sum(WorkoutLog.estimated_calories).label("total_burned")
        )
        .filter(WorkoutLog.user_id == current_user.id, WorkoutLog.logged_at >= since_date)
        .first()
    )
    step_calories = today_steps * 0.04
    today_calories_out = float(workout_logs.total_burned or 0) + step_calories

    from db.models.plan import Plan, PlanItem
    plan = db.query(Plan).filter(Plan.user_id == current_user.id).order_by(Plan.id.desc()).first()
    active_plan = None
    if plan:
        plan_items = (
            db.query(PlanItem, FoodItem)
            .join(FoodItem, PlanItem.food_id == FoodItem.id)
            .filter(PlanItem.plan_id == plan.id)
            .all()
        )
        days_dict = {}
        for item, food in plan_items:
            if item.day not in days_dict:
                days_dict[item.day] = {}
            if item.meal_name not in days_dict[item.day]:
                days_dict[item.day][item.meal_name] = []
            try:
                n = scale_nutrients(food, float(item.quantity), item.unit)
                cal, pro, carb, fat = n["calories"], n["protein"], n["carbs"], n["fats"]
            except UnitConversionError:
                cal = float(food.calories or 0)
                pro = float(food.protein or 0)
                carb = float(food.carbs or 0)
                fat = float(food.fats or 0)
            days_dict[item.day][item.meal_name].append({
                "food_id": food.id,
                "food_name": food.name,
                "quantity": float(item.quantity),
                "unit": item.unit,
                "calories": cal,
                "protein": pro,
                "carbs": carb,
                "fats": fat,
            })
        days_list = [
            {"day": day, "meals": [{"meal": m, "items": items} for m, items in meals.items()]}
            for day, meals in days_dict.items()
        ]
        active_plan = {
            "plan_id": plan.id,
            "name": plan.name,
            "description": plan.description,
            "workout_plan": plan.workout_plan,
            "avoidance_list": plan.avoidance_list,
            "budget_tips": plan.budget_tips,
            "days": days_list
        }

    return {
        "water": today_water,
        "steps": today_steps,
        "calories_in": today_calories_in,
        "calories_out": today_calories_out,
        "active_plan": active_plan
    }


@router.get("/summary")
def get_dashboard_summary(
    request: Request,
    days: int = 7,
    db: Session = Depends(get_db)
):
    current_user = request.state.user
    since_date = datetime.utcnow() - timedelta(days=days)

    food_totals = _sum_food_calories(db, current_user.id, since_date)

    workout_logs = (
        db.query(
            func.sum(WorkoutLog.estimated_calories).label("total_burned")
        )
        .filter(WorkoutLog.user_id == current_user.id, WorkoutLog.logged_at >= since_date)
        .first()
    )

    from db.models.tracking import StepLog
    step_sum = (
        db.query(func.sum(StepLog.steps))
        .filter(StepLog.user_id == current_user.id, StepLog.date >= since_date)
        .scalar() or 0
    )
    step_calories = step_sum * 0.04

    consumed = food_totals["calories"]
    burned = float(workout_logs.total_burned or 0) + step_calories

    return {
        "days": days,
        "calories": {
            "consumed": consumed,
            "burned": burned,
            "net": consumed - burned
        },
        "macros": {
            "protein": food_totals["protein"],
            "carbs": food_totals["carbs"],
            "fats": food_totals["fats"],
        }
    }


@router.get("/trends")
def get_dashboard_trends(
    request: Request,
    days: int = 7,
    db: Session = Depends(get_db)
):
    current_user = request.state.user
    today_utc = datetime.utcnow().date()
    since_date = today_utc - timedelta(days=days - 1)

    # 1. Fetch all FoodLogs + FoodItems in range
    food_logs = (
        db.query(FoodLog, FoodItem)
        .join(FoodItem, FoodLog.food_id == FoodItem.id)
        .filter(FoodLog.user_id == current_user.id)
        .filter(func.date(FoodLog.logged_at) >= since_date)
        .all()
    )
    
    food_by_date = {}
    for log, item in food_logs:
        d = log.logged_at.date()
        if d not in food_by_date:
            food_by_date[d] = []
        food_by_date[d].append((log, item))
        
    # 2. Fetch all WorkoutLogs in range
    workout_logs = (
        db.query(WorkoutLog)
        .filter(WorkoutLog.user_id == current_user.id)
        .filter(func.date(WorkoutLog.logged_at) >= since_date)
        .all()
    )
    
    workout_by_date = {}
    for w in workout_logs:
        d = w.logged_at.date()
        workout_by_date[d] = workout_by_date.get(d, 0) + float(w.estimated_calories or 0)
        
    # 3. Fetch all StepLogs in range
    from db.models.tracking import StepLog
    step_logs = (
        db.query(StepLog)
        .filter(StepLog.user_id == current_user.id, StepLog.date >= since_date)
        .all()
    )
    
    step_by_date = {s.date: s.steps * 0.04 for s in step_logs}
    
    trends = []
    for i in range(days):
        day_date = since_date + timedelta(days=i)
        
        day_foods = food_by_date.get(day_date, [])
        consumed = sum_scaled_logs(day_foods)["calories"]
        burned = workout_by_date.get(day_date, 0.0) + step_by_date.get(day_date, 0.0)
        
        trends.append({
            "date": day_date.isoformat(),
            "consumed": consumed,
            "burned": burned,
            "net": consumed - burned
        })

    return {
        "days": days,
        "trends": trends
    }
