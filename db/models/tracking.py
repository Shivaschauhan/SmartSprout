from sqlalchemy import Column, Integer, Date, ForeignKey
from sqlalchemy.orm import relationship
from datetime import date
from . import Base

class WaterLog(Base):
    __tablename__ = "water_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    date = Column(Date, default=date.today, index=True)
    amount = Column(Integer, default=0)  # in ml

    user = relationship("User", back_populates="water_logs")


class StepLog(Base):
    __tablename__ = "step_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    date = Column(Date, default=date.today, index=True)
    steps = Column(Integer, default=0)

    user = relationship("User", back_populates="step_logs")
