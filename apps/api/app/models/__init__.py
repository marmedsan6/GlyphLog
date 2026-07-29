# Importar todos los modelos para que SQLAlchemy los registre en Base.metadata.
# Requerido para que Alembic detecte todas las tablas en autogenerate.
from app.models.device_token import DeviceToken
from app.models.entry import Entry
from app.models.progress_event import ProgressEvent
from app.models.user import User

__all__ = ["User", "Entry", "ProgressEvent", "DeviceToken"]
