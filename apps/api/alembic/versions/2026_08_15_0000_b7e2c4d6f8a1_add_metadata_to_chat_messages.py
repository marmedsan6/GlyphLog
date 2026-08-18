"""add metadata to chat messages

Revision ID: b7e2c4d6f8a1
Revises: a1c9d2e4f5b6
Create Date: 2026-08-15 00:00:00.000000

Añade la columna `metadata` (JSON) a la tabla `chat_messages` para persistir
payloads estructurados de los mensajes del asistente (ej. la lista de
recomendaciones generadas en el chat de GlyphAI, para render de tarjetas).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7e2c4d6f8a1'
down_revision: Union[str, None] = 'a1c9d2e4f5b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'chat_messages',
        sa.Column('metadata', sa.JSON(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('chat_messages', 'metadata')
