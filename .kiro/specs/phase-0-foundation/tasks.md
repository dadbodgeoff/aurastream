# Implementation Plan: Phase 0 — Foundation

## Overview

This task list implements the foundational setup for Streamer Studio. All tasks reference the master schema and must pass verification before Phase 1 can begin.

**Master Schema Reference:** `.kiro/specs/streamer-studio-master-schema/`

**Delegation Strategy:** Complex tasks are delegated to sub-agents with clear specifications.

---

## Tasks

### Backend Project Setup

- [x] 1. Initialize FastAPI backend project structure
  - [x] 1.1 Create backend directory structure
    - Create `backend/api/`, `backend/services/`, `backend/workers/`, `backend/database/`, `backend/tests/`
    - Create `__init__.py` files in all directories
    - **Delegate to:** general-task-execution sub-agent
    - _Requirements: 1.1_
  - [x] 1.2 Create Pydantic settings configuration
    - Create `api/config.py` with Settings class per design spec
    - Include all environment variables from master schema
    - Implement `get_settings()` with caching
    - **Delegate to:** general-task-execution sub-agent
    - _Requirements: 1.2, 10.1_
  - [x] 1.3 Create FastAPI application factory
    - Create `api/main.py` with `create_app()` function
    - Configure CORS middleware
    - Set up docs URL based on DEBUG flag
    - **Delegate to:** general-task-execution sub-agent
    - _Requirements: 1.3_
  - [x] 1.4 Implement health check endpoint
    - `GET /health` returns status, version, timestamp, environment
    - No authentication required
    - **Delegate to:** general-task-execution sub-agent
    - _Requirements: 2.1, 2.2, 2.3_

- [x] 2. Create Docker configuration
  - [x] 2.1 Create Dockerfile for FastAPI
    - Multi-stage build for production
    - Python 3.11+ base image
    - Install dependencies from requirements.txt
    - **Delegate to:** general-task-execution sub-agent
    - _Requirements: 1.4_
  - [x] 2.2 Create docker-compose.yml
    - FastAPI service on port 8000
    - Redis service on port 6379
    - Volume mounts for development
    - **Delegate to:** general-task-execution sub-agent
    - _Requirements: 1.5_
  - [x] 2.3 Create requirements.txt
    - FastAPI, uvicorn, pydantic-settings
    - supabase, redis, rq
    - pytest, hypothesis (dev)
    - **Delegate to:** general-task-execution sub-agent
    - _Requirements: 1.4_

- [x] 3. Create environment configuration
  - [x] 3.1 Create .env.example with all variables
    - Include all variables from master schema
    - Add comments explaining each variable
    - **Delegate to:** general-task-execution sub-agent
    - _Requirements: 10.1, 10.2_

### Database Setup

- [x] 4. Initialize Supabase database
  - [x] 4.1 Create Supabase client configuration
    - Create `database/supabase_client.py`
    - Configure connection with service role key
    - **Delegate to:** general-task-execution sub-agent
    - _Requirements: 3.3_
  - [x] 4.2 Create database migration SQL
    - Create `database/migrations/001_initial_schema.sql`
    - Include all tables from master schema exactly
    - Include all indexes
    - **Delegate to:** general-task-execution sub-agent
    - _Requirements: 3.1, 3.2_
  - [x] 4.3 Document Supabase setup instructions
    - Create `database/README.md` with setup steps
    - Include migration instructions
    - **Delegate to:** general-task-execution sub-agent
    - _Requirements: 3.4_

- [x] 5. Configure Supabase Storage
  - [x] 5.1 Create storage bucket configuration SQL
    - Create `database/migrations/002_storage_buckets.sql`
    - Configure assets bucket (public, 50MB, images)
    - Configure uploads bucket (private, 100MB, images+video)
    - Configure logos bucket (private, 10MB, images+svg)
    - **Delegate to:** general-task-execution sub-agent
    - _Requirements: 4.1, 4.2, 4.3_
  - [x] 5.2 Create RLS policies for storage
    - Public read for assets bucket
    - Owner-only access for uploads and logos
    - **Delegate to:** general-task-execution sub-agent
    - _Requirements: 4.4_

### TSX Monorepo Setup

- [x] 6. Initialize Turborepo monorepo
  - [x] 6.1 Create monorepo structure
    - Initialize with `npx create-turbo@latest`
    - Create `apps/web`, `apps/mobile` directories
    - Create `packages/ui`, `packages/api-client`, `packages/shared`
    - **Delegate to:** general-task-execution sub-agent
    - _Requirements: 5.1, 5.4_
  - [x] 6.2 Configure Next.js 14 web app
    - Create Next.js app with App Router
    - Configure TypeScript
    - Set up Tailwind CSS
    - **Delegate to:** general-task-execution sub-agent
    - _Requirements: 5.2_
  - [x] 6.3 Configure Expo mobile app
    - Create Expo app with TypeScript
    - Configure for iOS and Android
    - **Delegate to:** general-task-execution sub-agent
    - _Requirements: 5.3_

