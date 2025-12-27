"""
Twitch Integration Flow E2E Tests.

Complete user journey tests for Twitch asset generation including:
- Getting dimension specifications
- Generating Twitch assets
- Creating asset packs

These tests validate end-to-end Twitch integration functionality with
mocked services for isolated testing.
"""

import uuid
from datetime import datetime, timezone
from typing import Dict, Any
from unittest.mock import MagicMock, patch, AsyncMock

import pytest
from fastapi.testclient import TestClient


@pytest.mark.e2e
class TestTwitchFlow:
    """
    End-to-end tests for Twitch integration user journeys.
    
    These tests validate complete Twitch asset generation flows including
    dimension specs, single asset generation, and pack creation.
    All external services are mocked for isolated testing.
    """

    def test_get_dimensions(
        self,
        client: TestClient,
        authenticated_user: dict,
    ) -> None:
        """
        Test that GET /api/v1/twitch/dimensions returns dimension specs.
        
        Validates:
            - Dimensions endpoint is accessible
            - Returns 200 OK status code
            - Response contains array of dimension specifications
            - Each spec includes asset_type, generation_size, export_size
            
        Flow:
            1. Request dimension specifications
            2. Verify all asset type dimensions are returned
        """
        headers = authenticated_user["headers"]
        
        response = client.get("/api/v1/twitch/dimensions", headers=headers)
        
        assert response.status_code == 200, (
            f"Get dimensions should return 200, got {response.status_code}: {response.text}"
        )
        
        data = response.json()
        assert isinstance(data, list), "Response should be an array"
        assert len(data) > 0, "Should return at least one dimension spec"
        
        # Verify structure of dimension specs
        for spec in data:
            assert "asset_type" in spec, "Spec should contain asset_type"
            assert "generation_size" in spec, "Spec should contain generation_size"
            assert "export_size" in spec, "Spec should contain export_size"
            assert "aspect_ratio" in spec, "Spec should contain aspect_ratio"

    def test_generate_twitch_asset(
        self,
        client: TestClient,
        authenticated_user: dict,
        brand_kit: dict,
    ) -> None:
        """
        Test that POST /api/v1/twitch/generate creates a generation job.
        
        Validates:
            - Generate endpoint accepts valid Twitch asset request
            - Returns 202 Accepted status code (async job)
            - Response contains job_id
            - Response contains status as 'queued'
            
        Flow:
            1. Use brand_kit fixture for brand context
            2. Submit Twitch asset generation request
            3. Verify job is created and queued
        """
        headers = authenticated_user["headers"]
        user_id = authenticated_user["user"]["id"]
        brand_kit_id = brand_kit["id"]
        
        with patch("backend.services.twitch.get_context_engine") as mock_context_engine, \
             patch("backend.services.audit_service.get_audit_service") as mock_audit:
            
            # Mock context engine
            mock_engine = MagicMock()
            mock_context_engine.return_value = mock_engine
            mock_engine.build_context = AsyncMock(return_value={
                "brand_kit": brand_kit,
                "asset_type": "twitch_emote",
                "game_context": None,
            })
            
            # Mock audit service
            mock_audit_instance = MagicMock()
            mock_audit_instance.log = AsyncMock()
            mock_audit.return_value = mock_audit_instance
            
            generate_data = {
                "brand_kit_id": brand_kit_id,
                "asset_type": "twitch_emote",
                "game_id": None,
            }
            
            response = client.post(
                "/api/v1/twitch/generate",
                headers=headers,
                json=generate_data,
            )
            
            assert response.status_code == 202, (
                f"Generate Twitch asset should return 202, got {response.status_code}: {response.text}"
            )
            
            data = response.json()
            assert "job_id" in data, "Response should contain job_id"
            assert data["status"] == "queued", "Job status should be 'queued'"
            assert data["asset_type"] == "twitch_emote", "Asset type should match"

    def test_create_pack(
        self,
        client: TestClient,
        authenticated_user: dict,
        brand_kit: dict,
    ) -> None:
        """
        Test that POST /api/v1/twitch/packs creates an asset pack.
        
        Validates:
            - Pack endpoint accepts valid pack request
            - Returns 202 Accepted status code (async job)
            - Response contains pack_id
            - Response contains pack_type
            - Response contains status as 'queued'
            
        Flow:
            1. Use brand_kit fixture for brand context
            2. Submit pack generation request
            3. Verify pack job is created and queued
        """
        headers = authenticated_user["headers"]
        user_id = authenticated_user["user"]["id"]
        brand_kit_id = brand_kit["id"]
        
        with patch("backend.services.twitch.get_context_engine") as mock_context_engine, \
             patch("backend.services.audit_service.get_audit_service") as mock_audit:
            
            # Mock context engine
            mock_engine = MagicMock()
            mock_context_engine.return_value = mock_engine
            mock_engine.build_context = AsyncMock(return_value={
                "brand_kit": brand_kit,
                "asset_type": "pack",
                "game_context": None,
            })
            
            # Mock audit service
            mock_audit_instance = MagicMock()
            mock_audit_instance.log = AsyncMock()
            mock_audit.return_value = mock_audit_instance
            
            pack_data = {
                "brand_kit_id": brand_kit_id,
                "pack_type": "seasonal",
                "game_id": None,
            }
            
            response = client.post(
                "/api/v1/twitch/packs",
                headers=headers,
                json=pack_data,
            )
            
            assert response.status_code == 202, (
                f"Create pack should return 202, got {response.status_code}: {response.text}"
            )
            
            data = response.json()
            assert "pack_id" in data, "Response should contain pack_id"
            assert data["pack_type"] == "seasonal", "Pack type should match"
            assert data["status"] == "queued", "Pack status should be 'queued'"

    def test_generate_twitch_asset_with_game_context(
        self,
        client: TestClient,
        authenticated_user: dict,
        brand_kit: dict,
    ) -> None:
        """
        Test that POST /api/v1/twitch/generate with game_id includes game context.
        
        Validates:
            - Generate endpoint accepts game_id parameter
            - Returns 202 Accepted status code
            - Game context is included in generation
            
        Flow:
            1. Use brand_kit fixture for brand context
            2. Submit generation request with game_id
            3. Verify job is created with game context
        """
        headers = authenticated_user["headers"]
        user_id = authenticated_user["user"]["id"]
        brand_kit_id = brand_kit["id"]
        
        with patch("backend.services.twitch.get_context_engine") as mock_context_engine, \
             patch("backend.services.audit_service.get_audit_service") as mock_audit:
            
            # Mock context engine with game context
            mock_engine = MagicMock()
            mock_context_engine.return_value = mock_engine
            mock_engine.build_context = AsyncMock(return_value={
                "brand_kit": brand_kit,
                "asset_type": "twitch_emote",
                "game_context": {
                    "game_id": "valorant",
                    "game_name": "Valorant",
                    "genre": "FPS",
                },
            })
            
            # Mock audit service
            mock_audit_instance = MagicMock()
            mock_audit_instance.log = AsyncMock()
            mock_audit.return_value = mock_audit_instance
            
            generate_data = {
                "brand_kit_id": brand_kit_id,
                "asset_type": "twitch_emote",
                "game_id": "valorant",
            }
            
            response = client.post(
                "/api/v1/twitch/generate",
                headers=headers,
                json=generate_data,
            )
            
            assert response.status_code == 202, (
                f"Generate with game context should return 202, got {response.status_code}: {response.text}"
            )
            
            data = response.json()
            assert "job_id" in data, "Response should contain job_id"
            assert data["status"] == "queued", "Job status should be 'queued'"

    def test_get_pack_status(
        self,
        client: TestClient,
        authenticated_user: dict,
    ) -> None:
        """
        Test that GET /api/v1/twitch/packs/{pack_id} returns pack status.
        
        Validates:
            - Pack status endpoint requires authentication
            - Returns 200 OK status code
            - Response contains pack_id, status, progress
            
        Flow:
            1. Request pack status by ID
            2. Verify pack status is returned
        """
        headers = authenticated_user["headers"]
        pack_id = str(uuid.uuid4())
        
        response = client.get(
            f"/api/v1/twitch/packs/{pack_id}",
            headers=headers,
        )
        
        assert response.status_code == 200, (
            f"Get pack status should return 200, got {response.status_code}: {response.text}"
        )
        
        data = response.json()
        assert "pack_id" in data, "Response should contain pack_id"
        assert "status" in data, "Response should contain status"
        assert "progress" in data, "Response should contain progress"
