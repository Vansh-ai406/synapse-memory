from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from pymongo.errors import ServerSelectionTimeoutError
from app.main import app


def test_readiness_checks_database():
    with patch('app.main.ping', new=AsyncMock(return_value=True)):
        response = TestClient(app).get('/health/ready')
    assert response.status_code == 200
    assert response.json()['database'] == 'connected'


def test_database_failure_is_sanitized():
    with patch('app.main.ping', new=AsyncMock(side_effect=ServerSelectionTimeoutError('secret-host'))):
        response = TestClient(app).get('/health/ready')
    assert response.status_code == 503
    assert 'secret-host' not in response.text


def test_static_server_does_not_expose_env():
    response = TestClient(app).get('/.env')
    assert response.status_code == 404


def test_built_frontend_is_served():
    from app.main import frontend_dist
    if frontend_dist.exists():
        response = TestClient(app).get('/')
        assert response.status_code == 200
        assert 'RecallOS' in response.text
