from fastapi import WebSocket
from typing import Dict
 
class ConnectionManager:
    def __init__(self):
        self.active: Dict[str, WebSocket] = {}
 
    async def connect(self, ws: WebSocket, user_id: str):
        await ws.accept()
        self.active[user_id] = ws
 
    def disconnect(self, user_id: str):
        self.active.pop(user_id, None)
 
    async def send(self, user_id: str, message: dict):
        ws = self.active.get(user_id)
        if ws:
            await ws.send_json(message)
 
manager = ConnectionManager()
