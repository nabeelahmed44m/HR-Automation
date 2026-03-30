"""Add interview recommendation status

Revision ID: b7322566ecd0
Revises: e60787fed7c1
Create Date: 2026-03-26 02:41:39.816262

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7322566ecd0'
down_revision: Union[str, Sequence[str], None] = 'e60787fed7c1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Manual ENUM creation for PostgreSQL
    recommendation_enum = sa.Enum('RECOMMENDED', 'NOT_RECOMMENDED', 'MAYBE', name='interviewrecommendation')
    recommendation_enum.create(op.get_bind())
    
    op.add_column('interview_sessions', sa.Column('recommendation', recommendation_enum, nullable=True))

def downgrade() -> None:
    op.drop_column('interview_sessions', 'recommendation')
    # Manual ENUM drop for PostgreSQL
    sa.Enum(name='interviewrecommendation').drop(op.get_bind())
