from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional
import os
import uuid
from io import BytesIO
from PIL import Image

from ..schemas.user import UserCreate, UserResponse, UserUpdate
from ..schemas.user_performance import UserPerformanceCreate, UserPerformanceResponse
from ..core.database import get_db
from ..core.config import settings
from ..models.user import User
from ..models.user_performance import UserPerformance
from ..routes.auth import get_current_admin, get_current_user

router = APIRouter(prefix="/api/data", tags=["data"])


@router.post("/performance", response_model=UserPerformanceResponse)
async def store_user_performance(
    performance_data: UserPerformanceCreate,
    db: Session = Depends(get_db)
):
    """Store user performance data with percentage, idle time, and focus time"""
    # Verify user exists
    user = db.query(User).filter(User.user_id == performance_data.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Create performance record
    db_performance = UserPerformance(
        user_id=user.id,
        performance_percentage=performance_data.performance_percentage,
        idle_time_seconds=performance_data.idle_time_seconds,
        focus_time_seconds=performance_data.focus_time_seconds,
        recorded_at=performance_data.recorded_at
    )
    
    db.add(db_performance)
    db.commit()
    db.refresh(db_performance)
    
    return UserPerformanceResponse(
        id=str(db_performance.id),
        user_id=db_performance.user_id,
        performance_percentage=db_performance.performance_percentage,
        idle_time_seconds=db_performance.idle_time_seconds,
        focus_time_seconds=db_performance.focus_time_seconds,
        recorded_at=db_performance.recorded_at,
        created_at=db_performance.created_at
    )

@router.get("/performance/average/{user_id}")
async def get_average_performance(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Get average performance data for all users"""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    performances = db.query(UserPerformance).filter(UserPerformance.user_id == user.id).all()
    day_wise = {}
    for performance in performances:
        date = performance.recorded_at.date()
        if date not in day_wise:
            day_wise[date] = []
        day_wise[date].append(performance.performance_percentage)
    
    last_7_days = {}
    for date, performances in day_wise.items():
        last_7_days[date] = sum(performances) / len(performances)
    
    return last_7_days
    

@router.get("/performance/user/{user_id}")
async def get_user_performance(
    user_id: int,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get performance data for a specific user, optionally filtered by date range"""
    # Verify user exists
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    query = db.query(UserPerformance).filter(UserPerformance.user_id == user.id)
    
    # Apply date filters if provided
    if start_date:
        try:
            start_datetime = datetime.fromisoformat(start_date)
            query = query.filter(UserPerformance.recorded_at >= start_datetime)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid start_date format. Use ISO 8601 format."
            )
    
    if end_date:
        try:
            end_datetime = datetime.fromisoformat(end_date)
            query = query.filter(UserPerformance.recorded_at <= end_datetime)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid end_date format. Use ISO 8601 format."
            )
    
    performances = query.order_by(UserPerformance.recorded_at.desc()).all()
    data_user_id = user.user_id
    
    return {
        "user_id": user.id,
        "user_name": user.full_name,
        "employee_id": user.employee_id,
        "total_records": len(performances),
        "performances": [
            {
                "id": str(p.id),
                "performance_percentage": p.performance_percentage,
                "idle_time_seconds": p.idle_time_seconds,
                "focus_time_seconds": p.focus_time_seconds,
                "recorded_at": p.recorded_at,
                "created_at": p.created_at
            }
            for p in performances
        ]
    }


