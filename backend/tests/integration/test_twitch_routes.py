"""
Integration tests for Twitch API routes.

Tests cover:
- POST /twitch/generate endpoint
- POST /twitch/packs endpoint
- GET /twitch/packs/{pack_id} endpoint
- GET /twitch/dimensions endpoint
- GET /twitch/game-meta/{game_id} endpoint
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
from fastapi import FastAPI

from backend.api.routes.twitch import router
from backend.api.middleware.auth import get_current_user
from backend.services.jwt_service import TokenPayload


# Create test app
app = FastAPI()
app.include_router(router)


# Mock user for authentication
def mock_current_user():
    return TokenPayload(
        sub="test-user-id",
        email="test@example.com",
        exp=9999999999,
        iat=1000000000,
        jti="test-jti-id",
        type="access",
        tier="pro",
    )


app.dependency_overrides[get_current_user] = mock_current_user


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


class TestGenerateEndpoint:
    """Tests for POST /twitch/generate endpoint."""
    
    def test_generate_returns_job_id(self, client):
        """Test that generate endpoint returns a job ID."""
        # Mock the context engine
        mock_context = MagicMock()
        mock_context.build_context = AsyncMock()
        
        with patch('backend.api.routes.twitch.get_context_engine', return_value=mock_context):
            with patch('backend.api.routes.twitch.get_audit_service') as mock_audit:
                mock_audit.return_value.log = AsyncMock()
                
                response = client.post(
                    "/twitch/generate",
                    json={
                        "asset_type": "twitch_emote",
                        "brand_kit_id": "test-brand-kit-id",
                    }
                )
        
        assert response.status_code == 202
        data = response.json()
        assert "job_id" in data
        assert data["status"] == "queued"
        assert data["asset_type"] == "twitch_emote"
    
    def test_generate_with_custom_prompt(self, client):
        """Test generate with custom prompt."""
        mock_context = MagicMock()
        mock_context.build_context = AsyncMock()
        
        with patch('backend.api.routes.twitch.get_context_engine', return_value=mock_context):
            with patch('backend.api.routes.twitch.get_audit_service') as mock_audit:
                mock_audit.return_value.log = AsyncMock()
                
                response = client.post(
                    "/twitch/generate",
                    json={
                        "asset_type": "twitch_emote",
                        "brand_kit_id": "test-brand-kit-id",
                        "custom_prompt": "excited streamer",
                    }
                )
        
        assert response.status_code == 202
    
    def test_generate_with_game_id(self, client):
        """Test generate with game context."""
        mock_context = MagicMock()
        mock_context.build_context = AsyncMock()
        
        with patch('backend.api.routes.twitch.get_context_engine', return_value=mock_context):
            with patch('backend.api.routes.twitch.get_audit_service') as mock_audit:
                mock_audit.return_value.log = AsyncMock()
                
                response = client.post(
                    "/twitch/generate",
                    json={
                        "asset_type": "twitch_emote",
                        "brand_kit_id": "test-brand-kit-id",
                        "game_id": "fortnite",
                    }
                )
        
        assert response.status_code == 202
    
    def test_generate_brand_kit_not_found(self, client):
        """Test generate with non-existent brand kit."""
        from backend.services.exceptions import BrandKitNotFoundError
        
        mock_context = MagicMock()
        mock_context.build_context = AsyncMock(side_effect=BrandKitNotFoundError("test-id"))
        
        with patch('backend.api.routes.twitch.get_context_engine', return_value=mock_context):
            response = client.post(
                "/twitch/generate",
                json={
                    "asset_type": "twitch_emote",
                    "brand_kit_id": "non-existent-id",
                }
            )
        
        assert response.status_code == 404


class TestPacksEndpoint:
    """Tests for POST /twitch/packs endpoint."""
    
    def test_generate_pack_returns_pack_id(self, client):
        """Test that pack generation returns a pack ID."""
        mock_context = MagicMock()
        mock_context.build_context = AsyncMock()
        
        with patch('backend.api.routes.twitch.get_context_engine', return_value=mock_context):
            with patch('backend.api.routes.twitch.get_audit_service') as mock_audit:
                mock_audit.return_value.log = AsyncMock()
                
                response = client.post(
                    "/twitch/packs",
                    json={
                        "pack_type": "seasonal",
                        "brand_kit_id": "test-brand-kit-id",
                    }
                )
        
        assert response.status_code == 202
        data = response.json()
        assert "pack_id" in data
        assert data["pack_type"] == "seasonal"
        assert data["status"] == "queued"
    
    def test_generate_emote_pack(self, client):
        """Test emote pack generation."""
        mock_context = MagicMock()
        mock_context.build_context = AsyncMock()
        
        with patch('backend.api.routes.twitch.get_context_engine', return_value=mock_context):
            with patch('backend.api.routes.twitch.get_audit_service') as mock_audit:
                mock_audit.return_value.log = AsyncMock()
                
                response = client.post(
                    "/twitch/packs",
                    json={
                        "pack_type": "emote",
                        "brand_kit_id": "test-brand-kit-id",
                    }
                )
        
        assert response.status_code == 202
        assert response.json()["pack_type"] == "emote"


class TestPackStatusEndpoint:
    """Tests for GET /twitch/packs/{pack_id} endpoint."""
    
    def test_get_pack_status(self, client):
        """Test getting pack status."""
        response = client.get("/twitch/packs/test-pack-id")
        
        assert response.status_code == 200
        data = response.json()
        assert "pack_id" in data
        assert "status" in data
        assert "progress" in data


class TestDimensionsEndpoint:
    """Tests for GET /twitch/dimensions endpoint."""
    
    def test_get_dimensions(self, client):
        """Test getting dimension specifications."""
        response = client.get("/twitch/dimensions")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Check structure of first item
        first = data[0]
        assert "asset_type" in first
        assert "generation_size" in first
        assert "export_size" in first
        assert "aspect_ratio" in first
    
    def test_dimensions_include_twitch_emote(self, client):
        """Test that dimensions include twitch_emote."""
        response = client.get("/twitch/dimensions")
        
        data = response.json()
        asset_types = [d["asset_type"] for d in data]
        assert "twitch_emote" in asset_types
    
    def test_dimensions_include_youtube_thumbnail(self, client):
        """Test that dimensions include youtube_thumbnail."""
        response = client.get("/twitch/dimensions")
        
        data = response.json()
        asset_types = [d["asset_type"] for d in data]
        assert "youtube_thumbnail" in asset_types


class TestGameMetaEndpoint:
    """Tests for GET /twitch/game-meta/{game_id} endpoint."""
    
    def test_get_known_game_meta(self, client):
        """Test getting metadata for a known game."""
        response = client.get("/twitch/game-meta/fortnite")
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Fortnite"
        assert "current_season" in data
        assert "genre" in data
    
    def test_get_unknown_game_meta(self, client):
        """Test getting metadata for an unknown game."""
        response = client.get("/twitch/game-meta/unknown_game_xyz")
        
        assert response.status_code == 404
        data = response.json()
        assert "error" in data["detail"]
    
    def test_get_game_meta_case_insensitive(self, client):
        """Test that game lookup is case insensitive."""
        response1 = client.get("/twitch/game-meta/FORTNITE")
        response2 = client.get("/twitch/game-meta/fortnite")
        
        assert response1.status_code == 200
        assert response2.status_code == 200
        assert response1.json()["name"] == response2.json()["name"]
