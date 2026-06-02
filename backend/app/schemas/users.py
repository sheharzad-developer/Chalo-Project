from pydantic import BaseModel


class PushTokenIn(BaseModel):
    token: str
