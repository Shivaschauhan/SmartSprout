from fastapi import APIRouter, Query, Depends
from sqlalchemy.orm import Session
from sqlalchemy import asc, desc
from db.session import get_db
from db.models.workout import Workout
from typing import Optional
from schemas.workout import WorkoutListResponse

router = APIRouter(
    prefix="/v1/workouts",
    tags=["Workouts"]
)

@router.get("/", response_model=WorkoutListResponse)
def list_workouts(
    db: Session = Depends(get_db),
    search: Optional[str] = Query(None, description="Search workouts by name"),
    muscle: Optional[str] = Query(None, description="Filter by muscle group"),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty"),
    sort_by: str = Query("name", description="Sort by field (name, calories_per_unit, difficulty)"),
    order: str = Query("asc", description="asc or desc"),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    query = db.query(Workout)

    if search:
        query = query.filter(Workout.name.ilike(f"%{search}%"))

    if muscle:
        from sqlalchemy import Text as SQLText
        query = query.filter(Workout.muscle_groups.cast(SQLText).like(f"%{muscle}%"))

    if difficulty:
        query = query.filter(Workout.difficulty.ilike(difficulty))

    sort_column = getattr(Workout, sort_by, None)
    if sort_column is not None:
        query = query.order_by(asc(sort_column) if order == "asc" else desc(sort_column))

    total = query.count()

    workouts = query.offset(offset).limit(limit).all()

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": workouts
    }
