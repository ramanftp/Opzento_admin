from .auth import router as auth_router
from .admin import router as admin_router
from .data import router as data_router

__all__ = ["auth_router", "admin_router", "data_router"]
