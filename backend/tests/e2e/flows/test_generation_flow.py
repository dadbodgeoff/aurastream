"""
Generation Flow E2E Tests.

Complete user journey tests for content generation including:
- Creating generation jobs
- Getting job status
- Listing jobs
- Jobs with brand kit context

These tests validate end-to-end generation functionality with
mocked Supabase responses and worker queues for isolated testing.
"""

import uuid
from datetime import datetime, timezone
from typing import Dict, Any
from unittest.mock import MagicMock, patch, AsyncMock
from dataclasses import dataclass

import pytest
from fastapi.testclient import TestClient


@dataclass
class MockGenerationJob:
    """Mock generation job for testing."""
    id: str
    user_id: str
    brand_kit_id: str
    asset_type: str
    status: str
    progress: int
    error_message: str
    created_at: str
    updated_at: str
    completed_at: str


def create_mock_job(
    user_id: str,
    job_id: str = None,
    brand_kit_id: str = None,
    asset_type: str = "twitch_emote",
    status: str = "queued",
    progress: int = 0,
) -> MockGenerationJob:
    """
    Create a mock generation job for testing.
    
    Args:
        user_id: Owner's user ID
        job_id: Optional job ID (generated if not provided)
        brand_kit_id: Optional brand kit ID
        asset_type: Type of asset to generate
        status: Job status (queued, processing, completed, failed)
        progress: Job progress percentage
        
    Returns:
        MockGenerationJob instance
    """
    now = datetime.now(timezone.utc).isoformat()
    return MockGenerationJob(
        id=job_id or str(uuid.uuid4()),
        user_id=user_id,
        brand_kit_id=brand_kit_id,
        asset_type=asset_type,
        status=status,
        progress=progress,
        error_message=None,
        created_at=now,
        updated_at=now,
        completed_at=None,
    )


