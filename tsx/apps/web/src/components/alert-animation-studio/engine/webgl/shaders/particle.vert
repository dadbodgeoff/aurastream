#version 300 es
precision highp float;

// ============================================================================
// Per-Instance Attributes (from buffer)
// ============================================================================

in vec3 aPosition;    // Position (x, y, z)
in vec3 aVelocity;    // Velocity (vx, vy, vz)
in vec4 aColor;       // Color (r, g, b, a)
in float aSize;       // Particle size
in float aRotation;   // Rotation angle (radians)
in float aLifetime;   // Lifetime progress (0-1, 0=born, 1=dead)
in float aSeed;       // Per-particle random seed (0-1)

// ============================================================================
// Uniforms (global per frame)
// ============================================================================

uniform float uTime;
uniform float uDeltaTime;
uniform vec2 uResolution;
uniform float uGravity;
uniform vec2 uWind;
uniform float uTurbulence;
uniform float uGlobalOpacity;

// ============================================================================
// Output to Fragment Shader
// ============================================================================

out vec4 vColor;
out vec2 vUV;
out float vLifetime;
out float vRotation;

// ============================================================================
// Noise Functions
// ============================================================================

/**
 * Pseudo-random function based on 2D input.
 */
float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

/**
 * Simple 2D noise for turbulence.
 * Uses bilinear interpolation of random values.
 */
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  
  // Smooth interpolation
  f = f * f * (3.0 - 2.0 * f);
  
  // Sample corners
  float a = rand(i);
  float b = rand(i + vec2(1.0, 0.0));
  float c = rand(i + vec2(0.0, 1.0));
  float d = rand(i + vec2(1.0, 1.0));
  
  // Bilinear interpolation
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

/**
 * Fractal Brownian Motion for more organic turbulence.
 */
float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  
  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p * frequency);
    amplitude *= 0.5;
    frequency *= 2.0;
  }
  
  return value;
}

// ============================================================================
// Main Vertex Shader
// ============================================================================

void main() {
  // Calculate time offset for this particle (adds variation)
  float particleTime = uTime * (1.0 + aSeed * 0.2);
  
  // Start with base position
  vec3 pos = aPosition;
  
  // ========================================
  // Apply Physics
  // ========================================
  
  // Gravity (downward acceleration over time)
  // Using simplified physics: y = y0 + v*t + 0.5*g*t^2
  float gravityEffect = 0.5 * uGravity * particleTime * particleTime * 500.0;
  pos.y += gravityEffect;
  
  // Wind (constant force in x/y direction)
  pos.xy += uWind * particleTime * 100.0;
  
  // Turbulence (organic swirling motion)
  if (uTurbulence > 0.0) {
    // Use FBM noise for more natural movement
    float noiseScale = 0.01;
    float timeScale = 0.5;
    
    float noiseX = fbm(vec2(pos.x * noiseScale + particleTime * timeScale, pos.y * noiseScale)) - 0.5;
    float noiseY = fbm(vec2(pos.y * noiseScale + particleTime * timeScale, pos.x * noiseScale)) - 0.5;
    
    pos.xy += vec2(noiseX, noiseY) * uTurbulence * 50.0;
  }
  
  // Apply velocity (linear motion)
  pos += aVelocity * particleTime;
  
  // ========================================
  // Convert to Clip Space
  // ========================================
  
  // Normalize position to clip space (-1 to 1)
  vec2 clipPos = (pos.xy / uResolution) * 2.0 - 1.0;
  
  // Flip Y axis (screen coordinates have Y down, clip space has Y up)
  clipPos.y *= -1.0;
  
  // Set final position (z=0 for 2D, w=1 for perspective divide)
  gl_Position = vec4(clipPos, 0.0, 1.0);
  
  // ========================================
  // Calculate Point Size
  // ========================================
  
  // Lifetime-based size fade (shrink as particle dies)
  float lifetimeFade = 1.0 - aLifetime;
  float sizeMultiplier = mix(1.0, 0.3, aLifetime * aLifetime); // Quadratic shrink
  
  // Scale size based on resolution (maintain visual consistency)
  float baseSize = aSize * sizeMultiplier;
  float resolutionScale = uResolution.y / 512.0;
  
  gl_PointSize = baseSize * resolutionScale;
  
  // Clamp point size to reasonable range
  gl_PointSize = clamp(gl_PointSize, 1.0, 256.0);
  
  // ========================================
  // Output to Fragment Shader
  // ========================================
  
  // Color with lifetime fade (quadratic for smoother fade-out)
  vColor = aColor;
  vColor.a *= lifetimeFade * lifetimeFade * uGlobalOpacity;
  
  // Pass lifetime for fragment shader effects
  vLifetime = aLifetime;
  
  // Pass rotation for UV transformation
  vRotation = aRotation + particleTime * 0.5 * aSeed; // Add some spin
  
  // UV coordinates will be computed in fragment shader from gl_PointCoord
  vUV = vec2(0.0);
}
