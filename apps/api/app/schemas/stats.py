"""Schemas para endpoints de estadísticas."""

from pydantic import BaseModel, Field


class UserStats(BaseModel):
    """Estadísticas completas del usuario."""

    total_entries: int = Field(..., description="Total de entradas")
    by_type: dict[str, int] = Field(..., description="Entradas por tipo (anime/manga/game)")
    by_status: dict[str, int] = Field(
        ..., description="Entradas por estado (watching/completed/etc)"
    )
    avg_rating: float = Field(..., description="Rating promedio global", ge=0, le=10)
    avg_rating_by_type: dict[str, float] = Field(..., description="Rating promedio por tipo")
    completion_rate: float = Field(
        ..., description="Porcentaje de entradas completadas", ge=0, le=100
    )
    completion_rate_by_type: dict[str, float] = Field(
        ..., description="Porcentaje de completado por tipo"
    )
    top_genres: list[tuple[str, int]] = Field(
        ..., description="Top 10 géneros más frecuentes (nombre, count)"
    )
    rating_distribution: dict[int, int] = Field(
        ..., description="Distribución de ratings (1-10 -> count)"
    )
    total_progress: dict[str, float] = Field(
        ..., description="Progreso acumulado por unidad (episodes/chapters/hours)"
    )
    entries_by_month: list[tuple[str, int]] = Field(
        ..., description="Entradas añadidas por mes (YYYY-MM, count) - últimos 12 meses"
    )
    current_streak_days: int = Field(
        ..., description="Días consecutivos con actualizaciones de progreso"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "total_entries": 45,
                "by_type": {"anime": 20, "manga": 15, "game": 10},
                "by_status": {
                    "watching": 5,
                    "completed": 30,
                    "on_hold": 3,
                    "dropped": 2,
                    "plan_to_watch": 5,
                },
                "avg_rating": 8.2,
                "avg_rating_by_type": {"anime": 8.5, "manga": 7.8, "game": 8.3},
                "completion_rate": 66.7,
                "completion_rate_by_type": {"anime": 70.0, "manga": 60.0, "game": 70.0},
                "top_genres": [
                    ("Action", 15),
                    ("Fantasy", 12),
                    ("Adventure", 10),
                ],
                "rating_distribution": {
                    1: 0,
                    2: 0,
                    3: 1,
                    4: 2,
                    5: 3,
                    6: 5,
                    7: 8,
                    8: 12,
                    9: 10,
                    10: 4,
                },
                "total_progress": {"episodes": 240.0, "chapters": 350.0, "hours": 120.5},
                "entries_by_month": [
                    ("2025-08", 3),
                    ("2025-09", 5),
                    ("2025-10", 2),
                ],
                "current_streak_days": 7,
            }
        }
