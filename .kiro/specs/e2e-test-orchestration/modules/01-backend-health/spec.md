# Module 01: Backend Health Tests

## Overview
Service health validation tests that run first to ensure all infrastructure is operational before running functional tests.

## Test Files

### `backend/tests/e2e/health/test_api_health.py`
```python
"""
API Server Health Tests.

Validates the FastAPI server is running and responding correctly.
"""

class TestAPIHealth:
    def test_health_endpoint_returns_200(self, client):
        """GET /health returns 200 with healthy status."""
        
    def test_health_includes_version(self, client):
        """Health response includes API version."""
        
    def test_health_includes_timestamp(self, client):
        """Health response includes server timestamp."""
        
    def test_health_includes_environment(self, client):
        """Health response includes environment (test/dev/prod)."""
```

### `backend/tests/e2e/health/test_redis_health.py`
```python
"""
Redis Health Tests.

Validates Redis connectivity and basic operations.
"""

class TestRedisHealth:
    def test_redis_connection(self, redis_client):
        """Redis connection is established."""
        
    def test_redis_ping(self, redis_client):
        """Redis responds to PING."""
        
    def test_redis_set_get(self, redis_client):
        """Redis SET/GET operations work."""
        
    def test_redis_queue_operations(self, redis_client):
        """Redis queue (RQ) operations work."""
```

### `backend/tests/e2e/health/test_database_health.py`
```python
"""
Database Health Tests.

Validates Supabase PostgreSQL connectivity and schema.
"""

class TestDatabaseHealth:
    def test_database_connection(self, supabase_client):
        """Database connection is established."""
        
    def test_simple_query(self, supabase_client):
        """Can execute simple SELECT query."""
        
    def test_all_tables_exist(self, supabase_client):
        """All 7 required tables exist."""
        
    def test_connection_pool_healthy(self, supabase_client):
        """Connection pool has available connections."""
```

### `backend/tests/e2e/health/test_storage_health.py`
```python
"""
Storage Health Tests.

Validates Supabase Storage bucket access.
"""

class TestStorageHealth:
    def test_storage_connection(self, storage_client):
        """Storage connection is established."""
        
    def test_assets_bucket_exists(self, storage_client):
        """Assets bucket exists and is accessible."""
        
    def test_uploads_bucket_exists(self, storage_client):
        """Uploads bucket exists and is accessible."""
        
    def test_logos_bucket_exists(self, storage_client):
        """Logos bucket exists and is accessible."""
        
    def test_brand_assets_bucket_exists(self, storage_client):
        """Brand-assets bucket exists and is accessible."""
```

## Fixtures Required

```python
# backend/tests/e2e/conftest.py

@pytest.fixture
def client():
    """FastAPI test client."""
    from backend.api.main import create_app
    app = create_app()
    return TestClient(app)

@pytest.fixture
def redis_client():
    """Redis client for health checks."""
    from redis import Redis
    return Redis.from_url(os.environ.get("REDIS_URL", "redis://localhost:6379"))

@pytest.fixture
def supabase_client():
    """Supabase client for database health checks."""
    from supabase import create_client
    return create_client(
        os.environ.get("SUPABASE_URL"),
        os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    )

@pytest.fixture
def storage_client(supabase_client):
    """Supabase storage client."""
    return supabase_client.storage
```

## Expected Outcomes

| Test | Expected Result |
|------|-----------------|
| API health | 200 OK with `{"status": "healthy"}` |
| Redis ping | PONG response |
| Database query | Successful SELECT 1 |
| Storage buckets | All 4 buckets accessible |

## Timeout
- Individual test: 10 seconds
- Module total: 60 seconds

## Dependencies
- None (runs first)

## Failure Impact
- **Critical**: If any health test fails, subsequent phases are blocked
- Deployment is halted until infrastructure issues are resolved
