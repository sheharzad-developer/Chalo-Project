from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import rides, drivers, payments, users
from app.websockets import routes as ws_routes

app = FastAPI(title="Chalo API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(rides.router, prefix="/api/v1/rides", tags=["rides"])
app.include_router(drivers.router, prefix="/api/v1/drivers", tags=["drivers"])
app.include_router(payments.router, prefix="/api/v1/payments", tags=["payments"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(ws_routes.router)


@app.get("/health")
async def health():
    return {"status": "ok", "app": "chalo"}
