# AuraStream Error Handling - Code Examples & File References

## Quick Reference: Current Implementation Files

### Backend Error Handling
- **Exception Definitions:** `backend/services/exceptions.py` (40+ custom exceptions)
- **Auth Routes:** `backend/api/routes/auth.py` (HTTPException wrapping)
- **Generation Routes:** `backend/api/routes/generation.py` (Usage limits, SSE errors)
- **Brand Kit Routes:** `backend/api/routes/brand_kits.py` (Ownership verification)
- **Coach Routes:** `backend/api/routes/coach.py` (Tier access, rate limiting)
- **Main App:** `backend/api/main.py` (Exception handlers, middleware)

### Frontend Error Handling
- **Toast System:** `tsx/apps/web/src/components/ui/Toast.tsx` (Imperative API)
- **Offline Banner:** `tsx/apps/web/src/components/ui/OfflineBanner.tsx` (Network detection)
- **Error Boundary:** `tsx/apps/web/src/app/error.tsx` (Global error page)
- **Form Validation:** `tsx/apps/web/src/hooks/useFormValidation.ts` (Debounced validation)
- **Onboarding Tour:** `tsx/apps/web/src/components/onboarding/OnboardingTour.tsx` (Driver.js)

### API Client
- **Generation Hooks:** `tsx/packages/api-client/src/hooks/useGeneration.ts`
- **Brand Kit Hooks:** `tsx/packages/api-client/src/hooks/useBrandKits.ts`
- **Coach Chat Hook:** `tsx/apps/web/src/hooks/useCoachChat.ts` (SSE streaming)

---

## Code Examples: Current Patterns

### Example 1: Backend Exception Handling

**File:** `backend/services/exceptions.py`

```python
class StreamerStudioError(Exception):
    """Base exception with consistent structure."""
    def __init__(
        self, 
        message: str, 
        code: str, 
        status_code: int = 400, 
        details: Optional[dict] = None
    ):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}
    
    def to_dict(self) -> dict:
        """Convert to API response format."""
        return {
            "error": {
                "message": self.message,
                "code": self.code,
                "details": self.details
            }
        }

# Usage in routes
class BrandKitLimitExceededError(StreamerStudioError):
    def __init__(self, current_count: int, max_count: int = 10):
        super().__init__(
            message=f"Maximum brand kits ({max_count}) reached",
            code="BRAND_KIT_LIMIT_EXCEEDED",
            status_code=403,
            details={"current_count": current_count, "max_count": max_count}
        )
```

### Example 2: Route Error Handling

**File:** `backend/api/routes/generation.py`

```python
@router.post("/generate", response_model=JobResponse)
async def create_generation_job(
    request: Request,
    data: GenerateRequest,
    current_user: TokenPayload = Depends(get_current_user),
) -> JobResponse:
    # Check usage limits
    usage_service = get_usage_limit_service()
    usage = await usage_service.check_limit(current_user.sub, "creations")
    
    if not usage.can_use:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "limit_exceeded",
                "message": f"You've used all {usage.limit} asset creations this month.",
                "used": usage.used,
                "limit": usage.limit,
                "resets_at": usage.resets_at.isoformat(),
            },
        )
    
    try:
        job = await service.create_job(...)
        await usage_service.increment(current_user.sub, "creations")
        
        # Audit log
        audit = get_audit_service()
        await audit.log(
            user_id=current_user.sub,
            action="generation.create",
            resource_type="generation_job",
            resource_id=job.id,
            details={"asset_type": data.asset_type},
            ip_address=request.client.host if request.client else None,
        )
        
        return _job_to_response(job)
        
    except BrandKitNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.to_dict())
    except AuthorizationError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=e.to_dict())
```

### Example 3: Toast Notifications

**File:** `tsx/apps/web/src/components/ui/Toast.tsx`

```typescript
// Imperative API
export const toast = {
  success: (title: string, options?: Partial<Omit<ToastOptions, 'title' | 'variant'>>) => {
    return useToastStore.getState().addToast({
      ...options,
      title,
      variant: 'success',
    });
  },
  
  error: (title: string, options?: Partial<Omit<ToastOptions, 'title' | 'variant'>>) => {
    return useToastStore.getState().addToast({
      ...options,
      title,
      variant: 'error',
    });
  },
};

// Usage in components
import { toast } from '@/components/ui/Toast';

// Simple
toast.success('Profile updated!');

// With description
toast.error('Upload failed', {
  description: 'File size exceeds 10MB limit',
});

// With action
toast.info('New update available', {
  action: {
    label: 'Refresh',
    onClick: () => window.location.reload(),
  },
});

// With rarity
toast.success('Achievement unlocked!', {
  rarity: 'legendary',
  description: 'You earned the "First Asset" badge',
});
```

### Example 4: Form Validation

**File:** `tsx/apps/web/src/hooks/useFormValidation.ts`

