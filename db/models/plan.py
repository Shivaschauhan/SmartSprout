from sqlalchemy import Column, Integer, String, Text, JSON, ForeignKey, TIMESTAMP, Boolean, DECIMAL
from sqlalchemy.orm import relationship
from . import Base

class Plan(Base):
    __tablename__ = "plans"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(Text, nullable=False)
    description = Column(Text)
    workout_plan = Column(JSON, nullable=True)
    avoidance_list = Column(JSON, nullable=True)
    budget_tips = Column(JSON, nullable=True)

    items = relationship(
        "PlanItem",
        back_populates="plan",
        cascade="all, delete-orphan"
    )

class PlanItem(Base):
    __tablename__ = "plan_items"
    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(Integer, ForeignKey("plans.id"))
    food_id = Column(Integer, ForeignKey("food_items.id"))
    quantity = Column(DECIMAL(8, 2), nullable=False)
    unit = Column(Text, nullable=False)
    meal_name = Column(Text, nullable=False)
    day = Column(String, nullable=True) 

    plan = relationship("Plan", back_populates="items")

class Reminder(Base):
    __tablename__ = "reminders"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    reminder_type = Column(Text)
    message = Column(Text)
    scheduled_at = Column(TIMESTAMP(timezone=True))
    sent = Column(Boolean, default=False)
