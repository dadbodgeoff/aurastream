# Singleton Migration Example: auth.py

This document shows exactly how to migrate a route file from direct singleton calls to FastAPI dependency injection.

## Before Migration (Current Code)

```python
# backend/api/routes/auth.py (BEFORE)

from backend.services.auth_service import get_auth_service, User
from backend.services.audit_service import get_audit_service

@router.post("/signup", response_model=SignupResponse)
async def signup(request: Request, data: SignupRequest) -> SignupResponse:
    # Direct singleton calls inside the function body
    auth_service = get_auth_service()      # ← Problem: Not injectable
    audit_service = get_audit_service()    # ← Problem: Not injectable
    
    ip_address = get_client_ip(request)
    user_agent = _get_user_agent(request)
    
    await check_signup_rate_limit(request)
    
    try:
        user = await auth_service.signup(
            email=data.email,
            password=data.password,
            display_name=data.display_name,
        )
        
        audit_service.log_signup_success(
            user_id=user.id,
            email=data.email,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        
        return SignupResponse(user=_user_to_response(user))
        
    except EmailExistsError as e:
        audit_service.log_signup_failed(...)
        raise HTTPException(status_code=e.status_code, detail=e.to_dict())
```

## After Migration (With DI)

```python
# backend/api/routes/auth.py (AFTER)

from backend.api.service_dependencies import (
    AuthServiceDep,
    AuditServiceDep,
)
from backend.services.auth_service import User  # Still need User type

@router.post("/signup", response_model=SignupResponse)
async def signup(
    request: Request,
    data: SignupRequest,
    auth_service: AuthServiceDep,      # ← Injected via Depends()
    audit_service: AuditServiceDep,    # ← Injected via Depends()
) -> SignupResponse:
    # Services are now injected, not fetched
    ip_address = get_client_ip(request)
    user_agent = _get_user_agent(request)
    
    await check_signup_rate_limit(request)
    
    try:
        user = await auth_service.signup(
            email=data.email,
            password=data.password,
            display_name=data.display_name,
        )
        
        audit_service.log_signup_success(
            user_id=user.id,
            email=data.email,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        
        return SignupResponse(user=_user_to_response(user))
        
    except EmailExistsError as e:
        audit_service.log_signup_failed(...)
        raise HTTPException(status_code=e.status_code, detail=e.to_dict())
```

## Changes Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Import** | `from backend.services.auth_service import get_auth_service` | `from backend.api.service_dependencies import AuthServiceDep` |
| **Function Signature** | `async def signup(request, data)` | `async def signup(request, data, auth_service: AuthServiceDep)` |
| **Service Access** | `auth_service = get_auth_service()` | Service is already available as parameter |
| **Testability** | Must patch module | Use `app.dependency_overrides` |

## Testing: Before vs After

### Before (Module Patching)

```python
# backend/tests/unit/test_auth_routes.py (BEFORE)

from unittest.mock import patch, MagicMock, AsyncMock

@patch("backend.api.routes.auth.get_auth_service")
@patch("backend.api.routes.auth.get_audit_service")
async def test_signup_success(mock_audit, mock_auth, client):
    # Setup mocks
    mock_auth_service = MagicMock()
    mock_auth_service.signup = AsyncMock(return_value=mock_user)
    mock_auth.return_value = mock_auth_service
    
    mock_audit_service = MagicMock()
    mock_audit.return_value = mock_audit_service
    
    # Test
    response = client.post("/api/v1/auth/signup", json={...})
    
    assert response.status_code == 201
    mock_auth_service.signup.assert_called_once()
```

### After (Dependency Override)

```python
# backend/tests/unit/test_auth_routes.py (AFTER)

from backend.api.service_dependencies import (
    get_auth_service_dep,
    get_audit_service_dep,
)

@pytest.fixture
def mock_auth_service():
    mock = MagicMock()
    mock.signup = AsyncMock(return_value=mock_user)
    return mock

@pytest.fixture
def mock_audit_service():
    return MagicMock()

@pytest.fixture
def client_with_mocks(mock_auth_service, mock_audit_service):
    from backend.api.main import create_app
    app = create_app()
    
    # Clean dependency override - no patching needed!
    app.dependency_overrides[get_auth_service_dep] = lambda: mock_auth_service
    app.dependency_overrides[get_audit_service_dep] = lambda: mock_audit_service
    
    with TestClient(app) as client:
        yield client
    
    app.dependency_overrides.clear()

async def test_signup_success(client_with_mocks, mock_auth_service):
    response = client_with_mocks.post("/api/v1/auth/signup", json={...})
    
    assert response.status_code == 201
    mock_auth_service.signup.assert_called_once()
```

## Benefits of the Migration

1. **Cleaner Tests** - No more `@patch` decorators or module-level patching
2. **Type Safety** - IDE knows the type of injected services
3. **Visible Dependencies** - Function signature shows what services are needed
4. **Reusable Fixtures** - Mock services can be shared across tests
5. **No Test Pollution** - `dependency_overrides` is scoped to the test client

## Migration Checklist for Each Route File

- [ ] Add import: `from backend.api.service_dependencies import XxxServiceDep`
- [ ] Add service parameters to function signature
- [ ] Remove `service = get_xxx_service()` calls from function body
- [ ] Update tests to use `dependency_overrides` instead of `@patch`
- [ ] Run tests to verify functionality unchanged

## Full auth.py Migration Diff

```diff
 # backend/api/routes/auth.py
 
-from backend.services.auth_service import get_auth_service, User
-from backend.services.audit_service import get_audit_service
+from backend.api.service_dependencies import (
+    AuthServiceDep,
+    AuditServiceDep,
+    AuthTokenServiceDep,
+)
+from backend.services.auth_service import User
 
 @router.post("/signup", response_model=SignupResponse)
-async def signup(request: Request, data: SignupRequest) -> SignupResponse:
-    auth_service = get_auth_service()
-    audit_service = get_audit_service()
+async def signup(
+    request: Request,
+    data: SignupRequest,
+    auth_service: AuthServiceDep,
+    audit_service: AuditServiceDep,
+) -> SignupResponse:
     # ... rest of function unchanged ...
 
 @router.post("/login", response_model=LoginResponse)
-async def login(request: Request, response: Response, data: LoginRequest) -> LoginResponse:
-    auth_service = get_auth_service()
-    audit_service = get_audit_service()
+async def login(
+    request: Request,
+    response: Response,
+    data: LoginRequest,
+    auth_service: AuthServiceDep,
+    audit_service: AuditServiceDep,
+) -> LoginResponse:
     # ... rest of function unchanged ...
```
