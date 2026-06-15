import pytest
from app.services.cache import CacheService


@pytest.fixture
def cache_service():
    return CacheService()


def test_cache_service_has_redis_url(cache_service):
    assert cache_service.redis_url is not None


def test_cache_service_train_key_format(cache_service):
    key = cache_service._train_key("12301")
    assert key == "train:12301:raw"


def test_cache_service_inactive_key_format(cache_service):
    key = cache_service._inactive_key("12301")
    assert key == "train:12301:inactive"
