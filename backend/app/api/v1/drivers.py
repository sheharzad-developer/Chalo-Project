import json
from fastapi import APIRouter, Depends, HTTPException
from app.deps import get_current_user
from app.models.profile import Profile, UserRole
from app.schemas.drivers import LocationIn
from app.services.redis_client import r

router = APIRouter()


def _require_driver(user: Profile) -> None:
    if user.role != UserRole.driver:
        raise HTTPException(403, 'Driver role required')


@router.post('/online')
async def go_online(loc: LocationIn, user: Profile = Depends(get_current_user)):
    _require_driver(user)
    await r.geoadd('drivers:online', (loc.lng, loc.lat, str(user.id)))
    await r.hset(f'driver:{user.id}', mapping={'lat': loc.lat, 'lng': loc.lng})
    return {'ok': True}


@router.post('/offline')
async def go_offline(user: Profile = Depends(get_current_user)):
    _require_driver(user)
    await r.zrem('drivers:online', str(user.id))
    await r.delete(f'driver:{user.id}')
    return {'ok': True}


@router.post('/location')
async def update_location(loc: LocationIn, user: Profile = Depends(get_current_user)):
    _require_driver(user)
    await r.geoadd('drivers:online', (loc.lng, loc.lat, str(user.id)))
    if loc.ride_id is not None:
        await r.publish(
            f'ride:{loc.ride_id}:driver_location',
            json.dumps({'lat': loc.lat, 'lng': loc.lng}),
        )
    return {'ok': True}
