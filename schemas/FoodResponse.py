from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class FoodResponse(BaseModel):
    id: int
    name: str
    calories: float
    protein: float
    carbs: float
    fats: float
    reference_amount: float
    reference_unit: str
    unit_conversions: Optional[Dict[str, Any]] = None
    category: str = "food"
    is_drink: bool = False
    source: str = "system"
    user_id: Optional[int] = None
    brand: Optional[str] = None
    description: Optional[str] = None
    serving_label: Optional[str] = None
    vitamins: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class FoodCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    calories: float = Field(..., ge=0)
    protein: float = Field(0, ge=0)
    carbs: float = Field(0, ge=0)
    fats: float = Field(0, ge=0)
    reference_amount: float = Field(..., gt=0)
    reference_unit: str = Field(..., min_length=1)
    unit_conversions: Optional[Dict[str, float]] = None
    category: str = "food"
    is_drink: bool = False
    brand: Optional[str] = None
    description: Optional[str] = None
    serving_label: Optional[str] = None
    vitamins: Optional[Dict[str, float]] = None


class FoodEstimateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    quantity: Optional[float] = None
    unit: Optional[str] = None
    category: Optional[str] = None
    is_drink: Optional[bool] = None


class FoodEstimateResponse(BaseModel):
    name: str
    calories: float
    protein: float
    carbs: float
    fats: float
    reference_amount: float
    reference_unit: str
    unit_conversions: Optional[Dict[str, float]] = None
    category: str = "food"
    is_drink: bool = False
    serving_label: Optional[str] = None
    description: Optional[str] = None


class PaginatedFoodResponse(BaseModel):
    total: int
    page: int
    per_page: int
    items: List[FoodResponse]


class IdentifiedFoodItem(BaseModel):
    name: str
    food_id: Optional[int] = None
    estimated_quantity: float
    unit: str
    category: str = "food"
    is_drink: bool = False
    confidence: float = 0.0
    calories: float = 0.0
    protein: float = 0.0
    carbs: float = 0.0
    fats: float = 0.0
    created: bool = False


class FoodIdentifyResponse(BaseModel):
    items: List[IdentifiedFoodItem]
    meal_suggestion: Optional[str] = None
    notes: Optional[str] = None
    total_calories: float = 0.0
    total_protein: float = 0.0
    total_carbs: float = 0.0
    total_fats: float = 0.0
