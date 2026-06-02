import uuid
from sqlalchemy import Column, ForeignKey, Float, String, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class Receipt(Base):
    """
    Immutable record issued when a ride is paid/completed. Snapshots the fare and
    trip details at completion time so it stays correct even if the ride row changes.
    One receipt per ride (ride_id is unique).
    """
    __tablename__ = "receipts"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ride_id = Column(UUID(as_uuid=True), ForeignKey("rides.id", ondelete="CASCADE"), unique=True, nullable=False)
    rider_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    driver_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True)
    fare = Column(Float, nullable=False)
    payment_method = Column(String, nullable=False)  # "card" or "cash"
    payment_reference = Column(String, nullable=True)  # SafePay tracker token for card
    distance_km = Column(Float, nullable=True)
    duration_min = Column(Float, nullable=True)
    pickup_address = Column(String, nullable=True)
    dropoff_address = Column(String, nullable=True)
    vehicle_type = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
