from app.config import settings


def test_settings_has_default_database_url():
    assert "postgresql" in settings.DATABASE_URL


def test_settings_has_default_redis_url():
    assert "redis" in settings.REDIS_URL


def test_settings_mock_mode_default():
    assert settings.DEVELOPMENT_MOCK_MODE is True


def test_settings_api_prefix():
    assert settings.API_V1_STR == "/api/v1"
