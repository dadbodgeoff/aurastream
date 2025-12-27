"""
Unit tests for Token Store Service.

Tests refresh token tracking and reuse detection functionality.
"""

import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock, patch
import uuid

from backend.services.token_store import (
    TokenStore,
    TokenReuseDetectedError,
    get_token_store,
    reset_token_store,
)


class TestTokenStore:
    """Tests for TokenStore class."""
    
    @pytest.fixture
    def mock_redis(self):
        """Create a mock Redis client."""
        redis_mock = MagicMock()
        # Default return values
        redis_mock.hgetall.return_value = {}
        redis_mock.hget.return_value = None
        redis_mock.smembers.return_value = set()
        redis_mock.scard.return_value = 0
        redis_mock.delete.return_value = 1
        return redis_mock
    
    @pytest.fixture
    def token_store(self, mock_redis):
        """Create a TokenStore instance with mock Redis."""
        return TokenStore(mock_redis)
    
    @pytest.fixture
    def sample_jti(self):
        """Generate a sample JWT ID."""
        return str(uuid.uuid4())
    
    @pytest.fixture
    def sample_user_id(self):
        """Generate a sample user ID."""
        return str(uuid.uuid4())
    
    # =========================================================================
    # Token Registration Tests
    # =========================================================================
    
    @pytest.mark.asyncio
    async def test_register_token_success(self, token_store, mock_redis, sample_jti, sample_user_id):
        """Test successful token registration."""
        expires_at = datetime.now(timezone.utc) + timedelta(days=30)
        
        await token_store.register_token(
            jti=sample_jti,
            user_id=sample_user_id,
            expires_at=expires_at,
        )
        
        # Verify Redis calls
        mock_redis.hset.assert_called_once()
        call_args = mock_redis.hset.call_args
        assert call_args[0][0] == f"refresh_token:{sample_jti}"
        
        mapping = call_args[1]["mapping"]
        assert mapping["user_id"] == sample_user_id
        assert mapping["used"] == "false"
        assert mapping["used_at"] == ""
        assert mapping["replaced_by"] == ""
        
        # Verify TTL was set
        mock_redis.expire.assert_called()
        
        # Verify token was added to user's set
        mock_redis.sadd.assert_called_once()
        sadd_args = mock_redis.sadd.call_args[0]
        assert sadd_args[0] == f"user_tokens:{sample_user_id}"
        assert sadd_args[1] == sample_jti
    
    @pytest.mark.asyncio
    async def test_register_token_with_expired_ttl(self, token_store, mock_redis, sample_jti, sample_user_id):
        """Test token registration with already expired TTL uses default."""
        # Expired time
        expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
        
        await token_store.register_token(
            jti=sample_jti,
            user_id=sample_user_id,
            expires_at=expires_at,
        )
        
        # Should use default TTL (30 days in seconds)
        expire_calls = mock_redis.expire.call_args_list
        assert len(expire_calls) >= 1
        # First call should be for the token key with default TTL
        token_ttl = expire_calls[0][0][1]
        assert token_ttl == 30 * 86400  # 30 days in seconds
    
    # =========================================================================
    # Token Use Tests
    # =========================================================================
    
    @pytest.mark.asyncio
    async def test_use_token_success(self, token_store, mock_redis, sample_jti, sample_user_id):
        """Test successful token use (first time)."""
        # Setup: Token exists and hasn't been used
        mock_redis.hgetall.return_value = {
            b"user_id": sample_user_id.encode(),
            b"created_at": datetime.now(timezone.utc).isoformat().encode(),
            b"used": b"false",
            b"used_at": b"",
            b"replaced_by": b"",
        }
        
        new_jti = str(uuid.uuid4())
        success, error = await token_store.use_token(
            jti=sample_jti,
            user_id=sample_user_id,
            new_jti=new_jti,
        )
        
        assert success is True
        assert error is None
        
        # Verify token was marked as used
        mock_redis.hset.assert_called_once()
        call_args = mock_redis.hset.call_args
        mapping = call_args[1]["mapping"]
        assert mapping["used"] == "true"
        assert mapping["replaced_by"] == new_jti
    
    @pytest.mark.asyncio
    async def test_use_token_not_found(self, token_store, mock_redis, sample_jti, sample_user_id):
        """Test using a token that doesn't exist."""
        mock_redis.hgetall.return_value = {}
        
        success, error = await token_store.use_token(
            jti=sample_jti,
            user_id=sample_user_id,
        )
        
        assert success is False
        assert error == "invalid"
    
    @pytest.mark.asyncio
    async def test_use_token_wrong_user(self, token_store, mock_redis, sample_jti, sample_user_id):
        """Test using a token that belongs to a different user."""
        different_user_id = str(uuid.uuid4())
        
        mock_redis.hgetall.return_value = {
            b"user_id": different_user_id.encode(),
            b"created_at": datetime.now(timezone.utc).isoformat().encode(),
            b"used": b"false",
            b"used_at": b"",
            b"replaced_by": b"",
        }
        
        success, error = await token_store.use_token(
            jti=sample_jti,
            user_id=sample_user_id,
        )
        
        assert success is False
        assert error == "wrong_user"
    
    @pytest.mark.asyncio
    async def test_use_token_reuse_detected(self, token_store, mock_redis, sample_jti, sample_user_id):
        """Test that reusing a token raises TokenReuseDetectedError."""
        # Setup: Token exists and HAS been used
        mock_redis.hgetall.return_value = {
            b"user_id": sample_user_id.encode(),
            b"created_at": datetime.now(timezone.utc).isoformat().encode(),
            b"used": b"true",
            b"used_at": datetime.now(timezone.utc).isoformat().encode(),
            b"replaced_by": str(uuid.uuid4()).encode(),
        }
        mock_redis.smembers.return_value = {sample_jti.encode()}
        
        with pytest.raises(TokenReuseDetectedError) as exc_info:
            await token_store.use_token(
                jti=sample_jti,
                user_id=sample_user_id,
            )
        
        assert exc_info.value.user_id == sample_user_id
        assert exc_info.value.jti == sample_jti
        
        # Verify all user tokens were invalidated
        mock_redis.smembers.assert_called_once()
        mock_redis.delete.assert_called()
    
    # =========================================================================
    # Token Invalidation Tests
    # =========================================================================
    
    @pytest.mark.asyncio
    async def test_invalidate_token_success(self, token_store, mock_redis, sample_jti, sample_user_id):
        """Test successful token invalidation."""
        mock_redis.hget.return_value = sample_user_id.encode()
        mock_redis.delete.return_value = 1
        
        result = await token_store.invalidate_token(sample_jti)
        
        assert result is True
        mock_redis.delete.assert_called_with(f"refresh_token:{sample_jti}")
        mock_redis.srem.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_invalidate_token_not_found(self, token_store, mock_redis, sample_jti):
        """Test invalidating a token that doesn't exist."""
        mock_redis.hget.return_value = None
        mock_redis.delete.return_value = 0
        
        result = await token_store.invalidate_token(sample_jti)
        
        assert result is False
    
    @pytest.mark.asyncio
    async def test_invalidate_all_user_tokens(self, token_store, mock_redis, sample_user_id):
        """Test invalidating all tokens for a user."""
        jti1 = str(uuid.uuid4())
        jti2 = str(uuid.uuid4())
        jti3 = str(uuid.uuid4())
        
        mock_redis.smembers.return_value = {
            jti1.encode(),
            jti2.encode(),
            jti3.encode(),
        }
        mock_redis.delete.return_value = 1
        
        count = await token_store.invalidate_all_user_tokens(sample_user_id)
        
        assert count == 3
        
        # Verify user's token set was cleared
        delete_calls = mock_redis.delete.call_args_list
        user_key_deleted = any(
            f"user_tokens:{sample_user_id}" in str(call)
            for call in delete_calls
        )
        assert user_key_deleted
    
    @pytest.mark.asyncio
    async def test_invalidate_all_user_tokens_empty(self, token_store, mock_redis, sample_user_id):
        """Test invalidating tokens when user has none."""
        mock_redis.smembers.return_value = set()
        
        count = await token_store.invalidate_all_user_tokens(sample_user_id)
        
        assert count == 0
    
    # =========================================================================
    # Token Count Tests
    # =========================================================================
    
    @pytest.mark.asyncio
    async def test_get_user_token_count(self, token_store, mock_redis, sample_user_id):
        """Test getting the count of active tokens for a user."""
        mock_redis.scard.return_value = 5
        
        count = await token_store.get_user_token_count(sample_user_id)
        
        assert count == 5
        mock_redis.scard.assert_called_once_with(f"user_tokens:{sample_user_id}")
    
    @pytest.mark.asyncio
    async def test_get_user_token_count_zero(self, token_store, mock_redis, sample_user_id):
        """Test getting token count when user has no tokens."""
        mock_redis.scard.return_value = 0
        
        count = await token_store.get_user_token_count(sample_user_id)
        
        assert count == 0
    
    # =========================================================================
    # Token Validity Tests
    # =========================================================================
    
    @pytest.mark.asyncio
    async def test_is_token_valid_true(self, token_store, mock_redis, sample_jti):
        """Test checking if an unused token is valid."""
        mock_redis.hgetall.return_value = {
            b"user_id": b"user-123",
            b"used": b"false",
        }
        
        is_valid = await token_store.is_token_valid(sample_jti)
        
        assert is_valid is True
    
    @pytest.mark.asyncio
    async def test_is_token_valid_false_used(self, token_store, mock_redis, sample_jti):
        """Test checking if a used token is invalid."""
        mock_redis.hgetall.return_value = {
            b"user_id": b"user-123",
            b"used": b"true",
        }
        
        is_valid = await token_store.is_token_valid(sample_jti)
        
        assert is_valid is False
    
    @pytest.mark.asyncio
    async def test_is_token_valid_false_not_found(self, token_store, mock_redis, sample_jti):
        """Test checking if a non-existent token is invalid."""
        mock_redis.hgetall.return_value = {}
        
        is_valid = await token_store.is_token_valid(sample_jti)
        
        assert is_valid is False


