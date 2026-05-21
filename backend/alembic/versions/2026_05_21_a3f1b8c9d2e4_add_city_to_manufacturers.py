"""add_city_to_manufacturers

Revision ID: a3f1b8c9d2e4
Revises: d7ebfc9e4b85
Create Date: 2026-05-21 09:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a3f1b8c9d2e4'
down_revision: Union[str, None] = 'd7ebfc9e4b85'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('manufacturers', sa.Column('city', sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column('manufacturers', 'city')