@router.post("/users", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Create a new user (admin only)"""
    from ..services.auth import create_user
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if not existing_user:
        # raise HTTPException(
        #     status_code=status.HTTP_400_BAD_REQUEST,
        #     detail="Email already registered"
        # )
    
    # Create user
        new_user = create_user(db, user_data)
    else:
        new_user = existing_user    
    
    return UserResponse(
        id=str(new_user.id),
        email=new_user.email,
        full_name=new_user.full_name,
        is_admin=new_user.is_admin,
        user_id=new_user.user_id or 1,
        is_active=new_user.is_active,
        created_at=new_user.created_at,
        updated_at=new_user.updated_at
    )


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    """Update user information"""
    from ..services.auth import update_user
    
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update user with provided data
    update_data = user_update.dict(exclude_unset=True)
    updated_user = update_user(db, user_id, update_data)
    
    return UserResponse(
        id=str(updated_user.id),
        email=updated_user.email,
        full_name=updated_user.full_name,
        is_admin=updated_user.is_admin,
        user_id=updated_user.user_id,
        is_active=updated_user.is_active,
        created_at=updated_user.created_at,
        updated_at=updated_user.updated_at
    )


@router.post("/upload-photo")
async def upload_photo(
    file: UploadFile = File(...),
    user_id: str = Form(None),
    email: Optional[str] = Form(None),
    name: Optional[str] = Form(None),
    employee_id: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Upload a photo for current user"""

    if not user_id and not employee_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either user_id or employee_id must be provided"
        )
    # Validate file type
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )
    
    # Validate file extension
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp']
    file_extension = os.path.splitext(file.filename)[1].lower()
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file extension. Allowed: {', '.join(allowed_extensions)}"
        )
    
    # Validate file size (max 5MB)
    max_size = 5 * 1024 * 1024  # 5MB
    file_content = await file.read()
    if len(file_content) > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size must be less than 5MB"
        )
    
    try:
        if user_id != None:
            user = db.query(User).filter(User.user_id == user_id).first()
        elif email != None:
            user = db.query(User).filter(User.email == email).first()
        elif employee_id != None:
            user = db.query(User).filter(User.employee_id == employee_id).first()

        else:
            raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either user_id or employee_id must be provided"
        )  
        if not user:
            newuser = UserCreate(
                email=email,
                full_name=name,
                user_id=user_id,
                employee_id=employee_id,
                password="123456",
            )
            from ..services.auth import create_user as create_user_service
            user = create_user_service(db, newuser)
        # Create employee-wise and day-wise folder structure
        date_str = datetime.utcnow().strftime("%Y-%m-%d")
        employee_code = (user.employee_id or str(user.id)).replace("/", "_")
        employee_folder = os.path.join(settings.UPLOAD_DIR, "photos", employee_code)
        date_folder = os.path.join(employee_folder, date_str)
        
        try:
            # Ensure directories exist with proper permissions
            try:
                os.makedirs(date_folder, exist_ok=True, mode=0o755)
            except OSError as e:
                if e.errno == 13:  # Permission denied
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail=f"Permission denied creating directory: {date_folder}. Check folder permissions."
                    )
                else:
                    raise e
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create directory: {str(e)}"
            )
        
        # Generate unique filename
        file_extension = os.path.splitext(file.filename)[1]
        if not file_extension:
            file_extension = '.jpg'  # Default extension
        
        unique_filename = f"{uuid.uuid4().hex}{file_extension}"
        file_path = os.path.join(date_folder, unique_filename)
        
        # Process and save image
        image = Image.open(BytesIO(file_content))
        
        # Convert to RGB if necessary (for JPEG compatibility)
        if image.mode in ("RGBA", "P"):
            image = image.convert("RGB")
        
        # Save optimized image
        image.save(file_path, "JPEG", quality=85, optimize=True)
        
        # Generate accessible URL
        photo_url = f"/uploads/photos/{employee_code}/{date_str}/{unique_filename}"
        
        return {
            "message": "Photo uploaded successfully",
            "photo_url": photo_url,
            "filename": unique_filename,
            "file_size": len(file_content),
            "uploaded_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        # Clean up file if it was created
        if 'file_path' in locals() and os.path.exists(file_path):
            os.remove(file_path)
        
       
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload photo: {str(e)}"
        )


