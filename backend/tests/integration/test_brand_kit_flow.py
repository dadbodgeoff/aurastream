"""
Integration tests for complete brand kit CRUD flows.

Tests end-to-end flows with mocked database:
- Complete Create → Read → Update → Delete flow
- Brand kit activation flow
- Multiple kits activation (only one active at a time)

These tests verify the complete brand kit workflow
with all components working together.
"""

import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from datetime import datetime, timezone
import uuid

from backend.api.main import create_app


# =============================================================================
# Test Configuration
# =============================================================================

TEST_SECRET_KEY = "test-jwt-secret-key-that-is-at-least-32-characters-long-for-testing"


# =============================================================================
# Helper Functions
# =============================================================================

def create_mock_supabase_response(data):
    """Create a mock Supabase response object."""
    mock_response = MagicMock()
    mock_response.data = data
    mock_response.count = len(data) if data else 0
    return mock_response


def create_mock_user_row(user_id=None, email="test@example.com", password_hash=None):
    """Create a mock database user row."""
    if user_id is None:
        user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    return {
        "id": user_id,
        "email": email,
        "password_hash": password_hash or "$2b$04$mock_hash",
        "email_verified": False,
        "display_name": "Test User",
        "avatar_url": None,
        "subscription_tier": "free",
        "subscription_status": "none",
        "assets_generated_this_month": 0,
        "created_at": now,
        "updated_at": now,
    }


def create_mock_brand_kit_row(
    brand_kit_id=None,
    user_id=None,
    name="Test Brand Kit",
    is_active=False,
):
    """Create a mock database brand kit row."""
    if brand_kit_id is None:
        brand_kit_id = str(uuid.uuid4())
    if user_id is None:
        user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    return {
        "id": brand_kit_id,
        "user_id": user_id,
        "name": name,
        "is_active": is_active,
        "primary_colors": ["#FF5733", "#3498DB"],
        "accent_colors": ["#F1C40F"],
        "fonts": {"headline": "Montserrat", "body": "Inter"},
        "logo_url": None,
        "tone": "professional",
        "style_reference": "Modern gaming aesthetic",
        "extracted_from": None,
        "created_at": now,
        "updated_at": now,
    }


