import uuid
from pydantic import BaseModel


class LocationIn(BaseModel):
    lat: float
    lng: float
    ride_id: uuid.UUID | None = None
