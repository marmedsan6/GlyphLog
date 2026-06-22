from fastapi import APIRouter, Depends, Request

from app.core.config import settings
from app.core.dependencies import get_auth_service
from app.core.rate_limiter import limiter
from app.schemas.auth import LoginRequest, RegisterResponse, TokenResponse
from app.schemas.user import UserCreate
from app.services.auth_service import AuthService

router = APIRouter()


@router.post("/register", response_model=RegisterResponse, status_code=201)
@limiter.limit(settings.rate_limit_register)
async def register(
    request: Request,
    data: UserCreate,
    service: AuthService = Depends(get_auth_service),
) -> RegisterResponse:
    return await service.register(data)


@router.post("/login", response_model=TokenResponse)
@limiter.limit(settings.rate_limit_login)
async def login(
    request: Request,
    data: LoginRequest,
    service: AuthService = Depends(get_auth_service),
) -> TokenResponse:
    return await service.login(data)
