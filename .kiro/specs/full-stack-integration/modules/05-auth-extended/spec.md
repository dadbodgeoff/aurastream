# MODULE 5: AUTH EXTENDED ENDPOINTS

## Overview
Implement password reset, email verification, profile update, and account deletion. These are critical for user management and GDPR compliance.

## Priority: HIGH
## Dependencies: None (can run parallel)
## Estimated Effort: 8-10 hours

---

## BACKEND IMPLEMENTATION REQUIRED

### Task 5.1: Create Database Migration
**File:** `backend/database/migrations/006_auth_tokens.sql`

```sql
-- Migration 006: Auth tokens for password reset and email verification

CREATE TABLE IF NOT EXISTS auth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_type TEXT NOT NULL CHECK (token_type IN ('password_reset', 'email_verification')),
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_auth_tokens_user_id ON auth_tokens(user_id);
CREATE INDEX idx_auth_tokens_type_expires ON auth_tokens(token_type, expires_at);

COMMENT ON TABLE auth_tokens IS 'Tokens for password reset and email verification';
```

### Task 5.2: Create Auth Token Service
**File:** `backend/services/auth_token_service.py`

Implement secure token generation and validation.


```python
"""
Auth Token Service for password reset and email verification.
"""
import secrets
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import uuid4

from backend.database.supabase_client import get_supabase_client


class AuthTokenService:
    """Service for managing auth tokens (password reset, email verification)."""
    
    def __init__(self, supabase_client=None):
        self._supabase = supabase_client
        self.table = "auth_tokens"
        self.password_reset_expiry_hours = 1
        self.email_verification_expiry_hours = 24
    
    @property
    def db(self):
        if self._supabase is None:
            self._supabase = get_supabase_client()
        return self._supabase
    
    def _generate_token(self) -> tuple[str, str]:
        """Generate a secure token and its hash."""
        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        return token, token_hash
    
    def _hash_token(self, token: str) -> str:
        """Hash a token for comparison."""
        return hashlib.sha256(token.encode()).hexdigest()
    
    async def create_password_reset_token(self, user_id: str) -> str:
        """Create a password reset token."""
        # Invalidate existing tokens
        self.db.table(self.table).delete().eq("user_id", user_id).eq("token_type", "password_reset").execute()
        
        token, token_hash = self._generate_token()
        expires_at = datetime.now(timezone.utc) + timedelta(hours=self.password_reset_expiry_hours)
        
        self.db.table(self.table).insert({
            "id": str(uuid4()),
            "user_id": user_id,
            "token_type": "password_reset",
            "token_hash": token_hash,
            "expires_at": expires_at.isoformat(),
        }).execute()
        
        return token
    
    async def validate_password_reset_token(self, token: str) -> Optional[str]:
        """Validate token and return user_id if valid."""
        token_hash = self._hash_token(token)
        
        result = self.db.table(self.table).select("*").eq("token_hash", token_hash).eq("token_type", "password_reset").is_("used_at", "null").execute()
        
        if not result.data:
            return None
        
        token_record = result.data[0]
        expires_at = datetime.fromisoformat(token_record["expires_at"].replace("Z", "+00:00"))
        
        if datetime.now(timezone.utc) > expires_at:
            return None
        
        return token_record["user_id"]
    
    async def mark_token_used(self, token: str) -> None:
        """Mark a token as used."""
        token_hash = self._hash_token(token)
        self.db.table(self.table).update({"used_at": datetime.now(timezone.utc).isoformat()}).eq("token_hash", token_hash).execute()
    
    async def create_email_verification_token(self, user_id: str) -> str:
        """Create an email verification token."""
        self.db.table(self.table).delete().eq("user_id", user_id).eq("token_type", "email_verification").execute()
        
        token, token_hash = self._generate_token()
        expires_at = datetime.now(timezone.utc) + timedelta(hours=self.email_verification_expiry_hours)
        
        self.db.table(self.table).insert({
            "id": str(uuid4()),
            "user_id": user_id,
            "token_type": "email_verification",
            "token_hash": token_hash,
            "expires_at": expires_at.isoformat(),
        }).execute()
        
        return token
    
    async def validate_email_verification_token(self, token: str) -> Optional[str]:
        """Validate token and return user_id if valid."""
        token_hash = self._hash_token(token)
        
        result = self.db.table(self.table).select("*").eq("token_hash", token_hash).eq("token_type", "email_verification").is_("used_at", "null").execute()
        
        if not result.data:
            return None
        
        token_record = result.data[0]
        expires_at = datetime.fromisoformat(token_record["expires_at"].replace("Z", "+00:00"))
        
        if datetime.now(timezone.utc) > expires_at:
            return None
        
        return token_record["user_id"]


_auth_token_service: Optional[AuthTokenService] = None

def get_auth_token_service() -> AuthTokenService:
    global _auth_token_service
    if _auth_token_service is None:
        _auth_token_service = AuthTokenService()
    return _auth_token_service
```

