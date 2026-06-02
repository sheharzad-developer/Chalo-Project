import httpx

EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'


async def send_push(token: str, title: str, body: str, data: dict | None = None) -> None:
    payload = {'to': token, 'title': title, 'body': body, 'data': data or {}}
    async with httpx.AsyncClient(timeout=10) as client:
        await client.post(EXPO_PUSH_URL, json=payload)
