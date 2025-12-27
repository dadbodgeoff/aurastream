# Security & Optimization Improvements 2025 - Requirements

## Overview
This spec addresses 10 high-signal security and optimization improvements identified through web research of current best practices (December 2025).

## Priority Classification

### P0 - Critical Security (Immediate)
1. **React Server Components Security Patch** - CVE-2025-55182 (CVSS 10.0)
2. **Supabase RLS Index Optimization** - Performance & security
3. **Stripe Webhook Race Condition Prevention** - Data integrity

### P1 - Security Hardening
4. **JWT Refresh Token Reuse Detection** - Token theft prevention
5. **FastAPI Security Headers Middleware** - Defense in depth

### P2 - Performance Optimization
6. **Pydantic v2.10 Partial Validation for LLM Streaming** - Coach UX
7. **TanStack Query v5 Query Key Factories** - Frontend maintainability
8. **SSE State Machine Pattern** - Streaming reliability

### P3 - Future Optimization
9. **React Native New Architecture** - Mobile performance (Expo SDK 54+)
10. **Redis Analytics Time-Series Consideration** - Scalability planning

## Detailed Requirements

### 1. React Server Components Security Patch
**Risk:** Critical RCE vulnerability in React 19 RSC / Next.js App Router
**Requirement:** 
- Audit current Next.js version
- Apply security patches for CVE-2025-55182, CVE-2025-55184, CVE-2025-55183
- Document remediation proof

### 2. Supabase RLS Index Optimization
**Risk:** Slow queries, potential security gaps with views
**Requirement:**
- Add indexes on all columns used in RLS policies (user_id)
- Audit views for RLS bypass risks
- Create migration 013_rls_indexes.sql

### 3. Stripe Webhook Race Condition Prevention
**Risk:** ~1% signup failures, duplicate processing
**Requirement:**
- Implement event queuing with Redis
- Add timestamp validation (reject events >5 min old)
- Implement proper idempotency with event persistence BEFORE processing
- Add buffer period for subscription renewals

### 4. JWT Refresh Token Reuse Detection
**Risk:** Token theft goes undetected
**Requirement:**
- Track refresh token usage in Redis/DB
- Detect reuse of rotated tokens
- Invalidate all user sessions on reuse detection
- Add security audit logging

### 5. FastAPI Security Headers Middleware
**Risk:** Missing defense-in-depth headers
**Requirement:**
- Add Content-Security-Policy header
- Add X-Frame-Options header
- Add X-Content-Type-Options header
- Add Strict-Transport-Security header
- Add GZip compression middleware

### 6. Pydantic v2.10 Partial Validation for LLM Streaming
**Risk:** Poor UX during streaming, validation delays
**Requirement:**
- Upgrade to Pydantic 2.10+ if needed
- Implement partial validation in coach streaming
- Validate tokens as they arrive

### 7. TanStack Query v5 Query Key Factories
**Risk:** Inconsistent cache invalidation, type safety issues
**Requirement:**
- Create query key factory pattern
- Bundle queryKey, queryFn, and options
- Update existing hooks to use factories

### 8. SSE State Machine Pattern
**Risk:** Janky rendering, lost data on failures
**Requirement:**
- Implement explicit state: idle → streaming → complete → error
- Batch DOM updates
- Save partial data on failures
- Offer retry mechanism

### 9. React Native New Architecture (Documentation Only)
**Risk:** Performance not optimized for latest RN
**Requirement:**
- Document upgrade path to Expo SDK 54+
- Note React Compiler benefits
- Create upgrade checklist (not implementation)

### 10. Redis Analytics Time-Series Consideration (Documentation Only)
**Risk:** Current architecture may not scale
**Requirement:**
- Document current architecture limitations
- Outline migration path to time-series DB
- Create decision document (not implementation)

## Success Criteria
- All P0 items implemented and tested
- All P1 items implemented and tested
- P2 items implemented with unit tests
- P3 items documented with clear upgrade paths
- Zero regressions in existing functionality
- All existing tests continue to pass

## Out of Scope
- Full React Native upgrade (P3 - documentation only)
- Redis to time-series migration (P3 - documentation only)
- UI changes beyond what's needed for state machine pattern
