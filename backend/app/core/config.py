from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@postgres:5432/monitoring_db"
    JWT_SECRET: str = "your-super-secret-jwt-key-change-this-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 24 * 60  # 24 hours
    REDIS_URL: str = "redis://redis:6379/0"
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]
    UPLOAD_DIR: str = "./uploads"
    DEFAULT_ADMIN_EMAIL: str = "admin@monitor.com"
    DEFAULT_ADMIN_PASSWORD: str = "admin123"
    SCREENSHOT_RETENTION_DAYS: int = 7
    RATE_LIMIT_PER_MINUTE: int = 60  # screenshots per minute per user
    PORT: int = 8001
    
    # Cookie Settings
    COOKIE_SECURE: bool = False  # Set to True for production (HTTPS)
    COOKIE_SAMESITE: str = "lax"
    
    # Odoo Integration Settings
    ODOO_DB_URL: str = "postgresql+psycopg2://odoo:odoo@localhost:5432/odoo_db"
    
    @property
    def is_production(self) -> bool:
        """Detect if running in production environment"""
        return any('opzento.com' in origin for origin in self.CORS_ORIGINS)
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