### Task 5.3: Add Auth Schemas
**File:** `backend/api/schemas/auth.py`

Add these schemas to the existing file:

```python
class PasswordResetRequest(BaseModel):
    """Request to initiate password reset."""
    email: EmailStr = Field(..., description="Email address for password reset")

class PasswordResetConfirm(BaseModel):
    """Request to confirm password reset with token."""
    token: str = Field(..., description="Password reset token from email")
    new_password: str = Field(..., min_length=8, max_length=128, description="New password")

class ProfileUpdate(BaseModel):
    """Request to update user profile."""
    display_name: Optional[str] = Field(None, min_length=1, max_length=50)
    avatar_url: Optional[str] = None

class PasswordChange(BaseModel):
    """Request to change password."""
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=8, max_length=128, description="New password")

class AccountDelete(BaseModel):
    """Request to delete account."""
    password: str = Field(..., description="Current password for confirmation")
    confirmation: str = Field(..., pattern="^DELETE$", description="Must be 'DELETE'")
```


### Task 5.4: Add Auth Endpoints
**File:** `backend/api/routes/auth.py`

Add these endpoints to the existing router:

```python
from backend.services.auth_token_service import get_auth_token_service

# Password Reset Request
@router.post("/password-reset/request", summary="Request password reset")
async def request_password_reset(data: PasswordResetRequest) -> dict:
    """Send password reset email. Always returns 200 to prevent email enumeration."""
    auth_service = get_auth_service()
    token_service = get_auth_token_service()
    
    try:
        user = await auth_service.get_user_by_email(data.email)
        if user:
            token = await token_service.create_password_reset_token(user.id)
            # TODO: Send email with reset link containing token
            # await send_password_reset_email(user.email, token)
    except Exception:
        pass  # Silently fail to prevent enumeration
    
    return {"message": "If an account exists with this email, a password reset link has been sent."}

# Password Reset Confirm
@router.post("/password-reset/confirm", summary="Confirm password reset")
async def confirm_password_reset(data: PasswordResetConfirm) -> dict:
    """Reset password using token."""
    auth_service = get_auth_service()
    token_service = get_auth_token_service()
    
    user_id = await token_service.validate_password_reset_token(data.token)
    if not user_id:
        raise HTTPException(status_code=400, detail={"error": {"message": "Invalid or expired reset token", "code": "AUTH_INVALID_TOKEN"}})
    
    await auth_service.update_password(user_id, data.new_password)
    await token_service.mark_token_used(data.token)
    
    return {"message": "Password has been reset successfully."}

# Email Verification Request
@router.post("/email/verify/request", summary="Request email verification")
async def request_email_verification(current_user: TokenPayload = Depends(get_current_user)) -> dict:
    """Send email verification link."""
    token_service = get_auth_token_service()
    auth_service = get_auth_service()
    
    user = await auth_service.get_user(current_user.sub)
    if user.email_verified:
        return {"message": "Email is already verified."}
    
    token = await token_service.create_email_verification_token(current_user.sub)
    # TODO: Send verification email
    # await send_verification_email(user.email, token)
    
    return {"message": "Verification email sent."}

# Email Verification Confirm
@router.get("/email/verify/{token}", summary="Verify email")
async def verify_email(token: str) -> dict:
    """Verify email with token."""
    token_service = get_auth_token_service()
    auth_service = get_auth_service()
    
    user_id = await token_service.validate_email_verification_token(token)
    if not user_id:
        raise HTTPException(status_code=400, detail={"error": {"message": "Invalid or expired verification token", "code": "AUTH_INVALID_TOKEN"}})
    
    await auth_service.verify_email(user_id)
    await token_service.mark_token_used(token)
    
    return {"message": "Email verified successfully."}

# Update Profile
@router.put("/me", response_model=UserResponse, summary="Update profile")
async def update_profile(data: ProfileUpdate, current_user: TokenPayload = Depends(get_current_user)) -> UserResponse:
    """Update user profile."""
    auth_service = get_auth_service()
    
    user = await auth_service.update_profile(current_user.sub, display_name=data.display_name, avatar_url=data.avatar_url)
    
    return _user_to_response(user)

# Change Password
@router.post("/me/password", summary="Change password")
async def change_password(data: PasswordChange, current_user: TokenPayload = Depends(get_current_user)) -> dict:
    """Change password for authenticated user."""
    auth_service = get_auth_service()
    
    # Verify current password
    user = await auth_service.get_user(current_user.sub)
    if not await auth_service.verify_password(user.id, data.current_password):
        raise HTTPException(status_code=401, detail={"error": {"message": "Current password is incorrect", "code": "AUTH_INVALID_CREDENTIALS"}})
    
    await auth_service.update_password(user.id, data.new_password)
    
    return {"message": "Password changed successfully."}

# Delete Account
@router.delete("/me", summary="Delete account")
async def delete_account(data: AccountDelete, current_user: TokenPayload = Depends(get_current_user)) -> dict:
    """Permanently delete user account and all data."""
    auth_service = get_auth_service()
    
    # Verify password
    if not await auth_service.verify_password(current_user.sub, data.password):
        raise HTTPException(status_code=401, detail={"error": {"message": "Password is incorrect", "code": "AUTH_INVALID_CREDENTIALS"}})
    
    await auth_service.delete_account(current_user.sub)
    
    return {"message": "Account deleted successfully."}
```

