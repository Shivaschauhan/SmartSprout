from fastapi import APIRouter, Request, HTTPException, Query, Depends
from sqlalchemy.orm import Session
from db.session import get_db
from db.models.food import FoodItem, FoodLog
from schemas.food_log import (
    FoodLogCreate,
    FoodLogResponse,
    FoodSummaryResponse,
    DailyFoodSummary,
    FoodLogBatchCreate,
    FoodLogBatchResponse,
)
from datetime import datetime, timedelta
from collections import defaultdict
from services.nutrition import scale_nutrients, UnitConversionError

router = APIRouter(
    prefix="/v1/food-logs",
    tags=["Food Logs"]
)


def _log_to_response(food_log: FoodLog, food_item: FoodItem) -> FoodLogResponse:
    nutrients = scale_nutrients(food_item, float(food_log.quantity), food_log.unit)
    return FoodLogResponse(
        id=food_log.id,
        food_id=food_item.id,
        food_name=food_item.name,
        quantity=float(food_log.quantity),
        unit=food_log.unit,
        meal_name=getattr(food_log, "meal_name", None),
        logged_at=food_log.logged_at,
        calories=nutrients["calories"],
        protein=nutrients["protein"],
        carbs=nutrients["carbs"],
        fats=nutrients["fats"],
        vitamins=nutrients["vitamins"],
    )


@router.post("/", response_model=FoodLogResponse)
def create_food_log(request: Request, body: FoodLogCreate, db: Session = Depends(get_db)):
    user = request.state.user
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    food_item = db.query(FoodItem).filter(FoodItem.id == body.food_id).first()
    if not food_item:
        raise HTTPException(status_code=404, detail="Food item not found")

    try:
        scale_nutrients(food_item, float(body.quantity), body.unit)
    except UnitConversionError as e:
        raise HTTPException(status_code=400, detail=str(e))

    food_log = FoodLog(
        user_id=user.id,
        food_id=food_item.id,
        quantity=body.quantity,
        unit=body.unit,
        meal_name=body.meal_name,
    )
    db.add(food_log)
    db.commit()
    db.refresh(food_log)
    return _log_to_response(food_log, food_item)


@router.post("/batch", response_model=FoodLogBatchResponse)
def create_food_logs_batch(request: Request, body: FoodLogBatchCreate, db: Session = Depends(get_db)):
    """Log multiple foods at once (meal scan confirmation)."""
    user = request.state.user
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    if not body.items:
        raise HTTPException(status_code=400, detail="No items to log")

    results = []
    for item in body.items:
        food_item = db.query(FoodItem).filter(FoodItem.id == item.food_id).first()
        if not food_item:
            raise HTTPException(status_code=404, detail=f"Food item {item.food_id} not found")
        try:
            scale_nutrients(food_item, float(item.quantity), item.unit)
        except UnitConversionError as e:
            raise HTTPException(status_code=400, detail=str(e))

        meal = item.meal_name or body.meal_name
        food_log = FoodLog(
            user_id=user.id,
            food_id=food_item.id,
            quantity=item.quantity,
            unit=item.unit,
            meal_name=meal,
        )
        db.add(food_log)
        db.flush()
        db.refresh(food_log)
        results.append(_log_to_response(food_log, food_item))

    db.commit()
    return FoodLogBatchResponse(count=len(results), items=results)


@router.get("/", response_model=list[FoodLogResponse])
def list_food_logs(
    request: Request,
    date: str = Query(None, description="Filter logs for a specific date (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    user = request.state.user
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    query = (
        db.query(FoodLog, FoodItem)
        .join(FoodItem, FoodItem.id == FoodLog.food_id)
        .filter(FoodLog.user_id == user.id)
    )

    if date:
        try:
            target_date = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

        day_start = datetime.combine(target_date, datetime.min.time())
        day_end = day_start + timedelta(days=1)
        query = query.filter(
            FoodLog.logged_at >= day_start,
            FoodLog.logged_at < day_end
        )

    logs = query.order_by(FoodLog.logged_at.desc()).all()
    results = []
    for log, food in logs:
        try:
            results.append(_log_to_response(log, food))
        except UnitConversionError:
            continue
    return results


@router.get("/summary", response_model=FoodSummaryResponse)
def get_food_summary(
    request: Request,
    days: int = 7,
    db: Session = Depends(get_db)
):
    user = request.state.user
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    today = datetime.utcnow().date()
    since_date = today - timedelta(days=days - 1)
    day_start = datetime.combine(since_date, datetime.min.time())

    rows = (
        db.query(FoodLog, FoodItem)
        .join(FoodItem, FoodItem.id == FoodLog.food_id)
        .filter(
            FoodLog.user_id == user.id,
            FoodLog.logged_at >= day_start
        )
        .all()
    )

    daily_map = defaultdict(lambda: {"calories": 0.0, "protein": 0.0, "carbs": 0.0, "fats": 0.0})
    for log, food in rows:
        try:
            n = scale_nutrients(food, float(log.quantity), log.unit)
        except UnitConversionError:
            continue
        d = log.logged_at.date() if hasattr(log.logged_at, "date") else log.logged_at
        daily_map[d]["calories"] += n["calories"]
        daily_map[d]["protein"] += n["protein"]
        daily_map[d]["carbs"] += n["carbs"]
        daily_map[d]["fats"] += n["fats"]

    daily_summary = [
        DailyFoodSummary(
            date=d,
            calories=vals["calories"],
            protein=vals["protein"],
            carbs=vals["carbs"],
            fats=vals["fats"],
        )
        for d, vals in sorted(daily_map.items(), reverse=True)
    ]

    return FoodSummaryResponse(
        days=days,
        range_start=since_date,
        range_end=today,
        total_calories=sum(d.calories for d in daily_summary),
        total_protein=sum(d.protein for d in daily_summary),
        total_carbs=sum(d.carbs for d in daily_summary),
        total_fats=sum(d.fats for d in daily_summary),
        daily=daily_summary
    )


@router.delete("/{log_id}")
def delete_food_log(log_id: int, request: Request, db: Session = Depends(get_db)):
    user = request.state.user
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    food_log = db.query(FoodLog).filter(FoodLog.id == log_id).first()
    if not food_log:
        raise HTTPException(status_code=404, detail="Food log not found")

    if food_log.user_id != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    db.delete(food_log)
    db.commit()
    return {"message": "Food log deleted successfully"}

