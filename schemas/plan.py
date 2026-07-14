from typing import List
from pydantic import BaseModel, Field, condecimal

class PlanItemSchema(BaseModel):
    food_id: int = Field(..., description="ID of the food item")
    quantity: condecimal(gt=0) = Field(..., description="Quantity in given unit")
    unit: str = Field(..., description="Unit of the quantity (e.g., g, cup)")

class MealSchema(BaseModel):
    meal: str = Field(..., description="Meal name (e.g., Breakfast, Lunch)")
    items: List[PlanItemSchema]

class GeneratedPlanSchema(BaseModel):
    day: str = Field(..., description="Day in the plan")
    meals: List[MealSchema]
