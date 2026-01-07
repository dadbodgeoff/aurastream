/**
 * Enterprise Depth Parallax Shaders
 *
 * Professional GLSL shaders for depth-based 3D effects:
 * - Depth-aware displacement
 * - Smooth layer separation
 * - Glow and bloom effects
 * - Edge-aware rendering
 *
 * Note: These shaders are designed for use with Three.js.
 * Install three.js: npm install three @types/three
 */

// Type definitions for Three.js uniforms (avoids direct dependency)
interface Vector2Like {
  x: number;
  y: number;
}

interface ColorLike {
  r: number;
  g: number;
  b: number;
}

interface TextureLike {
  uuid: string;
}

export const depthParallaxVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uParallaxIntensity;
  uniform vec2 uMouse;
  uniform sampler2D uDepthMap;
  uniform float uDepthScale;
  uniform float uSmoothFactor;

  varying vec2 vUv;
  varying float vDepth;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  // Smooth step for edge-aware displacement
  float smootherstep(float edge0, float edge1, float x) {
    x = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
    return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
  }

  void main() {
    vUv = uv;

    // Sample depth map with bilinear filtering
    float depth = texture2D(uDepthMap, uv).r;
    vDepth = depth;

    // Calculate parallax offset based on mouse position
    // Mouse is normalized to -1 to 1
    vec2 mouseOffset = uMouse * 2.0 - 1.0;

    // Depth-based parallax: foreground moves more
    float parallaxStrength = depth * uParallaxIntensity;
    vec2 parallaxOffset = mouseOffset * parallaxStrength;

    // Apply smooth displacement
    vec3 newPosition = position;
    newPosition.xy += parallaxOffset * uDepthScale;

    // Z displacement for pop-out effect
    newPosition.z += depth * uDepthScale * 0.5;

    // Calculate view-space position for lighting
    vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
    vViewPosition = -mvPosition.xyz;

    // Calculate normal (simplified for 2D plane)
    vNormal = normalize(normalMatrix * normal);

    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const depthParallaxFragmentShader = /* glsl */ `
  uniform sampler2D uTexture;
  uniform sampler2D uDepthMap;
  uniform float uTime;
  uniform float uGlowIntensity;
  uniform vec3 uGlowColor;
  uniform float uOpacity;
  uniform float uEdgeGlow;
  uniform vec3 uAmbientLight;

  varying vec2 vUv;
  varying float vDepth;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  // Edge detection using depth gradient
  float getEdgeFactor() {
    vec2 texelSize = vec2(1.0 / 512.0); // Adjust based on texture size

    float depthL = texture2D(uDepthMap, vUv - vec2(texelSize.x, 0.0)).r;
    float depthR = texture2D(uDepthMap, vUv + vec2(texelSize.x, 0.0)).r;
    float depthT = texture2D(uDepthMap, vUv - vec2(0.0, texelSize.y)).r;
    float depthB = texture2D(uDepthMap, vUv + vec2(0.0, texelSize.y)).r;

    float edgeX = abs(depthL - depthR);
    float edgeY = abs(depthT - depthB);

    return clamp((edgeX + edgeY) * 5.0, 0.0, 1.0);
  }

  void main() {
    // Sample main texture
    vec4 texColor = texture2D(uTexture, vUv);

    // Early discard for transparent pixels
    if (texColor.a < 0.01) {
      discard;
    }

    // Calculate edge factor for edge glow
    float edgeFactor = getEdgeFactor();

    // Depth-based glow (foreground glows more)
    float glowFactor = vDepth * uGlowIntensity;

    // Edge glow enhancement
    float edgeGlowFactor = edgeFactor * uEdgeGlow;

    // Combine glow effects
    vec3 glow = uGlowColor * (glowFactor + edgeGlowFactor);

    // Simple ambient lighting
    vec3 ambient = uAmbientLight * texColor.rgb;

    // Final color composition
    vec3 finalColor = texColor.rgb + glow;
    finalColor = mix(finalColor, ambient, 0.1);

    // Apply opacity
    float finalAlpha = texColor.a * uOpacity;

    gl_FragColor = vec4(finalColor, finalAlpha);
  }
`;


// ============================================================================
// Particle Shaders
// ============================================================================

export const particleVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uSizeVariance;

  attribute float aScale;
  attribute float aPhase;
  attribute vec3 aVelocity;
  attribute float aLifetime;
  attribute float aBirthTime;

  varying float vAlpha;
  varying float vPhase;

  void main() {
    // Calculate particle age
    float age = uTime - aBirthTime;
    float normalizedAge = age / aLifetime;

    // Fade out as particle ages
    vAlpha = 1.0 - smoothstep(0.7, 1.0, normalizedAge);

    // Pass phase for color variation
    vPhase = aPhase;

    // Calculate position with velocity
    vec3 pos = position + aVelocity * age;

    // Add some turbulence
    pos.x += sin(uTime * 2.0 + aPhase * 6.28) * 0.1;
    pos.y += cos(uTime * 1.5 + aPhase * 6.28) * 0.05;

    // Calculate size with variance and age-based shrinking
    float size = uSize * aScale * (1.0 + uSizeVariance * sin(aPhase * 6.28));
    size *= 1.0 - normalizedAge * 0.5; // Shrink over lifetime

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const particleFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uColorVariance;
  uniform sampler2D uParticleTexture;

  varying float vAlpha;
  varying float vPhase;

  // HSL to RGB conversion
  vec3 hsl2rgb(vec3 c) {
    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
  }

  // RGB to HSL conversion
  vec3 rgb2hsl(vec3 c) {
    float maxC = max(c.r, max(c.g, c.b));
    float minC = min(c.r, min(c.g, c.b));
    float l = (maxC + minC) / 2.0;

    if (maxC == minC) {
      return vec3(0.0, 0.0, l);
    }

    float d = maxC - minC;
    float s = l > 0.5 ? d / (2.0 - maxC - minC) : d / (maxC + minC);

    float h;
    if (maxC == c.r) {
      h = (c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0);
    } else if (maxC == c.g) {
      h = (c.b - c.r) / d + 2.0;
    } else {
      h = (c.r - c.g) / d + 4.0;
    }
    h /= 6.0;

    return vec3(h, s, l);
  }

  void main() {
    // Sample particle texture (soft circle)
    vec4 texColor = texture2D(uParticleTexture, gl_PointCoord);

    // Apply color with variance
    vec3 hsl = rgb2hsl(uColor);
    hsl.x += (vPhase - 0.5) * uColorVariance; // Hue shift
    hsl.y = clamp(hsl.y + (vPhase - 0.5) * 0.2, 0.0, 1.0); // Saturation
    vec3 variedColor = hsl2rgb(hsl);

    // Final color with alpha
    float alpha = texColor.a * vAlpha;

    if (alpha < 0.01) {
      discard;
    }

    gl_FragColor = vec4(variedColor * texColor.rgb, alpha);
  }
`;

// ============================================================================
// Glow/Bloom Shaders
// ============================================================================

export const glowVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const glowFragmentShader = /* glsl */ `
  uniform sampler2D uTexture;
  uniform float uIntensity;
  uniform vec3 uGlowColor;
  uniform float uBlurRadius;
  uniform vec2 uResolution;

  varying vec2 vUv;

  // Gaussian blur weights
  const float weights[5] = float[](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);

  void main() {
    vec2 texelSize = 1.0 / uResolution;
    vec4 result = texture2D(uTexture, vUv) * weights[0];

    // Horizontal blur
    for (int i = 1; i < 5; i++) {
      float offset = float(i) * uBlurRadius;
      result += texture2D(uTexture, vUv + vec2(texelSize.x * offset, 0.0)) * weights[i];
      result += texture2D(uTexture, vUv - vec2(texelSize.x * offset, 0.0)) * weights[i];
    }

    // Vertical blur
    for (int i = 1; i < 5; i++) {
      float offset = float(i) * uBlurRadius;
      result += texture2D(uTexture, vUv + vec2(0.0, texelSize.y * offset)) * weights[i];
      result += texture2D(uTexture, vUv - vec2(0.0, texelSize.y * offset)) * weights[i];
    }

    // Apply glow color and intensity
    vec3 glow = result.rgb * uGlowColor * uIntensity;

    gl_FragColor = vec4(glow, result.a * uIntensity);
  }
`;

// ============================================================================
// Shader Material Factory
// ============================================================================

/**
 * Depth parallax uniforms interface.
 * 
 * When using with Three.js, replace these types with actual Three.js types:
 * - TextureLike -> THREE.Texture
 * - Vector2Like -> THREE.Vector2
 * - ColorLike -> THREE.Color
 */
export interface DepthParallaxUniforms {
  uTime: { value: number };
  uTexture: { value: TextureLike | null };
  uDepthMap: { value: TextureLike | null };
  uMouse: { value: Vector2Like };
  uParallaxIntensity: { value: number };
  uDepthScale: { value: number };
  uSmoothFactor: { value: number };
  uGlowIntensity: { value: number };
  uGlowColor: { value: ColorLike };
  uOpacity: { value: number };
  uEdgeGlow: { value: number };
  uAmbientLight: { value: ColorLike };
}

/**
 * Create default uniforms for depth parallax shader.
 * 
 * Note: When using with Three.js, use this pattern:
 * ```typescript
 * import * as THREE from 'three';
 * 
 * const uniforms = {
 *   ...createDepthParallaxUniforms(),
 *   uMouse: { value: new THREE.Vector2(0.5, 0.5) },
 *   uGlowColor: { value: new THREE.Color(0xffffff) },
 *   uAmbientLight: { value: new THREE.Color(0xffffff) },
 * };
 * ```
 */
export function createDepthParallaxUniforms(): DepthParallaxUniforms {
  return {
    uTime: { value: 0 },
    uTexture: { value: null },
    uDepthMap: { value: null },
    uMouse: { value: { x: 0.5, y: 0.5 } },
    uParallaxIntensity: { value: 0.5 },
    uDepthScale: { value: 0.1 },
    uSmoothFactor: { value: 0.1 },
    uGlowIntensity: { value: 0 },
    uGlowColor: { value: { r: 1, g: 1, b: 1 } },
    uOpacity: { value: 1 },
    uEdgeGlow: { value: 0 },
    uAmbientLight: { value: { r: 1, g: 1, b: 1 } },
  };
}
