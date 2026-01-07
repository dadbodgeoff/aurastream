# 🎬 ANIMATION STUDIO V2 - MASTER SCHEMA
## Industry-Leading Animation Engine for Streamer Alerts

**Version:** 2.0.0  
**Status:** Planning Document  
**Author:** AuraStream Engineering  
**Last Updated:** January 2026

---

## EXECUTIVE SUMMARY

This document outlines the complete architecture for upgrading AuraStream's Alert Animation Studio from a professional-tier tool to an industry-leading platform. The upgrade consists of four major pillars:

1. **WebGL Particle Rendering** - GPU-accelerated particles (10,000+ at 60fps)
2. **Timeline Editor with Keyframes** - After Effects-style animation control
3. **Audio Reactivity** - Beat detection and frequency-driven animations
4. **OBS Integration & Export** - Self-contained HTML blob (100% fidelity, zero server dependency) + WebM/GIF/APNG for sharing

### Competitive Positioning

| Feature | StreamElements | Streamlabs | OWN3D | **AuraStream v2** |
|---------|---------------|------------|-------|-------------------|
| Custom Animations | ❌ Templates only | ❌ Templates only | ⚠️ Limited | ✅ Full control |
| Particle Effects | ⚠️ Basic CSS | ⚠️ Basic CSS | ⚠️ Basic | ✅ WebGL 10k+ |
| Keyframe Editor | ❌ | ❌ | ❌ | ✅ Full timeline |
| Audio Reactive | ⚠️ Basic | ⚠️ Basic | ❌ | ✅ FFT + Beat |
| Server Independence | ❌ | ❌ | ❌ | ✅ Self-contained |
| Video Export | ❌ | ❌ | ❌ | ✅ WebM/GIF/APNG |
| Depth/3D Effects | ❌ | ❌ | ❌ | ✅ Parallax |

**Target:** Cavalry/Rive-level capabilities at streamer-friendly pricing.

---

## SYSTEM ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ALERT ANIMATION STUDIO V2                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         UI LAYER                                      │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐     │  │
│  │  │  Canvas     │ │  Timeline   │ │   Audio     │ │   Export    │     │  │
│  │  │  Preview    │ │   Panel     │ │   Panel     │ │   Panel     │     │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘     │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      ENGINE LAYER                                     │  │
│  │                                                                       │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐     │  │
│  │  │   WebGL     │ │  Timeline   │ │   Audio     │ │   Lottie    │     │  │
│  │  │  Particles  │ │   Engine    │ │  Analyzer   │ │  Converter  │     │  │
│  │  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘     │  │
│  │         │               │               │               │            │  │
│  │         └───────────────┴───────────────┴───────────────┘            │  │
│  │                                │                                      │  │
│  │                 ┌──────────────▼──────────────┐                       │  │
│  │                 │   UNIFIED ANIMATION CONTEXT │                       │  │
│  │                 │                             │                       │  │
│  │                 │  • Time (ms, normalized)    │                       │  │
│  │                 │  • Keyframe values          │                       │  │
│  │                 │  • Audio FFT + beats        │                       │  │
│  │                 │  • Particle state           │                       │  │
│  │                 │  • Mouse/interaction        │                       │  │
│  │                 └──────────────┬──────────────┘                       │  │
│  │                                │                                      │  │
│  │                 ┌──────────────▼──────────────┐                       │  │
│  │                 │  EXISTING ANIMATION ENGINE  │                       │  │
│  │                 │                             │                       │  │
│  │                 │  entry/ loop/ depth/        │                       │  │
│  │                 │  particles/ presets/ core/  │                       │  │
│  │                 └─────────────────────────────┘                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## DIRECTORY STRUCTURE

```
tsx/apps/web/src/components/alert-animation-studio/
├── engine/
│   ├── animations/           # EXISTING - Entry, Loop, Depth, Particles, Presets
│   │   ├── core/
│   │   ├── entry/
│   │   ├── loop/
│   │   ├── depth/
│   │   ├── particles/
│   │   ├── presets/
│   │   └── index.ts
│   │
│   ├── webgl/                # NEW - WebGL Particle Rendering
│   │   ├── types.ts
│   │   ├── shaders/
│   │   │   ├── particle.vert
│   │   │   ├── particle.frag
│   │   │   └── index.ts
│   │   ├── buffers.ts
│   │   ├── textures.ts
│   │   ├── ParticleRenderer.ts
│   │   └── index.ts
│   │
│   ├── timeline/             # NEW - Timeline & Keyframes
│   │   ├── types.ts
│   │   ├── core/
│   │   │   ├── keyframe.ts
│   │   │   ├── track.ts
│   │   │   ├── timeline.ts
│   │   │   ├── interpolation.ts
│   │   │   └── index.ts
│   │   ├── hooks/
│   │   │   ├── useTimeline.ts
│   │   │   ├── usePlayback.ts
│   │   │   ├── useKeyframes.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   │
│   ├── audio/                # NEW - Audio Reactivity
│   │   ├── types.ts
│   │   ├── core/
│   │   │   ├── analyzer.ts
│   │   │   ├── fft.ts
│   │   │   ├── beatDetection.ts
│   │   │   ├── audioContext.ts
│   │   │   └── index.ts
│   │   ├── reactivity/
│   │   │   ├── types.ts
│   │   │   ├── mappings.ts
│   │   │   ├── triggers.ts
│   │   │   ├── smoothing.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   │
│   ├── export/               # NEW - Export Engines
│   │   ├── types.ts
│   │   ├── obs/
│   │   │   └── htmlBlobGenerator.ts  # Self-contained HTML blob
│   │   ├── video/
│   │   │   └── webmEncoder.ts
│   │   ├── gif/
│   │   │   └── gifEncoder.ts
│   │   ├── apng/
│   │   │   └── apngEncoder.ts
│   │   └── index.ts
│   │
│   └── context/              # NEW - Unified Animation Context
│       ├── types.ts
│       ├── AnimationContext.ts
│       └── index.ts
│
├── ui/                       # NEW - UI Components
│   ├── timeline/
│   │   ├── TimelinePanel.tsx
│   │   ├── Track.tsx
│   │   ├── Keyframe.tsx
│   │   ├── Playhead.tsx
│   │   ├── CurveEditor.tsx
│   │   ├── PropertyList.tsx
│   │   └── index.ts
│   ├── audio/
│   │   ├── AudioUploader.tsx
│   │   ├── WaveformDisplay.tsx
│   │   ├── FrequencyBands.tsx
│   │   ├── BeatMarkers.tsx
│   │   ├── ReactivityMapper.tsx
│   │   └── index.ts
│   └── export/
│       ├── ExportPanel.tsx
│       ├── LottiePreview.tsx
│       └── index.ts
│
├── AnimationCanvas.tsx       # EXISTING - Enhanced with WebGL
├── AnimationStudio.tsx       # EXISTING - Main container
└── index.ts
```

---

## PILLAR 1: WEBGL PARTICLE RENDERING

### 1.1 Overview

The current particle system uses CSS-based rendering, which is limited to ~100 particles before performance degrades. WebGL with instanced rendering can handle 10,000+ particles at 60fps by leveraging GPU parallelism.

### 1.2 Performance Comparison

| Renderer | Max Particles | CPU Usage | GPU Usage | Memory |
|----------|--------------|-----------|-----------|--------|
| CSS (current) | ~100 | High | Low | Low |
| WebGL Points | ~5,000 | Medium | Medium | Medium |
| WebGL Instanced | ~50,000 | Low | High | Medium |
| WebGL + Compute | ~1,000,000 | Very Low | Very High | High |

**Target:** WebGL Instanced rendering for 10,000+ particles.

### 1.3 Type Definitions

```typescript
// engine/webgl/types.ts

/**
 * Single particle instance data for GPU buffer.
 * Packed for efficient memory layout (48 bytes per particle).
 */
export interface ParticleGPUData {
  // Position (12 bytes)
  x: number;
  y: number;
  z: number;
  
  // Velocity (12 bytes)
  vx: number;
  vy: number;
  vz: number;
  
  // Color (16 bytes)
  r: number;
  g: number;
  b: number;
  a: number;
  
  // Properties (8 bytes)
  size: number;
  rotation: number;
  lifetime: number;      // 0-1 progress through life
  seed: number;          // For per-particle variation
}

/**
 * WebGL renderer configuration.
 */
export interface WebGLParticleConfig {
  maxParticles: number;           // Buffer size (default: 10000)
  blendMode: BlendMode;           // Additive, normal, multiply
  textureAtlas: string | null;    // Particle shape texture
  usePointSprites: boolean;       // true = GL_POINTS, false = instanced quads
  sortByDepth: boolean;           // For proper transparency
  gpuPhysics: boolean;            // Compute physics on GPU (WebGL2)
}

export type BlendMode = 'normal' | 'additive' | 'multiply' | 'screen';

/**
 * Uniform values passed to shaders each frame.
 */
export interface ParticleUniforms {
  uTime: number;
  uDeltaTime: number;
  uResolution: [number, number];
  uGravity: number;
  uWind: [number, number];
  uTurbulence: number;
  uGlobalOpacity: number;
}

/**
 * Texture atlas for particle shapes.
 */
export interface ParticleTextureAtlas {
  texture: WebGLTexture;
  regions: Map<ParticleShape, TextureRegion>;
}

export interface TextureRegion {
  u: number;      // UV coordinates
  v: number;
  width: number;
  height: number;
}

export type ParticleShape = 
  | 'circle' 
  | 'square' 
  | 'star' 
  | 'heart' 
  | 'sparkle' 
  | 'smoke' 
  | 'fire'
  | 'snow'
  | 'confetti';
```

### 1.4 Shader Implementation

```glsl
// engine/webgl/shaders/particle.vert

#version 300 es
precision highp float;

// Per-instance attributes (from buffer)
in vec3 aPosition;
in vec3 aVelocity;
in vec4 aColor;
in float aSize;
in float aRotation;
in float aLifetime;
in float aSeed;

// Uniforms (global per frame)
uniform float uTime;
uniform float uDeltaTime;
uniform vec2 uResolution;
uniform float uGravity;
uniform vec2 uWind;
uniform float uTurbulence;

// Output to fragment shader
out vec4 vColor;
out vec2 vUV;
out float vLifetime;

// Pseudo-random function
float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

// Simplex noise for turbulence
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = rand(i);
  float b = rand(i + vec2(1.0, 0.0));
  float c = rand(i + vec2(0.0, 1.0));
  float d = rand(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
  // Calculate elapsed time for this particle
  float t = uTime * (1.0 + aSeed * 0.2);
  
  // Apply physics
  vec3 pos = aPosition;
  
  // Gravity (downward acceleration)
  pos.y -= 0.5 * uGravity * t * t * 500.0;
  
  // Wind
  pos.xy += uWind * t * 100.0;
  
  // Turbulence (organic swirling)
  if (uTurbulence > 0.0) {
    float noiseX = noise(vec2(pos.x * 0.01 + t, pos.y * 0.01)) - 0.5;
    float noiseY = noise(vec2(pos.y * 0.01 + t, pos.x * 0.01)) - 0.5;
    pos.xy += vec2(noiseX, noiseY) * uTurbulence * 50.0;
  }
  
  // Velocity
  pos += aVelocity * t;
  
  // Convert to clip space
  vec2 clipPos = (pos.xy / uResolution) * 2.0 - 1.0;
  clipPos.y *= -1.0; // Flip Y for screen coordinates
  
  gl_Position = vec4(clipPos, 0.0, 1.0);
  
  // Size with lifetime fade
  float lifetimeFade = 1.0 - aLifetime;
  float sizeMultiplier = mix(1.0, 0.5, aLifetime); // Shrink as it dies
  gl_PointSize = aSize * sizeMultiplier * (uResolution.y / 512.0);
  
  // Color with lifetime fade
  vColor = aColor;
  vColor.a *= lifetimeFade * lifetimeFade; // Quadratic fade for smoother look
  
  vLifetime = aLifetime;
  
  // UV for texture sampling (rotated)
  float c = cos(aRotation);
  float s = sin(aRotation);
  vUV = mat2(c, -s, s, c) * (gl_PointCoord - 0.5) + 0.5;
}
```

