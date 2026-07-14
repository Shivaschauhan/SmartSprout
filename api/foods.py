from fastapi import APIRouter, Depends, Query, Request, HTTPException, UploadFile, File
from sqlalchemy import asc, desc, or_
from sqlalchemy.orm import Session
from db.session import get_db
from db.models.food import FoodItem
from typing import Optional
from schemas.FoodResponse import (
    PaginatedFoodResponse,
    FoodResponse,
    FoodCreate,
    FoodEstimateRequest,
    FoodEstimateResponse,
    FoodIdentifyResponse,
)
from services.food_vision import process_identification, estimate_food_macros
from services.nutrition import food_to_dict, available_units
from core.config import settings

router = APIRouter(
    prefix="/v1/foods",
    tags=["Foods"]
)


def _to_response(food: FoodItem) -> dict:
    d = food_to_dict(food)
    d["vitamins"] = food.vitamins or {}
    return d


@router.get("/", response_model=PaginatedFoodResponse)
def list_foods(
    request: Request,
    db: Session = Depends(get_db),
    search: Optional[str] = Query(None, description="Search food items by name"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    sort_by: str = Query("name", description="Sort field: name, calories, protein, carbs, fats"),
    order: str = Query("asc", description="Order: asc or desc"),
    category: Optional[str] = Query(None, description="food|drink|snack|condiment|supplement|other"),
    is_drink: Optional[bool] = Query(None),
    min_calories: Optional[float] = Query(None),
    max_calories: Optional[float] = Query(None),
    min_protein: Optional[float] = Query(None),
    max_protein: Optional[float] = Query(None),
    min_carbs: Optional[float] = Query(None),
    max_carbs: Optional[float] = Query(None),
    min_fats: Optional[float] = Query(None),
    max_fats: Optional[float] = Query(None),
):
    user = getattr(request.state, "user", None)
    user_id = user.id if user else None

    # System catalog + current user's custom items
    query = db.query(FoodItem)
    if user_id is not None:
        query = query.filter(or_(FoodItem.user_id.is_(None), FoodItem.user_id == user_id))
    else:
        query = query.filter(FoodItem.user_id.is_(None))

    if search:
        query = query.filter(FoodItem.name.ilike(f"%{search}%"))

    if category:
        query = query.filter(FoodItem.category == category)
    if is_drink is not None:
        query = query.filter(FoodItem.is_drink == is_drink)

    if min_calories is not None:
        query = query.filter(FoodItem.calories >= min_calories)
    if max_calories is not None:
        query = query.filter(FoodItem.calories <= max_calories)
    if min_protein is not None:
        query = query.filter(FoodItem.protein >= min_protein)
    if max_protein is not None:
        query = query.filter(FoodItem.protein <= max_protein)
    if min_carbs is not None:
        query = query.filter(FoodItem.carbs >= min_carbs)
    if max_carbs is not None:
        query = query.filter(FoodItem.carbs <= max_carbs)
    if min_fats is not None:
        query = query.filter(FoodItem.fats >= min_fats)
    if max_fats is not None:
        query = query.filter(FoodItem.fats <= max_fats)

    sort_field_map = {
        "name": FoodItem.name,
        "calories": FoodItem.calories,
        "protein": FoodItem.protein,
        "carbs": FoodItem.carbs,
        "fats": FoodItem.fats,
    }
    sort_column = sort_field_map.get(sort_by, FoodItem.name)
    query = query.order_by(asc(sort_column) if order == "asc" else desc(sort_column))

    total = query.count()
    foods = query.offset((page - 1) * per_page).limit(per_page).all()

    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "items": [_to_response(f) for f in foods],
    }


@router.get("/{food_id}", response_model=FoodResponse)
def get_food(food_id: int, request: Request, db: Session = Depends(get_db)):
    user = getattr(request.state, "user", None)
    user_id = user.id if user else None
    food = db.query(FoodItem).filter(FoodItem.id == food_id).first()
    if not food:
        raise HTTPException(status_code=404, detail="Food item not found")
    if food.user_id is not None and food.user_id != user_id:
        raise HTTPException(status_code=404, detail="Food item not found")
    return _to_response(food)


@router.post("/", response_model=FoodResponse, status_code=201)
def create_food(request: Request, body: FoodCreate, db: Session = Depends(get_db)):
    user = request.state.user
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    category = (body.category or "food").lower()
    is_drink = body.is_drink or category == "drink"
    if is_drink:
        category = "drink"

    food = FoodItem(
        name=body.name.strip(),
        calories=body.calories,
        protein=body.protein,
        carbs=body.carbs,
        fats=body.fats,
        vitamins=body.vitamins or {},
        reference_amount=body.reference_amount,
        reference_unit=body.reference_unit.strip(),
        unit_conversions=body.unit_conversions or {},
        category=category,
        is_drink=is_drink,
        source="user",
        user_id=user.id,
        brand=body.brand,
        description=body.description,
        serving_label=body.serving_label,
    )
    db.add(food)
    db.commit()
    db.refresh(food)
    return _to_response(food)


@router.post("/estimate", response_model=FoodEstimateResponse)
def estimate_food(request: Request, body: FoodEstimateRequest):
    user = request.state.user
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        data = estimate_food_macros(body.name, body.category, body.is_drink)
        return FoodEstimateResponse(
            name=data.get("name") or body.name,
            calories=float(data.get("calories") or 0),
            protein=float(data.get("protein") or 0),
            carbs=float(data.get("carbs") or 0),
            fats=float(data.get("fats") or 0),
            reference_amount=float(data.get("reference_amount") or 100),
            reference_unit=data.get("reference_unit") or "g",
            unit_conversions=data.get("unit_conversions") or {},
            category=data.get("category") or body.category or "food",
            is_drink=bool(data.get("is_drink") if data.get("is_drink") is not None else (body.is_drink or False)),
            serving_label=data.get("serving_label"),
            description=data.get("description"),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Estimate failed: {e}")


@router.post("/identify", response_model=FoodIdentifyResponse)
async def identify_food_photo(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Upload a meal photo; LLM identifies foods/drinks and match/creates catalog items."""
    user = request.state.user
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    content_type = file.content_type or "image/jpeg"
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty image file")
    if len(image_bytes) > settings.MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="Image too large (max 5MB)")

    try:
        result = process_identification(db, user.id, image_bytes, content_type)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Food identification failed: {e}")
