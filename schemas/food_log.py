from pydantic import BaseModel, condecimal
from datetime import datetime, date
from decimal import Decimal
from typing import Annotated, List, Optional


class FoodLogCreate(BaseModel):
    food_id: int
    quantity: Annotated[Decimal, condecimal(gt=0)]
    unit: str
    meal_name: Optional[str] = None


class FoodLogResponse(BaseModel):
    id: int
    food_id: int
    food_name: str
    quantity: float
    unit: str
    meal_name: Optional[str] = None
    logged_at: datetime
    calories: float
    protein: float
    carbs: float
    fats: float
    vitamins: dict

    class Config:
        from_attributes = True


class FoodLogBatchItem(BaseModel):
    food_id: int
    quantity: Annotated[Decimal, condecimal(gt=0)]
    unit: str
    meal_name: Optional[str] = None


class FoodLogBatchCreate(BaseModel):
    items: List[FoodLogBatchItem]
    meal_name: Optional[str] = None


class FoodLogBatchResponse(BaseModel):
    count: int
    items: List[FoodLogResponse]


class DailyFoodSummary(BaseModel):
    date: date
    calories: float
    protein: float
    carbs: float
    fats: float


class FoodSummaryResponse(BaseModel):
    days: int
    range_start: date
    range_end: date
    total_calories: float
    total_protein: float
    total_carbs: float
    total_fats: float
    daily: List[DailyFoodSummary]