### Task 5.5: Update Auth Service
**File:** `backend/services/auth_service.py`

Add these methods to the existing AuthService class:

```python
async def get_user_by_email(self, email: str) -> Optional[User]:
    """Get user by email."""
    result = self.db.table("users").select("*").eq("email", email).execute()
    if not result.data:
        return None
    return self._row_to_user(result.data[0])

async def update_password(self, user_id: str, new_password: str) -> None:
    """Update user password."""
    password_hash = self._hash_password(new_password)
    self.db.table("users").update({"password_hash": password_hash}).eq("id", user_id).execute()

async def verify_password(self, user_id: str, password: str) -> bool:
    """Verify user password."""
    result = self.db.table("users").select("password_hash").eq("id", user_id).execute()
    if not result.data:
        return False
    return self._verify_password(password, result.data[0]["password_hash"])

async def verify_email(self, user_id: str) -> None:
    """Mark user email as verified."""
    self.db.table("users").update({"email_verified": True}).eq("id", user_id).execute()

async def update_profile(self, user_id: str, display_name: Optional[str] = None, avatar_url: Optional[str] = None) -> User:
    """Update user profile."""
    update_data = {}
    if display_name is not None:
        update_data["display_name"] = display_name
    if avatar_url is not None:
        update_data["avatar_url"] = avatar_url
    
    if update_data:
        self.db.table("users").update(update_data).eq("id", user_id).execute()
    
    return await self.get_user(user_id)

async def delete_account(self, user_id: str) -> None:
    """Delete user account and all associated data."""
    # Cascade delete will handle related data
    self.db.table("users").delete().eq("id", user_id).execute()
```


