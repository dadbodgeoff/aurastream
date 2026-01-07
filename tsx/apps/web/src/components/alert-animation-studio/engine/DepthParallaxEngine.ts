/**
 * Enterprise Depth Parallax Engine
 *
 * Professional-grade 3D parallax system using depth maps.
 * Features:
 * - Multi-layer depth separation
 * - Smooth spring-based interpolation
 * - Mouse/gyroscope input handling
 * - GPU-accelerated rendering
 *
 * Note: Three.js integration is optional. Install with:
 * npm install three @types/three
 */

// ============================================================================
// Types
// ============================================================================

// Generic texture interface (compatible with Three.js Texture)
interface TextureLike {
  uuid: string;
}

// Generic matrix interface (compatible with Three.js Matrix4)
interface Matrix4Like {
  elements: number[];
  makeTranslation(x: number, y: number, z: number): Matrix4Like;
}

export interface DepthLayer {
  index: number;
  depthMin: number;
  depthMax: number;
  parallaxFactor: number;
  coveragePercent: number;
  label: string;
}

export interface DepthLayerData {
  layerCount: number;
  boundaries: number[];
  parallaxFactors: number[];
  layers: DepthLayer[];
  depthRange: {
    min: number;
    max: number;
    mean: number;
    std: number;
  };
}

export interface ParallaxConfig {
  intensity: number;
  smoothFactor: number;
  maxOffset: number;
  perspective: number;
  trigger: 'mouse' | 'gyro' | 'auto';
  invert: boolean;
}

export interface TiltConfig {
  maxAngleX: number;
  maxAngleY: number;
  perspective: number;
  scaleOnHover: number;
  smoothFactor: number;
}

export interface PopOutConfig {
  depthScale: number;
  trigger: 'on_enter' | 'always' | 'mouse';
  durationMs: number;
  easing: string;
}


// ============================================================================
// Spring Physics
// ============================================================================

interface SpringState {
  position: number;
  velocity: number;
}

class Spring {
  private state: SpringState = { position: 0, velocity: 0 };
  private target: number = 0;

  constructor(
    private stiffness: number = 180,
    private damping: number = 12,
    private mass: number = 1
  ) {}

  setTarget(target: number): void {
    this.target = target;
  }

  update(deltaTime: number): number {
    const dt = Math.min(deltaTime, 0.064); // Cap at ~15fps minimum

    // Spring force: F = -k * x
    const displacement = this.state.position - this.target;
    const springForce = -this.stiffness * displacement;

    // Damping force: F = -c * v
    const dampingForce = -this.damping * this.state.velocity;

    // Acceleration: a = F / m
    const acceleration = (springForce + dampingForce) / this.mass;

    // Update velocity and position (semi-implicit Euler)
    this.state.velocity += acceleration * dt;
    this.state.position += this.state.velocity * dt;

    return this.state.position;
  }

  getValue(): number {
    return this.state.position;
  }

  reset(value: number = 0): void {
    this.state.position = value;
    this.state.velocity = 0;
    this.target = value;
  }
}

// ============================================================================
// Easing Functions
// ============================================================================

export const Easing = {
  linear: (t: number): number => t,

  easeOutCubic: (t: number): number => 1 - Math.pow(1 - t, 3),

  easeInOutCubic: (t: number): number =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,

  easeOutElastic: (t: number): number => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0
      ? 0
      : t === 1
        ? 1
        : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },

  easeOutBack: (t: number): number => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },

  smoothStep: (t: number): number => t * t * (3 - 2 * t),

  smootherStep: (t: number): number => t * t * t * (t * (t * 6 - 15) + 10),
};

// ============================================================================
// Depth Parallax Engine
// ============================================================================

export class DepthParallaxEngine {
  private springX: Spring;
  private springY: Spring;
  private springZ: Spring;
  private springRotateX: Spring;
  private springRotateY: Spring;
  private springScale: Spring;

  private inputX: number = 0;
  private inputY: number = 0;
  private isHovering: boolean = false;

  private layerData: DepthLayerData | null = null;
  private depthTexture: TextureLike | null = null;

  constructor(
    private config: ParallaxConfig = {
      intensity: 0.5,
      smoothFactor: 0.1,
      maxOffset: 50,
      perspective: 1000,
      trigger: 'mouse',
      invert: false,
    }
  ) {
    // Initialize springs with designer-tuned values
    this.springX = new Spring(180, 12, 1);
    this.springY = new Spring(180, 12, 1);
    this.springZ = new Spring(120, 15, 1);
    this.springRotateX = new Spring(150, 14, 1);
    this.springRotateY = new Spring(150, 14, 1);
    this.springScale = new Spring(200, 16, 1);
    this.springScale.reset(1);
  }

