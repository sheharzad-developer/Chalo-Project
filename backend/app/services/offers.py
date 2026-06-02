import asyncio
import uuid
from app.websockets.manager import manager

_pending: dict[str, asyncio.Future] = {}


async def offer_to_driver(driver_id: uuid.UUID, ride_id: uuid.UUID, timeout: int = 15) -> bool:
    key = str(ride_id)
    fut: asyncio.Future = asyncio.get_event_loop().create_future()
    _pending[key] = fut
    try:
        await manager.send(str(driver_id), {'type': 'ride_offer', 'ride_id': key})
        try:
            response = await asyncio.wait_for(fut, timeout=timeout)
            return response == 'accept'
        except asyncio.TimeoutError:
            return False
    finally:
        _pending.pop(key, None)


def resolve_offer(ride_id: str, response: str) -> None:
    fut = _pending.get(ride_id)
    if fut and not fut.done():
        fut.set_result(response)
