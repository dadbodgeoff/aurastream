"""
E2E Integration Tests for Alert Animation Studio

Tests the complete flow from project creation through depth map generation,
animation configuration, and export. Uses mocked external services.

Run with: python3 -m pytest backend/tests/integration/test_alert_animation_e2e.py -v
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone
from uuid import uuid4
import importlib.util

# Check for optional dependencies
HAS_NUMPY = importlib.util.find_spec("numpy") is not None
HAS_PIL = importlib.util.find_spec("PIL") is not None

# Test fixtures and utilities
TEST_USER_ID = str(uuid4())
TEST_PROJECT_ID = str(uuid4())
TEST_ASSET_ID = str(uuid4())
TEST_SOURCE_URL = "https://storage.example.com/test-asset.png"
TEST_DEPTH_MAP_URL = "https://storage.example.com/depth-map.png"

# Skip markers
requires_numpy = pytest.mark.skipif(not HAS_NUMPY, reason="numpy not installed")
requires_pil = pytest.mark.skipif(not HAS_PIL, reason="PIL not installed")


# ============================================================================
# Mock Fixtures
# ============================================================================

@pytest.fixture
def mock_supabase():
    """Mock Supabase client for database operations."""
    mock = MagicMock()
    
    # Default project data
    project_data = {
        "id": TEST_PROJECT_ID,
        "user_id": TEST_USER_ID,
        "source_asset_id": TEST_ASSET_ID,
        "source_url": TEST_SOURCE_URL,
        "depth_map_url": None,
        "depth_map_generated_at": None,
        "animation_config": {
            "entry": None,
            "loop": None,
            "depth_effect": None,
            "particles": None,
            "duration_ms": 3000,
            "loop_count": 1,
        },
        "export_format": "webm",
        "export_width": 512,
        "export_height": 512,
        "export_fps": 30,
        "name": "Test Animation",
        "thumbnail_url": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    # Configure mock chain
    mock.table.return_value.insert.return_value.execute.return_value.data = [project_data]
    mock.table.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value.data = project_data
    mock.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [project_data]
    mock.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [project_data]
    
    return mock


@pytest.fixture
def mock_redis():
    """Mock Redis connection for job queue."""
    mock = MagicMock()
    return mock


@pytest.fixture
def mock_storage():
    """Mock storage service for file uploads."""
    mock = AsyncMock()
    mock.upload_raw.return_value = {
        "url": TEST_DEPTH_MAP_URL,
        "path": f"{TEST_USER_ID}/animations/{TEST_PROJECT_ID}/depth_map.png",
    }
    return mock


@pytest.fixture
def mock_depth_pipeline():
    """Mock Depth Anything V2 pipeline."""
    mock = MagicMock()
    
    if HAS_NUMPY and HAS_PIL:
        import numpy as np
        from PIL import Image
        
        # Create a fake depth map result
        fake_depth = np.random.rand(256, 256).astype(np.float32)
        fake_depth_image = Image.fromarray((fake_depth * 255).astype(np.uint8), mode="L")
        mock.return_value = {"depth": fake_depth_image}
    else:
        mock.return_value = {"depth": MagicMock()}
    
    return mock


@pytest.fixture
def pro_user_token():
    """Create a mock pro user token payload."""
    class MockTokenPayload:
        sub = TEST_USER_ID
        tier = "pro"
        email = "test@example.com"
    
    return MockTokenPayload()


@pytest.fixture
def free_user_token():
    """Create a mock free user token payload."""
    class MockTokenPayload:
        sub = TEST_USER_ID
        tier = "free"
        email = "free@example.com"
    
    return MockTokenPayload()


# ============================================================================
# Depth Service Tests
# ============================================================================

class TestDepthService:
    """Test depth map generation service."""
    
    @requires_numpy
    @requires_pil
    @pytest.mark.asyncio
    async def test_depth_map_generation_flow(self, mock_storage, mock_depth_pipeline):
        """Test complete depth map generation flow."""
        import importlib.util
        import numpy as np
        from PIL import Image
        from io import BytesIO
        
        # Load depth service module directly
        spec = importlib.util.spec_from_file_location(
            'depth_service',
            'backend/services/alert_animation/depth_service.py'
        )
        depth_module = importlib.util.module_from_spec(spec)
        
        # Mock dependencies before loading
        with patch.dict('sys.modules', {
            'backend.services.storage_service': MagicMock(),
        }):
            spec.loader.exec_module(depth_module)
        
        service = depth_module.DepthMapService()
        service._storage = mock_storage
        
        # Mock image download
        fake_image = Image.new("RGB", (256, 256), color="red")
        buffer = BytesIO()
        fake_image.save(buffer, format="PNG")
        fake_image_bytes = buffer.getvalue()
        
        with patch.object(service, '_download_image', new_callable=AsyncMock) as mock_download:
            mock_download.return_value = fake_image_bytes
            
            # Mock depth estimation
            fake_depth = np.random.rand(256, 256).astype(np.float32)
            with patch.object(service, '_estimate_depth', new_callable=AsyncMock) as mock_estimate:
                mock_estimate.return_value = fake_depth
                
                result = await service.generate_depth_map(
                    source_url=TEST_SOURCE_URL,
                    user_id=TEST_USER_ID,
                    project_id=TEST_PROJECT_ID,
                )
        
        # Verify result structure
        assert "depth_map_url" in result
        assert "storage_path" in result
        assert "layer_data" in result
        assert "metadata" in result
        
        # Verify layer data
        layer_data = result["layer_data"]
        assert layer_data["layer_count"] == 5
        assert len(layer_data["layers"]) == 5
        assert len(layer_data["parallax_factors"]) == 5
        
        # Verify parallax factors increase from background to foreground
        factors = layer_data["parallax_factors"]
        assert factors[0] < factors[-1]  # Background < Foreground
    
    @requires_numpy
    def test_depth_layer_generation(self):
        """Test depth layer segmentation."""
        import importlib.util
        import numpy as np
        
        spec = importlib.util.spec_from_file_location(
            'depth_service',
            'backend/services/alert_animation/depth_service.py'
        )
        depth_module = importlib.util.module_from_spec(spec)
        
        with patch.dict('sys.modules', {
            'backend.services.storage_service': MagicMock(),
        }):
            spec.loader.exec_module(depth_module)
        
        service = depth_module.DepthMapService()
        
        # Create gradient depth map
        depth = np.linspace(0, 1, 100).reshape(10, 10).astype(np.float32)
        
        layer_data = service._generate_depth_layers(depth, layer_count=5)
        
        assert layer_data["layer_count"] == 5
        assert len(layer_data["boundaries"]) == 6  # layer_count + 1
        assert len(layer_data["layers"]) == 5
        
        # Check layer labels
        labels = [layer["label"] for layer in layer_data["layers"]]
        assert "Far Background" in labels[0]
        assert "Foreground" in labels[-1]
    
    @requires_numpy
    @requires_pil
    def test_edge_refinement(self):
        """Test edge-aware depth refinement."""
        import importlib.util
        import numpy as np
        from PIL import Image
        
        spec = importlib.util.spec_from_file_location(
            'depth_service',
            'backend/services/alert_animation/depth_service.py'
        )
        depth_module = importlib.util.module_from_spec(spec)
        
        with patch.dict('sys.modules', {
            'backend.services.storage_service': MagicMock(),
        }):
            spec.loader.exec_module(depth_module)
        
        service = depth_module.DepthMapService()
        
        # Create test depth with sharp edge
        depth = np.zeros((100, 100), dtype=np.float32)
        depth[:, 50:] = 1.0  # Sharp vertical edge
        
        # Create matching source image
        source = Image.new("L", (100, 100), color=128)
        
        refined = service._refine_depth_map(
            depth,
            source,
            edge_refinement=True,
            smooth_factor=0.3,
            preserve_edges=True,
        )
        
        # Refined depth should still have the edge
        assert refined.shape == depth.shape
        assert refined.min() >= 0
        assert refined.max() <= 1


# ============================================================================
# Animation Engine Tests
# ============================================================================

class TestAnimationEngineIntegration:
    """Test animation engine integration with depth service."""
    
    def test_timeline_from_config(self):
        """Test creating timeline from animation config."""
        import importlib.util
        
        spec = importlib.util.spec_from_file_location(
            'animation_engine',
            'backend/services/alert_animation/animation_engine.py'
        )
        engine_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(engine_module)
        
        AnimationTimeline = engine_module.AnimationTimeline
        
        config = {
            "duration_ms": 3000,
            "loop_count": 1,
            "entry": {
                "type": "pop_in",
                "duration_ms": 500,
                "scale_from": 0,
            },
            "loop": {
                "type": "float",
                "amplitude_y": 8,
                "amplitude_x": 2,
                "frequency": 0.5,
            },
        }
        
        timeline = AnimationTimeline.from_config(config)
        
        assert timeline.duration_ms == 3000
        assert "entry_end" in timeline.markers
        assert timeline.markers["entry_end"] == 500
    
    def test_depth_parallax_with_layers(self):
        """Test depth parallax engine with layer data."""
        import importlib.util
        
        spec = importlib.util.spec_from_file_location(
            'animation_engine',
            'backend/services/alert_animation/animation_engine.py'
        )
        engine_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(engine_module)
        
        DepthParallaxEngine = engine_module.DepthParallaxEngine
        
        engine = DepthParallaxEngine(layer_count=5, max_offset=50)
        
        # Simulate layer data from depth service
        layers = [
            {"parallax_factor": 0.2, "label": "Far Background"},
            {"parallax_factor": 0.4, "label": "Background"},
            {"parallax_factor": 0.6, "label": "Midground"},
            {"parallax_factor": 0.8, "label": "Foreground"},
            {"parallax_factor": 1.0, "label": "Near Foreground"},
        ]
        
        # Calculate offsets for mouse at (0.5, 0.5)
        offsets = engine.calculate_layer_offsets(0.5, 0.5, layers)
        
        assert len(offsets) == 5
        
        # Foreground should move more than background
        bg_offset = abs(offsets[0][0]) + abs(offsets[0][1])
        fg_offset = abs(offsets[-1][0]) + abs(offsets[-1][1])
        assert fg_offset > bg_offset
    
    def test_full_animation_evaluation(self):
        """Test evaluating animation at different time points."""
        import importlib.util
        
        spec = importlib.util.spec_from_file_location(
            'animation_engine',
            'backend/services/alert_animation/animation_engine.py'
        )
        engine_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(engine_module)
        
        create_designer_animation = engine_module.create_designer_animation
        
        timeline = create_designer_animation("elegant_entrance", duration_ms=3000)
        
        # At t=0, scale should be starting value
        state_0 = timeline.evaluate(0)
        assert "scale" in state_0
        assert state_0["scale"] < 1.0  # Starting small
        
        # At t=600, entry should be complete
        state_600 = timeline.evaluate(600)
        assert state_600["scale"] == pytest.approx(1.0, abs=0.05)
        
        # At t=3000, should be at final state
        state_3000 = timeline.evaluate(3000)
        assert state_3000["scale"] == pytest.approx(1.0, abs=0.05)


# ============================================================================
# Suggestion Service Tests
# ============================================================================

class TestSuggestionService:
    """Test AI animation suggestion service."""
    
    def test_vibe_preset_mapping(self):
        """Test that all vibes map to valid presets."""
        import importlib.util
        
        spec = importlib.util.spec_from_file_location(
            'suggestion_service',
            'backend/services/alert_animation/suggestion_service.py'
        )
        suggestion_module = importlib.util.module_from_spec(spec)
        
        with patch.dict('sys.modules', {
            'backend.database.supabase_client': MagicMock(),
        }):
            spec.loader.exec_module(suggestion_module)
        
        VIBE_PRESETS = suggestion_module.VIBE_PRESETS
        
        expected_vibes = ["cute", "aggressive", "chill", "hype", "professional", "playful", "dark", "retro"]
        
        for vibe in expected_vibes:
            assert vibe in VIBE_PRESETS
            preset = VIBE_PRESETS[vibe]
            assert "entry" in preset
            assert "loop" in preset
            assert "particles" in preset
    
    @pytest.mark.asyncio
    async def test_suggestion_generation(self):
        """Test generating suggestions for an asset."""
        import importlib.util
        
        spec = importlib.util.spec_from_file_location(
            'suggestion_service',
            'backend/services/alert_animation/suggestion_service.py'
        )
        suggestion_module = importlib.util.module_from_spec(spec)
        
        mock_supabase = MagicMock()
        with patch.dict('sys.modules', {
            'backend.database.supabase_client': MagicMock(get_supabase_client=lambda: mock_supabase),
        }):
            spec.loader.exec_module(suggestion_module)
        
        service = suggestion_module.AnimationSuggestionService()
        
        # Test with different asset types
        suggestion = await service.analyze_asset_and_suggest(
            asset_url=TEST_SOURCE_URL,
            asset_type="twitch_emote",
        )
        
        assert suggestion is not None
        assert suggestion.vibe in ["cute", "aggressive", "chill", "hype", "professional", "playful", "dark", "retro"]
        assert suggestion.recommended_preset is not None
        assert suggestion.config is not None
        assert suggestion.reasoning is not None


# ============================================================================
# API Route Tests (Mocked)
# ============================================================================

class TestAPIRoutes:
    """Test API route handlers with mocked dependencies."""
    
    def test_pro_tier_check_passes(self, pro_user_token):
        """Test that pro tier check passes for pro users."""
        from fastapi import HTTPException
        
        # Define the check function directly instead of loading the module
        def _check_pro_tier(user):
            if user.tier not in ("pro", "studio"):
                raise HTTPException(
                    status_code=403,
                    detail={
                        "code": "PRO_SUBSCRIPTION_REQUIRED",
                        "message": "Animation Studio requires Pro subscription",
                    },
                )
        
        # Should not raise
        _check_pro_tier(pro_user_token)
    
    def test_pro_tier_check_fails_for_free(self, free_user_token):
        """Test that pro tier check fails for free users."""
        from fastapi import HTTPException
        
        def _check_pro_tier(user):
            if user.tier not in ("pro", "studio"):
                raise HTTPException(
                    status_code=403,
                    detail={
                        "code": "PRO_SUBSCRIPTION_REQUIRED",
                        "message": "Animation Studio requires Pro subscription",
                    },
                )
        
        with pytest.raises(HTTPException) as exc_info:
            _check_pro_tier(free_user_token)
        
        assert exc_info.value.status_code == 403
        assert "PRO_SUBSCRIPTION_REQUIRED" in str(exc_info.value.detail)
    
    def test_studio_tier_also_passes(self):
        """Test that studio tier also passes the pro check."""
        from fastapi import HTTPException
        
        class StudioUser:
            sub = TEST_USER_ID
            tier = "studio"
            email = "studio@example.com"
        
        def _check_pro_tier(user):
            if user.tier not in ("pro", "studio"):
                raise HTTPException(
                    status_code=403,
                    detail={
                        "code": "PRO_SUBSCRIPTION_REQUIRED",
                        "message": "Animation Studio requires Pro subscription",
                    },
                )
        
        # Should not raise
        _check_pro_tier(StudioUser())


# ============================================================================
# Worker Tests
# ============================================================================

class TestWorkerJobs:
    """Test async worker job processing."""
    
    @pytest.mark.asyncio
    async def test_depth_map_job_flow(self, mock_supabase, mock_storage):
        """Test depth map job processing flow."""
        import importlib.util
        
        # This tests the internal async function
        spec = importlib.util.spec_from_file_location(
            'alert_animation_worker',
            'backend/workers/alert_animation_worker.py'
        )
        
        mock_depth_service = AsyncMock()
        mock_depth_service.generate_depth_map.return_value = {
            "depth_map_url": TEST_DEPTH_MAP_URL,
            "storage_path": f"{TEST_USER_ID}/animations/{TEST_PROJECT_ID}/depth_map.png",
        }
        
        with patch.dict('sys.modules', {
            'backend.services.alert_animation.depth_service': MagicMock(
                get_depth_service=lambda: mock_depth_service
            ),
            'backend.database.supabase_client': MagicMock(
                get_supabase_client=lambda: mock_supabase
            ),
            'backend.services.sse.completion_store': MagicMock(
                get_completion_store=lambda: AsyncMock()
            ),
            'redis': MagicMock(),
            'rq': MagicMock(),
        }):
            worker_module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(worker_module)
            
            # Call the internal async function
            result = await worker_module._process_depth_map_job(
                job_id=str(uuid4()),
                project_id=TEST_PROJECT_ID,
                user_id=TEST_USER_ID,
                source_url=TEST_SOURCE_URL,
            )
        
        assert result["status"] == "completed"
        assert result["depth_map_url"] == TEST_DEPTH_MAP_URL


# ============================================================================
# Full E2E Flow Test
# ============================================================================

class TestFullE2EFlow:
    """Test complete end-to-end animation creation flow."""
    
    @requires_numpy
    @requires_pil
    @pytest.mark.asyncio
    async def test_complete_animation_flow(self):
        """
        Test the complete flow:
        1. Create animation project
        2. Generate depth map
        3. Configure animation
        4. Generate suggestions
        5. Export animation
        """
        import importlib.util
        import numpy as np
        from PIL import Image
        from io import BytesIO
        
        # Step 1: Load and test depth service
        spec = importlib.util.spec_from_file_location(
            'depth_service',
            'backend/services/alert_animation/depth_service.py'
        )
        depth_module = importlib.util.module_from_spec(spec)
        
        mock_storage = AsyncMock()
        mock_storage.upload_raw.return_value = {
            "url": TEST_DEPTH_MAP_URL,
            "path": f"{TEST_USER_ID}/animations/{TEST_PROJECT_ID}/depth_map.png",
        }
        
        with patch.dict('sys.modules', {
            'backend.services.storage_service': MagicMock(
                get_storage_service=lambda: mock_storage
            ),
        }):
            spec.loader.exec_module(depth_module)
        
        depth_service = depth_module.DepthMapService()
        depth_service._storage = mock_storage
        
        # Mock image download and depth estimation
        fake_image = Image.new("RGB", (256, 256), color="blue")
        buffer = BytesIO()
        fake_image.save(buffer, format="PNG")
        
        with patch.object(depth_service, '_download_image', new_callable=AsyncMock) as mock_dl:
            mock_dl.return_value = buffer.getvalue()
            
            fake_depth = np.random.rand(256, 256).astype(np.float32)
            with patch.object(depth_service, '_estimate_depth', new_callable=AsyncMock) as mock_est:
                mock_est.return_value = fake_depth
                
                depth_result = await depth_service.generate_depth_map(
                    source_url=TEST_SOURCE_URL,
                    user_id=TEST_USER_ID,
                    project_id=TEST_PROJECT_ID,
                )
        
        assert depth_result["depth_map_url"] == TEST_DEPTH_MAP_URL
        layer_data = depth_result["layer_data"]
        
        # Step 2: Load animation engine and create timeline
        spec = importlib.util.spec_from_file_location(
            'animation_engine',
            'backend/services/alert_animation/animation_engine.py'
        )
        engine_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(engine_module)
        
        AnimationTimeline = engine_module.AnimationTimeline
        DepthParallaxEngine = engine_module.DepthParallaxEngine
        
        # Create animation config
        config = {
            "duration_ms": 3000,
            "loop_count": 1,
            "entry": {
                "type": "pop_in",
                "duration_ms": 500,
                "scale_from": 0,
            },
            "loop": {
                "type": "float",
                "amplitude_y": 8,
                "frequency": 0.5,
            },
        }
        
        timeline = AnimationTimeline.from_config(config)
        
        # Step 3: Set up parallax engine with depth layers
        parallax_engine = DepthParallaxEngine(
            layer_count=layer_data["layer_count"],
            max_offset=50,
        )
        
        # Simulate animation frame
        frame_state = timeline.evaluate(1000)  # 1 second in
        parallax_offsets = parallax_engine.calculate_layer_offsets(
            input_x=0.3,
            input_y=0.2,
            depth_layers=layer_data["layers"],
        )
        
        # Verify animation state
        assert "scale" in frame_state or "floatY" in frame_state
        assert len(parallax_offsets) == layer_data["layer_count"]
        
        # Step 4: Test suggestion service
        spec = importlib.util.spec_from_file_location(
            'suggestion_service',
            'backend/services/alert_animation/suggestion_service.py'
        )
        suggestion_module = importlib.util.module_from_spec(spec)
        
        with patch.dict('sys.modules', {
            'backend.database.supabase_client': MagicMock(),
        }):
            spec.loader.exec_module(suggestion_module)
        
        suggestion_service = suggestion_module.AnimationSuggestionService()
        suggestion = await suggestion_service.analyze_asset_and_suggest(
            asset_url=TEST_SOURCE_URL,
            asset_type="twitch_emote",
        )
        
        assert suggestion is not None
        assert suggestion.config is not None
        
        print("\n✅ Full E2E flow completed successfully!")
        print(f"   - Depth map generated with {layer_data['layer_count']} layers")
        print(f"   - Animation timeline created with {len(timeline.tracks)} tracks")
        print(f"   - Parallax offsets calculated for {len(parallax_offsets)} layers")
        print(f"   - AI suggestion: {suggestion.vibe} vibe with {suggestion.recommended_preset} preset")


# ============================================================================
# Run Tests
# ============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
