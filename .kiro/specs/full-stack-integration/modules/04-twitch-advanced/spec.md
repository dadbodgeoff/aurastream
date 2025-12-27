# MODULE 4: TWITCH ADVANCED OPTIONS

## Overview
Add text overlay, game context, and logo options to the Twitch generation page. Backend supports these features but frontend doesn't expose them.

## Priority: MEDIUM
## Dependencies: None (can run parallel)
## Estimated Effort: 2-3 hours

---

## BACKEND VERIFICATION

### Existing Schema (VERIFIED)
**File:** `backend/api/schemas/twitch.py`

```python
class TwitchGenerateRequest(BaseModel):
    asset_type: TwitchAssetType
    brand_kit_id: str
    custom_prompt: Optional[str] = Field(None, max_length=500)
    game_id: Optional[str] = None
    text_overlay: Optional[str] = Field(None, max_length=100)
    include_logo: bool = Field(default=False)
```

### Endpoints (VERIFIED)
```
POST /api/v1/twitch/generate     → Generate single Twitch asset
GET  /api/v1/twitch/game-meta/{game_id} → Get game metadata
```

---

## IMPLEMENTATION TASKS

### Task 4.1: Verify/Update Twitch Types
**File:** `tsx/packages/api-client/src/types/twitch.ts`

**Verify these types exist (they should from previous work):**

```typescript
export interface TwitchGenerateRequest {
  assetType: TwitchAssetType;
  brandKitId: string;
  customPrompt?: string;
  gameId?: string;
  textOverlay?: string;
  includeLogo?: boolean;
}

export interface GameMetaResponse {
  id: string;
  name: string;
  currentSeason?: string;
  genre?: string;
  iconUrl?: string;
}
```

### Task 4.2: Add Game Meta Hook
**File:** `tsx/packages/api-client/src/hooks/useTwitch.ts`

**Add this hook if not present:**

```typescript
export function useGameMeta(gameId: string | undefined) {
  return useQuery({
    queryKey: ['twitch', 'game-meta', gameId],
    queryFn: async (): Promise<GameMetaResponse> => {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE}/twitch/game-meta/${gameId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Game not found');
        }
        throw new Error('Failed to fetch game metadata');
      }
      const data = await response.json();
      return transformGameMeta(data);
    },
    enabled: !!gameId,
    retry: false, // Don't retry on 404
  });
}

function transformGameMeta(data: any): GameMetaResponse {
  return {
    id: data.id,
    name: data.name,
    currentSeason: data.current_season,
    genre: data.genre,
    iconUrl: data.icon_url,
  };
}
```

### Task 4.3: Update Twitch Page
**File:** `tsx/apps/web/src/app/dashboard/twitch/page.tsx`

#### 4.3.1 Add State Variables

```typescript
// Text overlay
const [textOverlay, setTextOverlay] = useState('');

// Game context
const [gameSearch, setGameSearch] = useState('');
const [selectedGameId, setSelectedGameId] = useState<string | undefined>();

// Logo options
const [includeLogo, setIncludeLogo] = useState(false);
const [logoPosition, setLogoPosition] = useState<LogoPosition>('bottom-right');
const [logoSize, setLogoSize] = useState<LogoSize>('medium');

// Fetch game meta when selected
const { data: gameMeta, isLoading: isLoadingGame } = useGameMeta(selectedGameId);

// Fetch logos for selected brand kit
const { data: logosData } = useLogos(selectedBrandKitId || undefined);
const hasLogo = logosData?.logos?.primary != null;
```

#### 4.3.2 Add Text Overlay Section (After Custom Prompt)

```tsx
{/* Step 5: Text Overlay */}
<SectionCard className="mb-6">
  <div className="flex items-center gap-3 mb-4">
    <span className="w-8 h-8 rounded-lg bg-primary-500/10 text-primary-400 flex items-center justify-center text-sm font-bold">5</span>
    <h2 className="text-lg font-semibold text-text-primary">Text Overlay</h2>
    <span className="text-sm text-text-muted">(Optional)</span>
  </div>
  
  <div className="space-y-3">
    <input
      type="text"
      value={textOverlay}
      onChange={(e) => setTextOverlay(e.target.value)}
      placeholder="GG, POG, HYPE, etc."
      maxLength={100}
      className="w-full px-4 py-3 bg-background-base border border-border-subtle rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:border-primary-500 transition-colors"
    />
    <div className="flex justify-between items-center">
      <p className="text-sm text-text-tertiary">
        Text will be overlaid on the generated asset
      </p>
      <span className="text-xs text-text-tertiary">{textOverlay.length}/100</span>
    </div>
  </div>
</SectionCard>
```

