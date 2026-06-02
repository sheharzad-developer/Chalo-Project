import enum
from sqlalchemy import Column, String, DateTime, Enum, func
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class UserRole(str, enum.Enum):
    rider = "rider"
    driver = "driver"


class Profile(Base):
    __tablename__ = "profiles"
    id = Column(UUID(as_uuid=True), primary_key=True)
    full_name = Column(String, nullable=False)
    role = Column(Enum(UserRole, name="user_role"), nullable=False)
    safepay_customer_id = Column(String, nullable=True)
    push_token = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
