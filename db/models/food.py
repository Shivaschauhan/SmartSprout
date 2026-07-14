from sqlalchemy import Column, Integer, Text, DECIMAL, JSON, ForeignKey, TIMESTAMP, Boolean, String, Index
from sqlalchemy.sql import func
from . import Base


class FoodItem(Base):
    __tablename__ = "food_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(Text, index=True)
    calories = Column(DECIMAL(8, 2))  # per reference amount
    protein = Column(DECIMAL(8, 2))
    carbs = Column(DECIMAL(8, 2))
    fats = Column(DECIMAL(8, 2))
    vitamins = Column(JSON)
    reference_amount = Column(DECIMAL(6, 2), nullable=False)  # e.g., 100.00
    reference_unit = Column(Text, nullable=False)             # e.g., g, piece, ml
    unit_conversions = Column(JSON)                           # {"piece": 40, "cup": 150}

    # Extended catalog fields
    category = Column(String(32), default="food", index=True)  # food|drink|snack|condiment|supplement|other
    is_drink = Column(Boolean, default=False, index=True)
    source = Column(String(32), default="system")  # system|user|ai_vision|ai_estimate
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    brand = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    serving_label = Column(Text, nullable=True)

    __table_args__ = (
        Index("ix_food_items_name_category", "name", "category"),
    )


class FoodLog(Base):
    __tablename__ = "food_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    food_id = Column(Integer, ForeignKey("food_items.id"))
    quantity = Column(DECIMAL(6, 2), nullable=False)
    unit = Column(Text, nullable=False)
    meal_name = Column(Text, nullable=True)  # Breakfast/Lunch/Dinner/Snack optional
    logged_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_food_logs_user_logged", "user_id", "logged_at"),
    )
