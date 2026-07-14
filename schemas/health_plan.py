from typing import List
from pydantic import BaseModel, Field
from schemas.plan import MealSchema

class WorkoutExerciseSchema(BaseModel):
    name: str = Field(..., description="Name of the exercise")
    sets: int = Field(..., description="Number of sets")
    reps: str = Field(..., description="Number of reps or duration (e.g. 10-12 reps, 30 mins)")

class WorkoutPlanSchema(BaseModel):
    focus_area: str = Field(..., description="Target muscle group or focus (e.g. Upper Body, Cardio)")
    exercises: List[WorkoutExerciseSchema]

class CompleteHealthPlanSchema(BaseModel):
    day: str = Field(..., description="Day in the plan")
    meal_plan: List[MealSchema] = Field(..., description="List of meals for the day")
    workout_plan: WorkoutPlanSchema = Field(..., description="Workout routine for the day")
    avoidance_list: List[str] = Field(..., description="Specific foods or exercises to avoid based on profile/allergies")
    budget_tips: List[str] = Field(..., description="Tips on how to achieve this health plan on the user's budget")
