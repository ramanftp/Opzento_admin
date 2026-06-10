from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    is_active: bool = True
    is_admin: bool = False

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    user_id: int
    password: Optional[str] = None
    employee_id: str
    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    email: EmailStr
    password: str

    class Config:
        from_attributes = True


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    employee_id: Optional[str] = None
    user_id: int
    is_admin: bool = False
    screenshot_urls: Optional[list[str]] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None
    employee_id: Optional[str] = None
    screenshot_urls: Optional[list[str]] = None

    class Config:
        from_attributes = True
