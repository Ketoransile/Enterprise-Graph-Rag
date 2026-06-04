import uuid
from typing import Optional

from pydantic import BaseModel

from app.models import SecurityLevel


class ChunkRead(BaseModel):
    id: uuid.UUID
    document_id: uuid.UUID
    chunk_index: int
    chunk_text: str
    page_number: Optional[int]
    security_level: SecurityLevel

    class Config:
        from_attributes = True
