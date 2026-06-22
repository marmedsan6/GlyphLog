from httpx import AsyncClient


async def test_health_check(client: AsyncClient) -> None:
    """El endpoint /health responde 200 OK sin necesidad de autenticación ni BD."""
    response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
