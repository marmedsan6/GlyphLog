from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.core.dependencies import get_device_token_service
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.device_token import (
    ActivateDeviceRequest,
    ActivateDeviceResponse,
    DeviceListResponse,
    PairingCodeResponse,
)
from app.services.device_token_service import DeviceTokenService

router = APIRouter()


@router.post("/pair", response_model=PairingCodeResponse, status_code=status.HTTP_201_CREATED)
async def generate_pairing_code(
    current_user: User = Depends(get_current_user),
    service: DeviceTokenService = Depends(get_device_token_service),
) -> PairingCodeResponse:
    """Genera un código de emparejamiento para vincular un dispositivo externo.

    El código tiene 6 caracteres alfanuméricos y expira en 5 minutos.
    Requiere autenticación JWT desde la SPA.
    """
    return await service.generate_pairing_code(user_id=current_user.id)


@router.post("/activate", response_model=ActivateDeviceResponse)
async def activate_device(
    data: ActivateDeviceRequest,
    service: DeviceTokenService = Depends(get_device_token_service),
) -> ActivateDeviceResponse:
    """Activa un dispositivo usando un código de emparejamiento.

    No requiere autenticación (el código es el mecanismo de autenticación).
    Devuelve el device_token que se debe guardar en el dispositivo.
    El token solo se muestra UNA VEZ.
    """
    return await service.activate_device(
        pairing_code=data.pairing_code,
        device_name=data.device_name,
    )


@router.get("/", response_model=DeviceListResponse)
async def list_devices(
    current_user: User = Depends(get_current_user),
    service: DeviceTokenService = Depends(get_device_token_service),
) -> DeviceListResponse:
    """Lista todos los dispositivos emparejados activos del usuario.

    Requiere autenticación JWT desde la SPA.
    """
    return await service.list_devices(user_id=current_user.id)


@router.delete("/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_device(
    device_id: UUID,
    current_user: User = Depends(get_current_user),
    service: DeviceTokenService = Depends(get_device_token_service),
) -> None:
    """Revoca un dispositivo emparejado. El token dejará de funcionar inmediatamente.

    Requiere autenticación JWT desde la SPA.
    """
    await service.revoke_device(device_id=device_id, user_id=current_user.id)
