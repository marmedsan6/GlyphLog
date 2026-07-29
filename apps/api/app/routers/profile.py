from fastapi import APIRouter, Depends, File, UploadFile

from app.core.dependencies import get_profile_service
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.profile import (
    AvatarUploadResponse,
    UserProfileResponse,
    UserProfileUpdate,
)
from app.services.profile_service import ProfileService

router = APIRouter()


@router.get("/me", response_model=UserProfileResponse)
async def get_profile(
    current_user: User = Depends(get_current_user),
    service: ProfileService = Depends(get_profile_service),
) -> UserProfileResponse:
    return await service.get_profile(current_user.id)


@router.patch("/me", response_model=UserProfileResponse)
async def update_profile(
    data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    service: ProfileService = Depends(get_profile_service),
) -> UserProfileResponse:
    return await service.update_profile(current_user.id, data)


@router.post("/me/avatar", response_model=AvatarUploadResponse)
async def upload_avatar(
    avatar: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    service: ProfileService = Depends(get_profile_service),
) -> AvatarUploadResponse:
    return await service.upload_avatar(current_user.id, avatar)


@router.delete("/me/avatar", response_model=UserProfileResponse)
async def delete_avatar(
    current_user: User = Depends(get_current_user),
    service: ProfileService = Depends(get_profile_service),
) -> UserProfileResponse:
    return await service.delete_avatar(current_user.id)
