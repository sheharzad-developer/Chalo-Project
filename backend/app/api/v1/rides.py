from datetime import UTC, datetime
from fastapi import APIRouter, Depends, HTTPException
from geoalchemy2 import WKTElement
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.deps import get_current_user
from app.models.ride import Ride
from app.services.maps import route_distance_duration
from app.services.matching import find_nearest_driver
from app.services.pricing import estimate_fare
from app.schemas.rides import EstimateIn, EstimateOut, RideRequestIn, RideOut

router = APIRouter()


@router.post('/estimate', response_model=EstimateOut)
async def estimate(data: EstimateIn):
    try:
        distance_km, duration_min = await route_distance_duration(data.pickup, data.dropoff)
    except Exception as exc:
        raise HTTPException(400, 'Unable to estimate this route') from exc

    return EstimateOut(
        distance_km=distance_km,
        duration_min=duration_min,
        fare=estimate_fare(distance_km, duration_min, data.vehicle_type),
        vehicle_type=data.vehicle_type,
    )


@router.post('/request', response_model=RideOut)
async def request_ride(
    data: RideRequestIn,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ride = Ride(
        rider_id=user.id,
        pickup=WKTElement(f'POINT({data.pickup.lng} {data.pickup.lat})', srid=4326),
        dropoff=WKTElement(f'POINT({data.dropoff.lng} {data.dropoff.lat})', srid=4326),
        pickup_address=data.pickup_address,
        dropoff_address=data.dropoff_address,
        fare=data.fare,
        distance_km=data.distance_km,
        duration_min=data.duration_min,
        vehicle_type=data.vehicle_type,
        payment_method=data.payment_method,
    )
    db.add(ride)
    try:
        await db.commit()
        await db.refresh(ride)
    except SQLAlchemyError as exc:
        await db.rollback()
        raise HTTPException(400, 'Unable to save ride request') from exc

    try:
        await find_nearest_driver(ride.id, data.pickup)
    except HTTPException as exc:
        if exc.status_code != 404:
            raise
    except Exception:
        # Ride creation should still succeed if live driver matching is temporarily unavailable.
        pass

    return RideOut(
        id=ride.id,
        rider_id=ride.rider_id,
        driver_id=ride.driver_id,
        status=ride.status,
        fare=ride.fare,
        distance_km=ride.distance_km,
        duration_min=ride.duration_min,
        pickup_address=ride.pickup_address,
        dropoff_address=ride.dropoff_address,
        vehicle_type=ride.vehicle_type,
        payment_method=ride.payment_method,
        requested_at=ride.requested_at or datetime.now(UTC),
    )
