from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Annotated
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError

from db.session import get_db
from db.models.user import User
from schemas.user import UserCreate, UserLogin, UserResponse, UserOnboarding, AuthResponse
from auth.hashing import hash_password, verify_password
from auth.jwt_handler import create_access_token
from datetime import timedelta
from core.config import settings
from auth.jwt_handler import decode_access_token

router = APIRouter(
    prefix="/v1/auth",
    tags=["Authentication"]
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def get_current_user(token: Annotated[str, Depends(oauth2_scheme)], db: Session = Depends(get_db)):
    try:
        payload = decode_access_token(token)
        if not payload or "sub" not in payload:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token", headers={"WWW-Authenticate": "Bearer"})
    except InvalidTokenError:
        raise HTTPException( status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials", headers={"WWW-Authenticate": "Bearer"})
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found", headers={"WWW-Authenticate": "Bearer"})
    return user

@router.post("/register", response_model=AuthResponse)
def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    clean_email = user_data.email.strip().lower()
    # Check if email already exists (case-insensitive)
    existing_user = db.query(User).filter(func.lower(User.email) == clean_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    hashed_pw = hash_password(user_data.password)
    new_user = User(
        email=clean_email,
        password=hashed_pw,
        name=user_data.name,
        is_onboarded=False
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(new_user.id)},
        expires_delta=access_token_expires
    )

    return AuthResponse(
        message="Registration successful. Please complete onboarding.",
        user=new_user,
        access_token=access_token,
        token_type="bearer"
    )

@router.post("/onboarding", response_model=UserResponse)
def complete_onboarding(
    data: UserOnboarding,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    height_m = data.height_cm / 100
    bmi_value = round(data.weight_kg / (height_m ** 2), 2)

    current_user.age = data.age
    current_user.gender = data.gender
    current_user.height_cm = data.height_cm
    current_user.weight_kg = data.weight_kg
    current_user.bmi = bmi_value
    current_user.dietary_prefs = data.dietary_prefs
    current_user.goals = data.goals
    current_user.allergies = data.allergies
    current_user.budget = data.budget
    current_user.is_onboarded = True

    db.commit()
    db.refresh(current_user)

    return current_user


@router.post("/login", response_model=AuthResponse)
def login_user(user_data: UserLogin, db: Session = Depends(get_db)):
    clean_email = user_data.email.strip().lower()
    user = db.query(User).filter(func.lower(User.email) == clean_email).first()
    if not user or not verify_password(user_data.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=access_token_expires
    )

    return AuthResponse(
        message="Login successful",
        user=user,
        access_token=access_token,
        token_type="bearer"
    )