```glsl
// engine/webgl/shaders/particle.frag

#version 300 es
precision highp float;

in vec4 vColor;
in vec2 vUV;
in float vLifetime;

uniform sampler2D uTexture;
uniform int uShapeType; // 0=circle, 1=square, 2=star, etc.

out vec4 fragColor;

// Signed distance functions for procedural shapes
float sdCircle(vec2 p, float r) {
  return length(p) - r;
}

float sdStar(vec2 p, float r, int n, float m) {
  float an = 3.141593 / float(n);
  float en = 3.141593 / m;
  vec2 acs = vec2(cos(an), sin(an));
  vec2 ecs = vec2(cos(en), sin(en));
  float bn = mod(atan(p.x, p.y), 2.0 * an) - an;
  p = length(p) * vec2(cos(bn), abs(sin(bn)));
  p -= r * acs;
  p += ecs * clamp(-dot(p, ecs), 0.0, r * acs.y / ecs.y);
  return length(p) * sign(p.x);
}

float sdHeart(vec2 p) {
  p.x = abs(p.x);
  if (p.y + p.x > 1.0)
    return sqrt(dot(p - vec2(0.25, 0.75), p - vec2(0.25, 0.75))) - sqrt(2.0) / 4.0;
  return sqrt(min(dot(p - vec2(0.0, 1.0), p - vec2(0.0, 1.0)),
                  dot(p - 0.5 * max(p.x + p.y, 0.0), p - 0.5 * max(p.x + p.y, 0.0)))) 
         * sign(p.x - p.y);
}

void main() {
  vec2 uv = vUV * 2.0 - 1.0; // Center UV
  float alpha = 1.0;
  
  if (uShapeType == 0) {
    // Circle with soft edge
    float d = sdCircle(uv, 0.8);
    alpha = 1.0 - smoothstep(-0.1, 0.1, d);
  } else if (uShapeType == 1) {
    // Square
    vec2 d = abs(uv) - vec2(0.7);
    alpha = 1.0 - smoothstep(-0.1, 0.1, max(d.x, d.y));
  } else if (uShapeType == 2) {
    // Star (5 points)
    float d = sdStar(uv, 0.5, 5, 2.5);
    alpha = 1.0 - smoothstep(-0.05, 0.05, d);
  } else if (uShapeType == 3) {
    // Heart
    float d = sdHeart(uv * 1.2);
    alpha = 1.0 - smoothstep(-0.05, 0.05, d);
  } else if (uShapeType == 4) {
    // Sparkle (4-point star with glow)
    float d = sdStar(uv, 0.4, 4, 4.0);
    alpha = 1.0 - smoothstep(-0.1, 0.2, d);
    // Add glow
    alpha += 0.3 * (1.0 - smoothstep(0.0, 0.5, length(uv)));
  } else {
    // Texture sample
    alpha = texture(uTexture, vUV).a;
  }
  
  fragColor = vec4(vColor.rgb, vColor.a * alpha);
  
  // Discard fully transparent pixels
  if (fragColor.a < 0.01) discard;
}
```


### 1.5 WebGL Particle Renderer Class

```typescript
// engine/webgl/ParticleRenderer.ts

import type { Particle } from '../animations/particles/types';
import type { 
  WebGLParticleConfig, 
  ParticleUniforms, 
  ParticleGPUData,
  ParticleShape 
} from './types';
import { compileShader, createProgram } from './shaders';
import vertexShaderSource from './shaders/particle.vert?raw';
import fragmentShaderSource from './shaders/particle.frag?raw';

/**
 * High-performance WebGL particle renderer using instanced rendering.
 * Capable of rendering 10,000+ particles at 60fps.
 */
export class WebGLParticleRenderer {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private instanceBuffer: WebGLBuffer;
  private uniformLocations: Map<string, WebGLUniformLocation>;
  
  private config: WebGLParticleConfig;
  private particleData: Float32Array;
  private particleCount: number = 0;
  
  // Attribute layout (must match shader)
  private static readonly FLOATS_PER_PARTICLE = 14;
  private static readonly BYTES_PER_PARTICLE = 14 * 4; // 56 bytes
  
  constructor(
    canvas: HTMLCanvasElement,
    config: Partial<WebGLParticleConfig> = {}
  ) {
    this.config = {
      maxParticles: 10000,
      blendMode: 'additive',
      textureAtlas: null,
      usePointSprites: true,
      sortByDepth: false,
      gpuPhysics: false,
      ...config,
    };
    
    // Get WebGL2 context
    const gl = canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: false,
      antialias: true,
    });
    
    if (!gl) {
      throw new Error('WebGL2 not supported');
    }
    
    this.gl = gl;
    this.initShaders();
    this.initBuffers();
    this.initBlending();
  }
  
  /**
   * Initialize shader program.
   */
  private initShaders(): void {
    const gl = this.gl;
    
    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    
    this.program = createProgram(gl, vertexShader, fragmentShader);
    
    // Cache uniform locations
    this.uniformLocations = new Map();
    const uniforms = [
      'uTime', 'uDeltaTime', 'uResolution', 
      'uGravity', 'uWind', 'uTurbulence',
      'uGlobalOpacity', 'uTexture', 'uShapeType'
    ];
    
    for (const name of uniforms) {
      const location = gl.getUniformLocation(this.program, name);
      if (location) {
        this.uniformLocations.set(name, location);
      }
    }
  }
  
  /**
   * Initialize vertex buffers and VAO.
   */
  private initBuffers(): void {
    const gl = this.gl;
    
    // Create VAO
    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    
    // Create instance buffer
    this.instanceBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    
    // Allocate buffer for max particles
    const bufferSize = this.config.maxParticles * WebGLParticleRenderer.BYTES_PER_PARTICLE;
    gl.bufferData(gl.ARRAY_BUFFER, bufferSize, gl.DYNAMIC_DRAW);
    
    // Pre-allocate CPU-side array
    this.particleData = new Float32Array(
      this.config.maxParticles * WebGLParticleRenderer.FLOATS_PER_PARTICLE
    );
    
    // Set up attribute pointers
    const stride = WebGLParticleRenderer.BYTES_PER_PARTICLE;
    
    // aPosition (vec3) - offset 0
    const posLoc = gl.getAttribLocation(this.program, 'aPosition');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, stride, 0);
    gl.vertexAttribDivisor(posLoc, 1); // Per-instance
    
    // aVelocity (vec3) - offset 12
    const velLoc = gl.getAttribLocation(this.program, 'aVelocity');
    gl.enableVertexAttribArray(velLoc);
    gl.vertexAttribPointer(velLoc, 3, gl.FLOAT, false, stride, 12);
    gl.vertexAttribDivisor(velLoc, 1);
    
    // aColor (vec4) - offset 24
    const colorLoc = gl.getAttribLocation(this.program, 'aColor');
    gl.enableVertexAttribArray(colorLoc);
    gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, stride, 24);
    gl.vertexAttribDivisor(colorLoc, 1);
    
    // aSize (float) - offset 40
    const sizeLoc = gl.getAttribLocation(this.program, 'aSize');
    gl.enableVertexAttribArray(sizeLoc);
    gl.vertexAttribPointer(sizeLoc, 1, gl.FLOAT, false, stride, 40);
    gl.vertexAttribDivisor(sizeLoc, 1);
    
    // aRotation (float) - offset 44
    const rotLoc = gl.getAttribLocation(this.program, 'aRotation');
    gl.enableVertexAttribArray(rotLoc);
    gl.vertexAttribPointer(rotLoc, 1, gl.FLOAT, false, stride, 44);
    gl.vertexAttribDivisor(rotLoc, 1);
    
    // aLifetime (float) - offset 48
    const lifeLoc = gl.getAttribLocation(this.program, 'aLifetime');
    gl.enableVertexAttribArray(lifeLoc);
    gl.vertexAttribPointer(lifeLoc, 1, gl.FLOAT, false, stride, 48);
    gl.vertexAttribDivisor(lifeLoc, 1);
    
    // aSeed (float) - offset 52
    const seedLoc = gl.getAttribLocation(this.program, 'aSeed');
    gl.enableVertexAttribArray(seedLoc);
    gl.vertexAttribPointer(seedLoc, 1, gl.FLOAT, false, stride, 52);
    gl.vertexAttribDivisor(seedLoc, 1);
    
    gl.bindVertexArray(null);
  }
  
  /**
   * Initialize blending mode.
   */
  private initBlending(): void {
    const gl = this.gl;
    
    gl.enable(gl.BLEND);
    
    switch (this.config.blendMode) {
      case 'additive':
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        break;
      case 'multiply':
        gl.blendFunc(gl.DST_COLOR, gl.ZERO);
        break;
      case 'screen':
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_COLOR);
        break;
      default:
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }
  }
  
  /**
   * Update particle data from CPU particle system.
   * This bridges the existing particle system with WebGL rendering.
   */
  update(particles: Particle[]): void {
    const count = Math.min(particles.length, this.config.maxParticles);
    this.particleCount = count;
    
    // Pack particle data into Float32Array
    for (let i = 0; i < count; i++) {
      const p = particles[i];
      const offset = i * WebGLParticleRenderer.FLOATS_PER_PARTICLE;
      
      // Position
      this.particleData[offset + 0] = p.x;
      this.particleData[offset + 1] = p.y;
      this.particleData[offset + 2] = 0; // z
      
      // Velocity
      this.particleData[offset + 3] = p.vx;
      this.particleData[offset + 4] = p.vy;
      this.particleData[offset + 5] = 0; // vz
      
      // Color (parse from hex or use default)
      const color = this.parseColor(p.color);
      this.particleData[offset + 6] = color.r;
      this.particleData[offset + 7] = color.g;
      this.particleData[offset + 8] = color.b;
      this.particleData[offset + 9] = p.opacity;
      
      // Properties
      this.particleData[offset + 10] = p.size;
      this.particleData[offset + 11] = p.rotation;
      this.particleData[offset + 12] = p.lifetime / p.maxLifetime;
      this.particleData[offset + 13] = p.id % 1000 / 1000; // Seed from ID
    }
    
    // Upload to GPU
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferSubData(
      gl.ARRAY_BUFFER, 
      0, 
      this.particleData.subarray(0, count * WebGLParticleRenderer.FLOATS_PER_PARTICLE)
    );
  }
  
  /**
   * Render particles.
   */
  render(uniforms: ParticleUniforms, shapeType: number = 0): void {
    if (this.particleCount === 0) return;
    
    const gl = this.gl;
    
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    
    // Set uniforms
    gl.uniform1f(this.uniformLocations.get('uTime')!, uniforms.uTime);
    gl.uniform1f(this.uniformLocations.get('uDeltaTime')!, uniforms.uDeltaTime);
    gl.uniform2fv(this.uniformLocations.get('uResolution')!, uniforms.uResolution);
    gl.uniform1f(this.uniformLocations.get('uGravity')!, uniforms.uGravity);
    gl.uniform2fv(this.uniformLocations.get('uWind')!, uniforms.uWind);
    gl.uniform1f(this.uniformLocations.get('uTurbulence')!, uniforms.uTurbulence);
    gl.uniform1f(this.uniformLocations.get('uGlobalOpacity')!, uniforms.uGlobalOpacity);
    gl.uniform1i(this.uniformLocations.get('uShapeType')!, shapeType);
    
    // Draw instanced points
    gl.drawArraysInstanced(gl.POINTS, 0, 1, this.particleCount);
    
    gl.bindVertexArray(null);
  }
  
  /**
   * Parse color string to RGB values (0-1).
   */
  private parseColor(color: string): { r: number; g: number; b: number } {
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      return {
        r: parseInt(hex.slice(0, 2), 16) / 255,
        g: parseInt(hex.slice(2, 4), 16) / 255,
        b: parseInt(hex.slice(4, 6), 16) / 255,
      };
    }
    
    if (color.startsWith('rgb')) {
      const match = color.match(/(\d+)/g);
      if (match && match.length >= 3) {
        return {
          r: parseInt(match[0]) / 255,
          g: parseInt(match[1]) / 255,
          b: parseInt(match[2]) / 255,
        };
      }
    }
    
    return { r: 1, g: 1, b: 1 };
  }
  
  /**
   * Resize renderer to match canvas.
   */
  resize(width: number, height: number): void {
    this.gl.viewport(0, 0, width, height);
  }
  
  /**
   * Clean up WebGL resources.
   */
  dispose(): void {
    const gl = this.gl;
    gl.deleteBuffer(this.instanceBuffer);
    gl.deleteVertexArray(this.vao);
    gl.deleteProgram(this.program);
  }
}
```

### 1.6 Integration with Existing Particle System

```typescript
// engine/webgl/index.ts

export { WebGLParticleRenderer } from './ParticleRenderer';
export * from './types';

/**
 * Factory function to create appropriate renderer based on capabilities.
 */
export function createParticleRenderer(
  canvas: HTMLCanvasElement,
  preferWebGL: boolean = true
): ParticleRendererInterface {
  if (preferWebGL && isWebGL2Supported()) {
    try {
      return new WebGLParticleRenderer(canvas);
    } catch (e) {
      console.warn('WebGL particle renderer failed, falling back to CSS:', e);
    }
  }
  
  // Fall back to CSS renderer
  return new CSSParticleRenderer(canvas);
}

function isWebGL2Supported(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!canvas.getContext('webgl2');
  } catch {
    return false;
  }
}

/**
 * Common interface for particle renderers.
 */
export interface ParticleRendererInterface {
  update(particles: Particle[]): void;
  render(uniforms: ParticleUniforms, shapeType?: number): void;
  resize(width: number, height: number): void;
  dispose(): void;
}
```

---

## PILLAR 2: TIMELINE EDITOR WITH KEYFRAMES

### 2.1 Overview

The timeline editor provides After Effects-style keyframe animation control. Users can:
- Add keyframes at any point in time
- Adjust values with bezier curve handles
- See visual representation of animation curves
- Scrub through the timeline
- Layer multiple property animations

### 2.2 Type Definitions

