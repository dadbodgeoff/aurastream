# 🎬 ALERT ANIMATION STUDIO - IMPLEMENTATION TASKS
## Subagent Task Guide for Efficient Parallel Development

**Reference:** `ALERT_ANIMATION_STUDIO_MASTER_SCHEMA.md`  
**Access:** Pro subscription users only (no separate pricing)  
**Goal:** Ship in 2-3 weeks with parallel workstreams

---

## CRITICAL CONTEXT FOR ALL AGENTS

### Before Starting ANY Task
1. Read `ALERT_ANIMATION_STUDIO_MASTER_SCHEMA.md` for full specifications
2. Read `AURASTREAM_MASTER_SCHEMA.md` for project conventions
3. Follow existing patterns in the codebase (snake_case backend, camelCase frontend)
4. Pro tier check: `subscription_tier === 'pro' || subscription_tier === 'studio'`

### Key Files to Reference
- `backend/workers/generation_worker.py` - Worker pattern
- `backend/services/storage_service.py` - Storage pattern
- `backend/api/routes/project_asset_overrides.py` - Recent route pattern
- `tsx/packages/api-client/src/hooks/useProjectAssetOverrides.ts` - Hook pattern
- `tsx/apps/web/src/components/media-library/canvas-studio/` - UI pattern

---

## PHASE 1: DATABASE & BACKEND FOUNDATION
**Timeline:** Days 1-3  
**Dependencies:** None (can start immediately)


### TASK 1.1: Database Migration
**Assignee:** Backend Agent  
**Estimated Time:** 1 hour  
**Blocking:** Tasks 1.2, 1.3, 1.4

**Instructions:**
```
Create file: backend/database/migrations/083_alert_animations.sql

Requirements:
1. Create tables from MASTER_SCHEMA:
   - alert_animation_projects
   - animation_presets
   - alert_animation_exports
   
2. NO animation_pack_purchases table (feature included in Pro)

3. Add all indexes from schema

4. Add RLS policies:
   - Projects: user owns
   - Presets: system (user_id IS NULL) OR user owns
   - Exports: user owns

5. Add updated_at trigger for projects

6. Seed system presets (all 16 from schema):
   - 4 entry animations (pop_in, slide_in, fade_in, burst)
   - 4 loop animations (float, pulse, glow, wiggle)
   - 3 depth effects (parallax, tilt, pop_out)
   - 4 particle effects (sparkles, confetti, hearts, fire)
   - NO premium packs (all presets free for Pro users)

7. Remove is_premium and price_cents columns - not needed

Validation:
- Run migration locally
- Verify RLS works with test queries
```

---

### TASK 1.2: Pydantic Schemas
**Assignee:** Backend Agent  
**Estimated Time:** 1.5 hours  
**Depends On:** Task 1.1 (schema understanding)
**Blocking:** Task 1.3

**Instructions:**
```
Create file: backend/api/schemas/alert_animation.py

Copy schemas from MASTER_SCHEMA section "BACKEND SCHEMAS (Pydantic)"

Modifications needed:
1. REMOVE all premium/pack related fields:
   - Remove is_premium from AnimationPresetResponse
   - Remove pack_id from AnimationPresetResponse
   - Remove price_cents from AnimationPresetResponse
   - Remove PackResponse class entirely
   
2. ADD tier check field to responses:
   - Add to AnimationProjectResponse: requires_tier: str = "pro"

3. Keep all animation config models exactly as specified

4. Ensure all Field() constraints match schema

Validation:
- Import and instantiate each model
- Test validation with edge cases
- Run: python -c "from backend.api.schemas.alert_animation import *"
```

---

### TASK 1.3: API Routes
**Assignee:** Backend Agent  
**Estimated Time:** 2 hours  
**Depends On:** Task 1.2
**Blocking:** Task 2.1 (frontend hooks)

**Instructions:**
```
Create file: backend/api/routes/alert_animations.py

Endpoints to implement (12 total, removed pack endpoints):

# CRUD
POST   /api/v1/alert-animations                    
GET    /api/v1/alert-animations                    
GET    /api/v1/alert-animations/{id}               
PUT    /api/v1/alert-animations/{id}               
DELETE /api/v1/alert-animations/{id}               

# Processing
POST   /api/v1/alert-animations/{id}/depth-map     
POST   /api/v1/alert-animations/{id}/export        
GET    /api/v1/alert-animations/{id}/obs-url       

# Presets
GET    /api/v1/alert-animations/presets            
GET    /api/v1/alert-animations/presets/{category} 
POST   /api/v1/alert-animations/presets            
DELETE /api/v1/alert-animations/presets/{id}       

CRITICAL - Add tier check to ALL endpoints:
```python
from backend.services.subscription_service import check_feature_access

