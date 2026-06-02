import uuid
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
import requests
from sqlalchemy.exc import SQLAlchemyError
from app.core.config import settings
from app.core.database import get_db
from app.models.profile import Profile, UserRole

oauth2 = OAuth2PasswordBearer(tokenUrl="supabase")


def verify_supabase_token(token: str = Depends(oauth2)) -> dict:
    try:
        header = jwt.get_unverified_header(token)
        algorithm = header.get("alg")
        if not algorithm:
            raise JWTError("Missing token algorithm")

        if algorithm == settings.SUPABASE_JWT_ALGORITHM:
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=[settings.SUPABASE_JWT_ALGORITHM],
                audience="authenticated",
            )
        else:
            jwks_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
            response = requests.get(jwks_url, timeout=5)
            response.raise_for_status()
            keys = response.json().get("keys", [])
            key = next((item for item in keys if item.get("kid") == header.get("kid")), None)
            if not key:
                raise JWTError("No matching JWKS key")
            payload = jwt.decode(
                token,
                key,
                algorithms=[algorithm],
                audience="authenticated",
                issuer=f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1",
            )
        uuid.UUID(payload["sub"])
        return payload
    except (JWTError, KeyError, ValueError, requests.RequestException):
        raise HTTPException(401, "Invalid token")


async def get_current_user(payload: dict = Depends(verify_supabase_token), db=Depends(get_db)) -> Profile:
    user_id = uuid.UUID(payload["sub"])

    try:
        profile = await db.get(Profile, user_id)
    except SQLAlchemyError as exc:
        raise HTTPException(503, "Unable to load user profile") from exc

    if not profile:
        metadata = payload.get("user_metadata") or {}
        try:
            role = UserRole(metadata.get("role"))
        except ValueError:
            role = UserRole.rider

        profile = Profile(
            id=user_id,
            full_name=metadata.get("full_name") or payload.get("email") or "Rider",
            role=role,
        )
        db.add(profile)
        try:
            await db.commit()
            await db.refresh(profile)
        except SQLAlchemyError as exc:
            await db.rollback()
            raise HTTPException(503, "Unable to create user profile") from exc

    return profile
