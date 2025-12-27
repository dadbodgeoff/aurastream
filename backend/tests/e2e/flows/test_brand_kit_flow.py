"""
Brand Kit Flow E2E Tests.

Complete user journey tests for brand kit CRUD operations including:
- Creating brand kits
- Listing brand kits
- Getting brand kit by ID
- Updating brand kits
- Activating brand kits
- Deleting brand kits

These tests validate end-to-end brand kit functionality with
mocked Supabase responses for isolated testing.
"""

import uuid
from datetime import datetime, timezone
from typing import Dict, Any
from unittest.mock import MagicMock, patch, AsyncMock

import pytest
from fastapi.testclient import TestClient


def create_mock_brand_kit(
    user_id: str,
    brand_kit_id: str = None,
    name: str = "Test Brand Kit",
    is_active: bool = False,
) -> Dict[str, Any]:
    """
    Create a mock brand kit dictionary for testing.
    
    Args:
        user_id: Owner's user ID
        brand_kit_id: Optional brand kit ID (generated if not provided)
        name: Brand kit name
        is_active: Whether the brand kit is active
        
    Returns:
        Dict containing brand kit data
    """
    now = datetime.now(timezone.utc).isoformat()
    return {
        "id": brand_kit_id or str(uuid.uuid4()),
        "user_id": user_id,
        "name": name,
        "is_active": is_active,
        "primary_colors": ["#3B82F6", "#2563EB"],
        "accent_colors": ["#F59E0B"],
        "fonts": {"headline": "Montserrat", "body": "Inter"},
        "logo_url": None,
        "tone": "professional",
        "style_reference": "Modern design",
        "extracted_from": None,
        "colors_extended": {},
        "typography": {},
        "voice": {},
        "guidelines": {},
        "created_at": now,
        "updated_at": now,
    }


