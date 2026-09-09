from enum import Enum
from typing import List, Optional
from fastapi import Header, HTTPException, status, Depends
from pydantic import BaseModel


class UserRole(str, Enum):
    ADMIN = "admin"
    INSPECTOR = "inspector"
    PUBLIC_VIEWER = "public_viewer"


class AuthUser(BaseModel):
    user_id: str
    name: str
    role: UserRole
    department: Optional[str] = "Department of Consumer Affairs (DoCA)"


def get_current_user(
    x_user_role: Optional[str] = Header(default="inspector", alias="X-User-Role"),
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> AuthUser:
    """
    FastAPI dependency to extract and validate the authenticated user and their RBAC role.
    Supports both X-User-Role header and standard Bearer tokens.
    Defaults to inspector for developer convenience and SIH live demonstrations.
    """
    role_str = (x_user_role or "inspector").lower().strip()
    
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1].lower()
        if "admin" in token:
            role_str = "admin"
        elif "viewer" in token or "citizen" in token:
            role_str = "public_viewer"
        else:
            role_str = "inspector"

    try:
        user_role = UserRole(role_str)
    except ValueError:
        user_role = UserRole.PUBLIC_VIEWER

    user_names = {
        UserRole.ADMIN: "Super Admin (Legal Metrology Division)",
        UserRole.INSPECTOR: "Senior Legal Metrology Officer",
        UserRole.PUBLIC_VIEWER: "Citizen Consumer / Public User",
    }

    return AuthUser(
        user_id=f"usr_{user_role.value}_001",
        name=user_names.get(user_role, "Authenticated User"),
        role=user_role,
    )


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