```typescript
// engine/timeline/types.ts

/**
 * A single keyframe on a property track.
 */
export interface Keyframe {
  id: string;
  time: number;                    // Milliseconds from start
  value: number;                   // The value at this keyframe
  easing: EasingName;              // Easing function TO this keyframe
  
  // Bezier curve handles for custom easing
  // Values are relative to keyframe position
  handleIn?: BezierHandle;         // Incoming tangent (from previous keyframe)
  handleOut?: BezierHandle;        // Outgoing tangent (to next keyframe)
  
  // Metadata
  selected?: boolean;
  locked?: boolean;
}

export interface BezierHandle {
  x: number;    // Time offset (0-1 normalized to segment)
  y: number;    // Value offset (can exceed 0-1 for overshoot)
}

/**
 * A track contains keyframes for a single animatable property.
 */
export interface Track {
  id: string;
  property: AnimatableProperty;
  keyframes: Keyframe[];
  
  // Track state
  visible: boolean;               // Show in timeline UI
  locked: boolean;                // Prevent editing
  solo: boolean;                  // Only this track affects output
  muted: boolean;                 // Exclude from output
  
  // Visual
  color: string;                  // Track color in UI
  expanded: boolean;              // Show curve editor
}

/**
 * All properties that can be animated via keyframes.
 */
export type AnimatableProperty =
  // Transform
  | 'scaleX' | 'scaleY' | 'scaleZ' | 'scaleUniform'
  | 'positionX' | 'positionY' | 'positionZ'
  | 'rotationX' | 'rotationY' | 'rotationZ'
  | 'anchorX' | 'anchorY'
  | 'opacity'
  // Effects
  | 'glowIntensity' | 'glowRadius' | 'glowColorH' | 'glowColorS' | 'glowColorL'
  | 'blurAmount'
  | 'rgbSplitAmount'
  // Depth
  | 'depthIntensity' | 'depthScale'
  // Particles
  | 'particleSpawnRate' | 'particleSpeed' | 'particleSize' | 'particleOpacity';

/**
 * Property metadata for UI and validation.
 */
export interface PropertyMeta {
  property: AnimatableProperty;
  displayName: string;
  category: 'transform' | 'effects' | 'depth' | 'particles';
  defaultValue: number;
  min: number;
  max: number;
  step: number;
  unit?: string;                  // '%', 'px', '°', etc.
}

export const PROPERTY_METADATA: Record<AnimatableProperty, PropertyMeta> = {
  scaleX: { property: 'scaleX', displayName: 'Scale X', category: 'transform', defaultValue: 1, min: 0, max: 5, step: 0.01, unit: 'x' },
  scaleY: { property: 'scaleY', displayName: 'Scale Y', category: 'transform', defaultValue: 1, min: 0, max: 5, step: 0.01, unit: 'x' },
  scaleZ: { property: 'scaleZ', displayName: 'Scale Z', category: 'transform', defaultValue: 1, min: 0, max: 5, step: 0.01, unit: 'x' },
  scaleUniform: { property: 'scaleUniform', displayName: 'Scale', category: 'transform', defaultValue: 1, min: 0, max: 5, step: 0.01, unit: 'x' },
  positionX: { property: 'positionX', displayName: 'Position X', category: 'transform', defaultValue: 0, min: -1, max: 1, step: 0.01 },
  positionY: { property: 'positionY', displayName: 'Position Y', category: 'transform', defaultValue: 0, min: -1, max: 1, step: 0.01 },
  positionZ: { property: 'positionZ', displayName: 'Position Z', category: 'transform', defaultValue: 0, min: -1, max: 1, step: 0.01 },
  rotationX: { property: 'rotationX', displayName: 'Rotation X', category: 'transform', defaultValue: 0, min: -360, max: 360, step: 1, unit: '°' },
  rotationY: { property: 'rotationY', displayName: 'Rotation Y', category: 'transform', defaultValue: 0, min: -360, max: 360, step: 1, unit: '°' },
  rotationZ: { property: 'rotationZ', displayName: 'Rotation Z', category: 'transform', defaultValue: 0, min: -360, max: 360, step: 1, unit: '°' },
  anchorX: { property: 'anchorX', displayName: 'Anchor X', category: 'transform', defaultValue: 0.5, min: 0, max: 1, step: 0.01 },
  anchorY: { property: 'anchorY', displayName: 'Anchor Y', category: 'transform', defaultValue: 0.5, min: 0, max: 1, step: 0.01 },
  opacity: { property: 'opacity', displayName: 'Opacity', category: 'transform', defaultValue: 1, min: 0, max: 1, step: 0.01, unit: '%' },
  glowIntensity: { property: 'glowIntensity', displayName: 'Glow Intensity', category: 'effects', defaultValue: 0, min: 0, max: 1, step: 0.01 },
  glowRadius: { property: 'glowRadius', displayName: 'Glow Radius', category: 'effects', defaultValue: 10, min: 0, max: 100, step: 1, unit: 'px' },
  glowColorH: { property: 'glowColorH', displayName: 'Glow Hue', category: 'effects', defaultValue: 0, min: 0, max: 360, step: 1, unit: '°' },
  glowColorS: { property: 'glowColorS', displayName: 'Glow Saturation', category: 'effects', defaultValue: 1, min: 0, max: 1, step: 0.01 },
  glowColorL: { property: 'glowColorL', displayName: 'Glow Lightness', category: 'effects', defaultValue: 0.5, min: 0, max: 1, step: 0.01 },
  blurAmount: { property: 'blurAmount', displayName: 'Blur', category: 'effects', defaultValue: 0, min: 0, max: 50, step: 0.5, unit: 'px' },
  rgbSplitAmount: { property: 'rgbSplitAmount', displayName: 'RGB Split', category: 'effects', defaultValue: 0, min: 0, max: 20, step: 0.5, unit: 'px' },
  depthIntensity: { property: 'depthIntensity', displayName: 'Depth Intensity', category: 'depth', defaultValue: 0.5, min: 0, max: 1, step: 0.01 },
  depthScale: { property: 'depthScale', displayName: 'Depth Scale', category: 'depth', defaultValue: 30, min: 0, max: 100, step: 1 },
  particleSpawnRate: { property: 'particleSpawnRate', displayName: 'Spawn Rate', category: 'particles', defaultValue: 10, min: 0, max: 100, step: 1, unit: '/s' },
  particleSpeed: { property: 'particleSpeed', displayName: 'Particle Speed', category: 'particles', defaultValue: 1, min: 0, max: 5, step: 0.1, unit: 'x' },
  particleSize: { property: 'particleSize', displayName: 'Particle Size', category: 'particles', defaultValue: 1, min: 0.1, max: 5, step: 0.1, unit: 'x' },
  particleOpacity: { property: 'particleOpacity', displayName: 'Particle Opacity', category: 'particles', defaultValue: 1, min: 0, max: 1, step: 0.01 },
};

/**
 * Complete timeline state.
 */
export interface Timeline {
  id: string;
  name: string;
  duration: number;               // Total duration in ms
  tracks: Track[];
  fps: number;                    // Frame rate for snapping
  loop: boolean;
  
  // Audio sync (optional)
  audioTrack?: AudioTrackInfo;
  
  // Markers
  markers: TimelineMarker[];
}

export interface AudioTrackInfo {
  url: string;
  waveform: Float32Array;         // For visualization
  duration: number;               // Audio duration in ms
  bpm?: number;                   // Detected or manual BPM
  beats?: number[];               // Beat timestamps in ms
}

export interface TimelineMarker {
  id: string;
  time: number;
  label: string;
  color: string;
}

/**
 * Timeline UI state (separate from data).
 */
export interface TimelineUIState {
  currentTime: number;            // Playhead position in ms
  isPlaying: boolean;
  playbackSpeed: number;          // 0.25, 0.5, 1, 2, etc.
  
  // Selection
  selectedKeyframes: Set<string>;
  selectedTracks: Set<string>;
  
  // View
  zoom: number;                   // Pixels per second
  scrollX: number;                // Horizontal scroll
  scrollY: number;                // Vertical scroll (for many tracks)
  
  // Editing
  isDragging: boolean;
  dragType: 'keyframe' | 'handle' | 'playhead' | 'selection' | null;
  dragStartPos: { x: number; y: number } | null;
  
  // Snapping
  snapToFrames: boolean;
  snapToKeyframes: boolean;
  snapToMarkers: boolean;
  snapToBeats: boolean;
}
```


### 2.3 Keyframe Interpolation Engine

```typescript
// engine/timeline/core/interpolation.ts

import type { Keyframe, Track, BezierHandle } from '../types';
import { getEasing } from '../../animations/core/easing';

/**
 * Evaluate a cubic bezier curve at parameter t.
 * Used for custom easing curves between keyframes.
 */
export function cubicBezier(
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  t: number
): number {
  const t2 = t * t;
  const t3 = t2 * t;
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  
  return mt3 * p0 + 3 * mt2 * t * p1 + 3 * mt * t2 * p2 + t3 * p3;
}

/**
 * Solve cubic bezier for x to find t, then evaluate y.
 * This is how CSS cubic-bezier() works.
 */
export function solveCubicBezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x: number,
  epsilon: number = 0.0001
): number {
  // Newton-Raphson iteration to find t for given x
  let t = x;
  
  for (let i = 0; i < 8; i++) {
    const currentX = cubicBezier(0, x1, x2, 1, t);
    const error = currentX - x;
    
    if (Math.abs(error) < epsilon) break;
    
    // Derivative of bezier x component
    const dx = 3 * (1 - t) * (1 - t) * x1 + 
               6 * (1 - t) * t * (x2 - x1) + 
               3 * t * t * (1 - x2);
    
    if (Math.abs(dx) < epsilon) break;
    
    t -= error / dx;
    t = Math.max(0, Math.min(1, t));
  }
  
  // Evaluate y at found t
  return cubicBezier(0, y1, y2, 1, t);
}

/**
 * Interpolate between two keyframes.
 */
export function interpolateKeyframes(
  prevKey: Keyframe,
  nextKey: Keyframe,
  currentTime: number
): number {
  // Normalize time to 0-1 between keyframes
  const duration = nextKey.time - prevKey.time;
  if (duration <= 0) return nextKey.value;
  
  const t = (currentTime - prevKey.time) / duration;
  const clampedT = Math.max(0, Math.min(1, t));
  
  // If both keyframes have bezier handles, use cubic bezier
  if (prevKey.handleOut && nextKey.handleIn) {
    const easedT = solveCubicBezier(
      prevKey.handleOut.x,
      prevKey.handleOut.y,
      1 - nextKey.handleIn.x,
      1 - nextKey.handleIn.y,
      clampedT
    );
    
    return lerp(prevKey.value, nextKey.value, easedT);
  }
  
  // Otherwise use standard easing function
  const easingFn = getEasing(nextKey.easing);
  const easedT = easingFn(clampedT);
  
  return lerp(prevKey.value, nextKey.value, easedT);
}

/**
 * Linear interpolation.
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Find the keyframe before the given time.
 */
export function findPreviousKeyframe(
  keyframes: Keyframe[],
  time: number
): Keyframe | null {
  let result: Keyframe | null = null;
  
  for (const kf of keyframes) {
    if (kf.time <= time) {
      if (!result || kf.time > result.time) {
        result = kf;
      }
    }
  }
  
  return result;
}

/**
 * Find the keyframe after the given time.
 */
export function findNextKeyframe(
  keyframes: Keyframe[],
  time: number
): Keyframe | null {
  let result: Keyframe | null = null;
  
  for (const kf of keyframes) {
    if (kf.time > time) {
      if (!result || kf.time < result.time) {
        result = kf;
      }
    }
  }
  
  return result;
}

/**
 * Evaluate a track at a given time.
 */
export function evaluateTrack(track: Track, time: number): number {
  const { keyframes } = track;
  
  // No keyframes - return default
  if (keyframes.length === 0) {
    return PROPERTY_METADATA[track.property]?.defaultValue ?? 0;
  }
  
  // Single keyframe - return its value
  if (keyframes.length === 1) {
    return keyframes[0].value;
  }
  
  // Sort keyframes by time (should already be sorted, but ensure)
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);
  
  // Before first keyframe
  if (time <= sorted[0].time) {
    return sorted[0].value;
  }
  
  // After last keyframe
  if (time >= sorted[sorted.length - 1].time) {
    return sorted[sorted.length - 1].value;
  }
  
  // Find surrounding keyframes
  const prevKey = findPreviousKeyframe(sorted, time);
  const nextKey = findNextKeyframe(sorted, time);
  
  if (!prevKey || !nextKey) {
    return sorted[0].value;
  }
  
  return interpolateKeyframes(prevKey, nextKey, time);
}

/**
 * Evaluate all tracks at a given time.
 * Returns partial AnimationTransform with only the animated properties.
 */
export function evaluateTimeline(
  tracks: Track[],
  time: number
): Record<string, number> {
  const result: Record<string, number> = {};
  
  for (const track of tracks) {
    // Skip muted or invisible tracks
    if (track.muted || !track.visible) continue;
    
    result[track.property] = evaluateTrack(track, time);
  }
  
  return result;
}

/**
 * Convert timeline values to AnimationTransform.
 * Handles special cases like rotation (degrees to radians).
 */
export function timelineToTransform(
  values: Record<string, number>
): Partial<AnimationTransform> {
  const transform: Partial<AnimationTransform> = {};
  
  for (const [key, value] of Object.entries(values)) {
    switch (key) {
      // Rotation: convert degrees to radians
      case 'rotationX':
      case 'rotationY':
      case 'rotationZ':
        transform[key] = value * (Math.PI / 180);
        break;
      
      // Uniform scale: apply to all axes
      case 'scaleUniform':
        transform.scaleX = value;
        transform.scaleY = value;
        transform.scaleZ = value;
        break;
      
      // Direct mapping
      default:
        (transform as any)[key] = value;
    }
  }
  
  return transform;
}
```

### 2.4 Timeline State Management