#### 4.3.3 Add Game Context Section (After Text Overlay)

```tsx
{/* Step 6: Game Context */}
<SectionCard className="mb-6">
  <div className="flex items-center gap-3 mb-4">
    <span className="w-8 h-8 rounded-lg bg-primary-500/10 text-primary-400 flex items-center justify-center text-sm font-bold">6</span>
    <h2 className="text-lg font-semibold text-text-primary">Game Context</h2>
    <span className="text-sm text-text-muted">(Optional)</span>
  </div>
  
  <div className="space-y-4">
    {/* Game Search Input */}
    <div className="relative">
      <input
        type="text"
        value={gameSearch}
        onChange={(e) => setGameSearch(e.target.value)}
        placeholder="Search for a game..."
        className="w-full px-4 py-3 bg-background-base border border-border-subtle rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:border-primary-500 transition-colors"
      />
      {/* TODO: Add autocomplete dropdown */}
    </div>
    
    {/* Selected Game Display */}
    {selectedGameId && gameMeta && (
      <div className="flex items-center gap-4 p-4 bg-background-base rounded-xl border border-border-subtle">
        {gameMeta.iconUrl && (
          <img 
            src={gameMeta.iconUrl} 
            alt={gameMeta.name}
            className="w-12 h-12 rounded-lg object-cover"
          />
        )}
        <div className="flex-1">
          <h3 className="font-medium text-text-primary">{gameMeta.name}</h3>
          {gameMeta.currentSeason && (
            <p className="text-sm text-text-secondary">{gameMeta.currentSeason}</p>
          )}
          {gameMeta.genre && (
            <p className="text-xs text-text-tertiary">{gameMeta.genre}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setSelectedGameId(undefined);
            setGameSearch('');
          }}
          className="p-2 text-text-muted hover:text-text-primary transition-colors"
        >
          <XIcon className="w-5 h-5" />
        </button>
      </div>
    )}
    
    {isLoadingGame && (
      <div className="flex items-center justify-center py-4">
        <div className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
      </div>
    )}
    
    <p className="text-sm text-text-tertiary">
      Adding game context helps generate more relevant assets with game-specific styling
    </p>
  </div>
</SectionCard>
```

#### 4.3.4 Add Logo Options Section (After Game Context)

```tsx
{/* Step 7: Logo Options */}
{selectedBrandKitId && (
  <SectionCard className="mb-6">
    <div className="flex items-center gap-3 mb-4">
      <span className="w-8 h-8 rounded-lg bg-primary-500/10 text-primary-400 flex items-center justify-center text-sm font-bold">7</span>
      <h2 className="text-lg font-semibold text-text-primary">Logo Options</h2>
    </div>
    
    {/* Include Logo Toggle */}
    <div className="flex items-center justify-between p-4 bg-background-base rounded-xl mb-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-background-elevated rounded-lg flex items-center justify-center text-text-muted">
          <ImageIcon />
        </div>
        <div>
          <p className="font-medium text-text-primary">Include Logo</p>
          <p className="text-sm text-text-tertiary">
            {hasLogo 
              ? "Add your brand logo to the generated asset" 
              : "Upload a logo in your brand kit first"}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setIncludeLogo(!includeLogo)}
        disabled={!hasLogo}
        className={cn(
          "relative w-12 h-7 rounded-full transition-colors",
          includeLogo && hasLogo ? "bg-primary-500" : "bg-background-elevated",
          !hasLogo && "opacity-50 cursor-not-allowed"
        )}
      >
        <span
          className={cn(
            "absolute top-1 w-5 h-5 bg-white rounded-full transition-transform shadow-sm",
            includeLogo && hasLogo ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
    </div>

    {/* Logo Position & Size (same as generate page) */}
    {includeLogo && hasLogo && (
      <div className="space-y-4 animate-in fade-in duration-200">
        {/* Position selector */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Logo Position
          </label>
          <div className="grid grid-cols-5 gap-2">
            {LOGO_POSITIONS.map((pos) => (
              <button
                key={pos.id}
                type="button"
                onClick={() => setLogoPosition(pos.id)}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  logoPosition === pos.id
                    ? "bg-primary-500 text-white"
                    : "bg-background-base text-text-secondary hover:bg-background-elevated"
                )}
              >
                {pos.label}
              </button>
            ))}
          </div>
        </div>

        {/* Size selector */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Logo Size
          </label>
          <div className="grid grid-cols-3 gap-2">
            {LOGO_SIZES.map((size) => (
              <button
                key={size.id}
                type="button"
                onClick={() => setLogoSize(size.id)}
                className={cn(
                  "px-4 py-3 rounded-lg text-left transition-colors",
                  logoSize === size.id
                    ? "bg-primary-500/10 border-2 border-primary-500"
                    : "bg-background-base border-2 border-transparent hover:border-border-default"
                )}
              >
                <p className={cn(
                  "font-medium",
                  logoSize === size.id ? "text-primary-400" : "text-text-primary"
                )}>
                  {size.label}
                </p>
                <p className="text-xs text-text-tertiary">{size.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    )}

    {/* No logo warning */}
    {!hasLogo && (
      <div className="p-4 bg-warning-dark/10 border border-warning-main/20 rounded-xl">
        <p className="text-sm text-warning-light">
          No logo uploaded for this brand kit.{' '}
          <Link 
            href={`/dashboard/brand-kits/${selectedBrandKitId}`}
            className="underline hover:no-underline"
          >
            Upload a logo
          </Link>
          {' '}to include it in your generated assets.
        </p>
      </div>
    )}
  </SectionCard>
)}
```