class TestTokenReuseDetectedError:
    """Tests for TokenReuseDetectedError exception."""
    
    def test_error_attributes(self):
        """Test that error has correct attributes."""
        user_id = "user-123"
        jti = "token-456"
        
        error = TokenReuseDetectedError(user_id, jti)
        
        assert error.user_id == user_id
        assert error.jti == jti
        assert "user-123" in str(error)
    
    def test_error_message(self):
        """Test error message format."""
        error = TokenReuseDetectedError("user-abc", "jti-xyz")
        
        assert "Token reuse detected" in str(error)
        assert "user-abc" in str(error)


class TestGetTokenStore:
    """Tests for get_token_store singleton function."""
    
    def setup_method(self):
        """Reset singleton before each test."""
        reset_token_store()
    
    def teardown_method(self):
        """Reset singleton after each test."""
        reset_token_store()
    
    @patch('backend.services.token_store.redis')
    @patch('backend.api.config.get_settings')
    def test_get_token_store_creates_singleton(self, mock_get_settings, mock_redis):
        """Test that get_token_store creates a singleton instance."""
        mock_settings = MagicMock()
        mock_settings.REDIS_URL = "redis://localhost:6379"
        mock_get_settings.return_value = mock_settings
        
        mock_redis_client = MagicMock()
        mock_redis.from_url.return_value = mock_redis_client
        
        store1 = get_token_store()
        store2 = get_token_store()
        
        assert store1 is store2
        mock_redis.from_url.assert_called_once()
    
    @patch('backend.services.token_store.redis')
    @patch('backend.api.config.get_settings')
    def test_reset_token_store(self, mock_get_settings, mock_redis):
        """Test that reset_token_store clears the singleton."""
        mock_settings = MagicMock()
        mock_settings.REDIS_URL = "redis://localhost:6379"
        mock_get_settings.return_value = mock_settings
        
        mock_redis_client = MagicMock()
        mock_redis.from_url.return_value = mock_redis_client
        
        store1 = get_token_store()
        reset_token_store()
        store2 = get_token_store()
        
        # After reset, a new instance should be created
        assert mock_redis.from_url.call_count == 2


