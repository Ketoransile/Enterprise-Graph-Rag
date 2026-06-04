from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class AuditLogRead(BaseModel):
    id: str
    user_id: Optional[str] = None
    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    query_text: Optional[str] = None
    response_status: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