@router.post("")
async def create_animation_project(
    data: CreateAnimationProjectRequest,
    current_user: TokenPayload = Depends(get_current_user),
):
    # Tier check - Pro or Studio only
    if current_user.subscription_tier not in ("pro", "studio"):
        raise HTTPException(
            status_code=403,
            detail={
                "code": "PRO_SUBSCRIPTION_REQUIRED",
                "message": "Animation Studio requires Pro subscription"
            }
        )
    # ... rest of implementation
```

Reference: backend/api/routes/project_asset_overrides.py for patterns

Register in backend/api/routes/__init__.py:
- Add: from backend.api.routes.alert_animations import router as alert_animations_router
- Add to router includes

Validation:
- Test each endpoint with curl/httpie
- Verify tier check blocks free users
- Verify RLS prevents cross-user access
```

---

### TASK 1.4: Depth Map Service
**Assignee:** Backend Agent  
**Estimated Time:** 2 hours  
**Depends On:** Task 1.1
**Can Parallel With:** Task 1.2, 1.3

**Instructions:**
```
Create directory: backend/services/alert_animation/
Create files:
- backend/services/alert_animation/__init__.py
- backend/services/alert_animation/depth_service.py
- backend/services/alert_animation/models.py

Implementation from MASTER_SCHEMA section "DEPTH MAP SERVICE"

Key points:
1. Use Depth Anything V2 Small model (fastest)
2. Lazy-load model to avoid startup overhead
3. Run inference in thread pool (CPU-bound)
4. Upload result to Supabase storage

Dependencies to add to requirements.txt:
- transformers>=4.36.0
- torch>=2.0.0 (CPU only)
- Pillow (already present)

Storage path pattern:
{user_id}/animations/{project_id}/depth_map.png

Validation:
- Unit test with mock image
- Integration test with real image
- Verify ~2-5 second processing time
```

---

## PHASE 2: WORKER & FRONTEND TYPES
**Timeline:** Days 3-5  
**Dependencies:** Phase 1 tasks


### TASK 2.1: Alert Animation Worker
**Assignee:** Backend Agent  
**Estimated Time:** 2 hours  
**Depends On:** Task 1.4

**Instructions:**
```
Create file: backend/workers/alert_animation_worker.py

Implementation from MASTER_SCHEMA section "Worker Implementation"

Jobs to implement:
1. depth_map_job - Generate depth map using DepthMapService
2. export_job - Server-side FFmpeg export (fallback only)

Key patterns (copy from generation_worker.py):
- RQ job wrapper pattern
- SSE progress events via completion_store
- Async/sync bridge with run_async()
- Graceful error handling

Queue name: "alert_animation"
Worker name: "alert_animation_worker"

Add to docker-compose.yml (or equivalent):
- New worker service for alert_animation queue

Validation:
- Enqueue test job
- Verify SSE progress events
- Test error handling
```

---

### TASK 2.2: Export Service (Server Fallback)
**Assignee:** Backend Agent  
**Estimated Time:** 2.5 hours  
**Depends On:** Task 1.4
**Can Parallel With:** Task 2.1

**Instructions:**
```
Create file: backend/services/alert_animation/export_service.py

Implementation from MASTER_SCHEMA section "Server-Side Export"

This is FALLBACK only for Safari/mobile users.
Most exports happen client-side (Task 3.4).

Requirements:
1. Download source + depth map
2. Generate frames with Pillow/numpy
3. Encode with FFmpeg:
   - WebM: libvpx with yuva420p (alpha)
   - GIF: palette-based with transparency

FFmpeg must be installed in container.
Add to Dockerfile if not present:
RUN apt-get update && apt-get install -y ffmpeg

Validation:
- Generate test WebM with alpha
- Generate test GIF
- Verify transparency works
```

---

### TASK 2.3: TypeScript Types
**Assignee:** Frontend Agent  
**Estimated Time:** 1.5 hours  
**Depends On:** Task 1.2 (schema alignment)
**Blocking:** Task 2.4

**Instructions:**
```
Create file: tsx/packages/api-client/src/types/alertAnimation.ts

Copy types from MASTER_SCHEMA section "FRONTEND TYPES (TypeScript)"

Modifications needed:
1. REMOVE all premium/pack related types:
   - Remove Pack interface
   - Remove packId from AnimationPreset
   - Remove priceCents from AnimationPreset
   - Remove isPremium from AnimationPreset
   - Remove isOwned from any interface

2. ADD tier requirement:
   - Add to AnimationProject: requiresTier: 'pro' | 'studio'

3. Include ALL transform functions from schema

4. Export everything from index:
   - Add to tsx/packages/api-client/src/types/index.ts

Validation:
- TypeScript compiles without errors
- Import in test file and verify types work
```

---

### TASK 2.4: React Query Hooks
**Assignee:** Frontend Agent  
**Estimated Time:** 2 hours  
**Depends On:** Task 2.3
**Blocking:** Phase 3

