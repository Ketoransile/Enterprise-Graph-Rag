"""add user avatar url

Revision ID: 0002_user_avatar_url
Revises: 0001_initial
Create Date: 2026-06-05
"""

from alembic import op
import sqlalchemy as sa


revision = "0002_user_avatar_url"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("avatar_url", sa.String(length=1024), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "avatar_url")
