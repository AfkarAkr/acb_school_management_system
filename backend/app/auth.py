import os
from datetime import datetime, timedelta, timezone
from typing import Annotated
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pwdlib import PasswordHash
from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import SessionLocal
from .models import UserAccount
from .schemas import UserPrincipal


SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY is not set. Add a private key to backend/.env.")
if len(SECRET_KEY.encode("utf-8")) < 32:
    raise RuntimeError("SECRET_KEY must be at least 32 bytes long.")

ALGORITHM = "HS256"
TOKEN_LIFETIME_MINUTES = 60
password_hash = PasswordHash.recommended()
bearer_scheme = HTTPBearer(auto_error=False)


def get_db():
    with SessionLocal() as session:
        yield session


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return password_hash.verify(password, hashed_password)


def create_access_token(account: UserAccount) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=TOKEN_LIFETIME_MINUTES
    )
    claims = {"sub": str(account.id), "exp": expires_at}
    return jwt.encode(claims, SECRET_KEY, algorithm=ALGORITHM)


def get_current_account(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(bearer_scheme)
    ],
    session: Annotated[Session, Depends(get_db)],
) -> UserPrincipal:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise unauthorized

    try:
        claims = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        account_id = UUID(claims["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError):
        raise unauthorized from None

    account = session.scalar(
        select(UserAccount).where(
            UserAccount.id == account_id,
            UserAccount.is_active.is_(True),
        )
    )
    if account is None:
        raise unauthorized

    return UserPrincipal(
        account_id=str(account.id),
        email=account.email,
        role=account.role,
        staff_id=account.staff_id,
        student_id=account.student_id,
        parent_id=str(account.parent_id) if account.parent_id else None,
    )


def require_roles(*roles: str):
    def role_dependency(
        account: Annotated[UserPrincipal, Depends(get_current_account)],
    ) -> UserPrincipal:
        if account.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action",
            )
        return account

    return role_dependency
