from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.deps import get_current_user
from app.models.profile import Profile
from app.schemas.users import PushTokenIn

router = APIRouter()


@router.post('/push-token')
async def save_push_token(
    data: PushTokenIn,
    user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user.push_token = data.token
    await db.commit()
    return {'ok': True}