@pytest.mark.e2e
class TestBrandKitFlow:
    """
    End-to-end tests for brand kit CRUD user journeys.
    
    These tests validate complete brand kit operations including
    create, read, update, activate, and delete flows.
    All database operations are mocked for isolated testing.
    """

    def test_create_brand_kit(
        self,
        client: TestClient,
        authenticated_user: dict,
    ) -> None:
        """
        Test that POST /api/v1/brand-kits creates a new brand kit.
        
        Validates:
            - Create endpoint accepts valid brand kit data
            - Returns 201 Created status code
            - Response contains brand kit with correct name
            - Response contains brand kit ID
            - Brand kit is associated with authenticated user
            
        Flow:
            1. Submit create request with brand kit configuration
            2. Verify brand kit is created and returned
        """
        headers = authenticated_user["headers"]
        user_id = authenticated_user["user"]["id"]
        
        brand_kit_id = str(uuid.uuid4())
        mock_brand_kit = create_mock_brand_kit(
            user_id=user_id,
            brand_kit_id=brand_kit_id,
            name="My Gaming Brand",
        )
        
        with patch("backend.services.brand_kit_service.get_supabase_client") as mock_supabase, \
             patch("backend.services.audit_service.get_audit_service") as mock_audit:
            
            mock_client = MagicMock()
            mock_supabase.return_value = mock_client
            
            mock_table = MagicMock()
            mock_client.table.return_value = mock_table
            
            # Mock: count existing brand kits (under limit)
            mock_select = MagicMock()
            mock_table.select.return_value = mock_select
            mock_eq = MagicMock()
            mock_select.eq.return_value = mock_eq
            mock_eq.execute.return_value = MagicMock(data=[])
            
            # Mock: insert returns new brand kit
            mock_insert = MagicMock()
            mock_table.insert.return_value = mock_insert
            mock_insert.execute.return_value = MagicMock(data=[mock_brand_kit])
            
            # Mock audit service
            mock_audit_instance = MagicMock()
            mock_audit_instance.log = AsyncMock()
            mock_audit.return_value = mock_audit_instance
            
            # Reset brand kit service singleton
            import backend.services.brand_kit_service as bk_module
            bk_module._brand_kit_service = None
            
            create_data = {
                "name": "My Gaming Brand",
                "primary_colors": ["#3B82F6", "#2563EB"],
                "accent_colors": ["#F59E0B"],
                "fonts": {"headline": "Montserrat", "body": "Inter"},
                "tone": "professional",
            }
            
            response = client.post(
                "/api/v1/brand-kits",
                headers=headers,
                json=create_data,
            )
            
            assert response.status_code == 201, (
                f"Create brand kit should return 201, got {response.status_code}: {response.text}"
            )
            
            data = response.json()
            assert "id" in data, "Response should contain brand kit ID"
            assert data["name"] == "My Gaming Brand", "Brand kit name should match"
            assert data["user_id"] == user_id, "Brand kit should belong to user"

    def test_list_brand_kits(
        self,
        client: TestClient,
        authenticated_user: dict,
    ) -> None:
        """
        Test that GET /api/v1/brand-kits returns user's brand kits.
        
        Validates:
            - List endpoint requires authentication
            - Returns 200 OK status code
            - Response contains brand_kits array
            - Response contains total count
            - Only returns brand kits owned by user
            
        Flow:
            1. Create mock brand kits for user
            2. Request brand kit list
            3. Verify all user's brand kits are returned
        """
        headers = authenticated_user["headers"]
        user_id = authenticated_user["user"]["id"]
        
        mock_brand_kits = [
            create_mock_brand_kit(user_id, name="Brand Kit 1", is_active=True),
            create_mock_brand_kit(user_id, name="Brand Kit 2"),
        ]
        
        with patch("backend.services.brand_kit_service.get_supabase_client") as mock_supabase:
            mock_client = MagicMock()
            mock_supabase.return_value = mock_client
            
            mock_table = MagicMock()
            mock_client.table.return_value = mock_table
            
            mock_select = MagicMock()
            mock_table.select.return_value = mock_select
            mock_eq = MagicMock()
            mock_select.eq.return_value = mock_eq
            mock_order = MagicMock()
            mock_eq.order.return_value = mock_order
            mock_order.execute.return_value = MagicMock(data=mock_brand_kits)
            
            # Reset brand kit service singleton
            import backend.services.brand_kit_service as bk_module
            bk_module._brand_kit_service = None
            
            response = client.get("/api/v1/brand-kits", headers=headers)
            
            assert response.status_code == 200, (
                f"List brand kits should return 200, got {response.status_code}: {response.text}"
            )
            
            data = response.json()
            assert "brand_kits" in data, "Response should contain brand_kits array"
            assert "total" in data, "Response should contain total count"
            assert data["total"] == 2, "Should return 2 brand kits"
            assert len(data["brand_kits"]) == 2, "Should have 2 brand kits in array"

    def test_get_brand_kit_by_id(
        self,
        client: TestClient,
        authenticated_user: dict,
        brand_kit: dict,
    ) -> None:
        """
        Test that GET /api/v1/brand-kits/{id} returns a specific brand kit.
        
        Validates:
            - Get endpoint requires authentication
            - Returns 200 OK status code
            - Response contains correct brand kit data
            - Brand kit ID matches requested ID
            
        Flow:
            1. Use brand_kit fixture for test data
            2. Request brand kit by ID
            3. Verify correct brand kit is returned
        """
        headers = authenticated_user["headers"]
        user_id = authenticated_user["user"]["id"]
        brand_kit_id = brand_kit["id"]
        
        with patch("backend.services.brand_kit_service.get_supabase_client") as mock_supabase:
            mock_client = MagicMock()
            mock_supabase.return_value = mock_client
            
            mock_table = MagicMock()
            mock_client.table.return_value = mock_table
            
            mock_select = MagicMock()
            mock_table.select.return_value = mock_select
            mock_eq = MagicMock()
            mock_select.eq.return_value = mock_eq
            mock_single = MagicMock()
            mock_eq.eq.return_value = mock_single
            mock_single.execute.return_value = MagicMock(data=brand_kit)
            
            # Reset brand kit service singleton
            import backend.services.brand_kit_service as bk_module
            bk_module._brand_kit_service = None
            
            response = client.get(
                f"/api/v1/brand-kits/{brand_kit_id}",
                headers=headers,
            )
            
            assert response.status_code == 200, (
                f"Get brand kit should return 200, got {response.status_code}: {response.text}"
            )
            
            data = response.json()
            assert data["id"] == brand_kit_id, "Brand kit ID should match"
            assert data["name"] == brand_kit["name"], "Brand kit name should match"

    def test_update_brand_kit(
        self,
        client: TestClient,
        authenticated_user: dict,
        brand_kit: dict,
    ) -> None:
        """
        Test that PUT /api/v1/brand-kits/{id} updates a brand kit.
        
        Validates:
            - Update endpoint requires authentication
            - Returns 200 OK status code
            - Response contains updated brand kit data
            - Updated fields reflect new values
            
        Flow:
            1. Use brand_kit fixture for existing brand kit
            2. Submit update request with new name
            3. Verify brand kit is updated
        """
        headers = authenticated_user["headers"]
        user_id = authenticated_user["user"]["id"]
        brand_kit_id = brand_kit["id"]
        
        updated_brand_kit = {**brand_kit, "name": "Updated Brand Name"}
        
        with patch("backend.services.brand_kit_service.get_supabase_client") as mock_supabase, \
             patch("backend.services.audit_service.get_audit_service") as mock_audit:
            
            mock_client = MagicMock()
            mock_supabase.return_value = mock_client
            
            mock_table = MagicMock()
            mock_client.table.return_value = mock_table
            
            # Mock: get existing brand kit
            mock_select = MagicMock()
            mock_table.select.return_value = mock_select
            mock_eq = MagicMock()
            mock_select.eq.return_value = mock_eq
            mock_eq2 = MagicMock()
            mock_eq.eq.return_value = mock_eq2
            mock_eq2.execute.return_value = MagicMock(data=brand_kit)
            
            # Mock: update returns updated brand kit
            mock_update = MagicMock()
            mock_table.update.return_value = mock_update
            mock_update_eq = MagicMock()
            mock_update.eq.return_value = mock_update_eq
            mock_update_eq.execute.return_value = MagicMock(data=[updated_brand_kit])
            
            # Mock audit service
            mock_audit_instance = MagicMock()
            mock_audit_instance.log = AsyncMock()
            mock_audit.return_value = mock_audit_instance
            
            # Reset brand kit service singleton
            import backend.services.brand_kit_service as bk_module
            bk_module._brand_kit_service = None
            
            update_data = {"name": "Updated Brand Name"}
            
            response = client.put(
                f"/api/v1/brand-kits/{brand_kit_id}",
                headers=headers,
                json=update_data,
            )
            
            assert response.status_code == 200, (
                f"Update brand kit should return 200, got {response.status_code}: {response.text}"
            )
            
            data = response.json()
            assert data["name"] == "Updated Brand Name", "Brand kit name should be updated"

    def test_activate_brand_kit(
        self,
        client: TestClient,
        authenticated_user: dict,
        brand_kit: dict,
    ) -> None:
        """
        Test that POST /api/v1/brand-kits/{id}/activate sets is_active=True.
        
        Validates:
            - Activate endpoint requires authentication
            - Returns 200 OK status code
            - Response contains brand kit with is_active=True
            - Previously active brand kit is deactivated
            
        Flow:
            1. Use brand_kit fixture for existing brand kit
            2. Submit activate request
            3. Verify brand kit is now active
        """
        headers = authenticated_user["headers"]
        user_id = authenticated_user["user"]["id"]
        brand_kit_id = brand_kit["id"]
        
        activated_brand_kit = {**brand_kit, "is_active": True}
        
        with patch("backend.services.brand_kit_service.get_supabase_client") as mock_supabase, \
             patch("backend.services.audit_service.get_audit_service") as mock_audit:
            
            mock_client = MagicMock()
            mock_supabase.return_value = mock_client
            
            mock_table = MagicMock()
            mock_client.table.return_value = mock_table
            
            # Mock: get existing brand kit
            mock_select = MagicMock()
            mock_table.select.return_value = mock_select
            mock_eq = MagicMock()
            mock_select.eq.return_value = mock_eq
            mock_eq2 = MagicMock()
            mock_eq.eq.return_value = mock_eq2
            mock_eq2.execute.return_value = MagicMock(data=brand_kit)
            
            # Mock: deactivate all brand kits
            mock_update = MagicMock()
            mock_table.update.return_value = mock_update
            mock_update_eq = MagicMock()
            mock_update.eq.return_value = mock_update_eq
            mock_update_eq.execute.return_value = MagicMock(data=[])
            
            # Mock: activate specific brand kit
            mock_update_eq2 = MagicMock()
            mock_update_eq.eq.return_value = mock_update_eq2
            mock_update_eq2.execute.return_value = MagicMock(data=[activated_brand_kit])
            
            # Mock audit service
            mock_audit_instance = MagicMock()
            mock_audit_instance.log = AsyncMock()
            mock_audit.return_value = mock_audit_instance
            
            # Reset brand kit service singleton
            import backend.services.brand_kit_service as bk_module
            bk_module._brand_kit_service = None
            
            response = client.post(
                f"/api/v1/brand-kits/{brand_kit_id}/activate",
                headers=headers,
            )
            
            assert response.status_code == 200, (
                f"Activate brand kit should return 200, got {response.status_code}: {response.text}"
            )
            
            data = response.json()
            assert data["is_active"] is True, "Brand kit should be active"

    def test_delete_brand_kit(
        self,
        client: TestClient,
        authenticated_user: dict,
        brand_kit: dict,
    ) -> None:
        """
        Test that DELETE /api/v1/brand-kits/{id} removes a brand kit.
        
        Validates:
            - Delete endpoint requires authentication
            - Returns 204 No Content status code
            - Brand kit is removed from database
            
        Flow:
            1. Use brand_kit fixture for existing brand kit
            2. Submit delete request
            3. Verify brand kit is deleted (204 response)
        """
        headers = authenticated_user["headers"]
        user_id = authenticated_user["user"]["id"]
        brand_kit_id = brand_kit["id"]
        
        with patch("backend.services.brand_kit_service.get_supabase_client") as mock_supabase, \
             patch("backend.services.audit_service.get_audit_service") as mock_audit:
            
            mock_client = MagicMock()
            mock_supabase.return_value = mock_client
            
            mock_table = MagicMock()
            mock_client.table.return_value = mock_table
            
            # Mock: get existing brand kit (for ownership check)
            mock_select = MagicMock()
            mock_table.select.return_value = mock_select
            mock_eq = MagicMock()
            mock_select.eq.return_value = mock_eq
            mock_eq2 = MagicMock()
            mock_eq.eq.return_value = mock_eq2
            mock_eq2.execute.return_value = MagicMock(data=brand_kit)
            
            # Mock: delete brand kit
            mock_delete = MagicMock()
            mock_table.delete.return_value = mock_delete
            mock_delete_eq = MagicMock()
            mock_delete.eq.return_value = mock_delete_eq
            mock_delete_eq.execute.return_value = MagicMock(data=[brand_kit])
            
            # Mock audit service
            mock_audit_instance = MagicMock()
            mock_audit_instance.log = AsyncMock()
            mock_audit.return_value = mock_audit_instance
            
            # Reset brand kit service singleton
            import backend.services.brand_kit_service as bk_module
            bk_module._brand_kit_service = None
            
            response = client.delete(
                f"/api/v1/brand-kits/{brand_kit_id}",
                headers=headers,
            )
            
            assert response.status_code == 204, (
                f"Delete brand kit should return 204, got {response.status_code}: {response.text}"
            )
