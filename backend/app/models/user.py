from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime


@dataclass
class User:
    id: str
    email: str
    firebase_uid: str
    tier: str = "free"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
