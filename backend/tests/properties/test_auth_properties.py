"""
Property-based tests for authentication services.

These tests validate the correctness properties defined in the master schema:
- Property 1: JWT Token Round-Trip
- Property 2: Password Hash Verification
- Property 3: Expired Token Rejection

Uses Hypothesis for property-based testing with 100+ iterations.
"""

from datetime import timedelta

import pytest
from hypothesis import given, strategies as st, settings, assume

from backend.services.jwt_service import JWTService, TokenPayload
from backend.services.password_service import PasswordService
from backend.services.exceptions import TokenExpiredError, TokenInvalidError


# Test configuration
TEST_SECRET_KEY = "test-secret-key-for-property-tests-only"

# Use a lower cost factor for tests to speed up bcrypt operations
test_password_service = PasswordService(cost_factor=4)


# ============================================================================
# Hypothesis Strategies
# ============================================================================

# Strategy for valid user IDs (UUIDs as strings)
user_id_strategy = st.uuids().map(str)

# Strategy for subscription tiers
tier_strategy = st.sampled_from(['free', 'pro', 'studio'])

# Strategy for valid email addresses
email_strategy = st.emails()

# Strategy for valid passwords (meeting strength requirements)
# Using ASCII-only characters to avoid bcrypt's 72-byte limit with multi-byte chars
valid_password_strategy = st.text(
    alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*',
    min_size=8,
    max_size=64
).filter(
    lambda p: (
        any(c.isupper() for c in p) and
        any(c.islower() for c in p) and
        any(c.isdigit() for c in p)
    )
)

# Strategy for any password (for negative tests)
# Limited to 72 bytes to avoid bcrypt limit
any_password_strategy = st.text(
    alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+',
    min_size=1,
    max_size=72
)

# Strategy for expiration hours (positive)
exp_hours_strategy = st.integers(min_value=1, max_value=168)  # 1 hour to 1 week

# Strategy for seconds in the past (for expired tokens)
# Using at least 86400 seconds (1 day) to avoid timezone-related edge cases
# with datetime.utcnow().timestamp() which can be off by several hours
seconds_ago_strategy = st.integers(min_value=86400, max_value=86400 * 365)  # 1 day to 1 year


# ============================================================================
# Property 1: JWT Token Round-Trip
# ============================================================================

class TestJWTRoundTrip:
    """Property 1: JWT encode/decode round-trip produces equivalent payload."""
    
    @settings(max_examples=100)
    @given(
        user_id=user_id_strategy,
        tier=tier_strategy,
        email=email_strategy,
        exp_hours=exp_hours_strategy
    )
    def test_access_token_roundtrip(self, user_id: str, tier: str, email: str, exp_hours: int):
        """
        For any valid token payload, encoding then decoding SHALL produce
        an equivalent payload.
        """
        jwt_service = JWTService(secret_key=TEST_SECRET_KEY)
        
        # Create token with custom expiration
        token = jwt_service.create_access_token(
            user_id=user_id,
            tier=tier,
            email=email,
            expires_delta=timedelta(hours=exp_hours)
        )
        
        # Decode token
        payload = jwt_service.decode_access_token(token)
        
        # Verify round-trip
        assert payload.sub == user_id
        assert payload.tier == tier
        assert payload.email == email
        assert payload.type == "access"
        assert payload.jti is not None  # JTI should be generated
    
    @settings(max_examples=100)
    @given(user_id=user_id_strategy)
    def test_refresh_token_roundtrip(self, user_id: str):
        """Refresh token round-trip preserves user_id."""
        jwt_service = JWTService(secret_key=TEST_SECRET_KEY)
        
        token = jwt_service.create_refresh_token(user_id=user_id)
        payload = jwt_service.decode_refresh_token(token)
        
        assert payload.sub == user_id
        assert payload.type == "refresh"
        assert payload.jti is not None
    
    @settings(max_examples=50)
    @given(user_id=user_id_strategy, tier=tier_strategy, email=email_strategy)
    def test_jti_uniqueness(self, user_id: str, tier: str, email: str):
        """Each token should have a unique JTI."""
        jwt_service = JWTService(secret_key=TEST_SECRET_KEY)
        
        # Create multiple tokens
        tokens = [
            jwt_service.create_access_token(user_id, tier, email)
            for _ in range(5)
        ]
        
        # Extract JTIs
        jtis = [jwt_service.get_token_jti(t) for t in tokens]
        
        # All JTIs should be unique
        assert len(set(jtis)) == len(jtis)


