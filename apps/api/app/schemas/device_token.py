from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class PairingCodeResponse(BaseModel):
    """Respuesta al generar un código de emparejamiento."""

    pairing_code: str
    expires_in: int = Field(description="Segundos hasta que expire el código")


class ActivateDeviceRequest(BaseModel):
    """Solicitud para activar un dispositivo con un código de emparejamiento."""

    pairing_code: str = Field(..., min_length=6, max_length=10)
    device_name: str = Field(..., min_length=1, max_length=50)


class ActivateDeviceResponse(BaseModel):
    """Respuesta al activar un dispositivo. Contiene el token en texto plano (única vez)."""

    device_token: str = Field(description="Token de acceso. Solo se muestra una vez.")
    device_id: UUID
    device_name: str


class DeviceResponse(BaseModel):
    """Respuesta con información de un dispositivo emparejado."""

    id: UUID
    device_name: str
    last_used_at: datetime | None
    is_revoked: bool
    expires_at: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DeviceListResponse(BaseModel):
    """Lista de dispositivos emparejados del usuario."""

    devices: list[DeviceResponse]
