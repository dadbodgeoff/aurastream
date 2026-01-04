# Canvas Export & Sketch System

Complete canvas composition system for AuraStream, enabling users to:
1. Place and position assets on a canvas
2. Draw sketches and annotations
3. Export as a single image for AI generation (reducing API costs)

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     CANVAS STUDIO MODAL                         │
│  CanvasStudioModal.tsx - Full editor combining placement+sketch │
└─────────────────────────────────────────────────────────────────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          ▼                      ▼                      ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  PLACEMENT MODE │    │   SKETCH MODE   │    │  CANVAS EXPORT  │
│  PlacementCanvas│    │   SketchCanvas  │    │  CanvasRenderer │
│  PlacementCtrls │    │   SketchToolbar │    │  useCanvasExport│
└─────────────────┘    │   SketchToolPnl │    └─────────────────┘
                       │   useSketchStore│
                       └─────────────────┘
```

## Features

### Sketch Tools (8 total)
| Tool | Shortcut | Description |
|------|----------|-------------|
| Select | V | Select and drag elements |
| Pen | P | Freehand drawing |
| Rectangle | R | Rectangle shapes (hold Shift for square) |
| Circle | C | Circle/ellipse (hold Shift for perfect circle) |
| Line | L | Straight lines (hold Shift for 45° snapping) |
| Arrow | A | Directional arrows (hold Shift for 45° snapping) |
| Text | T | Text labels |
| Eraser | E | Delete elements by clicking |

### Keyboard Shortcuts
- **Tool switching**: V, P, R, C, L, A, T, E
- **Undo**: ⌘Z / Ctrl+Z
- **Redo**: ⌘⇧Z / Ctrl+Shift+Z / Ctrl+Y
- **Delete**: Delete / Backspace (when element selected)
- **Cancel**: Escape (cancel drawing or deselect)

### Element Manipulation
- **Drag to move**: Select tool + drag any element
- **Selection highlight**: Selected elements have teal glow
- **Z-index ordering**: Layer controls in placement mode

### Export
- 2x resolution by default (configurable)
- PNG format with transparency support
- Includes both placements and sketch elements

## Usage

### Basic - MediaAssetPicker with Canvas Studio
```tsx
import { MediaAssetPicker } from '@/components/media-library';

function CreatePage() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [placements, setPlacements] = useState<AssetPlacement[]>([]);
  const [sketches, setSketches] = useState<AnySketchElement[]>([]);

  return (
    <MediaAssetPicker
      selectedAssets={assets}
      onSelectionChange={setAssets}
      placements={placements}
      onPlacementsChange={setPlacements}
      sketchElements={sketches}
      onSketchElementsChange={setSketches}
      assetType="thumbnail"
      enableCanvasStudio={true}  // Enable full sketch mode
    />
  );
}
```

### Direct - CanvasStudioModal
```tsx
import { CanvasStudioModal } from '@/components/media-library';

<CanvasStudioModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  assetType="thumbnail"
  assets={selectedAssets}
  initialPlacements={placements}
  initialSketchElements={sketches}
  onSave={(placements, sketches) => {
    // Handle save
  }}
  onExport={(dataUrl, blob) => {
    // Handle export preview
  }}
/>
```

### Generation Integration
```tsx
import { useCanvasGeneration } from '@/hooks/useCanvasGeneration';

function GenerateWithCanvas() {
  const { prepareCanvasForGeneration, isPreparing } = useCanvasGeneration({
    width: 1280,
    height: 720,
    assetType: 'thumbnail',
  });

  const handleGenerate = async () => {
    // Export canvas and upload snapshot
    const { snapshotUrl, description } = await prepareCanvasForGeneration(
      placements,
      sketchElements
    );

    // Use in generation request
    await generateAsset({
      assetType: 'thumbnail',
      customPrompt: 'Epic gaming moment',
      canvasSnapshotUrl: snapshotUrl,
      canvasSnapshotDescription: description,
    });
  };
}
```

## File Structure

```
canvas-export/
├── types.ts           # All sketch element types
├── CanvasRenderer.tsx # Canvas rendering component
├── useCanvasExport.ts # Export hook
├── index.ts           # Module exports
└── README.md          # This file

sketch/
├── types.ts           # Sketch-specific types (re-exports from canvas-export)
├── constants.ts       # Tool configs, presets, defaults
├── useSketchStore.ts  # Zustand store for sketch state
├── SketchCanvas.tsx   # Interactive drawing canvas
├── SketchToolbar.tsx  # Tool selection toolbar
├── SketchToolPanel.tsx# Tool settings panel
├── SketchEditor.tsx   # Combined editor component
└── index.ts           # Module exports
```

## Element Types

```typescript
// Base element
interface SketchElement {
  id: string;
  type: SketchElementType;
  zIndex: number;
  opacity: number;
  color: string;
  strokeWidth: number;
}

// Freehand drawing
interface FreehandElement extends SketchElement {
  type: 'freehand';
  points: Array<{ x: number; y: number }>;
}

// Rectangle
interface RectangleElement extends SketchElement {
  type: 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
  filled: boolean;
}

// Circle/Ellipse
interface CircleElement extends SketchElement {
  type: 'circle';
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  filled: boolean;
}

// Line
interface LineElement extends SketchElement {
  type: 'line';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

// Arrow
interface ArrowElement extends SketchElement {
  type: 'arrow';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

// Text
interface TextElement extends SketchElement {
  type: 'text';
  x: number;
  y: number;
  text: string;
  fontSize: number;
  fontFamily: string;
}
```

## Coordinate System

All coordinates are stored as percentages (0-100) for responsive positioning:
- `x: 50, y: 50` = center of canvas
- `width: 25` = 25% of canvas width
- This allows elements to scale properly when canvas dimensions change

## History System

The sketch store maintains undo/redo history:
- Max 50 history entries
- Deep clones element state
- Actions tracked: Add, Delete, Move, Clear all
- History is trimmed when exceeding max entries