```typescript
// engine/timeline/core/timeline.ts

import type { Timeline, Track, Keyframe, TimelineUIState } from '../types';
import { nanoid } from 'nanoid';

/**
 * Create a new empty timeline.
 */
export function createTimeline(
  name: string = 'Untitled',
  duration: number = 3000
): Timeline {
  return {
    id: nanoid(),
    name,
    duration,
    tracks: [],
    fps: 30,
    loop: true,
    markers: [],
  };
}

/**
 * Create a new track for a property.
 */
export function createTrack(property: AnimatableProperty): Track {
  const meta = PROPERTY_METADATA[property];
  
  return {
    id: nanoid(),
    property,
    keyframes: [],
    visible: true,
    locked: false,
    solo: false,
    muted: false,
    color: getTrackColor(meta.category),
    expanded: false,
  };
}

/**
 * Create a new keyframe.
 */
export function createKeyframe(
  time: number,
  value: number,
  easing: EasingName = 'power2.out'
): Keyframe {
  return {
    id: nanoid(),
    time,
    value,
    easing,
    selected: false,
    locked: false,
  };
}

/**
 * Add a keyframe to a track.
 * If a keyframe exists at the same time, update it instead.
 */
export function addKeyframe(
  track: Track,
  time: number,
  value: number,
  easing?: EasingName
): Track {
  const existingIndex = track.keyframes.findIndex(kf => kf.time === time);
  
  if (existingIndex >= 0) {
    // Update existing keyframe
    const updated = [...track.keyframes];
    updated[existingIndex] = {
      ...updated[existingIndex],
      value,
      easing: easing ?? updated[existingIndex].easing,
    };
    return { ...track, keyframes: updated };
  }
  
  // Add new keyframe
  const newKeyframe = createKeyframe(time, value, easing);
  const keyframes = [...track.keyframes, newKeyframe].sort((a, b) => a.time - b.time);
  
  return { ...track, keyframes };
}

/**
 * Remove a keyframe from a track.
 */
export function removeKeyframe(track: Track, keyframeId: string): Track {
  return {
    ...track,
    keyframes: track.keyframes.filter(kf => kf.id !== keyframeId),
  };
}

/**
 * Move a keyframe to a new time.
 */
export function moveKeyframe(
  track: Track,
  keyframeId: string,
  newTime: number
): Track {
  const keyframes = track.keyframes.map(kf =>
    kf.id === keyframeId ? { ...kf, time: Math.max(0, newTime) } : kf
  ).sort((a, b) => a.time - b.time);
  
  return { ...track, keyframes };
}

/**
 * Update keyframe value.
 */
export function updateKeyframeValue(
  track: Track,
  keyframeId: string,
  value: number
): Track {
  const keyframes = track.keyframes.map(kf =>
    kf.id === keyframeId ? { ...kf, value } : kf
  );
  
  return { ...track, keyframes };
}

/**
 * Update keyframe bezier handles.
 */
export function updateKeyframeHandles(
  track: Track,
  keyframeId: string,
  handleIn?: BezierHandle,
  handleOut?: BezierHandle
): Track {
  const keyframes = track.keyframes.map(kf =>
    kf.id === keyframeId
      ? { ...kf, handleIn: handleIn ?? kf.handleIn, handleOut: handleOut ?? kf.handleOut }
      : kf
  );
  
  return { ...track, keyframes };
}

/**
 * Add a track to the timeline.
 */
export function addTrack(timeline: Timeline, property: AnimatableProperty): Timeline {
  // Check if track already exists
  if (timeline.tracks.some(t => t.property === property)) {
    return timeline;
  }
  
  const track = createTrack(property);
  return { ...timeline, tracks: [...timeline.tracks, track] };
}

/**
 * Remove a track from the timeline.
 */
export function removeTrack(timeline: Timeline, trackId: string): Timeline {
  return {
    ...timeline,
    tracks: timeline.tracks.filter(t => t.id !== trackId),
  };
}

/**
 * Snap time to nearest frame.
 */
export function snapToFrame(time: number, fps: number): number {
  const frameMs = 1000 / fps;
  return Math.round(time / frameMs) * frameMs;
}

/**
 * Snap time to nearest keyframe within threshold.
 */
export function snapToKeyframe(
  time: number,
  tracks: Track[],
  threshold: number = 50
): number {
  let closest = time;
  let minDistance = threshold;
  
  for (const track of tracks) {
    for (const kf of track.keyframes) {
      const distance = Math.abs(kf.time - time);
      if (distance < minDistance) {
        minDistance = distance;
        closest = kf.time;
      }
    }
  }
  
  return closest;
}

/**
 * Get color for track based on category.
 */
function getTrackColor(category: string): string {
  switch (category) {
    case 'transform': return '#3b82f6'; // Blue
    case 'effects': return '#8b5cf6';   // Purple
    case 'depth': return '#06b6d4';     // Cyan
    case 'particles': return '#f59e0b'; // Amber
    default: return '#6b7280';          // Gray
  }
}

/**
 * Create default UI state.
 */
export function createTimelineUIState(): TimelineUIState {
  return {
    currentTime: 0,
    isPlaying: false,
    playbackSpeed: 1,
    selectedKeyframes: new Set(),
    selectedTracks: new Set(),
    zoom: 100,  // 100 pixels per second
    scrollX: 0,
    scrollY: 0,
    isDragging: false,
    dragType: null,
    dragStartPos: null,
    snapToFrames: true,
    snapToKeyframes: true,
    snapToMarkers: true,
    snapToBeats: true,
  };
}
```

### 2.5 Timeline React Hook

```typescript
// engine/timeline/hooks/useTimeline.ts

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Timeline, Track, Keyframe, TimelineUIState, AnimatableProperty } from '../types';
import {
  createTimeline,
  createTimelineUIState,
  addTrack,
  removeTrack,
  addKeyframe,
  removeKeyframe,
  moveKeyframe,
  updateKeyframeValue,
  updateKeyframeHandles,
  snapToFrame,
  snapToKeyframe,
} from '../core/timeline';
import { evaluateTimeline, timelineToTransform } from '../core/interpolation';

export interface UseTimelineReturn {
  // State
  timeline: Timeline;
  uiState: TimelineUIState;
  currentValues: Record<string, number>;
  
  // Playback
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  
  // Track operations
  addTrack: (property: AnimatableProperty) => void;
  removeTrack: (trackId: string) => void;
  toggleTrackVisibility: (trackId: string) => void;
  toggleTrackLock: (trackId: string) => void;
  toggleTrackMute: (trackId: string) => void;
  
  // Keyframe operations
  addKeyframe: (trackId: string, time: number, value: number) => void;
  removeKeyframe: (trackId: string, keyframeId: string) => void;
  moveKeyframe: (trackId: string, keyframeId: string, newTime: number) => void;
  updateKeyframeValue: (trackId: string, keyframeId: string, value: number) => void;
  updateKeyframeHandles: (trackId: string, keyframeId: string, handleIn?: BezierHandle, handleOut?: BezierHandle) => void;
  
  // Selection
  selectKeyframe: (keyframeId: string, addToSelection?: boolean) => void;
  selectTrack: (trackId: string, addToSelection?: boolean) => void;
  clearSelection: () => void;
  deleteSelected: () => void;
  
  // View
  setZoom: (zoom: number) => void;
  setScroll: (x: number, y: number) => void;
  
  // Snapping
  toggleSnapToFrames: () => void;
  toggleSnapToKeyframes: () => void;
  toggleSnapToBeats: () => void;
  
  // Timeline
  setDuration: (duration: number) => void;
  setFps: (fps: number) => void;
  setLoop: (loop: boolean) => void;
}

export function useTimeline(
  initialTimeline?: Timeline,
  onTimeUpdate?: (time: number) => void
): UseTimelineReturn {
  const [timeline, setTimeline] = useState<Timeline>(
    initialTimeline ?? createTimeline()
  );
  const [uiState, setUIState] = useState<TimelineUIState>(createTimelineUIState());
  
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  
  // Calculate current values based on playhead position
  const currentValues = evaluateTimeline(timeline.tracks, uiState.currentTime);
  
  // Animation loop for playback
  useEffect(() => {
    if (!uiState.isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }
    
    lastFrameTimeRef.current = performance.now();
    
    const animate = (timestamp: number) => {
      const deltaMs = (timestamp - lastFrameTimeRef.current) * uiState.playbackSpeed;
      lastFrameTimeRef.current = timestamp;
      
      setUIState(prev => {
        let newTime = prev.currentTime + deltaMs;
        
        // Handle looping
        if (newTime >= timeline.duration) {
          newTime = timeline.loop ? newTime % timeline.duration : timeline.duration;
          
          if (!timeline.loop) {
            return { ...prev, currentTime: newTime, isPlaying: false };
          }
        }
        
        onTimeUpdate?.(newTime);
        return { ...prev, currentTime: newTime };
      });
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [uiState.isPlaying, uiState.playbackSpeed, timeline.duration, timeline.loop, onTimeUpdate]);
  
  // Playback controls
  const play = useCallback(() => {
    setUIState(prev => ({ ...prev, isPlaying: true }));
  }, []);
  
  const pause = useCallback(() => {
    setUIState(prev => ({ ...prev, isPlaying: false }));
  }, []);
  
  const stop = useCallback(() => {
    setUIState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }));
    onTimeUpdate?.(0);
  }, [onTimeUpdate]);
  
  const seek = useCallback((time: number) => {
    const clampedTime = Math.max(0, Math.min(timeline.duration, time));
    setUIState(prev => ({ ...prev, currentTime: clampedTime }));
    onTimeUpdate?.(clampedTime);
  }, [timeline.duration, onTimeUpdate]);
  
  const setPlaybackSpeed = useCallback((speed: number) => {
    setUIState(prev => ({ ...prev, playbackSpeed: speed }));
  }, []);
  
  // Track operations
  const handleAddTrack = useCallback((property: AnimatableProperty) => {
    setTimeline(prev => addTrack(prev, property));
  }, []);
  
  const handleRemoveTrack = useCallback((trackId: string) => {
    setTimeline(prev => removeTrack(prev, trackId));
  }, []);
  
  // ... (additional methods would follow the same pattern)
  
  return {
    timeline,
    uiState,
    currentValues,
    play,
    pause,
    stop,
    seek,
    setPlaybackSpeed,
    addTrack: handleAddTrack,
    removeTrack: handleRemoveTrack,
    // ... rest of the interface
  } as UseTimelineReturn;
}
```


---

## PILLAR 3: AUDIO REACTIVITY

### 3.1 Overview

Audio reactivity allows animations to respond to music in real-time. This includes:
- **Frequency bands**: Bass, mids, highs driving different properties
- **Beat detection**: Trigger animations on kicks, snares, etc.
- **BPM sync**: Align animation timing to music tempo
- **Waveform visualization**: Show audio in timeline

### 3.2 Type Definitions

