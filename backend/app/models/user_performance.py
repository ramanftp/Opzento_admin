import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Float, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from ..core.database import Base


class UserPerformance(Base):
    __tablename__ = "user_performances"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    performance_percentage = Column(Float, nullable=False)
    idle_time_seconds = Column(Integer, nullable=False)
    focus_time_seconds = Column(Integer, nullable=False)
    recorded_at = Column(DateTime, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="performances")

    def __repr__(self):
        return f"<UserPerformance(user_id={self.user_id}, performance_percentage={self.performance_percentage})>"
