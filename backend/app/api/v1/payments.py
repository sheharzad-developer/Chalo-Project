import json
import logging
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.deps import get_current_user
from app.models.profile import Profile
from app.models.ride import Ride, RideStatus
from app.schemas.payments import (
    ConfirmCashIn,
    ConfirmRidePaymentIn,
    InitRidePaymentIn,
    InitRidePaymentOut,
)
from app.services.safepay_service import (
    create_customer,
    create_tracker,
    is_payment_complete,
    verify_webhook_signature,
)
from app.websockets.manager import manager

logger = logging.getLogger(__name__)
router = APIRouter()


async def _ensure_safepay_customer(profile: Profile, db: AsyncSession) -> str:
    """Return SafePay customer token, creating one lazily if needed."""
    if profile.safepay_customer_id:
        return profile.safepay_customer_id

    email = f"rider-{profile.id}@chalo.app"
    customer_token = await create_customer(full_name=profile.full_name, email=email)
    profile.safepay_customer_id = customer_token
    await db.commit()
    return customer_token


@router.post("/init-ride-payment", response_model=InitRidePaymentOut)
async def init_ride_payment(
    data: InitRidePaymentIn,
    user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ride = await db.get(Ride, data.ride_id)
    if ride is None:
        raise HTTPException(404, "Ride not found")
    if ride.rider_id != user.id:
        raise HTTPException(403, "Only the rider can pay for this ride")
    if not ride.fare or ride.fare <= 0:
        raise HTTPException(400, "Ride has no fare")

    try:
        customer_token = await _ensure_safepay_customer(user, db)
        tracker = await create_tracker(
            amount_pkr=ride.fare,
            customer_token=customer_token,
            ride_id=str(ride.id),
        )
    except Exception as exc:
        logger.exception("SafePay error initialising ride payment")
        raise HTTPException(502, f"Payment gateway error: {exc}") from exc

    ride.payment_intent_id = tracker["token"]
    await db.commit()

    from app.core.config import settings

    return InitRidePaymentOut(
        tracker_token=tracker["token"],
        amount_pkr=ride.fare,
        ride_id=str(ride.id),
        safepay_env=settings.SAFEPAY_ENV,
    )


@router.post("/confirm-ride-payment")
async def confirm_ride_payment(
    data: ConfirmRidePaymentIn,
    user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ride = await db.get(Ride, data.ride_id)
    if ride is None:
        raise HTTPException(404, "Ride not found")
    if ride.rider_id != user.id:
        raise HTTPException(403, "Only the rider can confirm this payment")

    paid = await is_payment_complete(data.tracker_token)
    if not paid:
        raise HTTPException(402, "Payment not yet confirmed by SafePay")

    ride.status = RideStatus.completed
    ride.ended_at = datetime.now(UTC)
    await db.commit()

    receipt = {
        "type": "ride_paid",
        "ride_id": str(ride.id),
        "fare": ride.fare,
    }
    await manager.send(str(ride.rider_id), receipt)
    if ride.driver_id is not None:
        await manager.send(str(ride.driver_id), receipt)

    return {"ok": True}


@router.post("/confirm-cash")
async def confirm_cash_payment(
    data: ConfirmCashIn,
    user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Rider confirms cash was handed to the driver — completes the ride, no SafePay."""
    ride = await db.get(Ride, data.ride_id)
    if ride is None:
        raise HTTPException(404, "Ride not found")
    if ride.rider_id != user.id:
        raise HTTPException(403, "Only the rider can confirm this payment")
    if ride.payment_method != "cash":
        raise HTTPException(400, "This ride is not a cash ride")

    ride.status = RideStatus.completed
    ride.ended_at = datetime.now(UTC)
    await db.commit()

    receipt = {"type": "ride_paid", "ride_id": str(ride.id), "fare": ride.fare, "method": "cash"}
    await manager.send(str(ride.rider_id), receipt)
    if ride.driver_id is not None:
        await manager.send(str(ride.driver_id), receipt)

    return {"ok": True}


@router.post("/webhook")
async def safepay_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """
    SafePay webhook endpoint. SafePay sends a POST with HMAC-SHA256 signature
    in the X-SFPY-SIGNATURE header when a tracker changes state.

    On TRACKER_ENDED (successful payment) we mark the ride completed.
    This is the preferred confirmation path; confirm-ride-payment is a fallback.
    """
    body = await request.body()
    signature = request.headers.get("X-SFPY-SIGNATURE", "")

    if not verify_webhook_signature(body, signature):
        raise HTTPException(400, "Invalid webhook signature")

    try:
        payload = json.loads(body)
    except Exception:
        raise HTTPException(400, "Invalid JSON payload")

    tracker_token = payload.get("tracker", {}).get("token") or payload.get("tracker_token")
    state = payload.get("tracker", {}).get("state") or payload.get("state")

    if state == "TRACKER_ENDED" and tracker_token:
        from sqlalchemy import select
        from app.models.ride import Ride

        result = await db.execute(
            select(Ride).where(Ride.payment_intent_id == tracker_token)
        )
        ride = result.scalar_one_or_none()
        if ride and ride.status != RideStatus.completed:
            ride.status = RideStatus.completed
            ride.ended_at = datetime.now(UTC)
            await db.commit()
            receipt = {"type": "ride_paid", "ride_id": str(ride.id), "fare": ride.fare}
            await manager.send(str(ride.rider_id), receipt)
            if ride.driver_id:
                await manager.send(str(ride.driver_id), receipt)

    return {"ok": True}