```typescript
// engine/audio/types.ts

/**
 * Frequency band definitions.
 * Based on standard audio engineering ranges.
 */
export interface FrequencyBand {
  name: FrequencyBandName;
  minHz: number;
  maxHz: number;
  
  // Real-time values (updated each frame)
  value: number;          // Current normalized value (0-1)
  peak: number;           // Recent peak for visualization
  average: number;        // Rolling average for smoothing
}

export type FrequencyBandName =
  | 'sub'         // 20-60 Hz (sub bass, felt more than heard)
  | 'bass'        // 60-250 Hz (kick drums, bass guitar)
  | 'lowMid'      // 250-500 Hz (warmth, body)
  | 'mid'         // 500-2000 Hz (vocals, snare)
  | 'highMid'     // 2000-4000 Hz (presence, clarity)
  | 'high'        // 4000-8000 Hz (brilliance, cymbals)
  | 'brilliance'; // 8000-20000 Hz (air, sparkle)

export const FREQUENCY_BANDS: Omit<FrequencyBand, 'value' | 'peak' | 'average'>[] = [
  { name: 'sub',        minHz: 20,    maxHz: 60 },
  { name: 'bass',       minHz: 60,    maxHz: 250 },
  { name: 'lowMid',     minHz: 250,   maxHz: 500 },
  { name: 'mid',        minHz: 500,   maxHz: 2000 },
  { name: 'highMid',    minHz: 2000,  maxHz: 4000 },
  { name: 'high',       minHz: 4000,  maxHz: 8000 },
  { name: 'brilliance', minHz: 8000,  maxHz: 20000 },
];

/**
 * Detected beat information.
 */
export interface BeatInfo {
  time: number;           // Timestamp in ms
  strength: number;       // Beat intensity (0-1)
  type: BeatType;         // Classification
  confidence: number;     // Detection confidence (0-1)
}

export type BeatType = 'kick' | 'snare' | 'hihat' | 'other';

/**
 * Complete audio analysis state.
 */
export interface AudioAnalysis {
  // Raw data
  fft: Float32Array;              // Raw FFT frequency data
  waveform: Float32Array;         // Time-domain waveform
  
  // Processed data
  bands: FrequencyBand[];         // Frequency band values
  energy: number;                 // Overall energy (0-1)
  spectralCentroid: number;       // "Brightness" (0-1)
  spectralFlux: number;           // Rate of change
  
  // Beat detection
  beats: BeatInfo[];              // All detected beats
  currentBeatIndex: number;       // Index of current/last beat
  timeSinceLastBeat: number;      // Ms since last beat
  bpm: number;                    // Estimated BPM
  beatPhase: number;              // 0-1 position within beat cycle
  
  // Metadata
  isPlaying: boolean;
  currentTime: number;            // Audio playback position
  duration: number;               // Total audio duration
}

/**
 * Audio source configuration.
 */
export interface AudioSourceConfig {
  type: 'file' | 'microphone' | 'stream';
  url?: string;                   // For file type
  streamId?: string;              // For stream type (e.g., Twitch audio)
}

/**
 * Audio analyzer configuration.
 */
export interface AudioAnalyzerConfig {
  fftSize: 2048 | 4096 | 8192;    // FFT resolution
  smoothingTimeConstant: number;  // 0-1, higher = smoother
  minDecibels: number;            // Minimum dB threshold
  maxDecibels: number;            // Maximum dB threshold
  
  // Beat detection
  beatSensitivity: number;        // 0-1, higher = more sensitive
  beatDecay: number;              // How fast beat response decays
  
  // Band processing
  bandSmoothing: number;          // 0-1, smoothing for frequency bands
  peakDecay: number;              // How fast peaks decay
}

export const DEFAULT_ANALYZER_CONFIG: AudioAnalyzerConfig = {
  fftSize: 2048,
  smoothingTimeConstant: 0.8,
  minDecibels: -90,
  maxDecibels: -10,
  beatSensitivity: 0.7,
  beatDecay: 0.95,
  bandSmoothing: 0.3,
  peakDecay: 0.98,
};

/**
 * Mapping from audio source to animation property.
 */
export interface AudioReactiveMapping {
  id: string;
  enabled: boolean;
  
  // Source
  source: AudioSource;
  
  // Target
  target: AnimatableProperty;
  
  // Value mapping
  inputMin: number;               // Source value that maps to outputMin
  inputMax: number;               // Source value that maps to outputMax
  outputMin: number;              // Target value at inputMin
  outputMax: number;              // Target value at inputMax
  
  // Behavior
  smoothing: number;              // 0-1, response smoothing
  triggerMode: TriggerMode;
  threshold?: number;             // For threshold trigger
  
  // Modifiers
  invert: boolean;                // Flip the mapping
  clamp: boolean;                 // Clamp output to min/max
}

export type AudioSource =
  | { type: 'band'; band: FrequencyBandName }
  | { type: 'energy' }
  | { type: 'beat'; beatType?: BeatType }
  | { type: 'beatPhase' }
  | { type: 'bpm' }
  | { type: 'spectralCentroid' }
  | { type: 'spectralFlux' };

export type TriggerMode =
  | 'continuous'      // Always apply mapping
  | 'onBeat'          // Only apply on beat
  | 'onThreshold'     // Only apply when source exceeds threshold
  | 'onRise'          // Only apply when source is rising
  | 'onFall';         // Only apply when source is falling
```

### 3.3 Audio Analyzer Implementation

```typescript
// engine/audio/core/analyzer.ts

import type { 
  AudioAnalysis, 
  AudioAnalyzerConfig, 
  FrequencyBand,
  BeatInfo,
  FrequencyBandName 
} from '../types';
import { FREQUENCY_BANDS, DEFAULT_ANALYZER_CONFIG } from '../types';
import { BeatDetector } from './beatDetection';

/**
 * Real-time audio analyzer using Web Audio API.
 */
export class AudioAnalyzer {
  private audioContext: AudioContext;
  private analyzerNode: AnalyserNode;
  private sourceNode: AudioBufferSourceNode | MediaElementAudioSourceNode | null = null;
  
  private fftData: Float32Array;
  private waveformData: Float32Array;
  private bands: FrequencyBand[];
  private beatDetector: BeatDetector;
  
  private config: AudioAnalyzerConfig;
  private isInitialized: boolean = false;
  
  // State
  private lastEnergy: number = 0;
  private beats: BeatInfo[] = [];
  private lastBeatTime: number = 0;
  private bpmHistory: number[] = [];
  
  constructor(config: Partial<AudioAnalyzerConfig> = {}) {
    this.config = { ...DEFAULT_ANALYZER_CONFIG, ...config };
    
    // Initialize Web Audio
    this.audioContext = new AudioContext();
    this.analyzerNode = this.audioContext.createAnalyser();
    this.analyzerNode.fftSize = this.config.fftSize;
    this.analyzerNode.smoothingTimeConstant = this.config.smoothingTimeConstant;
    this.analyzerNode.minDecibels = this.config.minDecibels;
    this.analyzerNode.maxDecibels = this.config.maxDecibels;
    
    // Initialize data arrays
    const bufferLength = this.analyzerNode.frequencyBinCount;
    this.fftData = new Float32Array(bufferLength);
    this.waveformData = new Float32Array(bufferLength);
    
    // Initialize frequency bands
    this.bands = FREQUENCY_BANDS.map(band => ({
      ...band,
      value: 0,
      peak: 0,
      average: 0,
    }));
    
    // Initialize beat detector
    this.beatDetector = new BeatDetector(
      this.audioContext.sampleRate,
      this.config.fftSize,
      this.config.beatSensitivity
    );
    
    this.isInitialized = true;
  }
  
  /**
   * Connect an audio file for analysis.
   */
  async connectFile(url: string): Promise<HTMLAudioElement> {
    const audio = new Audio(url);
    audio.crossOrigin = 'anonymous';
    
    await new Promise<void>((resolve, reject) => {
      audio.oncanplaythrough = () => resolve();
      audio.onerror = () => reject(new Error('Failed to load audio'));
    });
    
    this.sourceNode = this.audioContext.createMediaElementSource(audio);
    this.sourceNode.connect(this.analyzerNode);
    this.analyzerNode.connect(this.audioContext.destination);
    
    return audio;
  }
  
  /**
   * Connect microphone for live analysis.
   */
  async connectMicrophone(): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = this.audioContext.createMediaStreamSource(stream);
    source.connect(this.analyzerNode);
    // Don't connect to destination (would cause feedback)
  }
  
  /**
   * Analyze current audio frame.
   * Call this every animation frame.
   */
  analyze(): AudioAnalysis {
    // Get raw FFT data
    this.analyzerNode.getFloatFrequencyData(this.fftData);
    this.analyzerNode.getFloatTimeDomainData(this.waveformData);
    
    // Process frequency bands
    this.processBands();
    
    // Calculate overall energy
    const energy = this.calculateEnergy();
    
    // Calculate spectral centroid (brightness)
    const spectralCentroid = this.calculateSpectralCentroid();
    
    // Calculate spectral flux (rate of change)
    const spectralFlux = Math.abs(energy - this.lastEnergy);
    this.lastEnergy = energy;
    
    // Detect beats
    const beat = this.beatDetector.detect(this.fftData);
    if (beat) {
      this.beats.push(beat);
      this.updateBPM(beat.time);
      this.lastBeatTime = beat.time;
    }
    
    // Calculate beat phase (0-1 position in beat cycle)
    const beatPhase = this.calculateBeatPhase();
    
    return {
      fft: this.fftData,
      waveform: this.waveformData,
      bands: this.bands,
      energy,
      spectralCentroid,
      spectralFlux,
      beats: this.beats,
      currentBeatIndex: this.beats.length - 1,
      timeSinceLastBeat: performance.now() - this.lastBeatTime,
      bpm: this.getAverageBPM(),
      beatPhase,
      isPlaying: this.audioContext.state === 'running',
      currentTime: this.audioContext.currentTime * 1000,
      duration: 0, // Set by caller if known
    };
  }
  
  /**
   * Process FFT data into frequency bands.
   */
  private processBands(): void {
    const binSize = this.audioContext.sampleRate / this.config.fftSize;
    
    for (const band of this.bands) {
      const startBin = Math.floor(band.minHz / binSize);
      const endBin = Math.min(
        Math.floor(band.maxHz / binSize),
        this.fftData.length - 1
      );
      
      // Calculate average energy in band
      let sum = 0;
      let count = 0;
      
      for (let i = startBin; i <= endBin; i++) {
        // Convert from dB to linear (0-1)
        const db = this.fftData[i];
        const linear = Math.pow(10, db / 20);
        sum += linear;
        count++;
      }
      
      const rawValue = count > 0 ? sum / count : 0;
      
      // Apply smoothing
      band.value = band.value * this.config.bandSmoothing + 
                   rawValue * (1 - this.config.bandSmoothing);
      
      // Update peak with decay
      band.peak = Math.max(band.value, band.peak * this.config.peakDecay);
      
      // Update rolling average
      band.average = band.average * 0.99 + band.value * 0.01;
    }
  }
  
  /**
   * Calculate overall energy (RMS of waveform).
   */
  private calculateEnergy(): number {
    let sum = 0;
    for (let i = 0; i < this.waveformData.length; i++) {
      sum += this.waveformData[i] * this.waveformData[i];
    }
    return Math.sqrt(sum / this.waveformData.length);
  }
  
  /**
   * Calculate spectral centroid (perceived brightness).
   */
  private calculateSpectralCentroid(): number {
    const binSize = this.audioContext.sampleRate / this.config.fftSize;
    let weightedSum = 0;
    let totalMagnitude = 0;
    
    for (let i = 0; i < this.fftData.length; i++) {
      const magnitude = Math.pow(10, this.fftData[i] / 20);
      const frequency = i * binSize;
      weightedSum += frequency * magnitude;
      totalMagnitude += magnitude;
    }
    
    if (totalMagnitude === 0) return 0;
    
    const centroid = weightedSum / totalMagnitude;
    // Normalize to 0-1 (assuming max frequency of 20kHz)
    return Math.min(centroid / 20000, 1);
  }
  
  /**
   * Calculate beat phase (0-1 position in beat cycle).
   */
  private calculateBeatPhase(): number {
    const bpm = this.getAverageBPM();
    if (bpm === 0) return 0;
    
    const beatDuration = 60000 / bpm; // ms per beat
    const timeSinceBeat = performance.now() - this.lastBeatTime;
    
    return (timeSinceBeat % beatDuration) / beatDuration;
  }
  
  /**
   * Update BPM estimate from beat timing.
   */
  private updateBPM(beatTime: number): void {
    if (this.beats.length < 2) return;
    
    const prevBeat = this.beats[this.beats.length - 2];
    const interval = beatTime - prevBeat.time;
    
    if (interval > 200 && interval < 2000) { // Reasonable BPM range
      const bpm = 60000 / interval;
      this.bpmHistory.push(bpm);
      
      // Keep last 8 intervals
      if (this.bpmHistory.length > 8) {
        this.bpmHistory.shift();
      }
    }
  }
  
  /**
   * Get average BPM from history.
   */
  private getAverageBPM(): number {
    if (this.bpmHistory.length === 0) return 0;
    
    const sum = this.bpmHistory.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.bpmHistory.length);
  }
  
  /**
   * Get a specific frequency band value.
   */
  getBand(name: FrequencyBandName): FrequencyBand | undefined {
    return this.bands.find(b => b.name === name);
  }
  
  /**
   * Resume audio context (required after user interaction).
   */
  async resume(): Promise<void> {
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }
  
  /**
   * Clean up resources.
   */
  dispose(): void {
    this.sourceNode?.disconnect();
    this.analyzerNode.disconnect();
    this.audioContext.close();
  }
}
```

### 3.4 Beat Detection

