'use client';

import { useMemo, useCallback, useState, useEffect } from 'react';
import { useIntelStore } from '@/stores/intelStore';
import { useUpdateIntelPreferences } from '@aurastream/api-client';
import type { PanelType, PanelConfig, PanelSize } from '@aurastream/api-client';
import { PANEL_REGISTRY } from './panelRegistry';

// =============================================================================
// Types
// =============================================================================

interface PanelGridProps {
  children?: React.ReactNode;
}

type LayoutItem = {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  static?: boolean;
};

// =============================================================================
// Grid Configuration
// =============================================================================

const COLS = { lg: 4, md: 2, sm: 1, xs: 1 };
const BREAKPOINTS = { lg: 1200, md: 900, sm: 600, xs: 0 };
const ROW_HEIGHT = 100;
const MARGIN: [number, number] = [16, 16];

const SIZE_TO_GRID: Record<PanelSize, { w: number; h: number }> = {
  tiny: { w: 1, h: 1 },
  small: { w: 1, h: 2 },
  wide: { w: 2, h: 2 },
  large: { w: 2, h: 3 },
};

// =============================================================================
// Helper Functions
// =============================================================================

function panelConfigToLayout(panels: PanelConfig[]): LayoutItem[] {
  return panels.map((panel) => {
    const gridSize = SIZE_TO_GRID[panel.size] || SIZE_TO_GRID.small;
    return {
      i: panel.panelType,
      x: panel.position.x,
      y: panel.position.y,
      w: gridSize.w,
      h: gridSize.h,
      static: false,
    };
  });
}

function layoutToPanelConfig(layout: LayoutItem[], currentPanels: PanelConfig[]): PanelConfig[] {
  return layout.map((item) => {
    const existingPanel = currentPanels.find(p => p.panelType === item.i);
    const size = existingPanel?.size || 'small';
    return {
      panelType: item.i as PanelType,
      position: { x: item.x, y: item.y },
      size,
    };
  });
}

// =============================================================================
// Simple Grid Fallback (for SSR and loading state)
// =============================================================================

function SimpleGrid({ children }: { children?: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {children}
    </div>
  );
}

// =============================================================================
// Panel Grid Component
// =============================================================================

export function PanelGrid({ children }: PanelGridProps) {
  const dashboardLayout = useIntelStore(state => state.dashboardLayout);
  const updateLayout = useIntelStore(state => state.updateLayout);
  const setIsDragging = useIntelStore(state => state.setIsDragging);
  const setPendingLayoutUpdate = useIntelStore(state => state.setPendingLayoutUpdate);
  const updatePreferences = useUpdateIntelPreferences();
  const [isMobile, setIsMobile] = useState(false);
  const [GridComponent, setGridComponent] = useState<React.ComponentType<any> | null>(null);

  // Load react-grid-layout only on client side
  useEffect(() => {
    const loadGrid = async () => {
      try {
        const RGL = await import('react-grid-layout') as any;
        const Responsive = RGL.Responsive;
        const WidthProvider = RGL.WidthProvider;
        if (Responsive && WidthProvider) {
          setGridComponent(() => WidthProvider(Responsive));
        }
      } catch (err) {
        console.error('Failed to load react-grid-layout:', err);
      }
    };
    loadGrid();
  }, []);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const layouts = useMemo(() => {
    const baseLayout = panelConfigToLayout(dashboardLayout);
    return {
      lg: baseLayout,
      md: baseLayout.map(item => ({ ...item, w: Math.min(item.w, 2), x: item.x % 2 })),
      sm: baseLayout.map((item, idx) => ({ ...item, x: 0, y: idx * item.h, w: 1 })),
      xs: baseLayout.map((item, idx) => ({ ...item, x: 0, y: idx * item.h, w: 1 })),
    };
  }, [dashboardLayout]);

  const handleLayoutChange = useCallback((currentLayout: LayoutItem[], allLayouts: Record<string, LayoutItem[]>) => {
    const lgLayout = allLayouts.lg || currentLayout;
    const newPanelConfig = layoutToPanelConfig(lgLayout, dashboardLayout);
    if (JSON.stringify(newPanelConfig) !== JSON.stringify(dashboardLayout)) {
      updateLayout(newPanelConfig);
    }
  }, [dashboardLayout, updateLayout]);

  const handleDragStart = useCallback(() => setIsDragging(true), [setIsDragging]);

  const handleDragStop = useCallback(async (layout: LayoutItem[]) => {
    setIsDragging(false);
    const newPanelConfig = layoutToPanelConfig(layout, dashboardLayout);
    try {
      await updatePreferences.mutateAsync({ dashboardLayout: newPanelConfig });
      setPendingLayoutUpdate(false);
    } catch (error) {
      console.error('Failed to save layout:', error);
    }
  }, [dashboardLayout, updatePreferences, setPendingLayoutUpdate, setIsDragging]);

  // Use simple grid until react-grid-layout loads
  if (!GridComponent) {
    return <SimpleGrid>{children}</SimpleGrid>;
  }

  return (
    <div className="intel-grid-container w-full">
      <GridComponent
        className="layout"
        layouts={layouts}
        breakpoints={BREAKPOINTS}
        cols={COLS}
        rowHeight={ROW_HEIGHT}
        margin={MARGIN}
        containerPadding={[0, 0]}
        onLayoutChange={handleLayoutChange}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        isDraggable={!isMobile}
        isResizable={false}
        draggableHandle=".drag-handle"
        useCSSTransforms={true}
        compactType="vertical"
      >
        {children}
      </GridComponent>
    </div>
  );
}

export function PanelWrapper({ panelType, children }: { panelType: PanelType; children: React.ReactNode }) {
  if (!PANEL_REGISTRY[panelType]) return null;
  return <div key={panelType} className="h-full">{children}</div>;
}