**Instructions:**
```
Create file: tsx/packages/api-client/src/hooks/useAlertAnimations.ts

Hooks to implement:
1. useAnimationProjects() - List projects
2. useAnimationProject(id) - Get single project
3. useCreateAnimationProject() - Create mutation
4. useUpdateAnimationProject() - Update mutation
5. useDeleteAnimationProject() - Delete mutation
6. useGenerateDepthMap(projectId) - Trigger depth map job
7. useExportAnimation(projectId) - Trigger export
8. useAnimationPresets(category?) - List presets
9. useCreatePreset() - Create custom preset
10. useOBSBrowserSource(projectId) - Get OBS URL

Pattern to follow (from useProjectAssetOverrides.ts):
```typescript
const API_BASE = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL
  : 'http://localhost:8000') + '/api/v1';

export function useAnimationProjects() {
  return useQuery({
    queryKey: ['alertAnimations'],
    queryFn: async () => {
      const token = apiClient.getAccessToken();
      const response = await fetch(`${API_BASE}/alert-animations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      return {
        ...data,
        projects: data.projects.map(transformAnimationProject),
      };
    },
  });
}
```

Export from tsx/packages/api-client/src/hooks/index.ts

Validation:
- Import hooks in test component
- Verify queries/mutations work
- Check error handling
```

---

## PHASE 3: FRONTEND UI COMPONENTS
**Timeline:** Days 5-10  
**Dependencies:** Phase 2 complete


### TASK 3.1: Alert Animation Studio Modal (Shell)
**Assignee:** Frontend Agent  
**Estimated Time:** 2 hours  
**Depends On:** Task 2.4
**Blocking:** Tasks 3.2-3.5

**Instructions:**
```
Create directory: tsx/apps/web/src/components/alert-animation-studio/
Create files:
- AlertAnimationStudio.tsx (main modal)
- types.ts (component-specific types)
- index.ts (exports)

AlertAnimationStudio.tsx structure:
```tsx
interface AlertAnimationStudioProps {
  isOpen: boolean;
  onClose: () => void;
  sourceAsset: {
    id: string;
    url: string;
    name: string;
  };
}

export function AlertAnimationStudio({ isOpen, onClose, sourceAsset }: Props) {
  // State
  const [animationConfig, setAnimationConfig] = useState<AnimationConfig>(defaultConfig);
  const [depthMapUrl, setDepthMapUrl] = useState<string | null>(null);
  
  // Hooks
  const { mutate: createProject } = useCreateAnimationProject();
  const { mutate: generateDepthMap } = useGenerateDepthMap();
  
  // On mount: create project + trigger depth map
  useEffect(() => {
    if (isOpen && sourceAsset) {
      createProject({
        sourceUrl: sourceAsset.url,
        sourceAssetId: sourceAsset.id,
        name: `${sourceAsset.name} Animation`,
      }, {
        onSuccess: (project) => {
          generateDepthMap(project.id);
        }
      });
    }
  }, [isOpen, sourceAsset]);
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="full">
      <div className="flex h-full">
        {/* Left: Preview Canvas */}
        <div className="flex-1">
          <AnimationCanvas 
            sourceUrl={sourceAsset.url}
            depthMapUrl={depthMapUrl}
            config={animationConfig}
          />
        </div>
        
        {/* Right: Controls */}
        <div className="w-80 border-l">
          <PresetSelector 
            config={animationConfig}
            onChange={setAnimationConfig}
          />
          <TimelineControls />
          <ExportPanel />
        </div>
      </div>
    </Modal>
  );
}
```

Follow patterns from CanvasStudioModal.tsx

Validation:
- Modal opens/closes
- Creates project on open
- Layout renders correctly
```

---

### TASK 3.2: Animation Canvas (Three.js)
**Assignee:** Frontend Agent (Three.js experience)  
**Estimated Time:** 4 hours  
**Depends On:** Task 3.1
**Can Parallel With:** Task 3.3

**Instructions:**
```
Create files:
- tsx/apps/web/src/components/alert-animation-studio/AnimationCanvas.tsx
- tsx/apps/web/src/components/alert-animation-studio/hooks/useAnimationEngine.ts
- tsx/apps/web/src/components/alert-animation-studio/shaders/depthParallax.vert
- tsx/apps/web/src/components/alert-animation-studio/shaders/depthParallax.frag

Dependencies to add:
npm install three @types/three gsap --workspace=@aurastream/web

Implementation from MASTER_SCHEMA sections:
- "THREE.JS IMPLEMENTATION"
- "Animation Engine Architecture"
- "Depth Parallax Shader"
- "GSAP Timeline Integration"

AnimationCanvas.tsx:
```tsx
interface AnimationCanvasProps {
  sourceUrl: string;
  depthMapUrl: string | null;
  config: AnimationConfig;
  onReady?: () => void;
}

export function AnimationCanvas({ sourceUrl, depthMapUrl, config, onReady }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engine = useAnimationEngine({
    sourceUrl,
    depthMapUrl,
    config,
    canvasRef,
  });
  
  return (
    <div className="relative w-full h-full bg-checker-pattern">
      <canvas 
        ref={canvasRef}
        className="w-full h-full"
      />
      {!depthMapUrl && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Spinner />
          <span>Generating depth map...</span>
        </div>
      )}
    </div>
  );
}
```

Key requirements:
1. Load source image as texture
2. Load depth map as displacement texture (when ready)
3. Apply custom shader for parallax effect
4. Mouse tracking for interactive parallax
5. GSAP timeline for entry/loop animations
6. Proper cleanup on unmount (dispose textures, geometries)

Validation:
- Image renders
- Depth parallax works with mouse
- Entry animation plays
- Loop animation loops
- No WebGL errors in console
```

---

### TASK 3.3: Preset Selector UI
**Assignee:** Frontend Agent  
**Estimated Time:** 2.5 hours  
**Depends On:** Task 3.1
**Can Parallel With:** Task 3.2

**Instructions:**
```
Create file: tsx/apps/web/src/components/alert-animation-studio/PresetSelector.tsx

UI for selecting animation presets organized by category.

```tsx
interface PresetSelectorProps {
  config: AnimationConfig;
  onChange: (config: AnimationConfig) => void;
}

export function PresetSelector({ config, onChange }: Props) {
  const { data: presets } = useAnimationPresets();
  
  const entryPresets = presets?.filter(p => p.category === 'entry') || [];
  const loopPresets = presets?.filter(p => p.category === 'loop') || [];
  const depthPresets = presets?.filter(p => p.category === 'depth') || [];
  const particlePresets = presets?.filter(p => p.category === 'particles') || [];
  
  return (
    <div className="p-4 space-y-6">
      <PresetCategory
        title="Entry Animation"
        icon="🎯"
        presets={entryPresets}
        selected={config.entry?.type}
        onSelect={(preset) => onChange({
          ...config,
          entry: preset.config as EntryAnimation,
        })}
      />
      
      <PresetCategory
        title="Loop Animation"
        icon="💫"
        presets={loopPresets}
        selected={config.loop?.type}
        onSelect={(preset) => onChange({
          ...config,
          loop: preset.config as LoopAnimation,
        })}
      />
      
      <PresetCategory
        title="3D Depth Effect"
        icon="🌀"
        presets={depthPresets}
        selected={config.depthEffect?.type}
        onSelect={(preset) => onChange({
          ...config,
          depthEffect: preset.config as DepthEffect,
        })}
      />
      
      <PresetCategory
        title="Particles"
        icon="✨"
        presets={particlePresets}
        selected={config.particles?.type}
        onSelect={(preset) => onChange({
          ...config,
          particles: preset.config as ParticleEffect,
        })}
      />
    </div>
  );
}

function PresetCategory({ title, icon, presets, selected, onSelect }) {
  return (
    <div>
      <h3 className="text-sm font-medium mb-2">{icon} {title}</h3>
      <div className="grid grid-cols-2 gap-2">
        {presets.map(preset => (
          <button
            key={preset.id}
            onClick={() => onSelect(preset)}
            className={cn(
              "p-2 rounded border text-left",
              selected === preset.config.type 
                ? "border-purple-500 bg-purple-500/10" 
                : "border-gray-700 hover:border-gray-600"
            )}
          >
            <span className="text-lg">{preset.icon}</span>
            <span className="text-sm ml-2">{preset.name}</span>
          </button>
        ))}
        <button
          onClick={() => onSelect(null)}
          className={cn(
            "p-2 rounded border text-sm",
            !selected ? "border-gray-500" : "border-gray-700"
          )}
        >
          None
        </button>
      </div>
    </div>
  );
}
```

Validation:
- Presets load from API
- Selection updates config
- Visual feedback on selection
- "None" option clears selection
```

---

### TASK 3.4: Export Panel (Client-Side)
**Assignee:** Frontend Agent  
**Estimated Time:** 3 hours  
**Depends On:** Task 3.2 (needs canvas reference)

**Instructions:**
```
Create files:
- tsx/apps/web/src/components/alert-animation-studio/ExportPanel.tsx
- tsx/apps/web/src/components/alert-animation-studio/hooks/useExport.ts

Implementation from MASTER_SCHEMA section "Client-Side Export (MediaRecorder)"

ExportPanel.tsx:
```tsx
interface ExportPanelProps {
  canvasRef: RefObject<HTMLCanvasElement>;
  timeline: gsap.core.Timeline;
  config: AnimationConfig;
  projectId: string;
}

export function ExportPanel({ canvasRef, timeline, config, projectId }: Props) {
  const [format, setFormat] = useState<'webm' | 'gif'>('webm');
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const { data: obsUrl } = useOBSBrowserSource(projectId);
  const supportsWebMAlpha = useSupportsWebMAlpha();
  
  const handleExport = async () => {
    setExporting(true);
    try {
      if (format === 'webm' && !supportsWebMAlpha) {
        // Fallback to server
        await exportServerSide(projectId, format);
      } else {
        // Client-side export
        const result = await exportAnimation(
          canvasRef.current!,
          timeline,
          { format, width: 512, height: 512, fps: 30, durationMs: config.durationMs },
          setProgress
        );
        downloadBlob(result.blob, `animation.${format}`);
      }
    } finally {
      setExporting(false);
    }
  };
  
  return (
    <div className="p-4 border-t">
      <h3 className="font-medium mb-3">Export</h3>
      
      {/* Format selector */}
      <div className="flex gap-2 mb-3">
        <button 
          onClick={() => setFormat('webm')}
          className={cn("px-3 py-1 rounded", format === 'webm' && "bg-purple-600")}
        >
          WebM (Alpha)
        </button>
        <button
          onClick={() => setFormat('gif')}
          className={cn("px-3 py-1 rounded", format === 'gif' && "bg-purple-600")}
        >
          GIF
        </button>
      </div>
      
      {/* Export button */}
      <button
        onClick={handleExport}
        disabled={exporting}
        className="w-full py-2 bg-purple-600 rounded font-medium"
      >
        {exporting ? `Exporting... ${progress}%` : `Download ${format.toUpperCase()}`}
      </button>
      
      {/* OBS URL */}
      {obsUrl && (
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-1">OBS Browser Source</h4>
          <div className="flex gap-2">
            <input 
              readOnly 
              value={obsUrl.url}
              className="flex-1 bg-gray-800 px-2 py-1 rounded text-xs"
            />
            <button onClick={() => navigator.clipboard.writeText(obsUrl.url)}>
              Copy
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">{obsUrl.instructions}</p>
        </div>
      )}
    </div>
  );
}
```

useExport.ts - implement from MASTER_SCHEMA:
- checkWebMAlphaSupport()
- exportAnimation() with MediaRecorder
- Progress tracking

Validation:
- WebM export works in Chrome/Firefox
- GIF fallback works
- Progress updates during export
- OBS URL copies to clipboard
```

---

### TASK 3.5: Particle Systems
**Assignee:** Frontend Agent (Three.js experience)  
**Estimated Time:** 3 hours  
**Depends On:** Task 3.2
**Can Parallel With:** Task 3.4

**Instructions:**
```
Create directory: tsx/apps/web/src/components/alert-animation-studio/particles/
Create files:
- SparkleSystem.tsx
- ConfettiSystem.tsx
- HeartSystem.tsx
- FireSystem.tsx
- index.ts

Implementation from MASTER_SCHEMA section "Particle System Implementation"

Each system should:
1. Use THREE.InstancedMesh for performance
2. Accept config from ParticleEffect type
3. Have update(deltaTime) method
4. Properly dispose on unmount

SparkleSystem example:
```tsx
interface SparkleSystemProps {
  config: ParticleEffect;
  scene: THREE.Scene;
}

export class SparkleSystem {
  private mesh: THREE.InstancedMesh;
  private particles: Particle[];
  
  constructor(config: ParticleEffect, scene: THREE.Scene) {
    // Create instanced geometry
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.ShaderMaterial({
      // Sparkle shader with additive blending
    });
    
    this.mesh = new THREE.InstancedMesh(geometry, material, config.count);
    scene.add(this.mesh);
    
    this.particles = this.initParticles(config);
  }
  
  update(deltaTime: number) {
    // Update particle positions, respawn dead particles
  }
  
  dispose() {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.mesh.parent?.remove(this.mesh);
  }
}
```

Validation:
- Each particle type renders
- Particles animate smoothly
- Performance stays 60fps with 100+ particles
- No memory leaks on dispose
```


---

## PHASE 4: INTEGRATION & TESTING
**Timeline:** Days 10-14  
**Dependencies:** Phase 3 complete

### TASK 4.1: Integration Point - "Animate This" Button
**Assignee:** Frontend Agent  
**Estimated Time:** 1.5 hours  
**Depends On:** Task 3.1

**Instructions:**
```
Add "Animate This" button to asset cards/detail views.

Files to modify:
1. tsx/apps/web/src/components/media-library/AssetCard.tsx (or equivalent)
2. tsx/apps/web/src/components/media-library/AssetDetailModal.tsx (or equivalent)

Implementation:
```tsx
import { AlertAnimationStudio } from '../alert-animation-studio';
import { useAuth } from '@aurastream/api-client';

function AssetActions({ asset }) {
  const { user } = useAuth();
  const [showAnimationStudio, setShowAnimationStudio] = useState(false);
  
  const canAnimate = user?.subscriptionTier === 'pro' || user?.subscriptionTier === 'studio';
  
  return (
    <>
      {/* Existing actions */}
      
      {/* Animate button - Pro only */}
      <button
        onClick={() => setShowAnimationStudio(true)}
        disabled={!canAnimate}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded",
          canAnimate 
            ? "bg-purple-600 hover:bg-purple-700" 
            : "bg-gray-700 cursor-not-allowed"
        )}
        title={canAnimate ? "Create 3D animation" : "Requires Pro subscription"}
      >
        <SparklesIcon className="w-4 h-4" />
        Animate
        {!canAnimate && <LockIcon className="w-3 h-3" />}
      </button>
      
      {/* Animation Studio Modal */}
      <AlertAnimationStudio
        isOpen={showAnimationStudio}
        onClose={() => setShowAnimationStudio(false)}
        sourceAsset={{
          id: asset.id,
          url: asset.url,
          name: asset.name || 'Asset',
        }}
      />
    </>
  );
}
```

Also add to:
- Asset grid hover actions
- Asset detail view
- Right-click context menu (if exists)

Validation:
- Button shows for Pro users
- Button disabled with lock for free users
- Modal opens with correct asset
```

---

### TASK 4.2: Unit Tests
**Assignee:** Backend Agent  
**Estimated Time:** 2 hours  
**Depends On:** Tasks 1.2, 1.4, 2.2

**Instructions:**
```
Create files:
- backend/tests/unit/test_alert_animation_schemas.py
- backend/tests/unit/test_alert_animation_depth.py
- backend/tests/unit/test_alert_animation_export.py

Copy test implementations from MASTER_SCHEMA section "Unit Tests"

Test coverage requirements:
1. Schema validation tests:
   - Valid configs accepted
   - Invalid durations rejected
   - Invalid colors rejected
   - Bounds enforced

2. Depth service tests (mocked):
   - Image download
   - Depth estimation call
   - Storage upload

3. Export service tests (mocked):
   - Frame generation
   - FFmpeg encoding

Run with:
python -m pytest backend/tests/unit/test_alert_animation*.py -v

Validation:
- All tests pass
- Coverage > 80% for new code
```

---

### TASK 4.3: Property-Based Tests (Hypothesis)
**Assignee:** Backend Agent  
**Estimated Time:** 2 hours  
**Depends On:** Task 4.2

**Instructions:**
```
Create file: backend/tests/properties/test_alert_animation_properties.py

Copy implementation from MASTER_SCHEMA section "Property-Based Tests (Hypothesis)"

Key property tests:
1. Any valid config serializes and deserializes
2. Duration always positive
3. Loop count non-negative
4. Invalid values rejected
5. Any combination of effects valid

Run with:
python -m pytest backend/tests/properties/test_alert_animation_properties.py -v --hypothesis-show-statistics

Validation:
- 100+ examples per test
- No failures found
- Edge cases covered
```

---

### TASK 4.4: Integration Tests
**Assignee:** Backend Agent  
**Estimated Time:** 2 hours  
**Depends On:** Task 1.3

**Instructions:**
```
Create file: backend/tests/integration/test_alert_animation_e2e.py

Copy implementation from MASTER_SCHEMA section "Integration Tests"

Test scenarios:
1. Create animation project (Pro user)
2. Create animation project (Free user - should fail 403)
3. List projects
4. Update animation config
5. Generate depth map (enqueues job)
6. Get presets
7. Get presets by category
8. Get OBS URL
9. Export client mode
10. Export server mode

Run with:
python -m pytest backend/tests/integration/test_alert_animation_e2e.py -v

Validation:
- All endpoints tested
- Tier check verified
- Error cases covered
```

---

### TASK 4.5: Frontend E2E Test
**Assignee:** Frontend Agent  
**Estimated Time:** 1.5 hours  
**Depends On:** Task 4.1

**Instructions:**
```
Create file: tsx/apps/web/e2e/flows/alert-animation.spec.ts

Test the complete user flow:
```typescript
import { test, expect } from '@playwright/test';

test.describe('Alert Animation Studio', () => {
  test.beforeEach(async ({ page }) => {
    // Login as Pro user
    await loginAsProUser(page);
  });
  
  test('should open animation studio from asset', async ({ page }) => {
    // Navigate to assets
    await page.goto('/dashboard/assets');
    
    // Click on an asset
    await page.click('[data-testid="asset-card"]');
    
    // Click animate button
    await page.click('button:has-text("Animate")');
    
    // Verify modal opens
    await expect(page.locator('[data-testid="animation-studio-modal"]')).toBeVisible();
  });
  
  test('should select animation presets', async ({ page }) => {
    // Open animation studio
    await openAnimationStudio(page);
    
    // Select entry preset
    await page.click('button:has-text("Pop In")');
    
    // Verify selection
    await expect(page.locator('button:has-text("Pop In")')).toHaveClass(/border-purple/);
  });
  
  test('should export animation', async ({ page }) => {
    // Open animation studio
    await openAnimationStudio(page);
    
    // Wait for depth map
    await page.waitForSelector('[data-testid="depth-map-ready"]');
    
    // Click export
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Download WebM")');
    
    // Verify download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.webm');
  });
  
  test('should block free users', async ({ page }) => {
    // Login as free user
    await loginAsFreeUser(page);
    
    // Navigate to assets
    await page.goto('/dashboard/assets');
    
    // Animate button should be disabled
    await expect(page.locator('button:has-text("Animate")')).toBeDisabled();
  });
});
```

Run with:
npm run test:e2e --workspace=@aurastream/web -- --grep "Alert Animation"

Validation:
- All flows pass
- Pro/Free tier check works
- Export produces file
```

---

## PHASE 5: POLISH & DOCUMENTATION
**Timeline:** Days 14-17  
**Dependencies:** Phase 4 complete


### TASK 5.1: Timeline Controls
**Assignee:** Frontend Agent  
**Estimated Time:** 1.5 hours  
**Depends On:** Task 3.2

**Instructions:**
```
Create file: tsx/apps/web/src/components/alert-animation-studio/TimelineControls.tsx

Simple playback controls for the animation:
```tsx
interface TimelineControlsProps {
  timeline: gsap.core.Timeline | null;
  durationMs: number;
}

export function TimelineControls({ timeline, durationMs }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  
  useEffect(() => {
    if (!timeline) return;
    
    const update = () => {
      setCurrentTime(timeline.time() * 1000);
      if (timeline.isActive()) {
        requestAnimationFrame(update);
      }
    };
    
    if (isPlaying) {
      requestAnimationFrame(update);
    }
  }, [timeline, isPlaying]);
  
  const handlePlayPause = () => {
    if (!timeline) return;
    if (isPlaying) {
      timeline.pause();
    } else {
      timeline.play();
    }
    setIsPlaying(!isPlaying);
  };
  
  const handleReset = () => {
    timeline?.restart().pause();
    setIsPlaying(false);
    setCurrentTime(0);
  };
  
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    timeline?.seek(time / 1000).pause();
    setCurrentTime(time);
    setIsPlaying(false);
  };
  
  return (
    <div className="flex items-center gap-3 p-3 border-t">
      <button onClick={handlePlayPause}>
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>
      <button onClick={handleReset}>
        <ResetIcon />
      </button>
      <input
        type="range"
        min={0}
        max={durationMs}
        value={currentTime}
        onChange={handleSeek}
        className="flex-1"
      />
      <span className="text-xs text-gray-400 w-20">
        {formatTime(currentTime)} / {formatTime(durationMs)}
      </span>
    </div>
  );
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const remainder = Math.floor((ms % 1000) / 10);
  return `${seconds}.${remainder.toString().padStart(2, '0')}`;
}
```

Validation:
- Play/pause works
- Scrubbing works
- Time display accurate
```

---

### TASK 5.2: Loading States & Error Handling
**Assignee:** Frontend Agent  
**Estimated Time:** 1.5 hours  
**Depends On:** Task 3.1

**Instructions:**
```
Add proper loading states and error handling throughout:

1. Depth map generation:
   - Show spinner while generating
   - Show error toast if fails
   - Retry button on failure

2. Export:
   - Progress bar during export
   - Error toast with retry
   - Success toast with download link

3. Preset loading:
   - Skeleton loaders
   - Error state with retry

4. Project creation:
   - Loading state on modal open
   - Error handling with close option

Implementation pattern:
```tsx
function AnimationStudioContent({ sourceAsset }) {
  const { 
    data: project, 
    isLoading: projectLoading, 
    error: projectError,
    refetch: retryProject 
  } = useAnimationProject(projectId);
  
  if (projectLoading) {
    return <LoadingState message="Setting up animation studio..." />;
  }
  
  if (projectError) {
    return (
      <ErrorState 
        message="Failed to create animation project"
        onRetry={retryProject}
      />
    );
  }
  
  // ... rest of component
}
```

Add toast notifications:
```tsx
import { toast } from 'sonner'; // or your toast library

// On depth map complete
toast.success('Depth map ready! Your animation now has 3D depth.');

// On export complete
toast.success('Animation exported!', {
  action: {
    label: 'Download',
    onClick: () => downloadBlob(blob, filename),
  },
});

// On error
toast.error('Export failed. Please try again.', {
  action: {
    label: 'Retry',
    onClick: handleExport,
  },
});
```

Validation:
- No silent failures
- All async operations have loading states
- Errors are user-friendly
- Retry options available
```

---

### TASK 5.3: OBS Browser Source Page
**Assignee:** Frontend Agent  
**Estimated Time:** 1.5 hours  
**Depends On:** Task 2.4

**Instructions:**
```
Create a public page that OBS can load as a browser source.

Create file: tsx/apps/web/src/app/obs/alert/[id]/page.tsx

```tsx
// This page is loaded by OBS as a browser source
// It renders the animation in a loop with transparent background

interface PageProps {
  params: { id: string };
  searchParams: { token?: string };
}

export default async function OBSAlertPage({ params, searchParams }: PageProps) {
  // Verify token (lightweight auth for OBS)
  const project = await getProjectForOBS(params.id, searchParams.token);
  
  if (!project) {
    return <div>Invalid or expired link</div>;
  }
  
  return (
    <OBSAlertClient 
      sourceUrl={project.sourceUrl}
      depthMapUrl={project.depthMapUrl}
      animationConfig={project.animationConfig}
    />
  );
}

// Client component that runs the animation
'use client';
function OBSAlertClient({ sourceUrl, depthMapUrl, animationConfig }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useAnimationEngine({
    sourceUrl,
    depthMapUrl,
    config: animationConfig,
    canvasRef,
    autoPlay: true,
    loop: true,
  });
  
  return (
    <canvas 
      ref={canvasRef}
      style={{
        width: '100vw',
        height: '100vh',
        background: 'transparent',
      }}
    />
  );
}
```

Backend endpoint for OBS URL:
```python
@router.get("/{id}/obs-url")
async def get_obs_url(id: UUID, current_user: TokenPayload = Depends(get_current_user)):
    project = await get_project(id, current_user.id)
    
    # Generate short-lived token for OBS
    obs_token = create_obs_token(project.id, expires_in=86400 * 30)  # 30 days
    
    base_url = settings.FRONTEND_URL
    url = f"{base_url}/obs/alert/{project.id}?token={obs_token}"
    
    return OBSBrowserSourceResponse(
        url=url,
        width=project.export_width,
        height=project.export_height,
        instructions="1. In OBS, add Browser Source\\n2. Set URL to above\\n3. Set dimensions to {width}x{height}\\n4. Check 'Shutdown source when not visible'"
    )
```

Validation:
- Page loads in browser
- Animation plays on loop
- Background is transparent
- Works in OBS browser source
```

---

### TASK 5.4: Update Master Schema
**Assignee:** Any Agent  
**Estimated Time:** 30 minutes  
**Depends On:** All tasks complete

**Instructions:**
```
Update ALERT_ANIMATION_STUDIO_MASTER_SCHEMA.md with:

1. Remove all premium pack references
2. Add tier access note: "Pro and Studio subscription required"
3. Update revenue section to note it's a Pro feature
4. Add any implementation learnings
5. Mark as "IMPLEMENTED" with date

Also update AURASTREAM_MASTER_SCHEMA.md:
1. Add Alert Animation Studio to module list
2. Add new endpoints to API reference
3. Add new tables to database schema section
```

---

## PARALLEL EXECUTION GUIDE

### Optimal Agent Assignment

```
BACKEND AGENT 1:
Day 1-2: Task 1.1 (Migration) → Task 1.2 (Schemas) → Task 1.3 (Routes)
Day 3-4: Task 2.1 (Worker)
Day 5-6: Task 4.2 (Unit Tests) → Task 4.3 (Property Tests) → Task 4.4 (Integration)

BACKEND AGENT 2:
Day 1-3: Task 1.4 (Depth Service) → Task 2.2 (Export Service)
Day 4+: Support/review

FRONTEND AGENT 1:
Day 3-4: Task 2.3 (Types) → Task 2.4 (Hooks)
Day 5-7: Task 3.1 (Modal Shell) → Task 3.3 (Preset Selector)
Day 8-9: Task 4.1 (Integration) → Task 5.2 (Error Handling)

FRONTEND AGENT 2 (Three.js):
Day 5-8: Task 3.2 (Animation Canvas)
Day 9-10: Task 3.5 (Particle Systems)
Day 11: Task 3.4 (Export Panel)

FRONTEND AGENT 3:
Day 10-11: Task 4.5 (E2E Tests)
Day 12: Task 5.1 (Timeline) → Task 5.3 (OBS Page)
```

### Critical Path
```
1.1 → 1.2 → 1.3 → 2.4 → 3.1 → 3.2 → 3.4 → 4.1
     ↘ 1.4 → 2.1
```

### Blockers to Watch
- Task 1.1 (Migration) blocks almost everything
- Task 3.2 (Three.js Canvas) is complex, start early
- Task 2.4 (Hooks) blocks all frontend UI work

---

## COMPLETION CHECKLIST

### Backend
- [ ] Migration runs successfully
- [ ] All 12 endpoints working
- [ ] Tier check on all endpoints
- [ ] Depth map generation works
- [ ] Server export fallback works
- [ ] Worker processes jobs
- [ ] SSE progress events work
- [ ] All tests pass

### Frontend
- [ ] Types compile without errors
- [ ] Hooks fetch data correctly
- [ ] Modal opens/closes
- [ ] Three.js canvas renders
- [ ] Depth parallax works
- [ ] Entry animations work
- [ ] Loop animations work
- [ ] Particle systems work
- [ ] Client export works
- [ ] OBS page works
- [ ] E2E tests pass

### Integration
- [ ] "Animate" button shows for Pro users
- [ ] "Animate" button disabled for free users
- [ ] Full flow works end-to-end
- [ ] No console errors
- [ ] Performance acceptable (60fps)

---

*Use this task guide to coordinate parallel development. Reference ALERT_ANIMATION_STUDIO_MASTER_SCHEMA.md for detailed specifications.*
