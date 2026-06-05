"""store uploaded document files

Revision ID: 0003_document_files
Revises: 0002_user_avatar_url
Create Date: 2026-06-05
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "0003_document_files"
down_revision = "0002_user_avatar_url"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "document_files",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "document_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("documents.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("content_type", sa.String(length=255), nullable=True),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("file_bytes", sa.LargeBinary(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint(
            "tenant_id",
            "document_id",
            name="uq_document_file_content_per_tenant",
        ),
    )
    op.create_index("ix_document_files_tenant_id", "document_files", ["tenant_id"])


def downgrade() -> None:
    op.drop_index("ix_document_files_tenant_id", table_name="document_files")
    op.drop_table("document_files")
