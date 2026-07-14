from pydantic import BaseModel
from typing import List

class WorkoutResponse(BaseModel):
    id: int
    name: str
    unit: str
    calories_per_unit: float
    muscle_groups: List[str]
    difficulty: str

    class Config:
        from_attributes = True


class WorkoutListResponse(BaseModel):
    total: int
    limit: int
    offset: int
    items: List[WorkoutResponse]
