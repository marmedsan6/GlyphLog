from fastapi import APIRouter, Depends

from app.core.dependencies import get_auth_service
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.user import UserCreate, UserResponse
from app.services.auth_service import AuthService

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(
    data: UserCreate,
    service: AuthService = Depends(get_auth_service),
) -> UserResponse:
    return await service.register(data)


@router.post("/login", response_model=TokenResponse)
async def login(
    data: LoginRequest,
    service: AuthService = Depends(get_auth_service),
) -> TokenResponse:
    return await service.login(data)