```typescript
const { fieldStates, setFieldValue, isFormValid } = useFormValidation({
  fields: {
    email: [
      {
        validate: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        message: 'Please enter a valid email',
        successMessage: "Great! That's a valid email address",
      },
    ],
    password: [
      {
        validate: (v) => v.length >= 8,
        message: 'Password must be at least 8 characters',
        successMessage: 'Strong password! You\'re all set',
      },
      {
        validate: (v) => /[A-Z]/.test(v) && /[a-z]/.test(v) && /\d/.test(v),
        message: 'Must include uppercase, lowercase, and number',
      },
    ],
  },
  debounceMs: 300,
});

// In component
<input
  {...getFieldProps('email')}
  placeholder="Email"
  className={fieldStates.email.error ? 'border-red-500' : ''}
/>
{fieldStates.email.error && (
  <p className="text-red-500 text-sm">{fieldStates.email.error}</p>
)}
{fieldStates.email.successMessage && (
  <p className="text-green-500 text-sm">✓ {fieldStates.email.successMessage}</p>
)}
```

### Example 5: SSE Error Handling

**File:** `backend/api/routes/generation.py`

```python
@router.get("/jobs/{job_id}/stream")
async def stream_job_progress(
    job_id: str,
    current_user: TokenPayload = Depends(get_current_user),
):
    """Stream real-time job progress via SSE."""
    
    async def event_generator():
        try:
            for _ in range(300):  # 5 minute timeout
                job = await service.get_job(current_user.sub, job_id)
                
                # Send progress update
                event_data = json.dumps({
                    "type": "progress",
                    "status": job.status,
                    "progress": job.progress,
                })
                yield f"data: {event_data}\n\n"
                
                # Check for completion
                if job.status == "completed":
                    assets = await service.get_job_assets(current_user.sub, job_id)
                    event_data = json.dumps({
                        "type": "completed",
                        "asset": {"id": assets[0].id, "url": assets[0].url},
                    })
                    yield f"data: {event_data}\n\n"
                    return
                
                # Check for failure
                if job.status == "failed":
                    event_data = json.dumps({
                        "type": "failed",
                        "error": job.error_message or "Generation failed",
                    })
                    yield f"data: {event_data}\n\n"
                    return
                
                await asyncio.sleep(1)
                
        except Exception as e:
            event_data = json.dumps({
                "type": "error",
                "error": str(e),
            })
            yield f"data: {event_data}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )
```

### Example 6: Coach Chat Error Handling

**File:** `tsx/apps/web/src/hooks/useCoachChat.ts`

```typescript
async function* streamSSE(
  url: string,
  body: object,
  accessToken: string | null
): AsyncGenerator<StreamChunk> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error?.message || errorMessage;
    } catch {
      // Use default error message
    }
    throw new Error(errorMessage);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('Response body is not readable');

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6).trim();
          if (dataStr === '[DONE]') return;
          
          try {
            const data = JSON.parse(dataStr);
            yield data as StreamChunk;
          } catch {
            console.warn('Failed to parse SSE data:', dataStr);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// Usage in component
const processStream = useCallback(
  async (stream: AsyncGenerator<StreamChunk>, messageId: string) => {
    try {
      for await (const chunk of stream) {
        switch (chunk.type) {
          case 'token':
            // Accumulate tokens
            break;
          case 'error':
            setError(chunk.content || 'An error occurred');
            setStreamingStage('error');
            break;
          case 'done':
            setStreamingStage('complete');
            break;
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Stream error';
      setError(errorMessage);
      setStreamingStage('error');
    }
  },
  []
);
```

---

## Gap Examples: What's Missing

### Gap 1: No Component Error Boundary

**Current:** Only global error.tsx  
**Missing:** Component-level error boundaries

```typescript
// MISSING: Component error boundary
export class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded">
          <h3 className="font-semibold">Something went wrong</h3>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Usage
<ErrorBoundary>
  <BrandKitForm />
</ErrorBoundary>
```

### Gap 2: No Retry Mechanism

**Current:** Failed operations are permanent  
**Missing:** Retry button in error toasts

```typescript
// MISSING: Retry mechanism
const handleGenerateWithRetry = async (retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await generateMutation.mutateAsync(data);
      toast.success('Generation started!');
      return result;
    } catch (error) {
      if (i === retries - 1) {
        toast.error('Generation failed', {
          description: 'Please try again later',
          action: {
            label: 'Retry',
            onClick: () => handleGenerateWithRetry(retries),
          },
        });
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};
```

### Gap 3: No Error Recovery Suggestions

**Current:** Generic error messages  
**Missing:** Contextual recovery suggestions

```typescript
// MISSING: Error recovery suggestions
const errorRecoveryMap = {
  'GENERATION_RATE_LIMIT': {
    title: 'Too many requests',
    description: 'You\'ve generated too many assets recently.',
    suggestion: 'Wait a few minutes and try again',
    action: 'Retry',
  },
  'BRAND_KIT_LIMIT_EXCEEDED': {
    title: 'Brand kit limit reached',
    description: 'You can have up to 10 brand kits.',
    suggestion: 'Delete an unused brand kit to create a new one',
    action: 'Go to Brand Kits',
  },
};

// Usage
if (error.code in errorRecoveryMap) {
  const recovery = errorRecoveryMap[error.code];
  toast.error(recovery.title, {
    description: recovery.description,
    action: {
      label: recovery.action,
      onClick: () => handleRecovery(error.code),
    },
  });
}
```