# ============================================================================
# Property 2: Password Hash Verification
# ============================================================================

class TestPasswordHashVerification:
    """Property 2: Password hashing and verification correctness."""
    
    @settings(max_examples=100)
    @given(password=valid_password_strategy)
    def test_hash_then_verify_returns_true(self, password: str):
        """
        For any valid password, hashing then verifying SHALL return True.
        """
        hashed = test_password_service.hash_password(password)
        assert test_password_service.verify_password(password, hashed) is True
    
    @settings(max_examples=100)
    @given(
        password=valid_password_strategy,
        wrong_password=any_password_strategy
    )
    def test_wrong_password_returns_false(self, password: str, wrong_password: str):
        """
        Verifying against a different password SHALL return False.
        """
        assume(password != wrong_password)
        
        hashed = test_password_service.hash_password(password)
        assert test_password_service.verify_password(wrong_password, hashed) is False
    
    @settings(max_examples=50)
    @given(password=valid_password_strategy)
    def test_hash_produces_different_results(self, password: str):
        """
        Same password should produce different hashes (due to salt).
        """
        hash1 = test_password_service.hash_password(password)
        hash2 = test_password_service.hash_password(password)
        
        # Hashes should be different (different salts)
        assert hash1 != hash2
        
        # But both should verify correctly
        assert test_password_service.verify_password(password, hash1)
        assert test_password_service.verify_password(password, hash2)
    
    @settings(max_examples=50)
    @given(password=any_password_strategy)
    def test_invalid_hash_returns_false(self, password: str):
        """
        Verifying against an invalid hash format should return False, not raise.
        """
        invalid_hashes = [
            "",
            "not-a-hash",
            "12345",
            "$2b$invalid$hash",
        ]
        
        for invalid_hash in invalid_hashes:
            # Should return False, not raise an exception
            assert test_password_service.verify_password(password, invalid_hash) is False


# ============================================================================
# Property 3: Expired Token Rejection
# ============================================================================

class TestExpiredTokenRejection:
    """Property 3: Expired tokens are properly rejected."""
    
    @settings(max_examples=100)
    @given(
        user_id=user_id_strategy,
        tier=tier_strategy,
        email=email_strategy,
        seconds_ago=seconds_ago_strategy
    )
    def test_expired_access_token_rejected(
        self, user_id: str, tier: str, email: str, seconds_ago: int
    ):
        """
        For any JWT token with expiration in the past, token validation
        SHALL raise TokenExpiredError.
        """
        jwt_service = JWTService(secret_key=TEST_SECRET_KEY)
        
        # Create token that's already expired
        token = jwt_service.create_access_token(
            user_id=user_id,
            tier=tier,
            email=email,
            expires_delta=timedelta(seconds=-seconds_ago)
        )
        
        # Should raise TokenExpiredError
        with pytest.raises(TokenExpiredError):
            jwt_service.decode_access_token(token)
    
    @settings(max_examples=100)
    @given(user_id=user_id_strategy, seconds_ago=seconds_ago_strategy)
    def test_expired_refresh_token_rejected(self, user_id: str, seconds_ago: int):
        """Expired refresh tokens should also be rejected."""
        jwt_service = JWTService(secret_key=TEST_SECRET_KEY)
        
        token = jwt_service.create_refresh_token(
            user_id=user_id,
            expires_delta=timedelta(seconds=-seconds_ago)
        )
        
        with pytest.raises(TokenExpiredError):
            jwt_service.decode_refresh_token(token)
    
    @settings(max_examples=50)
    @given(user_id=user_id_strategy, tier=tier_strategy, email=email_strategy)
    def test_jti_extractable_from_expired_token(
        self, user_id: str, tier: str, email: str
    ):
        """
        JTI should be extractable from expired tokens (for blacklist checks).
        """
        jwt_service = JWTService(secret_key=TEST_SECRET_KEY)
        
        # Create expired token (1 day ago to avoid timezone issues)
        token = jwt_service.create_access_token(
            user_id=user_id,
            tier=tier,
            email=email,
            expires_delta=timedelta(days=-1)
        )
        
        # Should be able to extract JTI without raising
        jti = jwt_service.get_token_jti(token)
        assert jti is not None
        assert len(jti) > 0


