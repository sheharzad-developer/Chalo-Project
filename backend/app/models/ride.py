import uuid
import enum
from sqlalchemy import Column, ForeignKey, Float, String, DateTime, Enum, func
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geography
from app.core.database import Base


class RideStatus(str, enum.Enum):
    searching = "searching"
    accepted = "accepted"
    arriving = "arriving"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"


class Ride(Base):
    __tablename__ = "rides"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rider_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    driver_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True)
    pickup = Column(Geography("POINT", srid=4326))
    dropoff = Column(Geography("POINT", srid=4326))
    pickup_address = Column(String)
    dropoff_address = Column(String)
    status = Column(Enum(RideStatus, name="ride_status"), default=RideStatus.searching, nullable=False)
    fare = Column(Float)
    distance_km = Column(Float)
    duration_min = Column(Float)
    payment_intent_id = Column(String, nullable=True)
    payment_method = Column(String, default="card", nullable=False)
    vehicle_type = Column(String, default="car")
    requested_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True), nullable=True)
    ended_at = Column(DateTime(timezone=True), nullable=True)
