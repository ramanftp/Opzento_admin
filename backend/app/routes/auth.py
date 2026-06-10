from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..core.security import verify_token, verify_refresh_token
from ..core.config import settings
from ..schemas.user import UserLogin, UserResponse
from ..schemas.auth import Token
from ..services.auth import login_user, create_default_admin
from ..models.user import User
from typing import List, Optional
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/auth", tags=["authentication"])
security = HTTPBearer()


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)) -> User:
    """Get the current authenticated user from Authorization header or cookie"""
    from fastapi import Request
    import logging
    logger = logging.getLogger(__name__)
    
    token = None
    
    # Try to get token from Authorization header first
    if credentials and credentials.credentials:
        token = credentials.credentials
        logger.info("Token found in Authorization header")
    
    if not token:
        logger.error("No authentication credentials provided in Authorization header")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No authentication credentials provided",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        logger.info(f"Attempting to verify token for user")
        payload = verify_token(token)
        email = payload.get("sub")
        logger.info(f"Token verified for email: {email}")
        
        if email is None:
            logger.error("Email is None in token payload")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        logger.info(f"Querying database for user with email: {email}")
        user = db.query(User).filter(User.email == email).first()
        if user is None:
            logger.error(f"User not found in database for email: {email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        logger.info(f"User found: {user.email}, is_active: {user.is_active}")
        if not user.is_active:
            logger.error(f"User account is deactivated: {email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account is deactivated",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        logger.info(f"Successfully authenticated user: {email}")
        return user
        
    except HTTPException as e:
        logger.error(f"HTTPException in get_current_user: {e.detail}")
        raise
    except Exception as e:
        logger.error(f"Unexpected exception in get_current_user: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.is_admin != True:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user




def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Get current active user (additional check for active status)"""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is not active"
        )
    return current_user


@router.post("/login", response_model=dict)
async def login(user_credentials: UserLogin, response: Response, db: Session = Depends(get_db)):
    import logging
    logger = logging.getLogger(__name__)
    
    # Ensure default admin exists
    create_default_admin(db)
    
    result = login_user(db, user_credentials)
    
    # Determine cookie settings based on environment
    cookie_secure = settings.COOKIE_SECURE or settings.is_production
    cookie_domain = None
    
    if settings.is_production:
        cookie_domain= "124.123.30.75:5173" # Set domain for production
        logger.info(f"Production environment detected. Setting cookie domain: {cookie_domain}, secure: True")
    else:
        logger.info(f"Development environment. secure={cookie_secure}")
    
    # Set httpOnly cookie for access token
    response.set_cookie(
        key="access_token",
        value=result["access_token"],
        httponly=True,
        secure=cookie_secure,
        samesite=settings.COOKIE_SAMESITE,
        max_age=24 * 60 * 60,  # 24 hours
        domain=cookie_domain
    )
    
    logger.info(f"Login successful for user: {user_credentials.email}")
    return result


@router.post("/logout")
async def logout(response: Response):
    # Determine domain based on environment
    cookie_domain = None
    if settings.CORS_ORIGINS and any('opzento.com' in origin for origin in settings.CORS_ORIGINS):
        cookie_domain = '124.123.30.75:5173'
    
    response.delete_cookie(
        key="access_token",
        domain=cookie_domain
    )
    return {"message": "Successfully logged out"}


@router.get("/health")
async def auth_health(db: Session = Depends(get_db)):
    """Check auth system health including database connectivity"""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        # Test database connection
        from ..models.user import User
        user_count = db.query(User).count()
        logger.info(f"Database connection OK. User count: {user_count}")
        
        return {
            "status": "healthy",
            "database": "connected",
            "user_count": user_count,
            "jwt_config": {
                "algorithm": settings.JWT_ALGORITHM,
                "secret_prefix": settings.JWT_SECRET[:10] + "..." if len(settings.JWT_SECRET) > 10 else settings.JWT_SECRET
            }
        }
    except Exception as e:
        logger.error(f"Auth health check failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Service unhealthy: {str(e)}"
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"Fetching user info for: {current_user.email}")
        
        # Ensure user has required fields
        if not current_user.id or not current_user.created_at or not current_user.updated_at:
            logger.error(f"User missing required fields: id={current_user.id}, created_at={current_user.created_at}, updated_at={current_user.updated_at}")
            raise ValueError("User data incomplete")
        
        user_response = UserResponse(
            id=str(current_user.id),
            email=current_user.email,
            full_name=current_user.full_name,
            employee_id=current_user.employee_id,
            user_id=current_user.user_id,
            is_admin=current_user.is_admin,
            is_active=current_user.is_active,
            created_at=current_user.created_at,
            updated_at=current_user.updated_at,
            screenshot_urls=None
        )
        
        logger.info(f"Successfully returned user info for: {current_user.email}")
        return user_response
        
    except ValueError as e:
        logger.error(f"Validation error in /me endpoint: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Invalid user data: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error in /me endpoint: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user information"
        )