### Gap 4: Inconsistent Loading States

**Current:** Some components show loading, others don't  
**Missing:** Unified skeleton component

```typescript
// MISSING: Unified skeleton component
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn(
      'bg-background-surface/50 animate-pulse rounded',
      className
    )} />
  );
}

// Usage
{isLoading ? (
  <div className="space-y-2">
    <Skeleton className="h-12 w-full" />
    <Skeleton className="h-12 w-full" />
    <Skeleton className="h-12 w-full" />
  </div>
) : (
  <BrandKitList />
)}
```

### Gap 5: No Inline Form Validation Feedback

**Current:** Validation happens but no visual feedback  
**Missing:** Error/success indicators in forms

```typescript
// MISSING: Inline validation feedback
<div className="space-y-2">
  <input
    {...getFieldProps('email')}
    placeholder="Email"
    className={cn(
      'px-3 py-2 border rounded',
      fieldStates.email.error && 'border-red-500 bg-red-500/5',
      fieldStates.email.valid && 'border-green-500 bg-green-500/5',
    )}
  />
  
  {fieldStates.email.error && (
    <p className="text-sm text-red-500 flex items-center gap-1">
      <XIcon className="w-4 h-4" />
      {fieldStates.email.error}
    </p>
  )}
  
  {fieldStates.email.valid && fieldStates.email.successMessage && (
    <p className="text-sm text-green-500 flex items-center gap-1">
      <CheckIcon className="w-4 h-4" />
      {fieldStates.email.successMessage}
    </p>
  )}
</div>
```

---

## Testing Error Scenarios

### Test Case 1: Generation Rate Limit

```typescript
// Test: User hits rate limit
describe('Generation Rate Limit', () => {
  it('should show rate limit error with retry option', async () => {
    const { getByText } = render(<GenerateButton />);
    
    // Mock rate limit error
    mockGenerateAsset.mockRejectedValueOnce({
      code: 'GENERATION_RATE_LIMIT',
      message: 'Too many requests',
      retry_after: 60,
    });
    
    fireEvent.click(getByText('Generate'));
    
    await waitFor(() => {
      expect(getByText('Too many requests')).toBeInTheDocument();
      expect(getByText('Retry')).toBeInTheDocument();
    });
  });
});
```

### Test Case 2: Form Validation

```typescript
// Test: Form validation feedback
describe('Form Validation', () => {
  it('should show error for invalid email', async () => {
    const { getByPlaceholderText, getByText } = render(<SignupForm />);
    
    const emailInput = getByPlaceholderText('Email');
    fireEvent.change(emailInput, { target: { value: 'invalid' } });
    fireEvent.blur(emailInput);
    
    await waitFor(() => {
      expect(getByText('Please enter a valid email')).toBeInTheDocument();
    });
  });
  
  it('should show success for valid email', async () => {
    const { getByPlaceholderText, getByText } = render(<SignupForm />);
    
    const emailInput = getByPlaceholderText('Email');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.blur(emailInput);
    
    await waitFor(() => {
      expect(getByText("Great! That's a valid email address")).toBeInTheDocument();
    });
  });
});
```

### Test Case 3: Error Boundary

```typescript
// Test: Error boundary catches errors
describe('Error Boundary', () => {
  it('should catch component errors', () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };
    
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    
    expect(getByText('Something went wrong')).toBeInTheDocument();
    expect(getByText('Try again')).toBeInTheDocument();
  });
});
```

---

## Summary: Files to Create/Modify

### Create New Files
1. `tsx/apps/web/src/components/ErrorBoundary.tsx` - Component error boundary
2. `tsx/apps/web/src/components/ui/Skeleton.tsx` - Unified skeleton component
3. `tsx/apps/web/src/utils/errorMessages.ts` - Error message mapping
4. `tsx/apps/web/src/components/ErrorRecovery.tsx` - Error recovery UI
5. `tsx/apps/web/src/components/FormErrorIndicator.tsx` - Form error display

### Modify Existing Files
1. `tsx/apps/web/src/components/ui/Toast.tsx` - Add retry button support
2. `tsx/apps/web/src/hooks/useFormValidation.ts` - Already good, just use it
3. `tsx/apps/web/src/app/providers.tsx` - Wrap with error boundary
4. `tsx/apps/web/src/app/dashboard/layout.tsx` - Add error boundary
5. `backend/api/main.py` - Already has good error handlers

### Testing Files
1. `tsx/apps/web/src/components/__tests__/ErrorBoundary.test.tsx`
2. `tsx/apps/web/src/hooks/__tests__/useFormValidation.test.ts`
3. `tsx/apps/web/src/components/__tests__/Toast.test.tsx`

---

This document provides concrete code examples and file references for implementing the improvements outlined in the main audit report.
