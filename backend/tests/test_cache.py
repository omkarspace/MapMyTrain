import pytest
from app.services.cache import CacheService


@pytest.fixture
def cache_service():
    return CacheService()


def test_cache_service_train_key_format(cache_service):
    key = cache_service._train_key("12301")
    assert key == "train:12301:raw"


def test_cache_service_initializes_without_client(cache_service):
    assert cache_service._client is None
