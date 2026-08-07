"""add_performance_indexes

Revision ID: 4f9a1b2c3d5e
Revises: 3da18b312194
Create Date: 2026-08-06 12:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '4f9a1b2c3d5e'
down_revision: Union[str, None] = '3da18b312194'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Habilitar extensión pg_trgm para búsqueda de texto con índices trigram
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    # Índice compuesto para búsqueda + paginación + filtros
    # Acelera la query principal de /entries/ (get_all) cuando filtra por tipo y ordena
    op.create_index(
        'ix_entries_user_type_created',
        'entries',
        ['user_id', 'type', 'created_at'],
        unique=False,
    )

    # Índice parcial para ratings (solo donde rating IS NOT NULL)
    # Reduce tamaño del índice y mejora queries que filtran/ordenan por rating
    op.execute(
        """
        CREATE INDEX ix_entries_user_rating
        ON entries (user_id, rating)
        WHERE rating IS NOT NULL
        """
    )

    # Índice trigram para búsqueda ILIKE en title
    # Acelera queries con búsqueda de texto (Entry.title.ilike('%search%'))
    op.execute(
        """
        CREATE INDEX ix_entries_title_trigram
        ON entries USING gin (title gin_trgm_ops)
        """
    )

    # Índice para búsqueda case-insensitive exacta (find_by_title_and_user)
    # Optimiza la query func.lower(Entry.title) == title.lower()
    op.execute(
        """
        CREATE INDEX ix_entries_user_title_lower
        ON entries (user_id, LOWER(title))
        """
    )


def downgrade() -> None:
    # Eliminar índices en orden inverso
    op.drop_index('ix_entries_user_title_lower', table_name='entries')
    op.drop_index('ix_entries_title_trigram', table_name='entries')
    op.drop_index('ix_entries_user_rating', table_name='entries')
    op.drop_index('ix_entries_user_type_created', table_name='entries')

    # Nota: no eliminamos pg_trgm porque puede estar en uso por otros schemas
