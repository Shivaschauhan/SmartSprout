from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from db.session import get_db
from db.models.plan import Plan, PlanItem
from db.models.food import FoodItem

router = APIRouter(
    prefix="/v1/plans",
    tags=["Plans"]
)

@router.get("/")
def get_plans(request: Request, db: Session = Depends(get_db)):
    current_user = request.state.user
    plans = db.query(Plan).filter(Plan.user_id == current_user.id).all()

    return [
        {
            "id": p.id,
            "name": p.name,
            "description": p.description,
        }
        for p in plans
    ]


@router.get("/{plan_id}")
def get_plan(plan_id: int, request: Request, db: Session = Depends(get_db)):
    current_user = request.state.user

    plan = db.query(Plan).filter(Plan.id == plan_id, Plan.user_id == current_user.id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

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
        days_dict[item.day][item.meal_name].append({
            "food_id": food.id,
            "food_name": food.name,
            "quantity": float(item.quantity),
            "unit": item.unit,
            "calories": float(food.calories),
            "protein": float(food.protein),
            "carbs": float(food.carbs),
            "fats": float(food.fats),
        })

    days_list = [
        {"day": day, "meals": [{"meal": m, "items": items} for m, items in meals.items()]}
        for day, meals in days_dict.items()
    ]

    return {
        "plan_id": plan.id,
        "name": plan.name,
        "description": plan.description,
        "workout_plan": plan.workout_plan,
        "avoidance_list": plan.avoidance_list,
        "budget_tips": plan.budget_tips,
        "days": days_list
    }