def setup_mock_supabase_for_brand_kits(
    mock_supabase,
    user_row=None,
    brand_kits=None,
    count=0,
):
    """
    Setup mock Supabase client for brand kit operations.
    
    Args:
        mock_supabase: The patched get_supabase_client
        user_row: User row for auth operations
        brand_kits: List of brand kit rows
        count: Count for brand kit limit checks
    """
    mock_client = MagicMock()
    mock_supabase.return_value = mock_client
    
    if brand_kits is None:
        brand_kits = []
    
    # Track state for dynamic responses
    state = {
        "brand_kits": list(brand_kits),
        "count": count,
    }
    
    def create_table_mock(table_name):
        mock_table = MagicMock()
        
        # SELECT operations
        def create_select_mock(*args, **kwargs):
            mock_select = MagicMock()
            
            def create_eq_mock(field, value):
                mock_eq = MagicMock()
                
                def create_execute():
                    mock_execute = MagicMock()
                    
                    if table_name == "users":
                        if user_row and user_row.get("email") == value:
                            mock_execute.data = [user_row]
                        elif user_row and user_row.get("id") == value:
                            mock_execute.data = [user_row]
                        else:
                            mock_execute.data = []
                    elif table_name == "brand_kits":
                        if field == "id":
                            mock_execute.data = [bk for bk in state["brand_kits"] if bk["id"] == value]
                        elif field == "user_id":
                            mock_execute.data = [bk for bk in state["brand_kits"] if bk["user_id"] == value]
                        else:
                            mock_execute.data = state["brand_kits"]
                        mock_execute.count = len(mock_execute.data)
                    else:
                        mock_execute.data = []
                        mock_execute.count = 0
                    
                    return mock_execute
                
                mock_eq.execute.side_effect = create_execute
                
                # Chain for .eq().eq() patterns
                def chain_eq(field2, value2):
                    mock_eq2 = MagicMock()
                    
                    def create_execute2():
                        mock_execute = MagicMock()
                        if table_name == "brand_kits":
                            # Filter by both conditions
                            filtered = [
                                bk for bk in state["brand_kits"]
                                if bk.get(field) == value and bk.get(field2) == value2
                            ]
                            mock_execute.data = filtered
                            mock_execute.count = len(filtered)
                        else:
                            mock_execute.data = []
                            mock_execute.count = 0
                        return mock_execute
                    
                    mock_eq2.execute.side_effect = create_execute2
                    return mock_eq2
                
                mock_eq.eq.side_effect = chain_eq
                
                # Support for .order() after .eq()
                def create_order_mock(field_name, desc=False):
                    mock_order = MagicMock()
                    
                    def create_order_execute():
                        mock_execute = MagicMock()
                        if table_name == "brand_kits":
                            filtered = [bk for bk in state["brand_kits"] if bk.get(field) == value]
                            mock_execute.data = filtered
                            mock_execute.count = len(filtered)
                        else:
                            mock_execute.data = []
                            mock_execute.count = 0
                        return mock_execute
                    
                    mock_order.execute.side_effect = create_order_execute
                    return mock_order
                
                mock_eq.order.side_effect = create_order_mock
                
                return mock_eq
            
            mock_select.eq.side_effect = create_eq_mock
            return mock_select
        
        mock_table.select.side_effect = create_select_mock
        
        # INSERT operations
        def create_insert_mock(data):
            mock_insert = MagicMock()
            
            def create_insert_execute():
                mock_execute = MagicMock()
                if table_name == "brand_kits":
                    # Add to state
                    state["brand_kits"].append(data)
                    mock_execute.data = [data]
                elif table_name == "users":
                    mock_execute.data = [data]
                else:
                    mock_execute.data = [data]
                return mock_execute
            
            mock_insert.execute.side_effect = create_insert_execute
            return mock_insert
        
        mock_table.insert.side_effect = create_insert_mock
        
        # UPDATE operations
        def create_update_mock(data):
            mock_update = MagicMock()
            
            def create_update_eq(field, value):
                mock_eq = MagicMock()
                
                def create_update_execute():
                    mock_execute = MagicMock()
                    if table_name == "brand_kits":
                        updated = []
                        for bk in state["brand_kits"]:
                            if bk.get(field) == value:
                                bk.update(data)
                                updated.append(bk)
                        mock_execute.data = updated
                    else:
                        mock_execute.data = []
                    return mock_execute
                
                mock_eq.execute.side_effect = create_update_execute
                return mock_eq
            
            mock_update.eq.side_effect = create_update_eq
            return mock_update
        
        mock_table.update.side_effect = create_update_mock
        
        # DELETE operations
        def create_delete_mock():
            mock_delete = MagicMock()
            
            def create_delete_eq(field, value):
                mock_eq = MagicMock()
                
                def create_delete_execute():
                    mock_execute = MagicMock()
                    if table_name == "brand_kits":
                        state["brand_kits"] = [
                            bk for bk in state["brand_kits"]
                            if bk.get(field) != value
                        ]
                        mock_execute.data = []
                    else:
                        mock_execute.data = []
                    return mock_execute
                
                mock_eq.execute.side_effect = create_delete_execute
                return mock_eq
            
            mock_delete.eq.side_effect = create_delete_eq
            return mock_delete
        
        mock_table.delete.side_effect = create_delete_mock
        
        return mock_table
    
    mock_client.table.side_effect = create_table_mock
    
    return mock_client, state


# =============================================================================
# Test Fixtures
# =============================================================================

@pytest.fixture
def mock_settings():
    """Create mock settings."""
    settings = MagicMock()
    settings.JWT_SECRET_KEY = TEST_SECRET_KEY
    settings.JWT_ALGORITHM = "HS256"
    settings.JWT_EXPIRATION_HOURS = 24
    settings.is_production = False
    settings.DEBUG = True
    settings.APP_ENV = "test"
    settings.allowed_origins_list = ["http://localhost:3000"]
    return settings


@pytest.fixture
def test_brand_kit_data():
    """Generate test brand kit data."""
    return {
        "name": "My Gaming Brand",
        "primary_colors": ["#FF5733", "#3498DB", "#2ECC71"],
        "accent_colors": ["#F1C40F"],
        "fonts": {
            "headline": "Montserrat",
            "body": "Inter"
        },
        "tone": "competitive",
        "style_reference": "Modern gaming aesthetic with bold colors"
    }


@pytest.fixture
def test_brand_kit_update_data():
    """Generate test brand kit update data."""
    return {
        "name": "Updated Brand Name",
        "primary_colors": ["#000000", "#FFFFFF"],
        "tone": "professional"
    }


# =============================================================================
# TestBrandKitCRUDFlow
# =============================================================================

