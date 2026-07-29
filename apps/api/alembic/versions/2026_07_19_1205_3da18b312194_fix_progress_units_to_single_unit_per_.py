"""fix_progress_units_to_single_unit_per_type

Revision ID: 3da18b312194
Revises: aff87fa854fe
Create Date: 2026-07-19 12:05:15.166439

"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '3da18b312194'
down_revision: Union[str, None] = 'aff87fa854fe'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Unidades legacy que desaparecen para nuevas entradas. Cada tipo se asigna a su
# unidad fija: anime -> episodes, manga -> chapters, game -> hours.
FIXED_UNIT_BY_TYPE: dict[str, str] = {
    "anime": "episodes",
    "manga": "chapters",
    "game": "hours",
}

# Unidades legacy que ya no se asignan a nuevas entradas pero se conservan en la
# tabla de eventos para preservar el timeline.
LEGACY_UNITS: set[str] = {"minutes", "percentage", "volumes"}


def upgrade() -> None:
    # PostgreSQL requiere que ADD VALUE se ejecute fuera de la transacción
    # actual (autocommit) antes de usar el nuevo valor en operaciones posteriores.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE progress_unit ADD VALUE IF NOT EXISTS 'hours'")

    # Migrar columnas de progreso a Numeric(10, 2) para admitir horas decimales.
    op.alter_column(
        "entries",
        "current_progress",
        existing_type=sa.Integer(),
        type_=sa.Numeric(precision=10, scale=2),
        existing_nullable=True,
    )
    op.alter_column(
        "entries",
        "progress_total",
        existing_type=sa.Integer(),
        type_=sa.Numeric(precision=10, scale=2),
        existing_nullable=True,
    )
    op.alter_column(
        "progress_events",
        "previous_value",
        existing_type=sa.Integer(),
        type_=sa.Numeric(precision=10, scale=2),
        existing_nullable=True,
    )
    op.alter_column(
        "progress_events",
        "current_value",
        existing_type=sa.Integer(),
        type_=sa.Numeric(precision=10, scale=2),
        existing_nullable=False,
    )

    # Migración de datos: a cada entrada con unidad legacy (o sin unidad) se le
    # asigna la unidad fija de su tipo. Si la entrada tiene historial o progreso
    # actual > 0, se inserta un evento de tipo 'reset' que conserva el valor
    # previo en el timeline.
    connection = op.get_bind()

    # 1) Entradas con unidad legacy y algún historial o progreso: evento reset.
    #    Se usa interpolación segura de los valores legacy (3 strings constantes)
    #    porque PostgreSQL no permite bindings ($1) dentro de un IN literal.
    legacy_units_sql = ", ".join(f"'{unit}'" for unit in LEGACY_UNITS)
    connection.execute(
        sa.text(
            f"""
            INSERT INTO progress_events (
                id,
                entry_id,
                previous_value,
                current_value,
                unit,
                recorded_at,
                note,
                source,
                event_type,
                user_id
            )
            SELECT
                gen_random_uuid(),
                e.id,
                e.current_progress,
                0,
                CASE e.type
                    WHEN 'anime' THEN 'episodes'::progress_unit
                    WHEN 'manga' THEN 'chapters'::progress_unit
                    WHEN 'game' THEN 'hours'::progress_unit
                END,
                NOW(),
                'Migración a unidad fija por tipo' ||
                    CASE
                        WHEN e.progress_unit IS NULL THEN ' (sin unidad anterior)'
                        ELSE ' (unidad anterior: ' || e.progress_unit || ')'
                    END,
                'migration',
                'reset',
                e.user_id
            FROM entries e
            WHERE (
                e.progress_unit IS NULL
                OR e.progress_unit IN ({legacy_units_sql})
            )
            AND (
                e.current_progress IS NOT NULL AND e.current_progress > 0
                OR EXISTS (
                    SELECT 1 FROM progress_events pe
                    WHERE pe.entry_id = e.id
                )
            )
            """
        )
    )

    # 2) Actualizar entradas afectadas: unidad fija, progreso a 0, total a NULL.
    #    Para las que no tenían historial ni progreso, simplemente se ajusta la
    #    unidad y se normaliza current_progress a 0 si era NULL.
    connection.execute(
        sa.text(
            f"""
            UPDATE entries
            SET
                progress_unit = CASE type
                    WHEN 'anime' THEN 'episodes'::progress_unit
                    WHEN 'manga' THEN 'chapters'::progress_unit
                    WHEN 'game' THEN 'hours'::progress_unit
                END,
                current_progress = COALESCE(current_progress, 0),
                progress_total = NULL
            WHERE progress_unit IS NULL OR progress_unit IN ({legacy_units_sql})
            """
        )
    )


def downgrade() -> None:
    # Revertir columnas a Integer. PostgreSQL truncará los decimales; los valores
    # enteros se mantienen. Esta operación es destructiva para datos decimales.
    op.alter_column(
        "entries",
        "current_progress",
        existing_type=sa.Numeric(precision=10, scale=2),
        type_=sa.Integer(),
        existing_nullable=True,
    )
    op.alter_column(
        "entries",
        "progress_total",
        existing_type=sa.Numeric(precision=10, scale=2),
        type_=sa.Integer(),
        existing_nullable=True,
    )
    op.alter_column(
        "progress_events",
        "previous_value",
        existing_type=sa.Numeric(precision=10, scale=2),
        type_=sa.Integer(),
        existing_nullable=True,
    )
    op.alter_column(
        "progress_events",
        "current_value",
        existing_type=sa.Numeric(precision=10, scale=2),
        type_=sa.Integer(),
        existing_nullable=False,
    )

    # Revertir unidades fijas a NULL. Los eventos de migración (source='migration')
    # permanecen en el timeline; el downgrade no intenta borrarlos.
    op.execute(
        """
        UPDATE entries
        SET progress_unit = NULL
        WHERE progress_unit IN ('episodes', 'chapters', 'hours')
        """
    )

    # Nota: no es posible eliminar el valor 'hours' del enum en PostgreSQL sin
    # recrear el tipo. Este downgrade deja el valor disponible, pero el schema
    # de la aplicación (SQLAlchemy) no lo usará para nuevas entradas.
