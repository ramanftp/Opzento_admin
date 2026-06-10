from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List, Optional
from ..core.database import get_db
from ..models.user import User
from ..models.user_performance import UserPerformance
from ..schemas.user import UserResponse
from ..routes.auth import get_current_admin
from ..services.cleanup import delete_user_photos

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/users", response_model=List[UserResponse])
async def get_users(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    query = db.query(User)
    
   
    
    users = query.all()
    
    result = []
    for user in users:
        result.append(UserResponse(
            id=str(user.id),
            email=user.email,
            full_name=user.full_name,
            user_id=user.user_id or 1,
            employee_id=user.employee_id,
            is_admin=user.is_admin,
            is_active=user.is_active,
            created_at=user.created_at,
            updated_at=user.updated_at
        ))
    
    return result


@router.get("/users/{user_id}")
async def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        user_id=user.user_id or 1,
        employee_id=user.employee_id,
        is_admin=user.is_admin,
        is_active=user.is_active,
        created_at=user.created_at,
        updated_at=user.updated_at
    )

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    

    
    # Prevent self-deletion
    if user.id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete yourself"
        )

    try:
        delete_user_photos(user)
    except Exception:
        # Continue deleting the user even if photo cleanup fails.
        pass

    db.delete(user)
    db.commit()
    
    return {"message": "User deleted successfully"}


@router.get("/dashboard")
async def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    # Get total counts
    total_users = db.query(User).count()
    total_admins = db.query(User).filter(User.is_admin == True).count()
    total_regular_users = db.query(User).filter(User.is_admin == False).count()

    # Get performance records from last 7 days
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    total_performances = db.query(UserPerformance).filter(
        UserPerformance.created_at >= seven_days_ago
    ).count()
    
    # Get recent activity (last 10 performance records)
    recent_performances = db.query(UserPerformance).order_by(
        UserPerformance.created_at.desc()
    ).limit(10).all()
    
    recent_activity = []
    for performance in recent_performances:
        user = db.query(User).filter(User.id == performance.user_id).first()
        recent_activity.append({
            "id": str(performance.id),
            "user_name": user.full_name if user else "Unknown",
            "performance_percentage": performance.performance_percentage,
            "recorded_at": performance.recorded_at,
            "created_at": performance.created_at
        })
    
    return {
        "total_users": total_users,
        "total_admins": total_admins,
        "total_regular_users": total_regular_users,
        "total_performances": total_performances,
        "recent_activity": recent_activity
    }


@router.get("/user-performances")
async def get_user_performances_7_days(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Get user-wise performance data for the last 7 days"""
    
    # Get performances from last 7 days
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    performances = db.query(UserPerformance).filter(
        UserPerformance.created_at >= seven_days_ago
    ).all()
    
    # Group by user and date
    user_performances = {}
    
    for performance in performances:
        user = db.query(User).filter(User.id == performance.user_id).first()
        if not user:
            continue
            
        # Use employee_id or fallback to user_id
        user_key = user.employee_id or str(user.id)
        user_name = user.full_name
        
        # Extract date from performance recorded_at
        performance_date = performance.recorded_at.date()
        date_str = performance_date.strftime("%Y-%m-%d")
        
        # Initialize user entry if not exists
        if user_key not in user_performances:
            user_performances[user_key] = {
                "user_name": user_name,
                "employee_id": user.employee_id,
                "dates": {}
            }
        
        # Initialize date if not exists
        if date_str not in user_performances[user_key]["dates"]:
            user_performances[user_key]["dates"][date_str] = {
                "count": 0,
                "avg_performance": 0,
                "total_idle_time": 0,
                "total_focus_time": 0
            }
        
        # Update performance data for this date
        user_performances[user_key]["dates"][date_str]["count"] += 1
        user_performances[user_key]["dates"][date_str]["avg_performance"] += performance.performance_percentage
        user_performances[user_key]["dates"][date_str]["total_idle_time"] += performance.idle_time_seconds
        user_performances[user_key]["dates"][date_str]["total_focus_time"] += performance.focus_time_seconds
    
    # Calculate averages
    for user_key in user_performances:
        for date_str in user_performances[user_key]["dates"]:
            data = user_performances[user_key]["dates"][date_str]
            if data["count"] > 0:
                data["avg_performance"] = data["avg_performance"] / data["count"]
    
    return {
        "users": user_performances,
        "total_users": len(user_performances),
        "date_range": "Last 7 days",
        "generated_at": datetime.utcnow().isoformat()
    }


@router.get("/users/{user_id}/performance")
async def get_user_performance(
    user_id: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Get performance data for a specific user for the last 7 days"""
    
    # Get the user
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get performances from last 7 days for this user
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    performances = db.query(UserPerformance).filter(
        UserPerformance.user_id == user.user_id,
        UserPerformance.created_at >= seven_days_ago
    ).order_by(UserPerformance.recorded_at.asc()).all()
    
    # Group by date and calculate daily averages
    daily_data = {}
    
    for performance in performances:
        performance_date = performance.recorded_at.date()
        date_str = performance_date.strftime("%Y-%m-%d")
        
        if date_str not in daily_data:
            daily_data[date_str] = {
                "date": date_str,
                "avg_performance": 0,
                "total_idle_time": 0,
                "total_focus_time": 0,
                "count": 0
            }
        
        daily_data[date_str]["avg_performance"] += performance.performance_percentage
        daily_data[date_str]["total_idle_time"] += performance.idle_time_seconds
        daily_data[date_str]["total_focus_time"] += performance.focus_time_seconds
        daily_data[date_str]["count"] += 1
    
    # Calculate averages and convert to sorted list
    result = []
    for date_str in sorted(daily_data.keys()):
        data = daily_data[date_str]
        if data["count"] > 0:
            result.append({
                "date": date_str,
                "avg_performance": round(data["avg_performance"] / data["count"], 2),
                "total_idle_time": data["total_idle_time"],
                "total_focus_time": data["total_focus_time"],
                "count": data["count"]
            })
    
    return {
        "user_id": str(user.user_id),
        "user_name": user.full_name,
        "employee_id": user.employee_id,
        "performance_data": result,
        "date_range": "Last 7 days",
        "generated_at": datetime.utcnow().isoformat()
    }


