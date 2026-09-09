from enum import Enum
from typing import List, Optional
from fastapi import HTTPException, status, Depends
from sqlalchemy.orm import Session

from app.core.security import get_current_user as get_real_current_user
from app.db.models import User

class UserRole(str, Enum):
    ADMIN = "admin"
    INSPECTOR = "officer" # mapped to officer
    PUBLIC_VIEWER = "public_viewer"

class AuthUser:
    def __init__(self, user: User):
        self.user_id = user.id
        self.name = user.email
        self.role = UserRole(user.role if user.role in [r.value for r in UserRole] else "officer")
        self.department = "Department of Consumer Affairs (DoCA)"
        
    @property
    def email(self):
        return self.name

def get_current_user(user: User = Depends(get_real_current_user)) -> AuthUser:
    """
    Returns the currently authenticated user wrapped in the AuthUser schema.
    """
    return AuthUser(user)

def require_role(allowed_roles: List[UserRole]):
    """
    Dependency factory to enforce role-based access control on sensitive endpoints.
    """
    def _role_checker(user: AuthUser = Depends(get_current_user)) -> AuthUser:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {[r.value for r in allowed_roles]}, current role: '{user.role.value}'.",
            )
        return user
    return _role_checker
