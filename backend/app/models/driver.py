from sqlalchemy import Column, ForeignKey, Boolean, Float, String
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geography
from app.core.database import Base


class Driver(Base):
    __tablename__ = "drivers"
    user_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), primary_key=True)
    license_no = Column(String, nullable=False)
    vehicle_make = Column(String)
    vehicle_model = Column(String)
    vehicle_plate = Column(String)
    is_online = Column(Boolean, default=False)
    rating = Column(Float, default=5.0)
    current_location = Column(Geography("POINT", srid=4326))
