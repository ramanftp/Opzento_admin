from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import os
import logging
from contextlib import asynccontextmanager

from .core.config import settings
from .core.database import engine, Base, wait_for_db
from .routes import auth_router, admin_router, data_router
from .services.auth import create_default_admin
from .services.cleanup import cleanup_old_performance_data, cleanup_old_photos
import asyncio

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up...")

    # Wait for database service to be ready
    await asyncio.to_thread(wait_for_db)

    # Create database tables
    Base.metadata.create_all(bind=engine)
    
    # Create default admin user
    from .core.database import SessionLocal
    db = SessionLocal()
    try:
        create_default_admin(db)
        logger.info("Default admin user created/verified successfully")
    except Exception as e:
        logger.error(f"Error creating default admin: {e}")
    finally:
        db.close()
    
    # Ensure upload directory exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    
    # Start background cleanup task
    cleanup_task = asyncio.create_task(periodic_cleanup())
    
    yield
    
    # Shutdown
    logger.info("Shutting down...")
    cleanup_task.cancel()


app = FastAPI(
    title="Desktop Monitoring System",
    description="A comprehensive desktop activity monitoring system",
    version="1.0.0",
    lifespan=lifespan
)


# Security middleware
app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=["localhost", "127.0.0.1", "*"]
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "status_code": exc.status_code}
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "status_code": 500}
    )


# Include routers
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(data_router)

# Serve static files (screenshots)
if os.path.exists(settings.UPLOAD_DIR):
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "Desktop Monitoring System is running"}


@app.get("/")
async def root():
    return {
        "message": "Desktop Monitoring System API",
        "version": "1.0.0",
        "docs": "/docs"
    }


async def periodic_cleanup():
    """Run cleanup task every 24 hours"""
    while True:
        try:
            await asyncio.sleep(24 * 60 * 60)  # Sleep for 24 hours
            logger.info("Running scheduled cleanup...")
            
            # Cleanup old performance data
            perf_result = cleanup_old_performance_data()
            logger.info(f"Performance data cleanup: {perf_result}")
            
            # Cleanup old photos
            photo_result = cleanup_old_photos()
            logger.info(f"Photo cleanup: {photo_result}")
            
            logger.info("Scheduled cleanup completed")
        except asyncio.CancelledError:
            logger.info("Cleanup task cancelled")
            break
        except Exception as e:
            logger.error(f"Cleanup task failed: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )
