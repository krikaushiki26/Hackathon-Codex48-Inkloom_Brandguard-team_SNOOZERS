
import os
from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from models import User


password_hash = PasswordHash.recommended()

from database import settings

JWT_SECRET = settings.jwt_secret

JWT_ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 60


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


def register_user(data: RegisterRequest, db: Session):
    email = str(data.email).lower()

    existing_user = db.scalar(
        select(User).where(User.email == email)
    )
    if existing_user:
        raise ValueError("An account with this email already exists.")

    user = User(
        name=data.name.strip(),
        email=email,
        password_hash=password_hash.hash(data.password),
        role="writer",
    )

    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def login_user(data: LoginRequest, db: Session):
    email = str(data.email).lower()

    user = db.scalar(
        select(User).where(User.email == email)
    )

    if not user or not password_hash.verify(
        data.password, user.password_hash
    ):
        raise ValueError("Incorrect email or password.")

    if not user.is_active:
        raise ValueError("This account is inactive.")

    token = jwt.encode(
        {
            "sub": str(user.id),
            "role": user.role,
            "exp": datetime.now(timezone.utc)
            + timedelta(minutes=TOKEN_EXPIRE_MINUTES),
        },
        JWT_SECRET,
        algorithm=JWT_ALGORITHM,
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
        },
    }