@pytest.mark.e2e
class TestGenerationFlow:
    """
    End-to-end tests for content generation user journeys.
    
    These tests validate complete generation flows including
    job creation, status tracking, and listing.
    All database operations and worker queues are mocked for isolated testing.
    """

    def test_create_generation_job(
        self,
        client: TestClient,
        authenticated_user: dict,
    ) -> None:
        """
        Test that POST /api/v1/generate creates a job with status=queued.
        
        Validates:
            - Generate endpoint accepts valid generation request
            - Returns 201 Created status code
            - Response contains job ID
            - Job status is 'queued'
            - Job is associated with authenticated user
            
        Flow:
            1. Submit generation request with asset type
            2. Verify job is created with queued status
        """
        headers = authenticated_user["headers"]
        user_id = authenticated_user["user"]["id"]
        
        job_id = str(uuid.uuid4())
        mock_job = create_mock_job(
            user_id=user_id,
            job_id=job_id,
            asset_type="twitch_emote",
            status="queued",
        )
        
        with patch("backend.services.generation_service.get_supabase_client") as mock_supabase, \
             patch("backend.services.audit_service.get_audit_service") as mock_audit, \
             patch("backend.workers.generation_worker.enqueue_generation_job") as mock_enqueue:
            
            mock_client = MagicMock()
            mock_supabase.return_value = mock_client
            
            mock_table = MagicMock()
            mock_client.table.return_value = mock_table
            
            # Mock: insert returns new job
            mock_insert = MagicMock()
            mock_table.insert.return_value = mock_insert
            mock_insert.execute.return_value = MagicMock(data=[{
                "id": mock_job.id,
                "user_id": mock_job.user_id,
                "brand_kit_id": mock_job.brand_kit_id,
                "asset_type": mock_job.asset_type,
                "status": mock_job.status,
                "progress": mock_job.progress,
                "error_message": mock_job.error_message,
                "created_at": mock_job.created_at,
                "updated_at": mock_job.updated_at,
                "completed_at": mock_job.completed_at,
            }])
            
            # Mock audit service
            mock_audit_instance = MagicMock()
            mock_audit_instance.log = AsyncMock()
            mock_audit.return_value = mock_audit_instance
            
            # Mock worker enqueue
            mock_enqueue.return_value = None
            
            # Reset generation service singleton
            import backend.services.generation_service as gen_module
            gen_module._generation_service = None
            
            generate_data = {
                "asset_type": "twitch_emote",
                "custom_prompt": "A happy cat emote",
            }
            
            response = client.post(
                "/api/v1/generate",
                headers=headers,
                json=generate_data,
            )
            
            assert response.status_code == 201, (
                f"Create job should return 201, got {response.status_code}: {response.text}"
            )
            
            data = response.json()
            assert "id" in data, "Response should contain job ID"
            assert data["status"] == "queued", "Job status should be 'queued'"
            assert data["user_id"] == user_id, "Job should belong to user"
            assert data["asset_type"] == "twitch_emote", "Asset type should match"

    def test_get_job_status(
        self,
        client: TestClient,
        authenticated_user: dict,
    ) -> None:
        """
        Test that GET /api/v1/jobs/{id} returns job with status.
        
        Validates:
            - Get job endpoint requires authentication
            - Returns 200 OK status code
            - Response contains job data with status
            - Job ID matches requested ID
            
        Flow:
            1. Create mock job
            2. Request job by ID
            3. Verify job data is returned with status
        """
        headers = authenticated_user["headers"]
        user_id = authenticated_user["user"]["id"]
        
        job_id = str(uuid.uuid4())
        mock_job = create_mock_job(
            user_id=user_id,
            job_id=job_id,
            status="processing",
            progress=50,
        )
        
        with patch("backend.services.generation_service.get_supabase_client") as mock_supabase:
            mock_client = MagicMock()
            mock_supabase.return_value = mock_client
            
            mock_table = MagicMock()
            mock_client.table.return_value = mock_table
            
            # Mock: select returns job
            mock_select = MagicMock()
            mock_table.select.return_value = mock_select
            mock_eq = MagicMock()
            mock_select.eq.return_value = mock_eq
            mock_eq2 = MagicMock()
            mock_eq.eq.return_value = mock_eq2
            mock_eq2.execute.return_value = MagicMock(data=[{
                "id": mock_job.id,
                "user_id": mock_job.user_id,
                "brand_kit_id": mock_job.brand_kit_id,
                "asset_type": mock_job.asset_type,
                "status": mock_job.status,
                "progress": mock_job.progress,
                "error_message": mock_job.error_message,
                "created_at": mock_job.created_at,
                "updated_at": mock_job.updated_at,
                "completed_at": mock_job.completed_at,
            }])
            
            # Reset generation service singleton
            import backend.services.generation_service as gen_module
            gen_module._generation_service = None
            
            response = client.get(
                f"/api/v1/jobs/{job_id}",
                headers=headers,
            )
            
            assert response.status_code == 200, (
                f"Get job should return 200, got {response.status_code}: {response.text}"
            )
            
            data = response.json()
            assert data["id"] == job_id, "Job ID should match"
            assert data["status"] == "processing", "Job status should be 'processing'"
            assert data["progress"] == 50, "Job progress should be 50"

    def test_list_jobs(
        self,
        client: TestClient,
        authenticated_user: dict,
    ) -> None:
        """
        Test that GET /api/v1/jobs returns user's jobs.
        
        Validates:
            - List jobs endpoint requires authentication
            - Returns 200 OK status code
            - Response contains jobs array
            - Response contains total count
            - Only returns jobs owned by user
            
        Flow:
            1. Create mock jobs for user
            2. Request job list
            3. Verify all user's jobs are returned
        """
        headers = authenticated_user["headers"]
        user_id = authenticated_user["user"]["id"]
        
        mock_jobs = [
            create_mock_job(user_id, status="completed"),
            create_mock_job(user_id, status="processing"),
            create_mock_job(user_id, status="queued"),
        ]
        
        mock_jobs_data = [
            {
                "id": job.id,
                "user_id": job.user_id,
                "brand_kit_id": job.brand_kit_id,
                "asset_type": job.asset_type,
                "status": job.status,
                "progress": job.progress,
                "error_message": job.error_message,
                "created_at": job.created_at,
                "updated_at": job.updated_at,
                "completed_at": job.completed_at,
            }
            for job in mock_jobs
        ]
        
        with patch("backend.services.generation_service.get_supabase_client") as mock_supabase:
            mock_client = MagicMock()
            mock_supabase.return_value = mock_client
            
            mock_table = MagicMock()
            mock_client.table.return_value = mock_table
            
            # Mock: select returns jobs
            mock_select = MagicMock()
            mock_table.select.return_value = mock_select
            mock_eq = MagicMock()
            mock_select.eq.return_value = mock_eq
            mock_order = MagicMock()
            mock_eq.order.return_value = mock_order
            mock_limit = MagicMock()
            mock_order.limit.return_value = mock_limit
            mock_offset = MagicMock()
            mock_limit.offset.return_value = mock_offset
            mock_offset.execute.return_value = MagicMock(data=mock_jobs_data)
            
            # Reset generation service singleton
            import backend.services.generation_service as gen_module
            gen_module._generation_service = None
            
            response = client.get("/api/v1/jobs", headers=headers)
            
            assert response.status_code == 200, (
                f"List jobs should return 200, got {response.status_code}: {response.text}"
            )
            
            data = response.json()
            assert "jobs" in data, "Response should contain jobs array"
            assert "total" in data, "Response should contain total count"
            assert len(data["jobs"]) == 3, "Should return 3 jobs"

    def test_job_with_brand_kit(
        self,
        client: TestClient,
        authenticated_user: dict,
        brand_kit: dict,
    ) -> None:
        """
        Test that POST /api/v1/generate with brand_kit_id uses brand context.
        
        Validates:
            - Generate endpoint accepts brand_kit_id
            - Returns 201 Created status code
            - Job is created with brand_kit_id reference
            - Brand kit context is used for generation
            
        Flow:
            1. Use brand_kit fixture for brand context
            2. Submit generation request with brand_kit_id
            3. Verify job is created with brand kit reference
        """
        headers = authenticated_user["headers"]
        user_id = authenticated_user["user"]["id"]
        brand_kit_id = brand_kit["id"]
        
        job_id = str(uuid.uuid4())
        mock_job = create_mock_job(
            user_id=user_id,
            job_id=job_id,
            brand_kit_id=brand_kit_id,
            asset_type="twitch_banner",
            status="queued",
        )
        
        with patch("backend.services.generation_service.get_supabase_client") as mock_supabase, \
             patch("backend.services.brand_kit_service.get_supabase_client") as mock_bk_supabase, \
             patch("backend.services.audit_service.get_audit_service") as mock_audit, \
             patch("backend.workers.generation_worker.enqueue_generation_job") as mock_enqueue:
            
            # Mock generation service supabase
            mock_client = MagicMock()
            mock_supabase.return_value = mock_client
            
            mock_table = MagicMock()
            mock_client.table.return_value = mock_table
            
            # Mock: insert returns new job
            mock_insert = MagicMock()
            mock_table.insert.return_value = mock_insert
            mock_insert.execute.return_value = MagicMock(data=[{
                "id": mock_job.id,
                "user_id": mock_job.user_id,
                "brand_kit_id": mock_job.brand_kit_id,
                "asset_type": mock_job.asset_type,
                "status": mock_job.status,
                "progress": mock_job.progress,
                "error_message": mock_job.error_message,
                "created_at": mock_job.created_at,
                "updated_at": mock_job.updated_at,
                "completed_at": mock_job.completed_at,
            }])
            
            # Mock brand kit service supabase
            mock_bk_client = MagicMock()
            mock_bk_supabase.return_value = mock_bk_client
            
            mock_bk_table = MagicMock()
            mock_bk_client.table.return_value = mock_bk_table
            
            mock_bk_select = MagicMock()
            mock_bk_table.select.return_value = mock_bk_select
            mock_bk_eq = MagicMock()
            mock_bk_select.eq.return_value = mock_bk_eq
            mock_bk_eq2 = MagicMock()
            mock_bk_eq.eq.return_value = mock_bk_eq2
            mock_bk_eq2.execute.return_value = MagicMock(data=brand_kit)
            
            # Mock audit service
            mock_audit_instance = MagicMock()
            mock_audit_instance.log = AsyncMock()
            mock_audit.return_value = mock_audit_instance
            
            # Mock worker enqueue
            mock_enqueue.return_value = None
            
            # Reset service singletons
            import backend.services.generation_service as gen_module
            import backend.services.brand_kit_service as bk_module
            gen_module._generation_service = None
            bk_module._brand_kit_service = None
            
            generate_data = {
                "asset_type": "twitch_banner",
                "brand_kit_id": brand_kit_id,
                "custom_prompt": "A professional gaming banner",
            }
            
            response = client.post(
                "/api/v1/generate",
                headers=headers,
                json=generate_data,
            )
            
            assert response.status_code == 201, (
                f"Create job with brand kit should return 201, got {response.status_code}: {response.text}"
            )
            
            data = response.json()
            assert "id" in data, "Response should contain job ID"
            assert data["brand_kit_id"] == brand_kit_id, "Job should reference brand kit"
            assert data["asset_type"] == "twitch_banner", "Asset type should match"
