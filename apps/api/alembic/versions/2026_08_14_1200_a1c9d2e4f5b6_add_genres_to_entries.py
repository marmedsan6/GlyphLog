"""add genres to entries

Revision ID: a1c9d2e4f5b6
Revises: f82a09eb518c
Create Date: 2026-08-14 12:00:00.000000

Añade la columna `genres` (JSON) a la tabla `entries` para que GlyphAI pueda
personalizar respuestas/recomendaciones según los géneros favoritos del usuario.
Es el primer campo JSON del proyecto: se auto-popula desde el catálogo externo
(AniList/RAWG) al crear o importar entradas.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1c9d2e4f5b6'
down_revision: Union[str, None] = 'f82a09eb518c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'entries',
        sa.Column('genres', sa.JSON(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('entries', 'genres')
