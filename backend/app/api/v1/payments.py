import asyncio
import json
import logging
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.deps import get_current_user
from app.models.profile import Profile
from app.models.receipt import Receipt
from app.models.ride import Ride, RideStatus
from app.schemas.payments import (
    CashRidePaymentIn,
    ConfirmRidePaymentIn,
    DriverEarningsOut,
    InitRidePaymentIn,
    InitRidePaymentOut,
    ReceiptOut,
)
from app.services.safepay_service import (
    build_checkout_url,
    create_customer,
    create_passport,
    create_tracker,
    is_payment_complete,
    verify_webhook_signature,
)
from app.websockets.manager import manager

logger = logging.getLogger(__name__)
router = APIRouter()


async def _complete_ride(ride: Ride, db: AsyncSession, payment_method: str) -> None:
    """
    Mark a ride paid/completed, persist a Receipt, and notify rider + driver.
    Idempotent — safe to call from the webhook and the manual confirm for the
    same ride; the receipt is only created once.
    """
    if ride.status == RideStatus.completed:
        return
    ride.status = RideStatus.completed
    ride.payment_method = payment_method
    ride.ended_at = datetime.now(UTC)

    # Persist an immutable receipt (one per ride).
    existing = await db.execute(select(Receipt).where(Receipt.ride_id == ride.id))
    if existing.scalar_one_or_none() is None:
        db.add(
            Receipt(
                ride_id=ride.id,
                rider_id=ride.rider_id,
                driver_id=ride.driver_id,
                fare=ride.fare,
                payment_method=payment_method,
                payment_reference=ride.payment_intent_id if payment_method == "card" else None,
                distance_km=ride.distance_km,
                duration_min=ride.duration_min,
                pickup_address=ride.pickup_address,
                dropoff_address=ride.dropoff_address,
                vehicle_type=ride.vehicle_type,
            )
        )
    await db.commit()

    receipt = {
        "type": "ride_paid",
        "ride_id": str(ride.id),
        "fare": ride.fare,
        "payment_method": payment_method,
    }
    await manager.send(str(ride.rider_id), receipt)
    if ride.driver_id is not None:
        await manager.send(str(ride.driver_id), receipt)


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
        tbt = await create_passport()
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
        checkout_url=build_checkout_url(tracker["token"], tbt, customer_token),
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

    # The webhook (TRACKER_ENDED) is the primary completion path and may already
    # have run. If not, SafePay can lag a few seconds behind the rider tapping
    # "I paid", so poll a few times before giving up instead of failing instantly.
    if ride.status == RideStatus.completed:
        return {"ok": True}

    paid = False
    for attempt in range(4):
        if await is_payment_complete(data.tracker_token):
            paid = True
            break
        if attempt < 3:
            await asyncio.sleep(2)

    if not paid:
        raise HTTPException(
            402,
            "We haven't received confirmation from SafePay yet. If you completed "
            "the payment, please wait a few seconds and tap Confirm again.",
        )

    await _complete_ride(ride, db, payment_method="card")
    return {"ok": True}


@router.post("/cash-ride-payment")
async def cash_ride_payment(
    data: CashRidePaymentIn,
    user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Cash payment: the rider pays the driver in cash on arrival. We just mark the
    ride paid/completed (payment_method=cash) — no SafePay involved. The driver
    collects the fare directly, so for cash rides there is no Chalo-side capture
    and no weekly payout owed back to the driver.
    """
    ride = await db.get(Ride, data.ride_id)
    if ride is None:
        raise HTTPException(404, "Ride not found")
    if ride.rider_id != user.id:
        raise HTTPException(403, "Only the rider can pay for this ride")
    if not ride.fare or ride.fare <= 0:
        raise HTTPException(400, "Ride has no fare")

    await _complete_ride(ride, db, payment_method="cash")
    return {"ok": True, "payment_method": "cash", "fare": ride.fare}


@router.get("/receipts", response_model=list[ReceiptOut])
async def list_receipts(
    user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the rider's receipts, newest first."""
    result = await db.execute(
        select(Receipt)
        .where(Receipt.rider_id == user.id)
        .order_by(Receipt.created_at.desc())
    )
    return result.scalars().all()


@router.get("/driver/earnings", response_model=DriverEarningsOut)
async def driver_earnings(
    user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Earnings summary + ride list for the signed-in driver."""
    result = await db.execute(
        select(Receipt)
        .where(Receipt.driver_id == user.id)
        .order_by(Receipt.created_at.desc())
    )
    receipts = result.scalars().all()
    cash = sum(r.fare for r in receipts if r.payment_method == "cash")
    card = sum(r.fare for r in receipts if r.payment_method == "card")
    return DriverEarningsOut(
        ride_count=len(receipts),
        total_earned=cash + card,
        cash_collected=cash,
        card_earned=card,
        receipts=receipts,
    )


@router.get("/receipts/{ride_id}", response_model=ReceiptOut)
async def get_receipt(
    ride_id: uuid.UUID,
    user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the receipt for a single ride (rider-owned)."""
    result = await db.execute(select(Receipt).where(Receipt.ride_id == ride_id))
    receipt = result.scalar_one_or_none()
    if receipt is None:
        raise HTTPException(404, "Receipt not found")
    if receipt.rider_id != user.id:
        raise HTTPException(403, "Not your receipt")
    return receipt


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
        result = await db.execute(
            select(Ride).where(Ride.payment_intent_id == tracker_token)
        )
        ride = result.scalar_one_or_none()
        if ride:
            await _complete_ride(ride, db, payment_method="card")

    return {"ok": True}
