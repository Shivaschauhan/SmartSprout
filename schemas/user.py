from pydantic import BaseModel, EmailStr
from enum import Enum
from typing import Optional, List, Literal

class DietaryPreference(str, Enum):
    veg = "veg"
    non_veg = "non-veg"
    vegan = "vegan"

class GoalType(str, Enum):
    weight_loss = "weight loss"
    weight_gain = "weight gain"
    maintain_healthy = "maintain healthy"

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserOnboarding(BaseModel):
    age: int
    gender: Literal["male", "female", "other"]
    height_cm: float
    weight_kg: float
    dietary_prefs: Optional[List[DietaryPreference]] = None
    goals: Optional[GoalType] = None
    allergies: Optional[str] = None
    budget: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class AuthUser(BaseModel):
    id: int
    email: EmailStr
    name: str
    is_onboarded: bool
    class Config:
        from_attributes = True

class AuthResponse(BaseModel):
    message: str
    user: AuthUser
    access_token: str
    token_type: str

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    name: str
    age: int | None
    gender: str | None
    height_cm: float | None
    weight_kg: float | None
    bmi: float | None
    dietary_prefs: Optional[List[DietaryPreference]]
    goals: Optional[GoalType]
    target_weight: Optional[float] = None
    is_onboarded: bool
    allergies: Optional[str] = None
    budget: Optional[str] = None

    class Config:
        from_attributes = True

class UserGoalsUpdate(BaseModel):
    goals: GoalType
    target_weight: Optional[float] = None

class UserGoalsResponse(BaseModel):
    id: int
    goals: Optional[GoalType]
    target_weight: Optional[float]
    current_weight: Optional[float]
    bmi: Optional[float]

    class Config:
        from_attributes = True

class UserUpdateMe(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    dietary_prefs: Optional[List[str]] = None
    allergies: Optional[str] = None
    budget: Optional[str] = None
    goals: Optional[str] = None
    target_weight: Optional[float] = None