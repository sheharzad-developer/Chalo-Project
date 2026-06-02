import uuid
from fastapi import HTTPException
from app.schemas.rides import Coordinate
from app.services.offers import offer_to_driver
from app.services.redis_client import r


async def find_nearest_driver(ride_id: uuid.UUID, pickup: Coordinate) -> str:
    nearby = await r.geosearch(
        'drivers:online',
        longitude=pickup.lng,
        latitude=pickup.lat,
        radius=5,
        unit='km',
        sort='ASC',
        count=10,
    )
    for driver_id in nearby:
        accepted = await offer_to_driver(driver_id, ride_id, timeout=15)
        if accepted:
            return driver_id
    raise HTTPException(404, 'No drivers available')
