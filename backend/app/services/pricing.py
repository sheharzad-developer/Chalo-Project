BASE_FARE = 50.0
PER_KM = 25.0
PER_MIN = 5.0
MIN_FARE_PKR = 200.0

VEHICLE_MULTIPLIERS: dict[str, float] = {
    "bike": 0.45,
    "rickshaw": 0.65,
    "car": 1.0,
    "van": 1.5,
    "bus": 0.35,
}


def estimate_fare(distance_km: float, duration_min: float, vehicle_type: str = "car") -> float:
    multiplier = VEHICLE_MULTIPLIERS.get(vehicle_type, 1.0)
    base = (BASE_FARE + (distance_km * PER_KM) + (duration_min * PER_MIN)) * multiplier
    return round(max(MIN_FARE_PKR, base), 2)
