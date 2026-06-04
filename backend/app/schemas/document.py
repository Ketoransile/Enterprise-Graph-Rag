import uuid
import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models import ProcessingStatus, SecurityLevel


class DocumentCreate(BaseModel):
    title: str
    description: Optional[str] = None
    file_name: str
    file_type: str
    storage_path: str
    security_level: SecurityLevel = SecurityLevel.INTERNAL
    page_count: Optional[int] = None


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    storage_path: Optional[str] = None
    security_level: Optional[SecurityLevel] = None
    processing_status: Optional[ProcessingStatus] = None
    page_count: Optional[int] = None


class DocumentRead(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str]
    file_name: str
    file_type: str
    storage_path: str
    security_level: SecurityLevel
    processing_status: ProcessingStatus
    page_count: Optional[int]
    uploaded_by: Optional[uuid.UUID]
    created_at: Optional[datetime.datetime] = Field(None, description="ISO timestamp")
    updated_at: Optional[datetime.datetime] = Field(None, description="ISO timestamp")

    class Config:
        from_attributes = True