```typescript
// engine/audio/core/beatDetection.ts

import type { BeatInfo, BeatType } from '../types';

/**
 * Beat detector using onset detection with energy flux.
 * 
 * Algorithm:
 * 1. Calculate energy in bass frequencies (where beats live)
 * 2. Compare to recent average energy
 * 3. If current energy exceeds threshold, it's a beat
 * 4. Classify beat type based on frequency content
 */
export class BeatDetector {
  private energyHistory: number[] = [];
  private readonly historySize: number;
  private readonly sensitivity: number;
  private lastBeatTime: number = 0;
  private readonly minBeatInterval: number = 150; // ms (max ~400 BPM)
  
  constructor(
    private sampleRate: number,
    private fftSize: number,
    sensitivity: number = 0.7
  ) {
    // History size for ~1 second of audio
    this.historySize = Math.ceil(sampleRate / fftSize);
    this.sensitivity = 1 + (1 - sensitivity); // Convert to threshold multiplier
  }
  
  /**
   * Process FFT frame and detect if this is a beat.
   */
  detect(fftData: Float32Array): BeatInfo | null {
    const now = performance.now();
    
    // Enforce minimum beat interval
    if (now - this.lastBeatTime < this.minBeatInterval) {
      return null;
    }
    
    // Calculate energy in bass frequencies (60-250 Hz)
    const bassEnergy = this.calculateBandEnergy(fftData, 60, 250);
    
    // Add to history
    this.energyHistory.push(bassEnergy);
    if (this.energyHistory.length > this.historySize) {
      this.energyHistory.shift();
    }
    
    // Need enough history for comparison
    if (this.energyHistory.length < this.historySize / 2) {
      return null;
    }
    
    // Calculate statistics
    const average = this.calculateAverage();
    const variance = this.calculateVariance(average);
    const stdDev = Math.sqrt(variance);
    
    // Dynamic threshold based on variance
    const threshold = average + this.sensitivity * stdDev;
    
    // Beat detected if energy exceeds threshold significantly
    if (bassEnergy > threshold && bassEnergy > average * 1.3) {
      this.lastBeatTime = now;
      
      return {
        time: now,
        strength: Math.min((bassEnergy - average) / (average + 0.001), 1),
        type: this.classifyBeat(fftData),
        confidence: this.calculateConfidence(bassEnergy, average, stdDev),
      };
    }
    
    return null;
  }
  
  /**
   * Calculate energy in a frequency band.
   */
  private calculateBandEnergy(
    fftData: Float32Array,
    minHz: number,
    maxHz: number
  ): number {
    const binSize = this.sampleRate / this.fftSize;
    const startBin = Math.floor(minHz / binSize);
    const endBin = Math.min(Math.floor(maxHz / binSize), fftData.length - 1);
    
    let energy = 0;
    for (let i = startBin; i <= endBin; i++) {
      // Convert from dB to linear
      const linear = Math.pow(10, fftData[i] / 20);
      energy += linear * linear;
    }
    
    return Math.sqrt(energy / (endBin - startBin + 1));
  }
  
  /**
   * Calculate average of energy history.
   */
  private calculateAverage(): number {
    if (this.energyHistory.length === 0) return 0;
    return this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;
  }
  
  /**
   * Calculate variance of energy history.
   */
  private calculateVariance(average: number): number {
    if (this.energyHistory.length === 0) return 0;
    return this.energyHistory.reduce(
      (sum, e) => sum + Math.pow(e - average, 2),
      0
    ) / this.energyHistory.length;
  }
  
  /**
   * Classify beat type based on frequency content.
   */
  private classifyBeat(fftData: Float32Array): BeatType {
    const subBass = this.calculateBandEnergy(fftData, 20, 60);
    const bass = this.calculateBandEnergy(fftData, 60, 150);
    const lowMid = this.calculateBandEnergy(fftData, 150, 500);
    const mid = this.calculateBandEnergy(fftData, 500, 2000);
    const high = this.calculateBandEnergy(fftData, 4000, 12000);
    
    // Kick: strong sub-bass and bass, weak mids
    if (subBass + bass > (lowMid + mid) * 1.5) {
      return 'kick';
    }
    
    // Snare: strong low-mid and mid
    if (lowMid + mid > bass * 1.2 && lowMid + mid > high * 1.5) {
      return 'snare';
    }
    
    // Hi-hat: strong highs
    if (high > bass * 1.5 && high > mid) {
      return 'hihat';
    }
    
    return 'other';
  }
  
  /**
   * Calculate detection confidence.
   */
  private calculateConfidence(
    energy: number,
    average: number,
    stdDev: number
  ): number {
    if (stdDev === 0) return 0.5;
    
    // Z-score indicates how many standard deviations above average
    const zScore = (energy - average) / stdDev;
    
    // Convert to 0-1 confidence (sigmoid-like)
    return Math.min(zScore / 4, 1);
  }
  
  /**
   * Reset detector state.
   */
  reset(): void {
    this.energyHistory = [];
    this.lastBeatTime = 0;
  }
}
```


### 3.5 Audio Reactivity Mappings

```typescript
// engine/audio/reactivity/mappings.ts

import type { 
  AudioAnalysis, 
  AudioReactiveMapping, 
  AudioSource,
  FrequencyBandName 
} from '../types';
import type { AnimationTransform } from '../../animations/core/types';

/**
 * Get value from audio source.
 */
export function getAudioSourceValue(
  audio: AudioAnalysis,
  source: AudioSource
): number {
  switch (source.type) {
    case 'band':
      const band = audio.bands.find(b => b.name === source.band);
      return band?.value ?? 0;
    
    case 'energy':
      return audio.energy;
    
    case 'beat':
      // Return 1 if within 100ms of a beat, 0 otherwise
      if (audio.timeSinceLastBeat < 100) {
        if (source.beatType) {
          const lastBeat = audio.beats[audio.currentBeatIndex];
          return lastBeat?.type === source.beatType ? 1 : 0;
        }
        return 1;
      }
      return 0;
    
    case 'beatPhase':
      return audio.beatPhase;
    
    case 'bpm':
      // Normalize BPM to 0-1 (assuming 60-180 BPM range)
      return Math.max(0, Math.min(1, (audio.bpm - 60) / 120));
    
    case 'spectralCentroid':
      return audio.spectralCentroid;
    
    case 'spectralFlux':
      return Math.min(audio.spectralFlux * 10, 1); // Scale up for visibility
    
    default:
      return 0;
  }
}

/**
 * Map a value from input range to output range.
 */
export function mapValue(
  value: number,
  inputMin: number,
  inputMax: number,
  outputMin: number,
  outputMax: number,
  clamp: boolean = true
): number {
  // Normalize to 0-1
  let normalized = (value - inputMin) / (inputMax - inputMin);
  
  if (clamp) {
    normalized = Math.max(0, Math.min(1, normalized));
  }
  
  // Map to output range
  return outputMin + normalized * (outputMax - outputMin);
}

/**
 * Smooth a value towards a target.
 */
export function smoothValue(
  current: number,
  target: number,
  smoothing: number
): number {
  return current + (target - current) * (1 - smoothing);
}

// State for tracking previous values (for rise/fall detection)
const previousValues = new Map<string, number>();

/**
 * Apply audio reactivity mappings to animation transform.
 */
export function applyAudioReactivity(
  transform: AnimationTransform,
  audio: AudioAnalysis,
  mappings: AudioReactiveMapping[]
): AnimationTransform {
  const result = { ...transform };
  
  for (const mapping of mappings) {
    if (!mapping.enabled) continue;
    
    // Get source value
    const sourceValue = getAudioSourceValue(audio, mapping.source);
    
    // Check trigger mode
    if (!shouldTrigger(mapping, sourceValue, audio)) {
      continue;
    }
    
    // Map value
    let mappedValue = mapValue(
      sourceValue,
      mapping.inputMin,
      mapping.inputMax,
      mapping.outputMin,
      mapping.outputMax,
      mapping.clamp
    );
    
    // Apply inversion
    if (mapping.invert) {
      mappedValue = mapping.outputMax - (mappedValue - mapping.outputMin);
    }
    
    // Get current value for smoothing
    const currentValue = (result as any)[mapping.target] ?? 0;
    
    // Apply smoothing
    const smoothedValue = smoothValue(currentValue, mappedValue, mapping.smoothing);
    
    // Set result
    (result as any)[mapping.target] = smoothedValue;
    
    // Store for rise/fall detection
    previousValues.set(mapping.id, sourceValue);
  }
  
  return result;
}

/**
 * Check if mapping should trigger based on mode.
 */
function shouldTrigger(
  mapping: AudioReactiveMapping,
  sourceValue: number,
  audio: AudioAnalysis
): boolean {
  switch (mapping.triggerMode) {
    case 'continuous':
      return true;
    
    case 'onBeat':
      return audio.timeSinceLastBeat < 50;
    
    case 'onThreshold':
      return sourceValue > (mapping.threshold ?? 0.5);
    
    case 'onRise':
      const prevRise = previousValues.get(mapping.id) ?? 0;
      return sourceValue > prevRise;
    
    case 'onFall':
      const prevFall = previousValues.get(mapping.id) ?? 0;
      return sourceValue < prevFall;
    
    default:
      return true;
  }
}

/**
 * Create a default mapping for common use cases.
 */
export function createDefaultMapping(
  source: AudioSource,
  target: AnimatableProperty
): AudioReactiveMapping {
  return {
    id: `${source.type}-${target}`,
    enabled: true,
    source,
    target,
    inputMin: 0,
    inputMax: 1,
    outputMin: getPropertyDefault(target),
    outputMax: getPropertyMax(target),
    smoothing: 0.3,
    triggerMode: 'continuous',
    invert: false,
    clamp: true,
  };
}

/**
 * Preset mappings for common audio-reactive effects.
 */
export const AUDIO_REACTIVE_PRESETS = {
  // Bass drives scale
  bassScale: createDefaultMapping(
    { type: 'band', band: 'bass' },
    'scaleUniform'
  ),
  
  // Kick triggers burst
  kickBurst: {
    ...createDefaultMapping({ type: 'beat', beatType: 'kick' }, 'scaleUniform'),
    outputMin: 1,
    outputMax: 1.3,
    smoothing: 0.1,
    triggerMode: 'onBeat' as const,
  },
  
  // Energy drives glow
  energyGlow: createDefaultMapping(
    { type: 'energy' },
    'glowIntensity'
  ),
  
  // High frequencies drive particle speed
  highsParticles: createDefaultMapping(
    { type: 'band', band: 'high' },
    'particleSpeed'
  ),
  
  // Beat phase drives rotation
  beatRotation: {
    ...createDefaultMapping({ type: 'beatPhase' }, 'rotationZ'),
    outputMin: 0,
    outputMax: 360,
    smoothing: 0,
  },
  
  // Spectral centroid drives color
  brightnessColor: createDefaultMapping(
    { type: 'spectralCentroid' },
    'glowColorH'
  ),
};
```


---

## PILLAR 4: OBS INTEGRATION & EXPORT STRATEGY

### 4.1 Architecture Overview

The primary use case is **live streaming alerts in OBS**. The architecture prioritizes:
- **Zero dependency on AuraStream servers** for rendering (your servers down ≠ their stream broken)
- **Full WebGL fidelity** (10,000+ particles, shaders, audio reactivity)
- **Simple setup** (copy HTML, paste into OBS, done)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SELF-CONTAINED ALERT ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │  TWITCH/YOUTUBE │───►│ AURASTREAM      │───►│ OBS HTML BLOB   │         │
│  │  (Event source) │    │ RELAY           │    │ (Self-contained)│         │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘         │
│                         (Lightweight proxy)    (Full WebGL engine)          │
│                                                                             │
│  IF RELAY DIES:         Blob keeps running,   Animation ready,             │
│  Events stop            just no new triggers  waits for next trigger       │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SELF-CONTAINED (in HTML blob):          HOSTED (on CDN):                  │
│  ├── WebGL engine (~100KB minified)      ├── Source image                  │
│  ├── Animation config (JSON)             ├── Depth map (optional)          │
│  ├── Reconnect/retry logic               └── Audio files (optional)        │
│  └── Test trigger button                                                    │
│                                                                             │
│  WHY CDN FOR ASSETS:                                                        │
│  • Base64 images bloat HTML by 33%                                          │
│  • CDN has 99.99% uptime (CloudFront/Cloudflare)                           │
│  • OBS caches images after first load                                       │
│  • User can update image without re-exporting HTML                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Failure Scenarios

| Scenario | What Happens |
|----------|--------------|
| AuraStream app servers down | Alerts still work (engine is embedded) |
| Bad code update pushed | Doesn't affect existing HTML blobs |
| CDN down (rare) | OBS uses cached images until restart |
| Trigger relay down | Alerts don't fire, but no crash/error |
| User offline | Animation renders, just no triggers |
| Twitch API down | No triggers (not our problem) |

### 4.3 Self-Contained HTML Blob Generator

```typescript
// engine/export/obs/htmlBlobGenerator.ts

export interface AlertBlobConfig {
  alertId: string;
  alertName: string;
  
  // Animation config (baked in)
  animation: AnimationConfig;
  
  // CDN URLs for assets
  cdnBaseUrl: string;
  sourceImagePath: string;
  depthMapPath?: string;
  
  // Trigger relay
  relayUrl: string;
  
  // Dimensions
  width: number;
  height: number;
}

/**
 * Generate a self-contained HTML blob for OBS.
 * 
 * The blob contains:
 * - Full WebGL engine (minified)
 * - Animation configuration
 * - Auto-reconnect logic for trigger relay
 * - Manual test trigger button
 * 
 * Assets (images) are loaded from CDN, not embedded.
 */
export function generateOBSHtmlBlob(config: AlertBlobConfig): string {
  return `<!DOCTYPE html>
<!--
  ═══════════════════════════════════════════════════════════════════════════
  AURASTREAM ALERT: ${config.alertName}
  Alert ID: ${config.alertId}
  Generated: ${new Date().toISOString()}
  
  This file is self-contained. Paste it into OBS as a Browser Source.
  ═══════════════════════════════════════════════════════════════════════════
-->
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      background: transparent; 
      overflow: hidden;
      width: ${config.width}px;
      height: ${config.height}px;
    }
    #alert-canvas { 
      width: 100%; 
      height: 100%; 
    }
    #status {
      position: fixed;
      bottom: 4px;
      right: 4px;
      font: 10px monospace;
      color: rgba(255,255,255,0.3);
      pointer-events: none;
    }
    #status.disconnected { color: rgba(255,100,100,0.5); }
  </style>
