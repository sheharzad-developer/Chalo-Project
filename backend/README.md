# Chalo Backend

FastAPI + PostgreSQL backend for Chalo Car Service.

## Setup

```bash
pip install -r requirements.txt
cp .env.example .env   # fill in your values
uvicorn app.main:app --reload --port 8000
```

## Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Async Postgres URL (`postgresql+asyncpg://...`) |
| `REDIS_URL` | Redis URL for ride dispatch |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_JWT_SECRET` | JWT secret from Supabase dashboard |
| `GOOGLE_MAPS_KEY` | Google Maps API key (optional, for road routing) |
| `SAFEPAY_API_KEY` | SafePay merchant API key (`sec_xxx`) |
| `SAFEPAY_WEBHOOK_SECRET` | SafePay webhook signing secret |
| `SAFEPAY_ENV` | `sandbox` or `production` |

## Payment flow

1. **POST /api/v1/payments/init-ride-payment** — creates a SafePay Tracker and returns `tracker_token`
2. **Mobile** — opens SafePay checkout via `Linking` (handles 3DS/OTP)
3. **POST /api/v1/payments/confirm-ride-payment** — polls SafePay to verify payment before marking the ride complete
4. **POST /api/v1/payments/webhook** — SafePay calls this on `TRACKER_ENDED`; marks ride complete as the primary path

## Driver payouts

Currently manual: fares accumulate in the Chalo SafePay merchant account, drivers are paid weekly via bank transfer. Automated SafePay Marketplace disbursements will be added in a future sprint.
