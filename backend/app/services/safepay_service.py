"""
SafePay payment service for Chalo.

Flow for a ride payment (replaces Stripe):
  1. create_customer()      – create/find a SafePay Merchant Shopper for the rider
  2. create_tracker()       – create a TRACKER_STARTED payment session for the ride fare
  3. Client (mobile app)    – performs 3DS authentication using @sfpy/react-native SDK
  4. confirm_payment()      – backend verifies TRACKER_ENDED state via webhook / polling
  5. Driver payout          – currently manual (bank transfer); automated disbursement
                              to be added once SafePay marketplace account is set up.

Authentication: X-SFPY-MERCHANT-SECRET header (API key).
Amounts: SafePay uses the lowest denomination (paisas for PKR), so Rs 500 → 50000.
"""
from __future__ import annotations

import logging
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

SANDBOX_BASE = "https://sandbox.api.getsafepay.com"
PRODUCTION_BASE = "https://api.getsafepay.com"


def _base() -> str:
    return SANDBOX_BASE if settings.SAFEPAY_ENV == "sandbox" else PRODUCTION_BASE


def _headers() -> dict[str, str]:
    return {
        "X-SFPY-MERCHANT-SECRET": settings.SAFEPAY_API_KEY,
        "Content-Type": "application/json",
    }


def _to_paisas(pkr_amount: float) -> int:
    """Convert PKR (e.g. 500.0) to paisas (50000) as required by SafePay."""
    return int(round(pkr_amount * 100))


async def create_customer(
    full_name: str,
    email: str,
    phone: str | None = None,
) -> str:
    """
    Create or retrieve a Merchant Shopper on SafePay.
    Returns the customer token (e.g. 'cus_xxxx').
    SafePay does not have a find-or-create endpoint, so we always create;
    duplicate detection should be done at the Profile level (safepay_customer_id).
    """
    payload: dict[str, Any] = {
        "first_name": full_name.split()[0] if full_name else "Rider",
        "last_name": " ".join(full_name.split()[1:]) if len(full_name.split()) > 1 else ".",
        "email": email,
    }
    if phone:
        payload["phone"] = phone

    async with httpx.AsyncClient(base_url=_base(), timeout=15) as client:
        resp = await client.post(
            "/customer/customers/v2/",
            json=payload,
            headers=_headers(),
        )
        resp.raise_for_status()
        data = resp.json()
        return data["data"]["token"]


async def create_tracker(
    amount_pkr: float,
    customer_token: str,
    ride_id: str,
    intent: str = "CYBERSOURCE",
) -> dict[str, Any]:
    """
    Create a SafePay payment tracker for a ride.
    Returns the full tracker dict including token and next_actions.

    intent can be CYBERSOURCE or MPGS depending on merchant config.
    """
    payload = {
        "merchant_api_key": settings.SAFEPAY_API_KEY,
        "intent": intent,
        "mode": "payment",
        "currency": "PKR",
        "user": customer_token,
        "amount": _to_paisas(amount_pkr),
        "entry_mode": "raw",
        "metadata": {
            "source": "chalo",
            "order_id": ride_id,
        },
    }

    async with httpx.AsyncClient(base_url=_base(), timeout=15) as client:
        resp = await client.post(
            "/order/payments/v3/",
            json=payload,
            headers=_headers(),
        )
        resp.raise_for_status()
        return resp.json()["data"]["tracker"]


async def fetch_tracker(tracker_token: str) -> dict[str, Any]:
    """Fetch current state of a payment tracker from the reporter API."""
    async with httpx.AsyncClient(base_url=_base(), timeout=15) as client:
        resp = await client.get(
            f"/reporter/api/v2/payments/{tracker_token}",
            headers=_headers(),
        )
        resp.raise_for_status()
        return resp.json()["data"]


async def is_payment_complete(tracker_token: str) -> bool:
    """
    Check if a tracker has reached TRACKER_ENDED (successful capture).
    Used as a fallback polling check when the webhook has not fired yet.
    """
    try:
        tracker = await fetch_tracker(tracker_token)
        return tracker.get("state") == "TRACKER_ENDED"
    except Exception:
        logger.exception("Error checking tracker state for %s", tracker_token)
        return False


def verify_webhook_signature(payload_bytes: bytes, signature: str) -> bool:
    """
    Verify SafePay webhook HMAC-SHA256 signature.
    SafePay signs the raw request body with the webhook_secret from your API settings.
    """
    import hashlib
    import hmac

    expected = hmac.new(
        settings.SAFEPAY_WEBHOOK_SECRET.encode(),
        payload_bytes,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
