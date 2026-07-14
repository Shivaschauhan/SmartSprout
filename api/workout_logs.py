from fastapi import APIRouter, Request, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from db.session import get_db
from db.models.workout import Workout, WorkoutLog
from schemas.workout_logs import WorkoutLogCreate, WorkoutLogResponse, WorkoutSummaryResponse, DailyWorkoutSummary
from datetime import datetime, timedelta

router = APIRouter(
    prefix="/v1/workout-logs",
    tags=["Workout Logs"]
)

@router.post("/", response_model=WorkoutLogResponse)
def log_workout(request: Request, body: WorkoutLogCreate, db: Session = Depends(get_db)):
    user = request.state.user
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    workout = db.query(Workout).filter(Workout.id == body.workout_id).first()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")

    # Strength workouts (reps-based)
    if workout.unit == "reps":
        if body.sets is None or body.reps_per_set is None:
            raise HTTPException(status_code=400, detail="Sets and reps are required for reps-based workout")
        total_reps = body.sets * body.reps_per_set
        duration_minutes = None
        estimated_calories = float(workout.calories_per_unit) * total_reps

    # Time-based workouts (cardio, yoga, etc.)
    elif workout.unit == "minutes":
        if body.duration_minutes is None:
            raise HTTPException(status_code=400, detail="Duration is required for time-based workout")
        total_reps = None
        duration_minutes = body.duration_minutes
        estimated_calories = float(workout.calories_per_unit) * duration_minutes

    else:
        raise HTTPException(status_code=400, detail="Unsupported workout unit")

    workout_log = WorkoutLog(
        user_id=user.id,
        workout_id=workout.id,
        sets=body.sets if workout.unit == "reps" else None,
        reps_per_set=body.reps_per_set if workout.unit == "reps" else None,
        total_reps=total_reps,
        duration_minutes=duration_minutes,
        estimated_calories=estimated_calories,
    )
    db.add(workout_log)
    db.commit()
    db.refresh(workout_log)

    return WorkoutLogResponse(
        id=workout_log.id,
        workout_id=workout.id,
        workout_name=workout.name,
        unit=workout.unit,
        sets=workout_log.sets,
        reps_per_set=workout_log.reps_per_set,
        total_reps=total_reps,
        duration_minutes=duration_minutes,
        estimated_calories=estimated_calories,
        muscle_groups=workout.muscle_groups,
        logged_at=workout_log.logged_at,
    )

@router.get("/", response_model=list[WorkoutLogResponse])
def list_workouts(
    request: Request,
    date: str = Query(None, description="Filter logs for a specific date (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    user = request.state.user
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    query = (
        db.query(WorkoutLog, Workout)
        .join(Workout, Workout.id == WorkoutLog.workout_id)
        .filter(WorkoutLog.user_id == user.id)
    )

    # ✅ If date filter provided, restrict logs to that day
    if date:
        try:
            target_date = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

        day_start = datetime.combine(target_date, datetime.min.time())
        day_end = day_start + timedelta(days=1)

        query = query.filter(
            WorkoutLog.logged_at >= day_start,
            WorkoutLog.logged_at < day_end
        )

    logs = query.order_by(WorkoutLog.logged_at.desc()).all()

    results = []
    for log, workout in logs:
        results.append(
            WorkoutLogResponse(
                id=log.id,
                workout_id=workout.id,
                workout_name=workout.name,
                unit=workout.unit,
                sets=log.sets,
                reps_per_set=log.reps_per_set,
                total_reps=log.total_reps,
                duration_minutes=log.duration_minutes,
                estimated_calories=float(log.estimated_calories),
                muscle_groups=workout.muscle_groups,
                logged_at=log.logged_at,
            )
        )

    return results

@router.get("/summary", response_model=WorkoutSummaryResponse)
def get_workout_summary(
    request: Request,
    days: int = 7,
    db: Session = Depends(get_db)
):
    user = request.state.user
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    today = datetime.utcnow().date()
    since_date = today - timedelta(days=days - 1)

    daily_logs = (
        db.query(
            func.date(WorkoutLog.logged_at).label("date"),
            func.count(WorkoutLog.id).label("workouts"),
            func.sum(WorkoutLog.estimated_calories).label("calories")
        )
        .filter(
            WorkoutLog.user_id == user.id,
            WorkoutLog.logged_at >= since_date
        )
        .group_by(func.date(WorkoutLog.logged_at))
        .order_by(func.date(WorkoutLog.logged_at).desc())
        .all()
    )

    daily_summary = [
        DailyWorkoutSummary(
            date=row.date,
            workouts=row.workouts,
            calories=float(row.calories or 0)
        )
        for row in daily_logs
    ]

    return WorkoutSummaryResponse(
        days=days,
        range_start=since_date,
        range_end=today,
        total_workouts=sum(d.workouts for d in daily_summary),
        total_calories=sum(d.calories for d in daily_summary),
        daily=daily_summary
    )


@router.delete("/{log_id}")
def delete_workout_log(log_id: int, request: Request, db: Session = Depends(get_db)):
    user = request.state.user
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    workout_log = db.query(WorkoutLog).filter(WorkoutLog.id == log_id).first()
    if not workout_log:
        raise HTTPException(status_code=404, detail="Workout log not found")

    if workout_log.user_id != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    db.delete(workout_log)
    db.commit()
    return {"message": "Workout log deleted successfully"}