class TestBrandKitCRUDFlow:
    """Test complete brand kit CRUD flows."""
    
    def test_complete_brand_kit_crud_flow(
        self,
        mock_settings,
        test_brand_kit_data,
        test_brand_kit_update_data,
    ):
        """
        Test: Create → Read → Update → Delete flow
        
        This test verifies the complete brand kit lifecycle.
        """
        with patch("backend.services.brand_kit_service.get_supabase_client") as mock_bk_supabase, \
             patch("backend.services.auth_service.get_supabase_client") as mock_auth_supabase, \
             patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.api.routes.auth.get_settings") as mock_route_settings:
            
            mock_get_settings.return_value = mock_settings
            mock_route_settings.return_value = mock_settings
            
            from backend.services.password_service import PasswordService
            password_svc = PasswordService(cost_factor=4)
            
            # Create user
            user_id = str(uuid.uuid4())
            test_password = "SecurePass123!"
            password_hash = password_svc.hash_password(test_password)
            user_row = create_mock_user_row(
                user_id=user_id,
                email="brandkit_test@example.com",
                password_hash=password_hash,
            )
            
            # Setup auth mock
            mock_auth_client = MagicMock()
            mock_auth_supabase.return_value = mock_auth_client
            mock_auth_table = MagicMock()
            mock_auth_client.table.return_value = mock_auth_table
            mock_auth_select = MagicMock()
            mock_auth_table.select.return_value = mock_auth_select
            mock_auth_eq = MagicMock()
            mock_auth_select.eq.return_value = mock_auth_eq
            mock_auth_execute = MagicMock()
            mock_auth_eq.execute.return_value = mock_auth_execute
            mock_auth_execute.data = [user_row]
            
            # Setup brand kit mock
            mock_bk_client, state = setup_mock_supabase_for_brand_kits(
                mock_bk_supabase,
                user_row=user_row,
                brand_kits=[],
                count=0,
            )
            
            # Reset service singletons
            import backend.services.auth_service as auth_module
            import backend.services.brand_kit_service as bk_module
            auth_module._auth_service = None
            bk_module._brand_kit_service = None
            
            app = create_app()
            client = TestClient(app)
            
            # Step 1: Login to get access token
            login_data = {
                "email": user_row["email"],
                "password": test_password,
            }
            login_response = client.post("/api/v1/auth/login", json=login_data)
            assert login_response.status_code == 200, f"Login failed: {login_response.json()}"
            access_token = login_response.json()["access_token"]
            headers = {"Authorization": f"Bearer {access_token}"}
            
            # Step 2: Create brand kit
            create_response = client.post(
                "/api/v1/brand-kits",
                json=test_brand_kit_data,
                headers=headers,
            )
            assert create_response.status_code == 201, f"Create failed: {create_response.json()}"
            created_kit = create_response.json()
            assert created_kit["name"] == test_brand_kit_data["name"]
            assert created_kit["primary_colors"] == [c.upper() for c in test_brand_kit_data["primary_colors"]]
            assert created_kit["tone"] == test_brand_kit_data["tone"]
            assert created_kit["is_active"] is False
            brand_kit_id = created_kit["id"]
            
            # Step 3: Read brand kit
            get_response = client.get(
                f"/api/v1/brand-kits/{brand_kit_id}",
                headers=headers,
            )
            assert get_response.status_code == 200, f"Get failed: {get_response.json()}"
            fetched_kit = get_response.json()
            assert fetched_kit["id"] == brand_kit_id
            assert fetched_kit["name"] == test_brand_kit_data["name"]
            
            # Step 4: Update brand kit
            update_response = client.put(
                f"/api/v1/brand-kits/{brand_kit_id}",
                json=test_brand_kit_update_data,
                headers=headers,
            )
            assert update_response.status_code == 200, f"Update failed: {update_response.json()}"
            updated_kit = update_response.json()
            assert updated_kit["name"] == test_brand_kit_update_data["name"]
            assert updated_kit["tone"] == test_brand_kit_update_data["tone"]
            
            # Step 5: List brand kits
            list_response = client.get("/api/v1/brand-kits", headers=headers)
            assert list_response.status_code == 200, f"List failed: {list_response.json()}"
            list_data = list_response.json()
            assert list_data["total"] >= 1
            assert any(bk["id"] == brand_kit_id for bk in list_data["brand_kits"])
            
            # Step 6: Delete brand kit
            delete_response = client.delete(
                f"/api/v1/brand-kits/{brand_kit_id}",
                headers=headers,
            )
            assert delete_response.status_code == 204, f"Delete failed: {delete_response.status_code}"
            
            # Step 7: Verify deletion - should return 404
            get_deleted_response = client.get(
                f"/api/v1/brand-kits/{brand_kit_id}",
                headers=headers,
            )
            assert get_deleted_response.status_code == 404


    def test_brand_kit_activation_flow(
        self,
        mock_settings,
        test_brand_kit_data,
    ):
        """
        Test: Create → Activate → Verify state
        
        This test verifies brand kit activation works correctly.
        """
        with patch("backend.services.brand_kit_service.get_supabase_client") as mock_bk_supabase, \
             patch("backend.services.auth_service.get_supabase_client") as mock_auth_supabase, \
             patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.api.routes.auth.get_settings") as mock_route_settings:
            
            mock_get_settings.return_value = mock_settings
            mock_route_settings.return_value = mock_settings
            
            from backend.services.password_service import PasswordService
            password_svc = PasswordService(cost_factor=4)
            
            # Create user
            user_id = str(uuid.uuid4())
            test_password = "SecurePass123!"
            password_hash = password_svc.hash_password(test_password)
            user_row = create_mock_user_row(
                user_id=user_id,
                email="activation_test@example.com",
                password_hash=password_hash,
            )
            
            # Setup auth mock
            mock_auth_client = MagicMock()
            mock_auth_supabase.return_value = mock_auth_client
            mock_auth_table = MagicMock()
            mock_auth_client.table.return_value = mock_auth_table
            mock_auth_select = MagicMock()
            mock_auth_table.select.return_value = mock_auth_select
            mock_auth_eq = MagicMock()
            mock_auth_select.eq.return_value = mock_auth_eq
            mock_auth_execute = MagicMock()
            mock_auth_eq.execute.return_value = mock_auth_execute
            mock_auth_execute.data = [user_row]
            
            # Setup brand kit mock
            mock_bk_client, state = setup_mock_supabase_for_brand_kits(
                mock_bk_supabase,
                user_row=user_row,
                brand_kits=[],
                count=0,
            )
            
            # Reset service singletons
            import backend.services.auth_service as auth_module
            import backend.services.brand_kit_service as bk_module
            auth_module._auth_service = None
            bk_module._brand_kit_service = None
            
            app = create_app()
            client = TestClient(app)
            
            # Step 1: Login
            login_data = {
                "email": user_row["email"],
                "password": test_password,
            }
            login_response = client.post("/api/v1/auth/login", json=login_data)
            assert login_response.status_code == 200
            access_token = login_response.json()["access_token"]
            headers = {"Authorization": f"Bearer {access_token}"}
            
            # Step 2: Create brand kit
            create_response = client.post(
                "/api/v1/brand-kits",
                json=test_brand_kit_data,
                headers=headers,
            )
            assert create_response.status_code == 201
            created_kit = create_response.json()
            brand_kit_id = created_kit["id"]
            assert created_kit["is_active"] is False
            
            # Step 3: Verify no active brand kit initially
            active_response = client.get("/api/v1/brand-kits/active", headers=headers)
            assert active_response.status_code == 200
            # Should be null/None when no active kit
            active_data = active_response.json()
            assert active_data is None
            
            # Step 4: Activate the brand kit
            activate_response = client.post(
                f"/api/v1/brand-kits/{brand_kit_id}/activate",
                headers=headers,
            )
            assert activate_response.status_code == 200, f"Activate failed: {activate_response.json()}"
            activated_kit = activate_response.json()
            assert activated_kit["is_active"] is True
            assert activated_kit["id"] == brand_kit_id
            
            # Step 5: Verify active brand kit endpoint returns the activated kit
            active_response_after = client.get("/api/v1/brand-kits/active", headers=headers)
            assert active_response_after.status_code == 200
            active_kit = active_response_after.json()
            assert active_kit is not None
            assert active_kit["id"] == brand_kit_id
            assert active_kit["is_active"] is True
            
            # Step 6: Verify the kit shows as active in list
            list_response = client.get("/api/v1/brand-kits", headers=headers)
            assert list_response.status_code == 200
            list_data = list_response.json()
            assert list_data["active_id"] == brand_kit_id


    def test_multiple_kits_activation(
        self,
        mock_settings,
        test_brand_kit_data,
    ):
        """
        Test: Create multiple kits → Activate one → Only one active
        
        This test verifies that only one brand kit can be active at a time.
        """
        with patch("backend.services.brand_kit_service.get_supabase_client") as mock_bk_supabase, \
             patch("backend.services.auth_service.get_supabase_client") as mock_auth_supabase, \
             patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.api.routes.auth.get_settings") as mock_route_settings:
            
            mock_get_settings.return_value = mock_settings
            mock_route_settings.return_value = mock_settings
            
            from backend.services.password_service import PasswordService
            password_svc = PasswordService(cost_factor=4)
            
            # Create user
            user_id = str(uuid.uuid4())
            test_password = "SecurePass123!"
            password_hash = password_svc.hash_password(test_password)
            user_row = create_mock_user_row(
                user_id=user_id,
                email="multi_kit_test@example.com",
                password_hash=password_hash,
            )
            
            # Setup auth mock
            mock_auth_client = MagicMock()
            mock_auth_supabase.return_value = mock_auth_client
            mock_auth_table = MagicMock()
            mock_auth_client.table.return_value = mock_auth_table
            mock_auth_select = MagicMock()
            mock_auth_table.select.return_value = mock_auth_select
            mock_auth_eq = MagicMock()
            mock_auth_select.eq.return_value = mock_auth_eq
            mock_auth_execute = MagicMock()
            mock_auth_eq.execute.return_value = mock_auth_execute
            mock_auth_execute.data = [user_row]
            
            # Setup brand kit mock
            mock_bk_client, state = setup_mock_supabase_for_brand_kits(
                mock_bk_supabase,
                user_row=user_row,
                brand_kits=[],
                count=0,
            )
            
            # Reset service singletons
            import backend.services.auth_service as auth_module
            import backend.services.brand_kit_service as bk_module
            auth_module._auth_service = None
            bk_module._brand_kit_service = None
            
            app = create_app()
            client = TestClient(app)
            
            # Step 1: Login
            login_data = {
                "email": user_row["email"],
                "password": test_password,
            }
            login_response = client.post("/api/v1/auth/login", json=login_data)
            assert login_response.status_code == 200
            access_token = login_response.json()["access_token"]
            headers = {"Authorization": f"Bearer {access_token}"}
            
            # Step 2: Create first brand kit
            kit1_data = {**test_brand_kit_data, "name": "Brand Kit 1"}
            create_response_1 = client.post(
                "/api/v1/brand-kits",
                json=kit1_data,
                headers=headers,
            )
            assert create_response_1.status_code == 201
            kit1 = create_response_1.json()
            kit1_id = kit1["id"]
            
            # Step 3: Create second brand kit
            kit2_data = {**test_brand_kit_data, "name": "Brand Kit 2"}
            create_response_2 = client.post(
                "/api/v1/brand-kits",
                json=kit2_data,
                headers=headers,
            )
            assert create_response_2.status_code == 201
            kit2 = create_response_2.json()
            kit2_id = kit2["id"]
            
            # Step 4: Create third brand kit
            kit3_data = {**test_brand_kit_data, "name": "Brand Kit 3"}
            create_response_3 = client.post(
                "/api/v1/brand-kits",
                json=kit3_data,
                headers=headers,
            )
            assert create_response_3.status_code == 201
            kit3 = create_response_3.json()
            kit3_id = kit3["id"]
            
            # Step 5: Verify all kits are inactive
            list_response = client.get("/api/v1/brand-kits", headers=headers)
            assert list_response.status_code == 200
            list_data = list_response.json()
            assert list_data["total"] == 3
            assert list_data["active_id"] is None
            for bk in list_data["brand_kits"]:
                assert bk["is_active"] is False
            
            # Step 6: Activate first kit
            activate_response_1 = client.post(
                f"/api/v1/brand-kits/{kit1_id}/activate",
                headers=headers,
            )
            assert activate_response_1.status_code == 200
            assert activate_response_1.json()["is_active"] is True
            
            # Step 7: Verify only kit1 is active
            list_response_after_1 = client.get("/api/v1/brand-kits", headers=headers)
            assert list_response_after_1.status_code == 200
            list_data_after_1 = list_response_after_1.json()
            assert list_data_after_1["active_id"] == kit1_id
            active_count = sum(1 for bk in list_data_after_1["brand_kits"] if bk["is_active"])
            assert active_count == 1
            
            # Step 8: Activate second kit
            activate_response_2 = client.post(
                f"/api/v1/brand-kits/{kit2_id}/activate",
                headers=headers,
            )
            assert activate_response_2.status_code == 200
            assert activate_response_2.json()["is_active"] is True
            
            # Step 9: Verify only kit2 is active now (kit1 should be deactivated)
            list_response_after_2 = client.get("/api/v1/brand-kits", headers=headers)
            assert list_response_after_2.status_code == 200
            list_data_after_2 = list_response_after_2.json()
            assert list_data_after_2["active_id"] == kit2_id
            
            # Count active kits - should be exactly 1
            active_count_after_2 = sum(1 for bk in list_data_after_2["brand_kits"] if bk["is_active"])
            assert active_count_after_2 == 1
            
            # Verify kit1 is no longer active
            kit1_in_list = next(bk for bk in list_data_after_2["brand_kits"] if bk["id"] == kit1_id)
            assert kit1_in_list["is_active"] is False
            
            # Verify kit2 is active
            kit2_in_list = next(bk for bk in list_data_after_2["brand_kits"] if bk["id"] == kit2_id)
            assert kit2_in_list["is_active"] is True
            
            # Step 10: Verify active endpoint returns kit2
            active_response = client.get("/api/v1/brand-kits/active", headers=headers)
            assert active_response.status_code == 200
            active_kit = active_response.json()
            assert active_kit is not None
            assert active_kit["id"] == kit2_id
            assert active_kit["name"] == "Brand Kit 2"