  setLayerData(data: DepthLayerData): void {
    this.layerData = data;
  }

  setDepthTexture(texture: TextureLike): void {
    this.depthTexture = texture;
  }

  setInput(x: number, y: number): void {
    // Normalize to -1 to 1 range
    this.inputX = Math.max(-1, Math.min(1, x));
    this.inputY = Math.max(-1, Math.min(1, y));

    // Update spring targets
    const direction = this.config.invert ? -1 : 1;
    this.springX.setTarget(this.inputX * this.config.maxOffset * direction);
    this.springY.setTarget(this.inputY * this.config.maxOffset * direction);
  }

  setHovering(hovering: boolean): void {
    this.isHovering = hovering;
  }

  update(deltaTime: number): void {
    this.springX.update(deltaTime);
    this.springY.update(deltaTime);
    this.springZ.update(deltaTime);
    this.springRotateX.update(deltaTime);
    this.springRotateY.update(deltaTime);
    this.springScale.update(deltaTime);
  }

  /**
   * Calculate parallax offset for a specific depth layer
   */
  getLayerOffset(layerIndex: number): { x: number; y: number } {
    if (!this.layerData || layerIndex >= this.layerData.layers.length) {
      return { x: 0, y: 0 };
    }

    const layer = this.layerData.layers[layerIndex];
    const factor = layer.parallaxFactor * this.config.intensity;

    return {
      x: this.springX.getValue() * factor,
      y: this.springY.getValue() * factor,
    };
  }

  /**
   * Calculate parallax offset for a specific depth value (0-1)
   */
  getDepthOffset(depthValue: number): { x: number; y: number; z: number } {
    // Depth 0 = far (background), Depth 1 = near (foreground)
    // Foreground moves more, background moves less
    const factor = depthValue * this.config.intensity;

    return {
      x: this.springX.getValue() * factor,
      y: this.springY.getValue() * factor,
      z: depthValue * 20 * this.config.intensity, // Z offset for pop-out
    };
  }

  /**
   * Get 3D tilt transform values
   */
  getTiltTransform(tiltConfig: TiltConfig): {
    rotateX: number;
    rotateY: number;
    scale: number;
  } {
    // Update spring targets for tilt
    this.springRotateX.setTarget(-this.inputY * tiltConfig.maxAngleX);
    this.springRotateY.setTarget(this.inputX * tiltConfig.maxAngleY);

    // Scale on hover
    const hoverIntensity = Math.sqrt(
      this.inputX * this.inputX + this.inputY * this.inputY
    );
    const targetScale = this.isHovering
      ? 1 + (tiltConfig.scaleOnHover - 1) * hoverIntensity
      : 1;
    this.springScale.setTarget(targetScale);

    return {
      rotateX: this.springRotateX.getValue(),
      rotateY: this.springRotateY.getValue(),
      scale: this.springScale.getValue(),
    };
  }

  /**
   * Get pop-out transform for depth-based z-offset
   */
  getPopOutTransform(
    depthValue: number,
    popOutConfig: PopOutConfig
  ): { translateZ: number; scale: number } {
    const zOffset = depthValue * popOutConfig.depthScale * this.config.intensity;
    const scale = 1 + depthValue * 0.1 * this.config.intensity;

    return {
      translateZ: zOffset,
      scale,
    };
  }

  /**
   * Generate CSS transform string for an element
   */
  getCSSTransform(depthValue: number): string {
    const offset = this.getDepthOffset(depthValue);

    return `translate3d(${offset.x}px, ${offset.y}px, ${offset.z}px)`;
  }

  /**
   * Generate transform matrix for a mesh (Three.js compatible)
   */
  getThreeTransform(depthValue: number): Matrix4Like {
    const offset = this.getDepthOffset(depthValue);
    
    // Create identity matrix with translation
    const matrix: Matrix4Like = {
      elements: [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        offset.x / 100, offset.y / 100, offset.z / 100, 1
      ],
      makeTranslation(x: number, y: number, z: number) {
        this.elements[12] = x;
        this.elements[13] = y;
        this.elements[14] = z;
        return this;
      }
    };

    return matrix;

    return matrix;
  }

  reset(): void {
    this.springX.reset(0);
    this.springY.reset(0);
    this.springZ.reset(0);
    this.springRotateX.reset(0);
    this.springRotateY.reset(0);
    this.springScale.reset(1);
    this.inputX = 0;
    this.inputY = 0;
  }
}