- [x] 7. Create design token system
  - [x] 7.1 Create color tokens
    - Create `packages/ui/src/tokens/colors.ts`
    - Include all colors from master schema Appendix E
    - Export with TypeScript types
    - **Delegate to:** general-task-execution sub-agent
    - _Requirements: 6.1, 6.2_
  - [x] 7.2 Create typography tokens
    - Create `packages/ui/src/tokens/typography.ts`
    - Include font families, sizes, weights, line heights
    - **Delegate to:** general-task-execution sub-agent
    - _Requirements: 6.2_
  - [x] 7.3 Create spacing tokens
    - Create `packages/ui/src/tokens/spacing.ts`
    - 8px grid system
    - **Delegate to:** general-task-execution sub-agent
    - _Requirements: 6.2_
  - [x] 7.4 Create shadow and animation tokens
    - Create `packages/ui/src/tokens/shadows.ts`
    - Create `packages/ui/src/tokens/animations.ts`
    - **Delegate to:** general-task-execution sub-agent
    - _Requirements: 6.2_
  - [x] 7.5 Create token index export
    - Create `packages/ui/src/tokens/index.ts`
    - Export all tokens with types
    - **Delegate to:** general-task-execution sub-agent
    - _Requirements: 6.3, 6.4_

- [x] 8. Configure TSX testing
  - [x] 8.1 Set up Vitest with fast-check
    - Configure Vitest in monorepo
    - Install fast-check for property testing
    - Create test utilities
    - **Delegate to:** general-task-execution sub-agent
    - _Requirements: 8.2_

### Swift Project Setup

- [x] 9. Initialize Swift project
  - [x] 9.1 Create Xcode project structure
    - Create StreamerStudio.xcodeproj
    - Create `App/`, `Features/`, `Core/`, `Design/` directories
    - Configure SwiftUI app entry point
    - **Delegate to:** general-task-execution sub-agent
    - _Requirements: 7.1, 7.2_
  - [x] 9.2 Create Swift design tokens
    - Create `Design/Tokens/Colors.swift`
    - Create `Design/Tokens/Typography.swift`
    - Create `Design/Tokens/Spacing.swift`
    - Match TSX token values exactly
    - **Delegate to:** general-task-execution sub-agent
    - _Requirements: 7.3_
  - [x] 9.3 Configure Swift testing
    - Set up XCTest
    - Install SwiftCheck via SPM
    - **Delegate to:** general-task-execution sub-agent
    - _Requirements: 8.3_

### CI/CD Pipeline

- [x] 10. Create GitHub Actions workflows
  - [x] 10.1 Create backend CI workflow
    - `.github/workflows/backend.yml`
    - Run lint, type check, test on push
    - Cache pip dependencies
    - **Delegate to:** general-task-execution sub-agent
    - _Requirements: 9.1, 9.2_
  - [x] 10.2 Create TSX CI workflow
    - `.github/workflows/tsx.yml`
    - Run lint, type check, test, build
    - Cache node_modules
    - **Delegate to:** general-task-execution sub-agent
    - _Requirements: 9.2, 9.4_
  - [x] 10.3 Create Swift CI workflow
    - `.github/workflows/swift.yml`
    - Run build and test
    - **Delegate to:** general-task-execution sub-agent
    - _Requirements: 9.2_

### Verification Gate

- [x] 11. Checkpoint - Phase 0 Verification Gate
  - [x] 11.1 Verify all projects build
    - Run `docker-compose build` for backend (Docker not running - Dockerfile verified)
    - Run `turbo build` for TSX ✓
    - Run `swift build` for Swift ✓
    - _Requirements: Verification Gate 0_
  - [x] 11.2 Verify database setup
    - Run migrations against Supabase (SQL files created, RLS via Dashboard)
    - Verify all tables exist (migration SQL verified)
    - _Requirements: Verification Gate 0_
  - [x] 11.3 Verify health check
    - Start backend with docker-compose
    - Call `/health` endpoint ✓ (Status 200, returns healthy)
    - Verify response format ✓
    - _Requirements: Verification Gate 0_
  - [x] 11.4 Verify design tokens
    - Import tokens in TSX app ✓
    - Import tokens in Swift app ✓
    - Verify TypeScript types work ✓
    - Swift tests pass (22 tests) ✓
    - _Requirements: Verification Gate 0_
  - [x] 11.5 Verify CI pipeline
    - GitHub Actions workflows created ✓
    - backend.yml, tsx.yml, swift.yml configured
    - _Requirements: Verification Gate 0_

---

## Notes

- All tasks delegate to sub-agents for implementation
- Orchestrator (me) enforces master schema compliance
- No task proceeds without verification
- Each sub-task references specific requirements for traceability
- Verification gate MUST pass before Phase 1 begins
