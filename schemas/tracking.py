from pydantic import BaseModel
from datetime import date

class WaterBase(BaseModel):
    amount: int

class WaterCreate(WaterBase):
    pass

class WaterOut(WaterBase):
    date: date
    class Config:
        from_attributes = True


class StepBase(BaseModel):
    steps: int

class StepCreate(StepBase):
    pass

class StepOut(StepBase):
    date: date
    class Config:
        from_attributes = True
