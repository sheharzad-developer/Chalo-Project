import uuid
from datetime import datetime
from pydantic import BaseModel


class InitRidePaymentIn(BaseModel):
    ride_id: uuid.UUID


class InitRidePaymentOut(BaseModel):
    tracker_token: str
    amount_pkr: float
    ride_id: str
    safepay_env: str
    checkout_url: str


class ConfirmRidePaymentIn(BaseModel):
    ride_id: uuid.UUID
    tracker_token: str


class CashRidePaymentIn(BaseModel):
    ride_id: uuid.UUID


class ReceiptOut(BaseModel):
    id: uuid.UUID
    ride_id: uuid.UUID
    fare: float
    payment_method: str
    payment_reference: str | None = None
    distance_km: float | None = None
    duration_min: float | None = None
    pickup_address: str | None = None
    dropoff_address: str | None = None
    vehicle_type: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class DriverEarningsOut(BaseModel):
    ride_count: int
    total_earned: float
    cash_collected: float   # driver already holds this cash
    card_earned: float      # collected by Chalo, owed to the driver on payout
    receipts: list[ReceiptOut]


class WebhookPayload(BaseModel):
    tracker_token: str
    state: str
