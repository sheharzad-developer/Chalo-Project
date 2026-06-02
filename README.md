# Chalo - Car Service 🚗

Pakistan-focused ride-sharing app. Expo React Native frontend + FastAPI backend.

## Structure

```
chalo/
├── backend/          FastAPI + PostgreSQL + Redis
│   ├── app/
│   │   ├── api/v1/   REST endpoints (rides, drivers, payments, users)
│   │   ├── core/     Config, database
│   │   ├── models/   SQLAlchemy ORM models
│   │   ├── schemas/  Pydantic request/response schemas
│   │   ├── services/ SafePay, maps, pricing, driver matching, notifications
│   │   └── websockets/ Real-time ride dispatch
│   ├── requirements.txt
│   └── .env.example
└── frontend/         Expo React Native (iOS + Android)
    ├── src/
    │   ├── api/      Axios client with Supabase auth headers
    │   ├── hooks/    WebSocket hook
    │   ├── lib/      Supabase client
    │   ├── screens/  RiderHome, Login, Signup, Profile, PayHub, Settings
    │   └── stores/   Zustand auth store
    ├── app.json
    └── .env.example
```

## Quick start

**Backend:**
```bash
cd chalo/backend
pip install -r requirements.txt
cp .env.example .env  # fill in your values
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd chalo/frontend
npm install        # or: npx expo install
cp .env.example .env
npx expo start
```

## Payment gateway

SafePay (Pakistan): `SAFEPAY_ENV=sandbox` for testing, `production` for live.

## Pricing (PKR)

| Vehicle | Base | /km | /min | Min fare |
|---|---|---|---|---|
| Bike | Rs 22 | Rs 11 | Rs 2 | Rs 90 |
| Rickshaw | Rs 32 | Rs 16 | Rs 3 | Rs 130 |
| Car | Rs 50 | Rs 25 | Rs 5 | Rs 200 |
| Van | Rs 75 | Rs 37 | Rs 7 | Rs 300 |

## Driver payouts

Collected via SafePay into the Chalo merchant account. Paid out weekly by bank transfer until SafePay Marketplace automated disbursements are configured.
