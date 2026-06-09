import uuid
from sqlalchemy import Column, String, Boolean, DateTime, Enum, Integer, JSON, ForeignKey

from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from enum import Enum as PyEnum
from ..core.database import Base





class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True,unique=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    user_id = Column(Integer, nullable=False)
    password_hash = Column(String(255), nullable=False)
    employee_id = Column(String(50), nullable=True, index=True)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    is_admin = Column(Boolean, default=False, index=True)
    # Relationships
    performances = relationship("UserPerformance", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        
        return f"<User(email={self.email}, is_admin={self.is_admin})>"


class Keys(Base):
    __tablename__ = "keys"

    id = Column(Integer, primary_key=True, autoincrement=True,unique=True, index=True)
    key = Column(String(255), unique=True, index=True, nullable=False)

    def __repr__(self):
        
        return f"<Keys(key={self.key})>"