</head>
<body>
  <canvas id="alert-canvas"></canvas>
  <div id="status">●</div>
  
  <script>
    // ═══════════════════════════════════════════════════════════════════════
    // CONFIGURATION (Baked at export time)
    // ═══════════════════════════════════════════════════════════════════════
    const CONFIG = ${JSON.stringify({
      alertId: config.alertId,
      cdnBaseUrl: config.cdnBaseUrl,
      sourceImage: config.sourceImagePath,
      depthMap: config.depthMapPath,
      relayUrl: config.relayUrl,
      width: config.width,
      height: config.height,
      animation: config.animation,
    }, null, 2)};
    
    // ═══════════════════════════════════════════════════════════════════════
    // AURASTREAM WEBGL ENGINE (Minified)
    // Version: 2.0.0
    // ═══════════════════════════════════════════════════════════════════════
    ${getMinifiedEngineCode()}
    
    // ═══════════════════════════════════════════════════════════════════════
    // TRIGGER RELAY CONNECTION
    // ═══════════════════════════════════════════════════════════════════════
    let relay = null;
    let reconnectAttempts = 0;
    const maxReconnectDelay = 30000; // Max 30s between retries
    
    function connectRelay() {
      const status = document.getElementById('status');
      
      try {
        relay = new EventSource(CONFIG.relayUrl + '/alerts/' + CONFIG.alertId + '/stream');
        
        relay.onopen = () => {
          status.textContent = '●';
          status.className = '';
          reconnectAttempts = 0;
          console.log('[AuraStream] Connected to trigger relay');
        };
        
        relay.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('[AuraStream] Trigger received:', data.type);
            window.auraEngine.trigger(data);
          } catch (e) {
            console.error('[AuraStream] Invalid trigger data:', e);
          }
        };
        
        relay.onerror = () => {
          status.textContent = '○';
          status.className = 'disconnected';
          relay.close();
          
          // Exponential backoff with jitter
          reconnectAttempts++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts) + Math.random() * 1000, maxReconnectDelay);
          console.log('[AuraStream] Relay disconnected, retrying in ' + Math.round(delay/1000) + 's...');
          setTimeout(connectRelay, delay);
        };
      } catch (e) {
        console.error('[AuraStream] Failed to connect:', e);
        setTimeout(connectRelay, 5000);
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════════
    async function init() {
      const canvas = document.getElementById('alert-canvas');
      
      // Initialize WebGL engine
      window.auraEngine = new AuraStreamEngine(canvas, CONFIG);
      
      // Load assets from CDN
      await window.auraEngine.loadAssets({
        source: CONFIG.cdnBaseUrl + '/' + CONFIG.sourceImage,
        depth: CONFIG.depthMap ? CONFIG.cdnBaseUrl + '/' + CONFIG.depthMap : null,
      });
      
      // Connect to trigger relay
      connectRelay();
      
      // Start render loop
      window.auraEngine.start();
      
      console.log('[AuraStream] Alert ready: ' + CONFIG.alertId);
    }
    
    // Manual test trigger (always works, even offline)
    window.testAlert = (type = 'subscription') => {
      window.auraEngine.trigger({ 
        type, 
        data: { 
          username: 'TestUser',
          amount: 5,
          message: 'Test alert!'
        }
      });
    };
    
    // Start when DOM ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  </script>
</body>
</html>`;
}

/**
 * Get the minified WebGL engine code.
 * In production, this would be the bundled/minified output.
 */
function getMinifiedEngineCode(): string {
  // This is a placeholder - actual implementation would:
  // 1. Bundle the engine with esbuild/rollup
  // 2. Minify with terser
  // 3. Return as string literal
  return `/* AuraStream Engine v2.0.0 - Minified */
class AuraStreamEngine {
  constructor(canvas, config) {
    this.canvas = canvas;
    this.config = config;
    this.gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: false });
    // ... full engine implementation
  }
  
  async loadAssets(urls) { /* ... */ }
  start() { /* ... */ }
  trigger(event) { /* ... */ }
  dispose() { /* ... */ }
}`;
}
```

### 4.4 Trigger Relay Service

The relay is a lightweight service that forwards Twitch/YouTube events to connected HTML blobs.

```typescript
// backend/services/alert_relay_service.py (conceptual)

/**
 * Lightweight SSE relay for alert triggers.
 * 
 * Architecture:
 * - Stateless (easy to scale horizontally)
 * - Just forwards events (no complex logic)
 * - If it dies, alerts just don't fire (graceful degradation)
 */

// Endpoint: GET /alerts/{alert_id}/stream
// Returns: SSE stream of trigger events

// Event format:
interface TriggerEvent {
  type: 'subscription' | 'donation' | 'raid' | 'follow' | 'bits' | 'test';
  data: {
    username: string;
    amount?: number;
    message?: string;
    tier?: string;
    // ... platform-specific fields
  };
  timestamp: string;
}
```

### 4.5 CDN Asset Structure

```
cdn.aurastream.io/
├── alerts/
│   └── {alert_id}/
│       ├── source.png          # Main alert image
│       ├── source@2x.png       # Retina version (optional)
│       ├── depth.png           # Depth map (optional)
│       └── audio/              # Audio files (optional)
│           ├── alert.mp3
│           └── alert.ogg
└── engine/
    └── v2.0.0/
        └── engine.min.js       # Fallback if not embedded
```

### 4.6 Export Panel UI

```typescript
// ui/export/ExportPanel.tsx

import React, { useState } from 'react';
import { generateOBSHtmlBlob } from '../../engine/export/obs/htmlBlobGenerator';

type ExportFormat = 'obs' | 'webm' | 'gif' | 'apng';

export function ExportPanel({ alertId, config, sourceImage }: ExportPanelProps) {
  const [format, setFormat] = useState<ExportFormat>('obs');
  const [copied, setCopied] = useState(false);
  
  const formatInfo: Record<ExportFormat, FormatInfo> = {
    obs: {
      name: 'OBS Browser Source',
      fidelity: '100%',
      description: 'Self-contained HTML. Full WebGL, audio reactive. Recommended.',
      icon: '🎬',
    },
    webm: {
      name: 'WebM Video',
      fidelity: '100%',
      description: 'Full quality video with alpha. For Discord, Twitter, etc.',
      icon: '🎥',
    },
    gif: {
      name: 'GIF',
      fidelity: '90%',
      description: 'Universal compatibility. 256 colors, no true alpha.',
      icon: '🖼️',
    },
    apng: {
      name: 'APNG',
      fidelity: '95%',
      description: 'High quality stickers. Full alpha, better than GIF.',
      icon: '🎞️',
    },
  };
  
  const handleOBSExport = async () => {
    const html = generateOBSHtmlBlob({
      alertId,
      alertName: config.name,
      animation: config,
      cdnBaseUrl: 'https://cdn.aurastream.io/alerts',
      sourceImagePath: `${alertId}/source.png`,
      depthMapPath: config.depthEffect ? `${alertId}/depth.png` : undefined,
      relayUrl: 'https://relay.aurastream.io',
      width: 512,
      height: 512,
    });
    
    await navigator.clipboard.writeText(html);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };
  
  return (
    <div className="export-panel">
      <h3>Export Alert</h3>
      
      {/* Format selector */}
      <div className="format-grid">
        {(Object.entries(formatInfo) as [ExportFormat, FormatInfo][]).map(([key, info]) => (
          <button
            key={key}
            className={`format-option ${format === key ? 'selected' : ''}`}
            onClick={() => setFormat(key)}
          >
            <span className="format-icon">{info.icon}</span>
            <span className="format-name">{info.name}</span>
            <span className="format-fidelity">{info.fidelity}</span>
          </button>
        ))}
      </div>
      
      <p className="format-description">{formatInfo[format].description}</p>
      
      {/* OBS-specific UI */}
      {format === 'obs' && (
        <div className="obs-export">
          <button onClick={handleOBSExport} className="export-button primary">
            {copied ? '✓ Copied to Clipboard!' : 'Copy HTML for OBS'}
          </button>
          
          <div className="obs-instructions">
            <h4>Setup Instructions:</h4>
            <ol>
              <li>Click "Copy HTML for OBS" above</li>
              <li>In OBS, add a new <strong>Browser Source</strong></li>
              <li>Check "Local file" and paste the HTML</li>
              <li>Set width/height to 512x512 (or your alert size)</li>
              <li>Click OK - your alert is ready!</li>
            </ol>
            
            <p className="obs-note">
              <strong>Note:</strong> The alert will automatically connect to receive 
              triggers. Use <code>testAlert()</code> in browser console to test.
            </p>
          </div>
        </div>
      )}
      
      {/* Video export UI */}
      {format !== 'obs' && (
        <VideoExportUI format={format} config={config} />
      )}
    </div>
  );
}
```

### 4.7 Video Export: WebM with Alpha

For sharing outside OBS, WebM provides full-fidelity export with transparency.

```typescript
// engine/export/video/webmEncoder.ts

export interface WebMExportConfig {
  width: number;
  height: number;
  fps: number;
  duration: number;         // milliseconds
  quality: number;          // 0-1
  includeAudio: boolean;
}

/**
 * Export animation to WebM using MediaRecorder API.
 * This captures the actual WebGL canvas output.
 */
export class WebMEncoder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private canvas: HTMLCanvasElement;
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }
  
  /**
   * Start recording the canvas.
   */
  async startRecording(config: WebMExportConfig): Promise<void> {
    const stream = this.canvas.captureStream(config.fps);
    
    // Check for VP9 with alpha support
    const mimeType = this.getSupportedMimeType();
    
    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 5000000 * config.quality,
    });
    
    this.chunks = [];
    
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.chunks.push(e.data);
      }
    };
    
    this.mediaRecorder.start(100); // Collect data every 100ms
  }
  
  /**
   * Stop recording and return the video blob.
   */
  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No recording in progress'));
        return;
      }
      
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: 'video/webm' });
        resolve(blob);
      };
      
      this.mediaRecorder.stop();
    });
  }
  
  /**
   * Get best supported mime type with alpha.
   */
  private getSupportedMimeType(): string {
    const types = [
      'video/webm;codecs=vp9',      // Best: VP9 with alpha
      'video/webm;codecs=vp8',      // Fallback: VP8
      'video/webm',                  // Generic WebM
    ];
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    
    throw new Error('No supported WebM codec found');
  }
  
  /**
   * Full export workflow.
   */
  async export(
    config: WebMExportConfig,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    await this.startRecording(config);
    
    // Wait for animation duration
    const startTime = performance.now();
    
    await new Promise<void>((resolve) => {
      const checkProgress = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / config.duration, 1);
        
        onProgress?.(progress);
        
        if (progress >= 1) {
          resolve();
        } else {
          requestAnimationFrame(checkProgress);
        }
      };
      
      requestAnimationFrame(checkProgress);
    });
    
    return this.stopRecording();
  }
}

### 4.8 GIF Export (Legacy Support)

For maximum compatibility, GIF export is available but with known limitations.

```typescript
// engine/export/gif/gifEncoder.ts

import GIF from 'gif.js';

export interface GIFExportConfig {
  width: number;
  height: number;
  fps: number;
  duration: number;
  quality: number;         // 1-20 (lower = better quality, slower)
  dithering: 'none' | 'floyd-steinberg' | 'atkinson';
  transparent?: string;    // Color to treat as transparent
}

/**
 * Export animation to GIF format.
 * 
 * LIMITATIONS:
 * - 256 color palette (may cause banding)
 * - 1-bit transparency (no semi-transparent pixels)
 * - Larger file sizes than WebM
 * - No audio support
 */
export class GIFEncoder {
  private gif: GIF;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  
  constructor(canvas: HTMLCanvasElement, config: GIFExportConfig) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    
    this.gif = new GIF({
      workers: 4,
      quality: config.quality,
      width: config.width,
      height: config.height,
      workerScript: '/gif.worker.js',
      dither: config.dithering !== 'none',
      transparent: config.transparent ? parseInt(config.transparent.slice(1), 16) : null,
    });
  }
  
  /**
   * Add a frame to the GIF.
   */
  addFrame(delay: number = 33): void {
    this.gif.addFrame(this.ctx, {
      copy: true,
      delay,
    });
  }
  
  /**
   * Render the final GIF.
   */
  async render(onProgress?: (progress: number) => void): Promise<Blob> {
    return new Promise((resolve, reject) => {
      this.gif.on('progress', (p) => onProgress?.(p));
      
      this.gif.on('finished', (blob) => {
        resolve(blob);
      });
      
      this.gif.render();
    });
  }
  
  /**
   * Full export workflow.
   */
  async export(
    config: GIFExportConfig,
    renderFrame: (frameIndex: number) => void,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    const totalFrames = Math.ceil((config.duration / 1000) * config.fps);
    const frameDelay = 1000 / config.fps;
    
    // Render each frame
    for (let i = 0; i < totalFrames; i++) {
      renderFrame(i);
      this.addFrame(frameDelay);
      onProgress?.(i / totalFrames * 0.5); // First 50% is frame capture
    }
    
    // Encode GIF
    return this.render((p) => onProgress?.(0.5 + p * 0.5));
  }
}
```

### 4.9 APNG Export (High-Quality Stickers)

APNG provides full alpha channel support with better compression than GIF.

```typescript
// engine/export/apng/apngEncoder.ts

import UPNG from 'upng-js';

export interface APNGExportConfig {
  width: number;
  height: number;
  fps: number;
  duration: number;
  compression: number;     // 0-9 (higher = smaller file, slower)
}

/**
 * Export animation to APNG format.
 * 
 * ADVANTAGES over GIF:
 * - Full 8-bit alpha channel
 * - Better compression
 * - True color (24-bit + alpha)
 * 
 * LIMITATIONS:
 * - Not supported in all browsers (IE, old Edge)
 * - Larger than WebM for long animations
 */
