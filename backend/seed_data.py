#!/usr/bin/env python3
"""
Seed script to populate the database with sample users and performance data.
Run this script to add test data for development.
"""

import sys
import os
from datetime import datetime, timedelta
from random import randint, uniform
import asyncio

# Add the app directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.models.user import User
from app.models.user_performance import UserPerformance
from app.core.security import get_password_hash


def seed_database():
    """Seed the database with sample users and performance data."""
    db = SessionLocal()
    
    try:
        print("Starting database seeding...")
        
        # Create tables if they don't exist
        Base.metadata.create_all(bind=engine)
        print("Tables created/verified.")
        
        # Clear existing data (optional - comment out if you want to keep existing data)
        print("Clearing existing data...")
        db.query(UserPerformance).delete()
        db.commit()
        db.query(User).delete()
        db.commit()
        
        # Sample users data
        users_data = [
            {
                "email": "admin@opzento.com",
                "full_name": "Admin User",
                "user_id": 1,
                "employee_id": "admin001",
                "is_admin": True,
                "is_active": True,
                "password": "admin123"
            },
            {
                "email": "john.doe@opzento.com",
                "full_name": "John Doe",
                "user_id": 1001,
                "employee_id": "EMP001",
                "is_admin": False,
                "is_active": True,
                "password": "password123"
            },
            {
                "email": "jane.smith@opzento.com",
                "full_name": "Jane Smith",
                "user_id": 1002,
                "employee_id": "EMP002",
                "is_admin": False,
                "is_active": True,
                "password": "password123"
            },
            {
                "email": "mike.johnson@opzento.com",
                "full_name": "Mike Johnson",
                "user_id": 1003,
                "employee_id": "EMP003",
                "is_admin": False,
                "is_active": True,
                "password": "password123"
            },
            {
                "email": "sarah.williams@opzento.com",
                "full_name": "Sarah Williams",
                "user_id": 1004,
                "employee_id": "EMP004",
                "is_admin": False,
                "is_active": True,
                "password": "password123"
            },
            {
                "email": "inactive.user@opzento.com",
                "full_name": "Inactive User",
                "user_id": 1005,
                "employee_id": "EMP005",
                "is_admin": False,
                "is_active": False,
                "password": "password123"
            }
        ]
        
        # Create users
        created_users = []
        print("Creating users...")
        for user_data in users_data:
            password = user_data.pop("password")
            hashed_password = get_password_hash(password)
            
            user = User(
                **user_data,
                password_hash=hashed_password
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            created_users.append(user)
            print(f"  Created user: {user.email} (ID: {user.id})")
        
        # Generate performance data for each user (last 30 days)
        print("\nGenerating performance data...")
        for user in created_users:
            if not user.is_active:
                continue
                
            # Generate 30 days of performance data
            for days_ago in range(30, 0, -1):
                date = datetime.utcnow() - timedelta(days=days_ago)
                
                # Generate random performance metrics
                performance_percentage = round(uniform(60, 95), 2)  # 60-95% performance
                idle_time_seconds = randint(300, 1800)  # 5-30 minutes idle
                focus_time_seconds = randint(14400, 28800)  # 4-8 hours focus
                
                performance = UserPerformance(
                    user_id=user.id,
                    performance_percentage=performance_percentage,
                    idle_time_seconds=idle_time_seconds,
                    focus_time_seconds=focus_time_seconds,
                    recorded_at=date
                )
                db.add(performance)
            
            db.commit()
            print(f"  Generated 30 days of performance data for {user.full_name}")
        
        print("\n✅ Database seeding completed successfully!")
        print(f"\nCreated {len(created_users)} users with performance data.")
        print("\nLogin credentials:")
        for user in created_users:
            status = "Active" if user.is_active else "Inactive"
            print(f"  - {user.email}: password123 ({status})")
        
    except Exception as e:
        print(f"\n❌ Error during seeding: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
