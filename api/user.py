from fastapi import APIRouter, Request, Depends, HTTPException
from db.models.user import User
from schemas.user import UserResponse, UserGoalsResponse, UserGoalsUpdate, UserUpdateMe
from sqlalchemy.orm import Session
from db.session import get_db

router = APIRouter(prefix="/v1/user", tags=["User"])

@router.get("/me", response_model=UserResponse)
def get_me(request: Request, db: Session = Depends(get_db)):
    current_user: User = request.state.user
    return current_user

@router.put("/me", response_model=UserResponse)
def update_me(
    request: Request,
    body: UserUpdateMe,
    db: Session = Depends(get_db),
):
    user = request.state.user
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    db_user = db.query(User).filter(User.id == user.id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    if body.name is not None:
        db_user.name = body.name
    if body.age is not None:
        db_user.age = body.age
    if body.height_cm is not None:
        db_user.height_cm = body.height_cm
    if body.weight_kg is not None:
        db_user.weight_kg = body.weight_kg
    if body.dietary_prefs is not None:
        db_user.dietary_prefs = body.dietary_prefs
    if body.allergies is not None:
        db_user.allergies = body.allergies
    if body.budget is not None:
        db_user.budget = body.budget
    if body.goals is not None:
        db_user.goals = body.goals
    if body.target_weight is not None:
        db_user.target_weight = body.target_weight

    # Auto-calculate BMI if height and weight are available
    if db_user.height_cm and db_user.weight_kg:
        height_m = float(db_user.height_cm) / 100
        if height_m > 0:
            db_user.bmi = round(float(db_user.weight_kg) / (height_m**2), 2)

    db.commit()
    db.refresh(db_user)

    return db_user

@router.post("/goals", response_model=UserGoalsResponse)
def update_goals(
    request: Request,
    body: UserGoalsUpdate,
    db: Session = Depends(get_db),
):
    user = request.state.user
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    db_user = db.query(User).filter(User.id == user.id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    # update goals + target
    db_user.goals = body.goals
    db_user.target_weight = body.target_weight

    db.commit()
    db.refresh(db_user)

    return UserGoalsResponse(
        id=db_user.id,
        goals=db_user.goals,
        target_weight=db_user.target_weight,
        current_weight=float(db_user.weight_kg) if db_user.weight_kg else None,
        bmi=float(db_user.bmi) if db_user.bmi else None,
    )


@router.get("/goals", response_model=UserGoalsResponse)
def get_goals(request: Request, db: Session = Depends(get_db)):
    user = request.state.user
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    db_user = db.query(User).filter(User.id == user.id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    return UserGoalsResponse(
        id=db_user.id,
        goals=db_user.goals,
        target_weight=db_user.target_weight,
        current_weight=float(db_user.weight_kg) if db_user.weight_kg else None,
        bmi=float(db_user.bmi) if db_user.bmi else None,
    )