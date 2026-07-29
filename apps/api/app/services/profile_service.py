from pathlib import Path
from uuid import UUID

from fastapi import HTTPException, UploadFile, status

from app.core.uploads import delete_avatar_file, save_avatar
from app.models.user import User
from app.repositories.profile_repository import ProfileRepository
from app.schemas.profile import AvatarUploadResponse, UserProfileResponse, UserProfileUpdate


class ProfileService:
    def __init__(self, profile_repo: ProfileRepository) -> None:
        self.profile_repo = profile_repo

    def _avatar_url(self, user: User) -> str:
        if user.avatar_filename:
            return f"/uploads/avatars/{user.avatar_filename}"
        return self._generated_avatar_url(user.id)

    @staticmethod
    def _generated_avatar_url(user_id: UUID) -> str:
        # DiceBear pixel-art es una URL pública, no requiere API key.
        return f"https://api.dicebear.com/9.x/pixel-art/svg?seed={user_id}"

    def _to_response(self, user: User) -> UserProfileResponse:
        return UserProfileResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            avatar_url=self._avatar_url(user),
            bio=user.bio,
        )

    async def get_profile(self, user_id: UUID) -> UserProfileResponse:
        user = await self.profile_repo.get_by_id(user_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado",
            )
        return self._to_response(user)

    async def update_profile(self, user_id: UUID, data: UserProfileUpdate) -> UserProfileResponse:
        user = await self.profile_repo.get_by_id(user_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado",
            )

        new_username = data.username
        if new_username is not None and new_username != user.username:
            if await self.profile_repo.username_exists(new_username):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Este nombre de usuario ya está en uso",
                )

        updated_user = await self.profile_repo.update_profile(
            user=user,
            username=new_username,
            bio=data.bio,
        )
        return self._to_response(updated_user)

    async def upload_avatar(self, user_id: UUID, file: UploadFile) -> AvatarUploadResponse:
        user = await self.profile_repo.get_by_id(user_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado",
            )

        # Eliminar avatar anterior si existe para mantener el disco limpio.
        if user.avatar_filename:
            delete_avatar_file(user.avatar_filename)

        avatar_path = await save_avatar(file, user_id)
        filename = Path(avatar_path).name

        updated_user = await self.profile_repo.update_avatar(user, filename)
        return AvatarUploadResponse(avatar_url=self._avatar_url(updated_user))

    async def delete_avatar(self, user_id: UUID) -> UserProfileResponse:
        user = await self.profile_repo.get_by_id(user_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado",
            )

        if user.avatar_filename:
            delete_avatar_file(user.avatar_filename)
            user = await self.profile_repo.clear_avatar(user)

        return self._to_response(user)
