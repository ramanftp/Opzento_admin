from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from ..models.user import User
from ..schemas.user import UserCreate, UserLogin
from ..core.security import verify_password, get_password_hash, create_access_token
from datetime import timedelta
from ..core.config import settings


def authenticate_user(db: Session, email: str, password: str) -> User:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    if not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is deactivated"
        )
    return user


def create_user(db: Session, user: UserCreate) -> User:
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Hash password
    hashed_password = get_password_hash(user.password)
    
    # Create user
    db_user = User(
        email=user.email,
        full_name=user.full_name,
        password_hash=hashed_password,
        user_id=user.user_id if hasattr(user, 'user_id') else 1,
        is_admin=user.is_admin if hasattr(user, 'is_admin') else False,
        employee_id=user.employee_id if hasattr(user, 'employee_id') else None,
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def login_user(db: Session, user_credentials: UserLogin) -> dict:
    user = authenticate_user(db, user_credentials.email, user_credentials.password)
    access_token = create_access_token(
        data={"sub": user.email, "user_id": str(user.id)}
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
        }
    }


def create_default_admin(db: Session) -> User:
    """Create default admin user if not exists"""
    try:
        # Check if admin already exists
        admin = db.query(User).filter(User.email == settings.DEFAULT_ADMIN_EMAIL).first()
        if admin:
            return admin
        
        # Create default admin with configured password
        password = settings.DEFAULT_ADMIN_PASSWORD
        
        admin_user = User(
            email=settings.DEFAULT_ADMIN_EMAIL,
            full_name="System Administrator",
            user_id=1,
            password_hash=get_password_hash(password),
            employee_id="admin001",
            is_admin=True
        )
        
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        return admin_user
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create default admin: {str(e)}"
        )


def get_user_by_id(db: Session, user_id: str) -> User:
    """Get user by ID"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user



def update_user(db: Session, user_id: str, update_data: dict) -> User:
    """Update user information"""
    user = get_user_by_id(db, user_id)
    
    for field, value in update_data.items():
        if hasattr(user, field) and value is not None:
            setattr(user, field, value)
    
    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    return user


def deactivate_user(db: Session, user_id: str) -> User:
    """Deactivate user account"""
    user = get_user_by_id(db, user_id)
    user.is_active = False
    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    return user