#### 4.3.5 Update API Call

```typescript
const handleGenerate = async () => {
  if (!selectedBrandKitId) {
    alert('Please select a brand kit');
    return;
  }

  try {
    if (generationMode === 'single') {
      const result = await generateAssetMutation.mutateAsync({
        assetType: selectedAssetType,
        brandKitId: selectedBrandKitId,
        customPrompt: customPrompt || undefined,
        gameId: selectedGameId || undefined,
        textOverlay: textOverlay || undefined,
        includeLogo: includeLogo && hasLogo,
      });
      router.push(`/dashboard/assets?job=${result.id}`);
    } else {
      const result = await generatePackMutation.mutateAsync({
        packType: selectedPackType,
        brandKitId: selectedBrandKitId,
        customPrompt: customPrompt || undefined,
        gameId: selectedGameId || undefined,
      });
      router.push(`/dashboard/assets?pack=${result.id}`);
    }
  } catch (error) {
    console.error('Generation failed:', error);
  }
};
```

#### 4.3.6 Add Constants

```typescript
const LOGO_POSITIONS = [
  { id: 'top-left' as const, label: 'Top Left' },
  { id: 'top-right' as const, label: 'Top Right' },
  { id: 'bottom-left' as const, label: 'Bottom Left' },
  { id: 'bottom-right' as const, label: 'Bottom Right' },
  { id: 'center' as const, label: 'Center' },
];

const LOGO_SIZES = [
  { id: 'small' as const, label: 'Small', description: '10% of image' },
  { id: 'medium' as const, label: 'Medium', description: '15% of image' },
  { id: 'large' as const, label: 'Large', description: '20% of image' },
];

type LogoPosition = typeof LOGO_POSITIONS[number]['id'];
type LogoSize = typeof LOGO_SIZES[number]['id'];
```

---

## ACCEPTANCE CRITERIA

- [ ] Text overlay input renders
- [ ] Text overlay has 100 char limit
- [ ] Game search input renders
- [ ] Selected game displays with metadata
- [ ] Game can be cleared
- [ ] Logo toggle works
- [ ] Logo position selector works
- [ ] Logo size selector works
- [ ] No logo warning shows when appropriate
- [ ] API call includes all new parameters
- [ ] TypeScript compiles without errors

---

## TESTING COMMANDS

```bash
# Type check
cd tsx && npm run typecheck

# Run dev server
cd tsx && npm run dev

# Test:
# 1. Navigate to /dashboard/twitch
# 2. Select brand kit
# 3. Enter text overlay
# 4. Search and select a game
# 5. Enable logo with position/size
# 6. Generate and verify job created
```

---

## FILES TO UPDATE

1. `tsx/packages/api-client/src/types/twitch.ts` (verify types)
2. `tsx/packages/api-client/src/hooks/useTwitch.ts` (add useGameMeta)
3. `tsx/apps/web/src/app/dashboard/twitch/page.tsx` (add UI sections)

## IMPORTS NEEDED

```typescript
import { useLogos } from '@streamer-studio/api-client';
import { useGameMeta } from '@streamer-studio/api-client';
import Link from 'next/link';
```