class TestTokenStoreIntegration:
    """Integration-style tests for token store workflows."""
    
    @pytest.fixture
    def mock_redis(self):
        """Create a mock Redis client with stateful behavior."""
        redis_mock = MagicMock()
        storage = {}
        sets = {}
        
        def hset(key, mapping=None):
            if key not in storage:
                storage[key] = {}
            if mapping:
                storage[key].update(mapping)
        
        def hgetall(key):
            return {k.encode(): v.encode() if isinstance(v, str) else v 
                    for k, v in storage.get(key, {}).items()}
        
        def hget(key, field):
            data = storage.get(key, {})
            value = data.get(field)
            return value.encode() if isinstance(value, str) else value
        
        def delete(key):
            if key in storage:
                del storage[key]
                return 1
            if key in sets:
                del sets[key]
                return 1
            return 0
        
        def sadd(key, value):
            if key not in sets:
                sets[key] = set()
            sets[key].add(value)
        
        def srem(key, value):
            if key in sets and value in sets[key]:
                sets[key].remove(value)
                return 1
            return 0
        
        def smembers(key):
            return {v.encode() if isinstance(v, str) else v 
                    for v in sets.get(key, set())}
        
        def scard(key):
            return len(sets.get(key, set()))
        
        redis_mock.hset = hset
        redis_mock.hgetall = hgetall
        redis_mock.hget = hget
        redis_mock.delete = delete
        redis_mock.sadd = sadd
        redis_mock.srem = srem
        redis_mock.smembers = smembers
        redis_mock.scard = scard
        redis_mock.expire = MagicMock()
        
        return redis_mock
    
    @pytest.fixture
    def token_store(self, mock_redis):
        """Create a TokenStore with stateful mock Redis."""
        return TokenStore(mock_redis)
    
    @pytest.mark.asyncio
    async def test_full_token_lifecycle(self, token_store):
        """Test complete token lifecycle: register -> use -> invalidate."""
        user_id = str(uuid.uuid4())
        jti1 = str(uuid.uuid4())
        jti2 = str(uuid.uuid4())
        expires_at = datetime.now(timezone.utc) + timedelta(days=30)
        
        # 1. Register first token
        await token_store.register_token(jti1, user_id, expires_at)
        
        # 2. Verify token count
        count = await token_store.get_user_token_count(user_id)
        assert count == 1
        
        # 3. Use the token (should succeed)
        success, error = await token_store.use_token(jti1, user_id, jti2)
        assert success is True
        assert error is None
        
        # 4. Register the new token
        await token_store.register_token(jti2, user_id, expires_at)
        
        # 5. Verify token count increased
        count = await token_store.get_user_token_count(user_id)
        assert count == 2
        
        # 6. Try to reuse the old token (should fail with security alert)
        with pytest.raises(TokenReuseDetectedError):
            await token_store.use_token(jti1, user_id)
        
        # 7. All tokens should be invalidated
        count = await token_store.get_user_token_count(user_id)
        assert count == 0
    
    @pytest.mark.asyncio
    async def test_multiple_devices_scenario(self, token_store):
        """Test scenario with multiple devices (multiple active tokens)."""
        user_id = str(uuid.uuid4())
        expires_at = datetime.now(timezone.utc) + timedelta(days=30)
        
        # User logs in from 3 devices
        device_tokens = [str(uuid.uuid4()) for _ in range(3)]
        
        for jti in device_tokens:
            await token_store.register_token(jti, user_id, expires_at)
        
        # Verify all tokens registered
        count = await token_store.get_user_token_count(user_id)
        assert count == 3
        
        # Logout from one device
        await token_store.invalidate_token(device_tokens[0])
        
        # Verify count decreased
        count = await token_store.get_user_token_count(user_id)
        assert count == 2
        
        # Logout from all devices
        invalidated = await token_store.invalidate_all_user_tokens(user_id)
        assert invalidated == 2
        
        # Verify all tokens gone
        count = await token_store.get_user_token_count(user_id)
        assert count == 0