export class APNGEncoder {
  private frames: ImageData[] = [];
  private delays: number[] = [];
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }
  
  /**
   * Capture current canvas as a frame.
   */
  addFrame(delay: number = 33): void {
    const imageData = this.ctx.getImageData(
      0, 0, 
      this.canvas.width, 
      this.canvas.height
    );
    this.frames.push(imageData);
    this.delays.push(delay);
  }
  
  /**
   * Encode all frames to APNG.
   */
  encode(config: APNGExportConfig): ArrayBuffer {
    // Convert ImageData to raw RGBA buffers
    const buffers = this.frames.map(frame => frame.data.buffer);
    
    // Encode with UPNG
    const apng = UPNG.encode(
      buffers,
      config.width,
      config.height,
      0, // 0 = lossless
      this.delays
    );
    
    return apng;
  }
  
  /**
   * Full export workflow.
   */
  async export(
    config: APNGExportConfig,
    renderFrame: (frameIndex: number) => void,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    const totalFrames = Math.ceil((config.duration / 1000) * config.fps);
    const frameDelay = 1000 / config.fps;
    
    this.frames = [];
    this.delays = [];
    
    // Capture frames
    for (let i = 0; i < totalFrames; i++) {
      renderFrame(i);
      this.addFrame(frameDelay);
      onProgress?.(i / totalFrames * 0.8);
    }
    
    // Encode
    const buffer = this.encode(config);
    onProgress?.(1);
    
    return new Blob([buffer], { type: 'image/apng' });
  }
  
  /**
   * Clear captured frames.
   */
  clear(): void {
    this.frames = [];
    this.delays = [];
  }
}
```

---

## UNIFIED ANIMATION CONTEXT

### 5.1 Extended Context Interface

The existing `AnimationContext` needs to be extended to include timeline, audio, and WebGL data:

```typescript
// engine/context/types.ts

import type { AnimationTransform } from '../animations/core/types';
import type { Timeline, TimelineUIState } from '../timeline/types';
import type { AudioAnalysis, AudioReactiveMapping } from '../audio/types';
import type { WebGLParticleRenderer } from '../webgl/ParticleRenderer';

/**
 * Extended animation context with all v2 features.
 */
export interface AnimationContextV2 {
  // === EXISTING (from core/types.ts) ===
  t: number;                      // Normalized time 0-1
  timeMs: number;                 // Raw time in ms
  durationMs: number;             // Total duration
  deltaTime: number;              // Delta since last frame (seconds)
  isPlaying: boolean;
  mesh: THREE.Mesh | null;
  material: THREE.ShaderMaterial | null;
  canvasWidth: number;
  canvasHeight: number;
  mouseX: number;
  mouseY: number;
  isHovering: boolean;
  
  // === NEW: Timeline ===
  timeline?: {
    data: Timeline;
    state: TimelineUIState;
    evaluatedValues: Record<string, number>;
  };
  
  // === NEW: Audio ===
  audio?: {
    analysis: AudioAnalysis;
    mappings: AudioReactiveMapping[];
    isEnabled: boolean;
  };
  
  // === NEW: WebGL Particles ===
  webglParticles?: {
    renderer: WebGLParticleRenderer;
    isEnabled: boolean;
  };
  
  // === NEW: Export Mode ===
  exportMode?: {
    isExporting: boolean;
    format: 'webm' | 'gif' | 'lottie';
    frame: number;
    totalFrames: number;
  };
}

/**
 * Create extended context from base context.
 */
export function createAnimationContextV2(
  base: AnimationContext,
  extensions?: Partial<AnimationContextV2>
): AnimationContextV2 {
  return {
    ...base,
    ...extensions,
  };
}
```

### 5.2 Unified Animation Pipeline

```typescript
// engine/context/AnimationPipeline.ts

import type { AnimationContextV2 } from './types';
import type { AnimationTransform } from '../animations/core/types';
import type { AnimationConfig } from '@aurastream/api-client';
import { DEFAULT_TRANSFORM } from '../animations/core/types';
import { applyEntryAnimation } from '../animations/entry';
import { applyLoopAnimation } from '../animations/loop';
import { applyDepthEffect } from '../animations/depth';
import { evaluateTimeline, timelineToTransform } from '../timeline/core/interpolation';
import { applyAudioReactivity } from '../audio/reactivity/mappings';

/**
 * Unified animation pipeline that combines all animation sources.
 * 
 * Pipeline order:
 * 1. Timeline keyframes (base layer)
 * 2. Entry animation (additive)
 * 3. Loop animation (additive)
 * 4. Audio reactivity (modulation)
 * 5. Depth effects (final pass)
 */
export function processAnimationPipeline(
  config: AnimationConfig,
  context: AnimationContextV2
): AnimationTransform {
  let transform: AnimationTransform = { ...DEFAULT_TRANSFORM };
  
  // 1. Timeline keyframes (if present)
  if (context.timeline?.data) {
    const timelineValues = evaluateTimeline(
      context.timeline.data.tracks,
      context.timeMs
    );
    const timelineTransform = timelineToTransform(timelineValues);
    transform = mergeTransforms(transform, timelineTransform);
  }
  
  // 2. Entry animation
  if (config.entry) {
    const entryDuration = config.entry.durationMs;
    if (context.timeMs < entryDuration) {
      transform = applyEntryAnimation(config.entry, context, transform);
    }
  }
  
  // 3. Loop animation (after entry completes)
  if (config.loop) {
    const entryDuration = config.entry?.durationMs ?? 0;
    if (context.timeMs >= entryDuration) {
      const loopTime = context.timeMs - entryDuration;
      const loopDuration = config.durationMs - entryDuration;
      const loopT = (loopTime % loopDuration) / loopDuration;
      transform = applyLoopAnimation(config.loop, context, transform, loopT);
    }
  }
  
  // 4. Audio reactivity (modulates existing values)
  if (context.audio?.isEnabled && context.audio.analysis) {
    transform = applyAudioReactivity(
      transform,
      context.audio.analysis,
      context.audio.mappings
    );
  }
  
  // 5. Depth effects (final pass, affects shader uniforms)
  if (config.depthEffect && context.material) {
    transform = applyDepthEffect(
      config.depthEffect,
      context,
      transform,
      {
        mouseX: context.mouseX,
        mouseY: context.mouseY,
        triggerProgress: 0,
        time: context.timeMs / 1000,
      }
    );
  }
  
  return transform;
}

/**
 * Merge two transforms (second overrides first where defined).
 */
function mergeTransforms(
  base: AnimationTransform,
  override: Partial<AnimationTransform>
): AnimationTransform {
  return {
    ...base,
    ...Object.fromEntries(
      Object.entries(override).filter(([_, v]) => v !== undefined)
    ),
  } as AnimationTransform;
}
```


---

## IMPLEMENTATION ROADMAP

### Phase 1: WebGL Particles (2-3 weeks)
1. Create `engine/webgl/` directory structure
2. Implement shader compilation utilities
3. Write vertex and fragment shaders
4. Build `WebGLParticleRenderer` class
5. Create fallback detection and CSS renderer interface
6. Integrate with existing particle system
7. Add particle shape texture atlas
8. Performance testing and optimization

### Phase 2: Timeline Editor (3-4 weeks)
1. Create `engine/timeline/` directory structure
2. Implement core types and interfaces
3. Build keyframe interpolation engine
4. Create timeline state management
5. Build React hooks (`useTimeline`, `usePlayback`, `useKeyframes`)
6. Create UI components:
   - TimelinePanel (main container)
   - Track (property row)
   - Keyframe (diamond marker)
   - Playhead (time indicator)
   - CurveEditor (bezier handles)
7. Integrate with animation pipeline
8. Add undo/redo support

### Phase 3: Audio Reactivity (2-3 weeks)
1. Create `engine/audio/` directory structure
2. Implement Web Audio API analyzer
3. Build FFT processing and frequency bands
4. Implement beat detection algorithm
5. Create audio reactivity mapping system
6. Build UI components:
   - AudioUploader
   - WaveformDisplay
   - FrequencyBands
   - ReactivityMapper
7. Integrate with animation pipeline
8. Add preset mappings

### Phase 4: OBS Integration & Export (2-3 weeks)
1. Create `engine/export/` directory structure
2. Build self-contained HTML blob generator
3. Bundle WebGL engine for embedding (esbuild/rollup + terser)
4. Set up CDN for alert assets (CloudFront/Cloudflare)
5. Build lightweight trigger relay service (SSE)
6. Build WebM encoder using MediaRecorder API
7. Build GIF encoder using gif.js
8. Build APNG encoder using upng-js
9. Create Export Panel UI with format comparison
10. Test OBS integration across Windows/Mac/Linux

### Phase 5: Integration & Polish (1-2 weeks)
1. Unified animation context
2. Animation pipeline orchestration
3. Performance optimization
4. Error handling and fallbacks
5. Documentation
6. Unit and integration tests

---

## API SCHEMA UPDATES

### Backend Schema Additions

```python
# backend/api/schemas/alert_animation.py (additions)

# Timeline types
class TimelineKeyframe(BaseModel):
    id: str
    time: int  # milliseconds
    value: float
    easing: str = "power2.out"
    handle_in_x: Optional[float] = None
    handle_in_y: Optional[float] = None
    handle_out_x: Optional[float] = None
    handle_out_y: Optional[float] = None

class TimelineTrack(BaseModel):
    id: str
    property: str
    keyframes: List[TimelineKeyframe]
    visible: bool = True
    locked: bool = False
    muted: bool = False

class Timeline(BaseModel):
    id: str
    name: str
    duration: int
    tracks: List[TimelineTrack]
    fps: int = 30
    loop: bool = True

# Audio reactivity types
AudioSourceType = Literal["band", "energy", "beat", "beatPhase", "bpm", "spectralCentroid"]
FrequencyBandName = Literal["sub", "bass", "lowMid", "mid", "highMid", "high", "brilliance"]
TriggerMode = Literal["continuous", "onBeat", "onThreshold", "onRise", "onFall"]

class AudioSource(BaseModel):
    type: AudioSourceType
    band: Optional[FrequencyBandName] = None
    beat_type: Optional[str] = None

class AudioReactiveMapping(BaseModel):
    id: str
    enabled: bool = True
    source: AudioSource
    target: str  # AnimatableProperty
    input_min: float = 0
    input_max: float = 1
    output_min: float = 0
    output_max: float = 1
    smoothing: float = 0.3
    trigger_mode: TriggerMode = "continuous"
    threshold: Optional[float] = None
    invert: bool = False
    clamp: bool = True

# Extended animation config
class AnimationConfigV2(AnimationConfig):
    timeline: Optional[Timeline] = None
    audio_mappings: Optional[List[AudioReactiveMapping]] = None
    audio_url: Optional[str] = None
    use_webgl_particles: bool = True
```

### Frontend Type Additions

```typescript
// tsx/packages/api-client/src/types/alertAnimation.ts (additions)

// Timeline types
export interface TimelineKeyframe {
  id: string;
  time: number;
  value: number;
  easing: string;
  handleInX?: number;
  handleInY?: number;
  handleOutX?: number;
  handleOutY?: number;
}

export interface TimelineTrack {
  id: string;
  property: string;
  keyframes: TimelineKeyframe[];
  visible: boolean;
  locked: boolean;
  muted: boolean;
}

export interface Timeline {
  id: string;
  name: string;
  duration: number;
  tracks: TimelineTrack[];
  fps: number;
  loop: boolean;
}

// Audio types
export type AudioSourceType = 'band' | 'energy' | 'beat' | 'beatPhase' | 'bpm' | 'spectralCentroid';
export type FrequencyBandName = 'sub' | 'bass' | 'lowMid' | 'mid' | 'highMid' | 'high' | 'brilliance';
export type TriggerMode = 'continuous' | 'onBeat' | 'onThreshold' | 'onRise' | 'onFall';

export interface AudioSource {
  type: AudioSourceType;
  band?: FrequencyBandName;
  beatType?: string;
}

export interface AudioReactiveMapping {
  id: string;
  enabled: boolean;
  source: AudioSource;
  target: string;
  inputMin: number;
  inputMax: number;
  outputMin: number;
  outputMax: number;
  smoothing: number;
  triggerMode: TriggerMode;
  threshold?: number;
  invert: boolean;
  clamp: boolean;
}

// Extended config
export interface AnimationConfigV2 extends AnimationConfig {
  timeline?: Timeline;
  audioMappings?: AudioReactiveMapping[];
  audioUrl?: string;
  useWebglParticles?: boolean;
}
```

---

## CONCLUSION

This master schema provides a complete blueprint for upgrading AuraStream's Alert Animation Studio to industry-leading status. The four pillars work together:

1. **WebGL Particles** provide visual impact at scale (10,000+ particles at 60fps)
2. **Timeline Editor** gives precise creative control with After Effects-style keyframes
3. **Audio Reactivity** creates dynamic, music-driven animations with beat detection
4. **OBS Integration & Export** provides bulletproof delivery:
   - **Self-contained HTML blob** - Full WebGL engine embedded, zero server dependency
   - **CDN-hosted assets** - 99.99% uptime, cached by OBS
   - **Lightweight trigger relay** - Graceful degradation if down
   - **Video exports** (WebM/GIF/APNG) for social media sharing

**Key Architecture Decision:** The self-contained HTML blob approach means:
- AuraStream servers down? Alerts still work.
- Bad code update pushed? Doesn't affect live streamers.
- User offline? Animation renders, just no triggers.

This is a **competitive moat** - StreamElements and Streamlabs can't offer this level of reliability because their alerts depend on their servers being up.

**Estimated Total Development Time:** 10-14 weeks

**Result:** A tool that rivals Cavalry, Rive, and After Effects for streamer alert creation, with bulletproof reliability that competitors can't match.

---

*Document Version: 1.0.0*  
*Last Updated: January 2026*  
*Status: Ready for Implementation*
