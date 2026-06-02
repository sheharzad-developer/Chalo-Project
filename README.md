# Chalo — Car Service 🚗

Pakistan-focused ride-hailing app. **Expo React Native** frontend + **FastAPI** backend, with Supabase (auth + Postgres) and SafePay (payments).

## Stack

| Layer | Tech |
|---|---|
| Frontend | Expo (React Native), React Navigation, Zustand, `react-native-maps` (Google provider) |
| Backend | FastAPI, SQLAlchemy (async) + asyncpg, WebSockets |
| Auth | Supabase Auth (email/password); JWTs verified via JWKS (ES256) or legacy HS256 |
| Database | Supabase Postgres |
| Payments | SafePay (sandbox / production) |
| Routing & geocoding | OSRM (road distance/time) + OpenStreetMap Nominatim (geocoding) — no Google key required |

## Structure

```
chalo/
├── backend/                FastAPI service
│   └── app/
│       ├── api/v1/         REST endpoints: rides, drivers, payments, users
│       ├── core/           Config + async DB engine
│       ├── models/         SQLAlchemy models: profile, ride, driver
│       ├── schemas/        Pydantic request/response models
│       ├── services/       safepay, maps (OSRM), pricing, matching, notifications
│       └── websockets/     Real-time ride dispatch
└── frontend/               Expo app (iOS + Android)
    └── src/
        ├── api/            Axios client (injects Supabase JWT)
        ├── lib/            Supabase client
        ├── hooks/          Ride WebSocket hook
        ├── screens/        RiderHome, Login, Signup, Profile, PayHub, Settings
        └── stores/         Zustand auth store
```

## Quick start

### Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # fill in real values (see below)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- Use `--host 0.0.0.0` (not the default `127.0.0.1`) so a physical phone can reach it.
- For `DATABASE_URL`, use the **Supabase IPv4 session pooler** (`aws-1-<region>.pooler.supabase.com`, user `postgres.<ref>`). The direct `db.<ref>.supabase.co` host is IPv6-only and fails on many networks.
- URL-encode special characters in the DB password (`@` → `%40`, etc.).
- Health check: `GET http://localhost:8000/health` · API docs: `/docs`.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env            # fill in real values
npx expo start -c               # -c clears cache so .env changes are picked up
```

- `EXPO_PUBLIC_*` values are **inlined at bundle time** — after editing `.env` you must restart with `-c` and fully reload the app.
- On a **physical phone**, set `EXPO_PUBLIC_API_URL` to a reachable backend URL. iOS blocks plain-HTTP to LAN IPs, so the simplest path is an HTTPS tunnel (e.g. `ngrok http 8000`); a `http://<mac-lan-ip>:8000` may also require granting Local Network permission.
- The iOS Simulator can use `http://127.0.0.1:8000` directly.

## Environment variables

See [`backend/.env.example`](backend/.env.example) and [`frontend/.env.example`](frontend/.env.example) for the full list. **Never commit a real `.env`** — only the publishable/anon key, API URL, and the `sandbox`/`production` flag are safe in the frontend; all merchant/DB/JWT secrets live in the backend only.

## Auth notes

- New signups require email confirmation **unless** "Confirm email" is disabled (Supabase → Authentication → Providers → Email). With confirmation on, an unconfirmed account fails login as *"Invalid login credentials."*
- The backend auto-creates a `profiles` row on a user's first authenticated request.

## Pricing (PKR)

Fare = `max(200, (50 + 25·km + 5·min) × vehicle_multiplier)`

| Vehicle | Multiplier |
|---|---|
| Bike | 0.45 |
| Rickshaw | 0.65 |
| Car | 1.0 |
| Van | 1.5 |
| Bus | 0.35 |

- Base fare **Rs 50** + **Rs 25/km** + **Rs 5/min**, floored at a **Rs 200** minimum.
- Distance/duration come from OSRM road routing (falls back to a straight-line haversine estimate if OSRM is unreachable).

## Payments

SafePay hosted checkout. The backend creates a payment *tracker* for the ride fare; the app opens the SafePay checkout URL; payment is confirmed via webhook (preferred) or polling. Set `SAFEPAY_ENV=sandbox` for testing, `production` for live.

## Driver payouts

Collected via SafePay into the Chalo merchant account. Paid out weekly by bank transfer until SafePay Marketplace automated disbursements are configured.
