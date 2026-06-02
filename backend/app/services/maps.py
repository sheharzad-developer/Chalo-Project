import logging
import math

import httpx

from app.schemas.rides import Coordinate

logger = logging.getLogger(__name__)

OSRM_BASE = "https://router.project-osrm.org"


async def route_distance_duration(pickup: Coordinate, dropoff: Coordinate) -> tuple[float, float]:
    """
    Real driving distance (km) and duration (min) between two points via OSRM.
    Falls back to a haversine straight-line estimate if the routing service is
    unavailable, so fare estimates never hard-fail on a transient network error.
    """
    url = (
        f"{OSRM_BASE}/route/v1/driving/"
        f"{pickup.lng},{pickup.lat};{dropoff.lng},{dropoff.lat}"
        "?overview=false"
    )
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            route = resp.json()["routes"][0]
            distance_km = route["distance"] / 1000.0
            duration_min = route["duration"] / 60.0
            return round(distance_km, 2), round(duration_min, 1)
    except Exception:
        logger.warning("OSRM routing unavailable, falling back to haversine", exc_info=True)
        distance_km = _haversine_km(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng)
        duration_min = (distance_km / 30.0) * 60.0
        return round(distance_km, 2), round(duration_min, 1)


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))
