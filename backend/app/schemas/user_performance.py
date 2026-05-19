from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class UserPerformanceBase(BaseModel):
    user_id: int
    performance_percentage: float
    idle_time_seconds: int
    focus_time_seconds: int
    recorded_at: datetime

    class Config:
        from_attributes = True


class UserPerformanceCreate(BaseModel):
    user_id: int
    performance_percentage: float
    idle_time_seconds: int
    focus_time_seconds: int
    recorded_at: datetime

    class Config:
        from_attributes = True


class UserPerformanceResponse(BaseModel):
    id: str
    user_id: int
    performance_percentage: float
    idle_time_seconds: int
    focus_time_seconds: int
    recorded_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True