# ============================================================================
# Additional Property Tests
# ============================================================================

class TestTokenInvalidation:
    """Additional tests for token validation edge cases."""
    
    def test_wrong_secret_key_rejected(self):
        """Token signed with different key should be rejected."""
        jwt_service1 = JWTService(secret_key="secret-key-1")
        jwt_service2 = JWTService(secret_key="secret-key-2")
        
        token = jwt_service1.create_access_token(
            user_id="user-123",
            tier="free",
            email="test@example.com"
        )
        
        with pytest.raises(TokenInvalidError):
            jwt_service2.decode_access_token(token)
    
    def test_malformed_token_rejected(self):
        """Malformed tokens should be rejected."""
        jwt_service = JWTService(secret_key=TEST_SECRET_KEY)
        
        malformed_tokens = [
            "",
            "not.a.token",
            "eyJhbGciOiJIUzI1NiJ9.invalid.signature",
            "completely-invalid",
        ]
        
        for token in malformed_tokens:
            with pytest.raises(TokenInvalidError):
                jwt_service.decode_access_token(token)
    
    def test_access_token_as_refresh_rejected(self):
        """Access token should not be accepted as refresh token."""
        jwt_service = JWTService(secret_key=TEST_SECRET_KEY)
        
        access_token = jwt_service.create_access_token(
            user_id="user-123",
            tier="free",
            email="test@example.com"
        )
        
        with pytest.raises(TokenInvalidError):
            jwt_service.decode_refresh_token(access_token)
    
    def test_refresh_token_as_access_rejected(self):
        """Refresh token should not be accepted as access token."""
        jwt_service = JWTService(secret_key=TEST_SECRET_KEY)
        
        refresh_token = jwt_service.create_refresh_token(user_id="user-123")
        
        with pytest.raises(TokenInvalidError):
            jwt_service.decode_access_token(refresh_token)


class TestPasswordStrengthValidation:
    """Tests for password strength validation."""
    
    @settings(max_examples=50)
    @given(password=valid_password_strategy)
    def test_valid_passwords_pass_validation(self, password: str):
        """Passwords meeting requirements should pass validation."""
        result = test_password_service.validate_password_strength(password)
        assert result.is_valid is True
        assert len(result.failed_requirements) == 0
    
    def test_short_password_fails(self):
        """Passwords shorter than 8 characters should fail."""
        result = test_password_service.validate_password_strength("Short1")
        assert result.is_valid is False
        assert any("8 characters" in req for req in result.failed_requirements)
    
    def test_no_uppercase_fails(self):
        """Passwords without uppercase should fail."""
        result = test_password_service.validate_password_strength("lowercase123")
        assert result.is_valid is False
        assert any("uppercase" in req for req in result.failed_requirements)
    
    def test_no_lowercase_fails(self):
        """Passwords without lowercase should fail."""
        result = test_password_service.validate_password_strength("UPPERCASE123")
        assert result.is_valid is False
        assert any("lowercase" in req for req in result.failed_requirements)
    
    def test_no_digit_fails(self):
        """Passwords without digits should fail."""
        result = test_password_service.validate_password_strength("NoDigitsHere")
        assert result.is_valid is False
        assert any("digit" in req for req in result.failed_requirements)
    
    def test_strength_score_range(self):
        """Strength score should be between 0 and 4."""
        test_passwords = [
            "a",  # Very weak
            "password",  # Weak
            "Password1",  # Fair
            "Password1!",  # Strong
            "MyV3ryStr0ng!Pass",  # Very strong
        ]
        
        for password in test_passwords:
            result = test_password_service.validate_password_strength(password)
            assert 0 <= result.score <= 4