@router.get("/photos/employee/{employee_id}")
async def get_employee_photos(
    employee_id: str,
    date: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Get photos for a specific employee, optionally filtered by date"""
    # Find user by employee_id or user_id
    user = db.query(User).filter(
        (User.employee_id == employee_id) | (User.id == employee_id)
    ).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    # Build base directory path
    base_photo_dir = os.path.join(settings.UPLOAD_DIR, "photos", user.employee_id.replace("/", "_") or str(user.id))
    
    if not os.path.exists(base_photo_dir):
        return {
            "user_id": str(user.id),
            "employee_id": user.employee_id or str(user.id),
            "user_name": user.full_name,
            "date_filter": date,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": 0,
                "pages": 0
            },
            "photos": []
        }
    
    photos = []
    total_count = 0
    
    # If date filter is specified, only look in that date folder
    if date:
        date_dir = os.path.join(base_photo_dir, date)
        if os.path.exists(date_dir):
            photo_files = [f for f in os.listdir(date_dir) 
                         if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
            total_count = len(photo_files)
            
            # Sort by modification time (newest first)
            photo_files.sort(key=lambda f: os.path.getmtime(os.path.join(date_dir, f)), reverse=True)
            
            # Apply pagination
            start_idx = (page - 1) * limit
            end_idx = start_idx + limit
            paginated_files = photo_files[start_idx:end_idx]
            
            for filename in paginated_files:
                file_path = os.path.join(date_dir, filename)
                photo_url = f"/uploads/photos/{user.employee_id.replace('/', '_') or str(user.id)}/{date}/{filename}"
                photos.append({
                    "filename": filename,
                    "photo_url": photo_url,
                    "date": date,
                    "size": os.path.getsize(file_path),
                    "modified_at": datetime.fromtimestamp(os.path.getmtime(file_path))
                })
    else:
        # Get all photos from all date folders
        for date_str in sorted(os.listdir(base_photo_dir), reverse=True):
            date_dir = os.path.join(base_photo_dir, date_str)
            if os.path.isdir(date_dir):
                photo_files = [f for f in os.listdir(date_dir) 
                             if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
                total_count += len(photo_files)
                
                # Sort by modification time
                photo_files.sort(key=lambda f: os.path.getmtime(os.path.join(date_dir, f)), reverse=True)
                
                for filename in photo_files:
                    file_path = os.path.join(date_dir, filename)
                    photo_url = f"/uploads/photos/{user.employee_id.replace('/', '_') or str(user.id)}/{date_str}/{filename}"
                    photos.append({
                        "filename": filename,
                        "photo_url": photo_url,
                        "date": date_str,
                        "size": os.path.getsize(file_path),
                        "modified_at": datetime.fromtimestamp(os.path.getmtime(file_path))
                    })
        
        # Sort all photos by modified_at
        photos.sort(key=lambda x: x['modified_at'], reverse=True)
        
        # Apply pagination
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        photos = photos[start_idx:end_idx]
    
    return {
        "user_id": str(user.id),
        "employee_id": user.employee_id or str(user.id),
        "user_name": user.full_name,
        "date_filter": date,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total_count,
            "pages": (total_count + limit - 1) // limit
        },
        "photos": photos
    }


@router.get("/photos/employee/{employee_id}/day-wise")
async def get_employee_photos_day_wise(
    employee_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Get all photos for an employee grouped by day"""
    employee_id = employee_id.replace("_", "/")
    try:
        # Get base URL for constructing absolute URLs
        base_url = f"{request.url.scheme}://{request.url.netloc}"
        
        # Find user by employee_id or user_id
        user = db.query(User).filter(User.employee_id == employee_id).first()
        
        # If not found by employee_id, try by user_id (convert to int if possible)
        if not user:
            try:
                user_id_int = int(employee_id)
                user = db.query(User).filter(User.id == user_id_int).first()
            except ValueError:
                pass
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found"
            )
        
        emp_id = (user.employee_id or str(user.id)).replace("/", "_")
        photo_base = os.path.join(settings.UPLOAD_DIR, "photos", emp_id)
        
        if not os.path.exists(photo_base):
            return {
                "user_id": str(user.id),
                "employee_id": emp_id,
                "user_name": user.full_name,
                "photos_by_day": {},
                "total_days": 0,
                "total_photos": 0
            }
        
        photos_by_day = {}
        
        # Iterate through date folders
        for date_str in sorted(os.listdir(photo_base), reverse=True):
            date_dir = os.path.join(photo_base, date_str)
            if os.path.isdir(date_dir):
                try:
                    photo_files = [f for f in os.listdir(date_dir) 
                                 if f.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.bmp'))]
                    
                    if photo_files:
                        # Sort by modification time (newest first)
                        photo_files.sort(key=lambda f: os.path.getmtime(os.path.join(date_dir, f)), reverse=True)
                        
                        photos = []
                        for filename in photo_files:
                            file_path = os.path.join(date_dir, filename)
                            photo_url = f"{base_url}/uploads/photos/{emp_id}/{date_str}/{filename}"
                            photos.append({
                                "filename": filename,
                                "photo_url": photo_url,
                                "size": os.path.getsize(file_path),
                                "modified_at": datetime.fromtimestamp(os.path.getmtime(file_path)).isoformat()
                            })
                        
                        photos_by_day[date_str] = photos
                except Exception as e:
                    print(f"Error processing date folder {date_str}: {e}")
                    continue
        
        return {
            "user_id": str(user.id),
            "employee_id": emp_id,
            "user_name": user.full_name,
            "photos_by_day": photos_by_day,
            "total_days": len(photos_by_day),
            "total_photos": sum(len(photos) for photos in photos_by_day.values())
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_employee_photos_day_wise: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching photos: {str(e)}"
        )