from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import jwt, JWTError

from app.core.config import settings
from app.services.offers import resolve_offer
from app.websockets.manager import manager

router = APIRouter()


@router.websocket('/ws/{user_id}')
async def websocket_endpoint(ws: WebSocket, user_id: str, token: str):
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=[settings.SUPABASE_JWT_ALGORITHM],
            audience='authenticated',
        )
        if payload.get('sub') != user_id:
            await ws.close(code=4401)
            return
    except (JWTError, KeyError):
        await ws.close(code=4401)
        return

    await manager.connect(ws, user_id)
    try:
        while True:
            data = await ws.receive_json()
            msg_type = data.get('type')
            if msg_type == 'ride_offer_response':
                # Driver accepted/rejected an offer.
                resolve_offer(data['ride_id'], data.get('response', 'reject'))
            # Other types (chat, etc.) can be added here.
    except WebSocketDisconnect:
        manager.disconnect(user_id)