---

## FRONTEND IMPLEMENTATION

### Task 5.6: Create Auth Types
**File:** `tsx/packages/api-client/src/types/auth.ts`

```typescript
export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

export interface ProfileUpdate {
  displayName?: string;
  avatarUrl?: string;
}

export interface PasswordChange {
  currentPassword: string;
  newPassword: string;
}

export interface AccountDelete {
  password: string;
  confirmation: 'DELETE';
}
```

### Task 5.7: Create Auth Hooks
**File:** `tsx/packages/api-client/src/hooks/useAuthExtended.ts`

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: async (email: string) => {
      const response = await fetch(`${API_BASE}/auth/password-reset/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) throw new Error('Failed to request password reset');
      return response.json();
    },
  });
}

export function useConfirmPasswordReset() {
  return useMutation({
    mutationFn: async ({ token, newPassword }: { token: string; newPassword: string }) => {
      const response = await fetch(`${API_BASE}/auth/password-reset/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: newPassword }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to reset password');
      }
      return response.json();
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: ProfileUpdate) => {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE}/auth/me`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          display_name: data.displayName,
          avatar_url: data.avatarUrl,
        }),
      });
      if (!response.ok) throw new Error('Failed to update profile');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async ({ currentPassword, newPassword }: PasswordChange) => {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE}/auth/me/password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to change password');
      }
      return response.json();
    },
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: async ({ password, confirmation }: AccountDelete) => {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE}/auth/me`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password, confirmation }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to delete account');
      }
      return response.json();
    },
  });
}
```

### Task 5.8: Create Frontend Pages

**Files to create:**
1. `tsx/apps/web/src/app/auth/forgot-password/page.tsx`
2. `tsx/apps/web/src/app/auth/reset-password/page.tsx`
3. `tsx/apps/web/src/app/dashboard/settings/page.tsx`

---

## ACCEPTANCE CRITERIA

### Backend
- [ ] Migration created and runs successfully
- [ ] Auth token service implemented
- [ ] All 7 new endpoints work
- [ ] Password reset flow works end-to-end
- [ ] Email verification flow works
- [ ] Profile update works
- [ ] Password change works
- [ ] Account deletion works

### Frontend
- [ ] Types created
- [ ] Hooks created
- [ ] Forgot password page works
- [ ] Reset password page works
- [ ] Settings page works
- [ ] All forms validate correctly
- [ ] Error messages display

---

## TESTING COMMANDS

```bash
# Run migration
cd backend && python -c "from backend.database.supabase_client import get_supabase_client; print('Connected')"

# Test endpoints with curl
curl -X POST http://localhost:8000/api/v1/auth/password-reset/request \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Type check frontend
cd tsx && npm run typecheck
```

---

## FILES TO CREATE

### Backend
1. `backend/database/migrations/006_auth_tokens.sql`
2. `backend/services/auth_token_service.py`

### Frontend
1. `tsx/packages/api-client/src/types/auth.ts`
2. `tsx/packages/api-client/src/hooks/useAuthExtended.ts`
3. `tsx/apps/web/src/app/auth/forgot-password/page.tsx`
4. `tsx/apps/web/src/app/auth/reset-password/page.tsx`
5. `tsx/apps/web/src/app/dashboard/settings/page.tsx`

## FILES TO UPDATE

### Backend
1. `backend/api/routes/auth.py` - Add new endpoints
2. `backend/api/schemas/auth.py` - Add new schemas
3. `backend/services/auth_service.py` - Add new methods
