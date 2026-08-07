"""Servicio de estadísticas y métricas del usuario."""

import logging
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entry import Entry, EntryStatus, EntryType
from app.models.progress_event import ProgressEvent

logger = logging.getLogger(__name__)


class StatsService:
    """Servicio para calcular estadísticas agregadas del usuario."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user_stats(self, user_id: UUID) -> dict:
        """
        Calcula estadísticas completas del usuario.

        Args:
            user_id: ID del usuario

        Returns:
            Diccionario con todas las métricas agregadas
        """
        logger.info(f"Calculando estadísticas para user {user_id}")

        # Cargar todas las entradas del usuario de una vez
        stmt = select(Entry).where(Entry.user_id == user_id)
        result = await self.db.execute(stmt)
        entries = list(result.scalars().all())

        if not entries:
            return self._empty_stats()

        # Calcular métricas básicas
        total_entries = len(entries)
        by_type = self._count_by_type(entries)
        by_status = self._count_by_status(entries)

        # Ratings
        avg_rating = self._calculate_avg_rating(entries)
        avg_rating_by_type = self._calculate_avg_rating_by_type(entries)
        rating_distribution = self._calculate_rating_distribution(entries)

        # Completion rates
        completion_rate = self._calculate_completion_rate(entries)
        completion_rate_by_type = self._calculate_completion_rate_by_type(entries)

        # Progreso acumulado
        total_progress = self._calculate_total_progress(entries)

        # Top géneros (placeholder - necesitaría campo genres en Entry)
        top_genres = []

        # Entradas por mes (últimos 12 meses)
        entries_by_month = await self._calculate_entries_by_month(user_id)

        # Racha de actualizaciones
        current_streak_days = await self._calculate_current_streak(user_id)

        return {
            "total_entries": total_entries,
            "by_type": by_type,
            "by_status": by_status,
            "avg_rating": avg_rating,
            "avg_rating_by_type": avg_rating_by_type,
            "completion_rate": completion_rate,
            "completion_rate_by_type": completion_rate_by_type,
            "top_genres": top_genres,
            "rating_distribution": rating_distribution,
            "total_progress": total_progress,
            "entries_by_month": entries_by_month,
            "current_streak_days": current_streak_days,
        }

    def _empty_stats(self) -> dict:
        """Retorna estadísticas vacías cuando no hay entradas."""
        return {
            "total_entries": 0,
            "by_type": {t.value: 0 for t in EntryType},
            "by_status": {s.value: 0 for s in EntryStatus},
            "avg_rating": 0.0,
            "avg_rating_by_type": {t.value: 0.0 for t in EntryType},
            "completion_rate": 0.0,
            "completion_rate_by_type": {t.value: 0.0 for t in EntryType},
            "top_genres": [],
            "rating_distribution": {},
            "total_progress": {},
            "entries_by_month": [],
            "current_streak_days": 0,
        }

    def _count_by_type(self, entries: list[Entry]) -> dict[str, int]:
        """Cuenta entradas por tipo."""
        counter = Counter(e.type.value for e in entries)
        return {t.value: counter.get(t.value, 0) for t in EntryType}

    def _count_by_status(self, entries: list[Entry]) -> dict[str, int]:
        """Cuenta entradas por estado."""
        counter = Counter(e.status.value for e in entries)
        return {s.value: counter.get(s.value, 0) for s in EntryStatus}

    def _calculate_avg_rating(self, entries: list[Entry]) -> float:
        """Calcula rating promedio global."""
        ratings = [float(e.rating) for e in entries if e.rating is not None]
        return sum(ratings) / len(ratings) if ratings else 0.0

    def _calculate_avg_rating_by_type(self, entries: list[Entry]) -> dict[str, float]:
        """Calcula rating promedio por tipo."""
        ratings_by_type = defaultdict(list)
        for entry in entries:
            if entry.rating is not None:
                ratings_by_type[entry.type.value].append(float(entry.rating))

        return {
            t.value: (sum(ratings_by_type[t.value]) / len(ratings_by_type[t.value]))
            if ratings_by_type[t.value]
            else 0.0
            for t in EntryType
        }

    def _calculate_completion_rate(self, entries: list[Entry]) -> float:
        """Calcula tasa de completado global."""
        if not entries:
            return 0.0
        completed = sum(1 for e in entries if e.status == EntryStatus.completed)
        return (completed / len(entries)) * 100

    def _calculate_completion_rate_by_type(self, entries: list[Entry]) -> dict[str, float]:
        """Calcula tasa de completado por tipo."""
        stats_by_type = defaultdict(lambda: {"total": 0, "completed": 0})

        for entry in entries:
            stats_by_type[entry.type.value]["total"] += 1
            if entry.status == EntryStatus.completed:
                stats_by_type[entry.type.value]["completed"] += 1

        return {
            t.value: (
                (stats_by_type[t.value]["completed"] / stats_by_type[t.value]["total"]) * 100
                if stats_by_type[t.value]["total"] > 0
                else 0.0
            )
            for t in EntryType
        }

    def _calculate_rating_distribution(self, entries: list[Entry]) -> dict[int, int]:
        """Calcula distribución de ratings (1-10)."""
        # Redondear ratings a enteros
        ratings = [round(float(e.rating)) for e in entries if e.rating is not None]
        counter = Counter(ratings)
        # Asegurar que todos los valores 1-10 estén presentes
        return {i: counter.get(i, 0) for i in range(1, 11)}

    def _calculate_total_progress(self, entries: list[Entry]) -> dict[str, float]:
        """Calcula progreso total acumulado por unidad."""
        progress_by_unit = defaultdict(Decimal)

        for entry in entries:
            if entry.current_progress is not None and entry.progress_unit is not None:
                progress_by_unit[entry.progress_unit.value] += entry.current_progress

        # Convertir a float para serialización JSON
        return {unit: float(total) for unit, total in progress_by_unit.items()}

    async def _calculate_entries_by_month(self, user_id: UUID) -> list[tuple[str, int]]:
        """Calcula entradas añadidas por mes (últimos 12 meses)."""
        # Fecha de hace 12 meses
        twelve_months_ago = datetime.now() - timedelta(days=365)

        # Query para contar entradas por mes
        stmt = (
            select(
                func.to_char(Entry.created_at, "YYYY-MM").label("month"),
                func.count(Entry.id).label("count"),
            )
            .where(Entry.user_id == user_id, Entry.created_at >= twelve_months_ago)
            .group_by("month")
            .order_by("month")
        )

        result = await self.db.execute(stmt)
        rows = result.all()

        return [(row.month, row.count) for row in rows]

    async def _calculate_current_streak(self, user_id: UUID) -> int:
        """
        Calcula racha actual de días con actualizaciones de progreso.

        Cuenta días consecutivos desde hoy hacia atrás donde hubo al menos
        un evento de progreso del usuario.
        """
        # Obtener eventos de progreso ordenados por fecha DESC
        stmt = (
            select(func.date(ProgressEvent.recorded_at).label("event_date"))
            .join(Entry)
            .where(Entry.user_id == user_id)
            .distinct()
            .order_by(func.date(ProgressEvent.recorded_at).desc())
            .limit(100)  # Limitar a últimos 100 días únicos por performance
        )

        result = await self.db.execute(stmt)
        event_dates = [row.event_date for row in result.all()]

        if not event_dates:
            return 0

        # Contar días consecutivos desde hoy
        today = datetime.now().date()
        streak = 0

        for i, event_date in enumerate(event_dates):
            expected_date = today - timedelta(days=i)
            if event_date == expected_date:
                streak += 1
            else:
                break

        return streak
