import uuid
from pydantic import BaseModel


class InitRidePaymentIn(BaseModel):
    ride_id: uuid.UUID


class InitRidePaymentOut(BaseModel):
    tracker_token: str
    amount_pkr: float
    ride_id: str
    safepay_env: str


class ConfirmRidePaymentIn(BaseModel):
    ride_id: uuid.UUID
    tracker_token: str


class ConfirmCashIn(BaseModel):
    ride_id: uuid.UUID


class WebhookPayload(BaseModel):
    tracker_token: str
    state: str
