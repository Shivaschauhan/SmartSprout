from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from datetime import datetime, date
from schemas.tracking import WaterOut, WaterCreate, StepCreate, StepOut
from db.session import get_db
from db.models.tracking import WaterLog, StepLog

router = APIRouter(prefix="/v1/tracking", tags=["Tracking"])

# --- Water ---
@router.get("/water/today", response_model=WaterOut)
def get_today_water(request: Request, db: Session = Depends(get_db)):
    current_user = request.state.user
    log = (
        db.query(WaterLog)
        .filter(WaterLog.user_id == current_user.id, WaterLog.date == datetime.utcnow().date())
        .first()
    )
    if not log:
        log = WaterLog(user_id=current_user.id, date=datetime.utcnow().date(), amount=0)
        db.add(log)
        db.commit()
        db.refresh(log)
    return log

@router.post("/water", response_model=WaterOut)
def add_water(request: Request, payload: WaterCreate, db: Session = Depends(get_db)):
    current_user = request.state.user
    log = (
        db.query(WaterLog)
        .filter(WaterLog.user_id == current_user.id, WaterLog.date == datetime.utcnow().date())
        .first()
    )
    if not log:
        log = WaterLog(user_id=current_user.id, date=datetime.utcnow().date(), amount=0)
        db.add(log)
    log.amount += payload.amount
    db.commit()
    db.refresh(log)
    return log


# --- Steps ---
@router.get("/steps/today", response_model=StepOut)
def get_today_steps(request: Request, db: Session = Depends(get_db)):
    current_user = request.state.user
    log = (
        db.query(StepLog)
        .filter(StepLog.user_id == current_user.id, StepLog.date == datetime.utcnow().date())
        .first()
    )
    if not log:
        log = StepLog(user_id=current_user.id, date=datetime.utcnow().date(), steps=0)
        db.add(log)
        db.commit()
        db.refresh(log)
    return log

@router.post("/steps", response_model=StepOut)
def add_steps(request: Request, payload: StepCreate, db: Session = Depends(get_db)):
    current_user = request.state.user
    log = (
        db.query(StepLog)
        .filter(StepLog.user_id == current_user.id, StepLog.date == datetime.utcnow().date())
        .first()
    )
    if not log:
        log = StepLog(user_id=current_user.id, date=datetime.utcnow().date(), steps=0)
        db.add(log)
    log.steps += payload.steps
    db.commit()
    db.refresh(log)
    return log


@router.delete("/water", response_model=WaterOut)
def reset_water(request: Request, db: Session = Depends(get_db)):
    current_user = request.state.user
    log = (
        db.query(WaterLog)
        .filter(WaterLog.user_id == current_user.id, WaterLog.date == datetime.utcnow().date())
        .first()
    )
    if log:
        log.amount = 0
        db.commit()
        db.refresh(log)
    else:
        log = WaterLog(user_id=current_user.id, date=datetime.utcnow().date(), amount=0)
        db.add(log)
        db.commit()
        db.refresh(log)
    return log


@router.delete("/steps", response_model=StepOut)
def reset_steps(request: Request, db: Session = Depends(get_db)):
    current_user = request.state.user
    log = (
        db.query(StepLog)
        .filter(StepLog.user_id == current_user.id, StepLog.date == datetime.utcnow().date())
        .first()
    )
    if log:
        log.steps = 0
        db.commit()
        db.refresh(log)
    else:
        log = StepLog(user_id=current_user.id, date=datetime.utcnow().date(), steps=0)
        db.add(log)
        db.commit()
        db.refresh(log)
    return log
