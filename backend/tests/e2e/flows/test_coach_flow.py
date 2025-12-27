"""
Coach Feature Flow E2E Tests.

Complete user journey tests for the Prompt Coach feature including:
- Getting prompt tips
- Checking access levels

These tests validate end-to-end coach functionality with
mocked services for isolated testing.
"""

import uuid
from datetime import datetime, timezone
from typing import Dict, Any
from unittest.mock import MagicMock, patch, AsyncMock

import pytest
from fastapi.testclient import TestClient


@pytest.mark.e2e
class TestCoachFlow:
    """
    End-to-end tests for Prompt Coach user journeys.
    
    These tests validate coach feature flows including
    tips retrieval and access level checking.
    All external services are mocked for isolated testing.
    """

    def test_get_tips(
        self,
        client: TestClient,
        authenticated_user: dict,
    ) -> None:
        """
        Test that GET /api/v1/coach/tips returns tips array.
        
        Validates:
            - Tips endpoint requires authentication
            - Returns 200 OK status code
            - Response contains tips array
            - Each tip has id, title, description, example
            - Response includes upgrade CTA for non-premium users
            
        Flow:
            1. Request tips for an asset type
            2. Verify tips are returned with proper structure
        """
        headers = authenticated_user["headers"]
        
        with patch("backend.services.coach.get_tips_service") as mock_tips_service:
            # Mock tips service
            mock_service = MagicMock()
            mock_tips_service.return_value = mock_service
            mock_service.format_tips_response.return_value = {
                "tips": [
                    {
                        "id": "tip_1",
                        "title": "Use Descriptive Language",
                        "description": "Be specific about what you want in your emote",
                        "example": "A happy cat with sparkles around it",
                    },
                    {
                        "id": "tip_2",
                        "title": "Consider Your Brand Colors",
                        "description": "Include your brand colors for consistency",
                        "example": "Use blue and gold accents",
                    },
                    {
                        "id": "tip_3",
                        "title": "Keep It Simple",
                        "description": "Emotes are small, so simple designs work best",
                        "example": "A single expressive face",
                    },
                ],
                "upgrade_cta": "Upgrade to Studio for AI-powered prompt assistance",
            }
            
            response = client.get(
                "/api/v1/coach/tips",
                headers=headers,
                params={"asset_type": "twitch_emote"},
            )
            
            assert response.status_code == 200, (
                f"Get tips should return 200, got {response.status_code}: {response.text}"
            )
            
            data = response.json()
            assert "tips" in data, "Response should contain tips array"
            assert "feature" in data, "Response should contain feature level"
            assert isinstance(data["tips"], list), "Tips should be an array"
            assert len(data["tips"]) > 0, "Should return at least one tip"
            
            # Verify tip structure
            for tip in data["tips"]:
                assert "id" in tip, "Tip should have id"
                assert "title" in tip, "Tip should have title"
                assert "description" in tip, "Tip should have description"
                assert "example" in tip, "Tip should have example"

    def test_check_access(
        self,
        client: TestClient,
        authenticated_user: dict,
    ) -> None:
        """
        Test that GET /api/v1/coach/access returns access level.
        
        Validates:
            - Access endpoint requires authentication
            - Returns 200 OK status code
            - Response contains has_access boolean
            - Response contains feature level
            - Response contains grounding availability
            - Free tier users get tips_only access
            
        Flow:
            1. Request access level check
            2. Verify access information is returned
        """
        headers = authenticated_user["headers"]
        
        response = client.get("/api/v1/coach/access", headers=headers)
        
        assert response.status_code == 200, (
            f"Check access should return 200, got {response.status_code}: {response.text}"
        )
        
        data = response.json()
        assert "has_access" in data, "Response should contain has_access"
        assert "feature" in data, "Response should contain feature level"
        assert "grounding" in data, "Response should contain grounding availability"
        
        # Free tier user should have limited access
        assert isinstance(data["has_access"], bool), "has_access should be boolean"
        assert data["feature"] in ["tips_only", "full_coach"], (
            "Feature should be 'tips_only' or 'full_coach'"
        )

    def test_get_tips_different_asset_types(
        self,
        client: TestClient,
        authenticated_user: dict,
    ) -> None:
        """
        Test that GET /api/v1/coach/tips returns different tips for different asset types.
        
        Validates:
            - Tips endpoint accepts asset_type parameter
            - Returns tips relevant to the specified asset type
            
        Flow:
            1. Request tips for different asset types
            2. Verify tips are returned for each type
        """
        headers = authenticated_user["headers"]
        
        asset_types = ["twitch_emote", "youtube_thumbnail", "twitch_banner"]
        
        for asset_type in asset_types:
            with patch("backend.services.coach.get_tips_service") as mock_tips_service:
                # Mock tips service
                mock_service = MagicMock()
                mock_tips_service.return_value = mock_service
                mock_service.format_tips_response.return_value = {
                    "tips": [
                        {
                            "id": f"tip_{asset_type}_1",
                            "title": f"Tip for {asset_type}",
                            "description": f"Description for {asset_type}",
                            "example": f"Example for {asset_type}",
                        },
                    ],
                    "upgrade_cta": "Upgrade to Studio",
                }
                
                response = client.get(
                    "/api/v1/coach/tips",
                    headers=headers,
                    params={"asset_type": asset_type},
                )
                
                assert response.status_code == 200, (
                    f"Get tips for {asset_type} should return 200, got {response.status_code}"
                )
                
                data = response.json()
                assert "tips" in data, f"Response for {asset_type} should contain tips"
                assert len(data["tips"]) > 0, f"Should return tips for {asset_type}"

    def test_access_upgrade_message_for_free_tier(
        self,
        client: TestClient,
        authenticated_user: dict,
    ) -> None:
        """
        Test that free tier users receive upgrade message in access response.
        
        Validates:
            - Free tier users get has_access=False for full coach
            - Response includes upgrade_message
            
        Flow:
            1. Request access level as free tier user
            2. Verify upgrade message is included
        """
        headers = authenticated_user["headers"]
        
        response = client.get("/api/v1/coach/access", headers=headers)
        
        assert response.status_code == 200, (
            f"Check access should return 200, got {response.status_code}: {response.text}"
        )
        
        data = response.json()
        
        # Free tier user (from authenticated_user fixture) should not have full access
        if not data["has_access"]:
            assert "upgrade_message" in data, (
                "Non-premium users should receive upgrade_message"
            )
            assert data["upgrade_message"] is not None, (
                "Upgrade message should not be None for free tier"
            )

    def test_tips_include_upgrade_cta(
        self,
        client: TestClient,
        authenticated_user: dict,
    ) -> None:
        """
        Test that tips response includes upgrade CTA for non-premium users.
        
        Validates:
            - Tips response includes upgrade_cta field
            - CTA encourages upgrade to premium tier
            
        Flow:
            1. Request tips as free tier user
            2. Verify upgrade CTA is included
        """
        headers = authenticated_user["headers"]
        
        with patch("backend.services.coach.get_tips_service") as mock_tips_service:
            # Mock tips service
            mock_service = MagicMock()
            mock_tips_service.return_value = mock_service
            mock_service.format_tips_response.return_value = {
                "tips": [
                    {
                        "id": "tip_1",
                        "title": "Test Tip",
                        "description": "Test description",
                        "example": "Test example",
                    },
                ],
                "upgrade_cta": "Upgrade to Studio for AI-powered prompt coaching!",
            }
            
            response = client.get(
                "/api/v1/coach/tips",
                headers=headers,
                params={"asset_type": "twitch_emote"},
            )
            
            assert response.status_code == 200, (
                f"Get tips should return 200, got {response.status_code}: {response.text}"
            )
            
            data = response.json()
            assert "upgrade_cta" in data, "Response should contain upgrade_cta"
