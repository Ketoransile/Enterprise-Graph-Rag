import uuid
from enum import StrEnum

from pgvector.sqlalchemy import Vector
from sqlalchemy import Boolean, Column, DateTime, Enum, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.db.base import Base


class SecurityLevel(StrEnum):
    PUBLIC = "PUBLIC"
    INTERNAL = "INTERNAL"
    CONFIDENTIAL = "CONFIDENTIAL"
    RESTRICTED = "RESTRICTED"


class ProcessingStatus(StrEnum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class IdMixin:
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)


class TenantMixin:
    tenant_id = Column(UUID(as_uuid=True), nullable=False, index=True)


class TimestampMixin:
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class Tenant(Base, IdMixin, TimestampMixin):
    __tablename__ = "tenants"

    name = Column(String(255), nullable=False, unique=True)
    description = Column(Text, nullable=True)


class Role(Base, IdMixin, TenantMixin, TimestampMixin):
    __tablename__ = "roles"

    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)

    __table_args__ = (UniqueConstraint("tenant_id", "name", name="uq_role_tenant_name"),)


class User(Base, IdMixin, TenantMixin, TimestampMixin):
    __tablename__ = "users"

    email = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    __table_args__ = (UniqueConstraint("tenant_id", "email", name="uq_user_tenant_email"),)


class UserRole(Base, TenantMixin, TimestampMixin):
    __tablename__ = "user_roles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role_id = Column(UUID(as_uuid=True), ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)

    __table_args__ = (
        UniqueConstraint("tenant_id", "user_id", "role_id", name="uq_user_role_per_tenant"),
    )


class Document(Base, IdMixin, TenantMixin, TimestampMixin):
    __tablename__ = "documents"

    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    file_name = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False)
    storage_path = Column(String(512), nullable=False)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    security_level = Column(Enum(SecurityLevel), nullable=False, default=SecurityLevel.INTERNAL)
    processing_status = Column(
        Enum(ProcessingStatus), nullable=False, default=ProcessingStatus.PENDING
    )
    page_count = Column(Integer, nullable=True)

    __table_args__ = (UniqueConstraint("tenant_id", "file_name", name="uq_document_file_per_tenant"),)


class DocumentVersion(Base, IdMixin, TenantMixin, TimestampMixin):
    __tablename__ = "document_versions"

    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    version_number = Column(Integer, nullable=False)
    storage_path = Column(String(512), nullable=False)

    __table_args__ = (
        UniqueConstraint("document_id", "version_number", name="uq_document_version_number"),
    )


class Chunk(Base, IdMixin, TenantMixin, TimestampMixin):
    __tablename__ = "chunks"

    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    chunk_text = Column(Text, nullable=False)
    page_number = Column(Integer, nullable=True)
    security_level = Column(Enum(SecurityLevel), nullable=False, default=SecurityLevel.INTERNAL)

    __table_args__ = (
        UniqueConstraint("document_id", "chunk_index", name="uq_document_chunk_index"),
    )


class Embedding(Base, IdMixin, TenantMixin, TimestampMixin):
    __tablename__ = "embeddings"

    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    chunk_id = Column(UUID(as_uuid=True), ForeignKey("chunks.id", ondelete="CASCADE"), nullable=False)
    embedding = Column(Vector(768), nullable=False)

    __table_args__ = (
        UniqueConstraint("chunk_id", name="uq_embedding_chunk"),
    )


class AuditLog(Base, IdMixin, TenantMixin, TimestampMixin):
    __tablename__ = "audit_logs"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    action = Column(String(100), nullable=False)
    resource_type = Column(String(100), nullable=True)
    resource_id = Column(UUID(as_uuid=True), nullable=True)
    query_text = Column(Text, nullable=True)
    response_status = Column(String(50), nullable=True)


class EvaluationMetric(Base, IdMixin, TenantMixin, TimestampMixin):
    __tablename__ = "evaluation_metrics"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    query_text = Column(Text, nullable=False)
    response_text = Column(Text, nullable=True)
    context_text = Column(Text, nullable=True)
    faithfulness_score = Column(Float, nullable=True)
    relevance_score = Column(Float, nullable=True)
    context_precision_score = Column(Float, nullable=True)
    latency_ms = Column(Integer, nullable=True)
    num_chunks_retrieved = Column(Integer, nullable=True)
    num_chunks_after_rbac = Column(Integer, nullable=True)
