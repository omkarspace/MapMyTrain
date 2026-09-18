import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.cleanup import clean_expired_telemetry, CLEANUP_INTERVAL_SECONDS, BATCH_SIZE


@pytest.mark.asyncio
async def test_cleanup_deletes_in_batches():
    mock_conn = AsyncMock()
    mock_result = "DELETE 10000"
    mock_conn.execute = AsyncMock(return_value=mock_result)

    mock_pool = AsyncMock()
    mock_pool.acquire.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
    mock_pool.acquire.return_value.__aexit__ = AsyncMock(return_value=False)

    with patch("app.services.cleanup.db_manager") as mock_db:
        mock_db.get_connection.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
        mock_db.get_connection.return_value.__aexit__ = AsyncMock(return_value=False)

        call_count = 0
        original_execute = mock_conn.execute

        async def counting_execute(query, *args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count >= 2:
                return "DELETE 5000"
            return mock_result

        mock_conn.execute = counting_execute
        await clean_expired_telemetry()
        assert call_count == 2


@pytest.mark.asyncio
async def test_cleanup_stops_when_no_more_records():
    mock_conn = AsyncMock()
    mock_conn.execute = AsyncMock(return_value="DELETE 0")

    with patch("app.services.cleanup.db_manager") as mock_db:
        mock_db.get_connection.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
        mock_db.get_connection.return_value.__aexit__ = AsyncMock(return_value=False)

        await clean_expired_telemetry()
        assert mock_conn.execute.call_count == 1


def test_cleanup_constants():
    assert CLEANUP_INTERVAL_SECONDS == 3600
    assert BATCH_SIZE == 10000
