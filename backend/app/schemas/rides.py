import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.ride import RideStatus


class Coordinate(BaseModel):
    lat: float
    lng: float


class EstimateIn(BaseModel):
    pickup: Coordinate
    dropoff: Coordinate
    vehicle_type: str = 'car'


class EstimateOut(BaseModel):
    distance_km: float
    duration_min: float
    fare: float
    vehicle_type: str = 'car'


class RideRequestIn(BaseModel):
    pickup: Coordinate
    dropoff: Coordinate
    pickup_address: str
    dropoff_address: str
    fare: float
    distance_km: float
    duration_min: float
    vehicle_type: str = 'car'


class RideOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    rider_id: uuid.UUID
    driver_id: uuid.UUID | None = None
    status: RideStatus
    fare: float | None = None
    distance_km: float | None = None
    duration_min: float | None = None
    pickup_address: str | None = None
    dropoff_address: str | None = None
    vehicle_type: str | None = None
    requested_at: datetime