# =============================================================================
# TestBrandKitErrorHandling
# =============================================================================

class TestBrandKitErrorHandling:
    """Test error handling in brand kit flows."""
    
    def test_unauthorized_access_without_token(self, mock_settings):
        """Test that brand kit endpoints require authentication."""
        with patch("backend.api.middleware.auth.get_settings") as mock_get_settings:
            mock_get_settings.return_value = mock_settings
            
            app = create_app()
            client = TestClient(app)
            
            # Try to access brand kits without token
            response = client.get("/api/v1/brand-kits")
            assert response.status_code == 401
    
    def test_brand_kit_not_found(self, mock_settings):
        """Test 404 response for non-existent brand kit."""
        with patch("backend.services.brand_kit_service.get_supabase_client") as mock_bk_supabase, \
             patch("backend.services.auth_service.get_supabase_client") as mock_auth_supabase, \
             patch("backend.api.middleware.auth.get_settings") as mock_get_settings, \
             patch("backend.api.routes.auth.get_settings") as mock_route_settings:
            
            mock_get_settings.return_value = mock_settings
            mock_route_settings.return_value = mock_settings
            
            from backend.services.password_service import PasswordService
            password_svc = PasswordService(cost_factor=4)
            
            user_id = str(uuid.uuid4())
            test_password = "SecurePass123!"
            password_hash = password_svc.hash_password(test_password)
            user_row = create_mock_user_row(
                user_id=user_id,
                email="notfound_test@example.com",
                password_hash=password_hash,
            )
            
            # Setup auth mock
            mock_auth_client = MagicMock()
            mock_auth_supabase.return_value = mock_auth_client
            mock_auth_table = MagicMock()
            mock_auth_client.table.return_value = mock_auth_table
            mock_auth_select = MagicMock()
            mock_auth_table.select.return_value = mock_auth_select
            mock_auth_eq = MagicMock()
            mock_auth_select.eq.return_value = mock_auth_eq
            mock_auth_execute = MagicMock()
            mock_auth_eq.execute.return_value = mock_auth_execute
            mock_auth_execute.data = [user_row]
            
            # Setup brand kit mock with empty list
            mock_bk_client, state = setup_mock_supabase_for_brand_kits(
                mock_bk_supabase,
                user_row=user_row,
                brand_kits=[],
                count=0,
            )
            
            import backend.services.auth_service as auth_module
            import backend.services.brand_kit_service as bk_module
            auth_module._auth_service = None
            bk_module._brand_kit_service = None
            
            app = create_app()
            client = TestClient(app)
            
            # Login
            login_response = client.post("/api/v1/auth/login", json={
                "email": user_row["email"],
                "password": test_password,
            })
            assert login_response.status_code == 200
            access_token = login_response.json()["access_token"]
            headers = {"Authorization": f"Bearer {access_token}"}
            
            # Try to get non-existent brand kit
            fake_id = str(uuid.uuid4())
            response = client.get(f"/api/v1/brand-kits/{fake_id}", headers=headers)
            assert response.status_code == 404
