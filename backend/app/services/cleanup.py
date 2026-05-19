from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from ..core.database import SessionLocal
from ..models.user_performance import UserPerformance
from ..core.config import settings
import os
import logging

logger = logging.getLogger(__name__)


def cleanup_old_performance_data():
    """Delete performance data older than retention period"""
    db = SessionLocal()
    try:
        # Calculate cutoff date (default 90 days)
        retention_days = getattr(settings, 'PERFORMANCE_RETENTION_DAYS', 90)
        cutoff_date = datetime.utcnow() - timedelta(days=retention_days)
        
        # Find old performance records
        old_performances = db.query(UserPerformance).filter(
            UserPerformance.created_at < cutoff_date
        ).all()
        
        deleted_count = len(old_performances)
        
        for performance in old_performances:
            # Delete database record
            db.delete(performance)
        
        db.commit()
        
        logger.info(f"Performance data cleanup completed: Deleted {deleted_count} records older than {retention_days} days")
        
        return {
            "deleted_count": deleted_count,
            "cutoff_date": cutoff_date.isoformat(),
            "retention_days": retention_days
        }
        
    except Exception as e:
        logger.error(f"Performance data cleanup failed: {e}")
        db.rollback()
        return {
            "error": str(e)
        }
    finally:
        db.close()


def get_performance_stats():
    """Get performance data statistics"""
    db = SessionLocal()
    try:
        total_performances = db.query(UserPerformance).count()
        
        # Get stats for last 7 days
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        recent_performances = db.query(UserPerformance).filter(
            UserPerformance.created_at >= seven_days_ago
        ).count()
        
        return {
            "total_performances": total_performances,
            "recent_performances_7_days": recent_performances
        }
    except Exception as e:
        logger.error(f"Failed to get performance stats: {e}")
        return {
            "error": str(e)
        }
    finally:
        db.close()


def cleanup_old_photos():
    """Delete photo files older than retention period"""
    db = SessionLocal()
    try:
        # Calculate cutoff date (default 180 days for photos)
        retention_days = getattr(settings, 'PHOTO_RETENTION_DAYS', 180)
        cutoff_date = datetime.utcnow() - timedelta(days=retention_days)
        
        base_upload_dir = settings.UPLOAD_DIR
        photos_dir = os.path.join(base_upload_dir, "photos")
        
        deleted_files = 0
        deleted_size = 0
        
        if os.path.exists(photos_dir):
            for employee_dir in os.listdir(photos_dir):
                employee_path = os.path.join(photos_dir, employee_dir)
                if os.path.isdir(employee_path):
                    for date_dir in os.listdir(employee_path):
                        date_path = os.path.join(employee_path, date_dir)
                        if os.path.isdir(date_path):
                            try:
                                # Parse date from directory name
                                dir_date = datetime.strptime(date_dir, "%Y-%m-%d")
                                
                                if dir_date < cutoff_date:
                                    # Delete all files in this date directory
                                    for file in os.listdir(date_path):
                                        file_path = os.path.join(date_path, file)
                                        if os.path.isfile(file_path):
                                            try:
                                                file_size = os.path.getsize(file_path)
                                                os.remove(file_path)
                                                deleted_files += 1
                                                deleted_size += file_size
                                            except OSError as e:
                                                logger.error(f"Failed to delete file {file_path}: {e}")
                                    
                                    # Try to remove empty date directory
                                    try:
                                        os.rmdir(date_path)
                                    except OSError:
                                        pass
                            except ValueError:
                                # Skip directories that don't match date format
                                pass
        
        logger.info(f"Photo cleanup completed: Deleted {deleted_files} files ({deleted_size / (1024*1024):.2f} MB) older than {retention_days} days")
        
        return {
            "deleted_files": deleted_files,
            "deleted_size_bytes": deleted_size,
            "deleted_size_mb": round(deleted_size / (1024 * 1024), 2),
            "cutoff_date": cutoff_date.isoformat(),
            "retention_days": retention_days
        }
        
    except Exception as e:
        logger.error(f"Photo cleanup failed: {e}")
        return {
            "error": str(e)
        }
    finally:
        db.close()
