#version 300 es
precision highp float;

// ============================================================================
// Input from Vertex Shader
// ============================================================================

in vec4 vColor;
in vec2 vUV;
in float vLifetime;
in float vRotation;

// ============================================================================
// Uniforms
// ============================================================================

uniform sampler2D uTexture;
uniform int uShapeType;

// ============================================================================
// Output
// ============================================================================

out vec4 fragColor;

// ============================================================================
// Constants
// ============================================================================

const float PI = 3.14159265359;
const float TAU = 6.28318530718;

// ============================================================================
// Signed Distance Functions (SDF)
// ============================================================================

/**
 * SDF for a circle.
 * Returns negative inside, positive outside.
 */
float sdCircle(vec2 p, float r) {
  return length(p) - r;
}

/**
 * SDF for a rounded square/box.
 */
float sdBox(vec2 p, vec2 b, float r) {
  vec2 d = abs(p) - b + r;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
}

/**
 * SDF for a square (no rounding).
 */
float sdSquare(vec2 p, float s) {
  vec2 d = abs(p) - vec2(s);
  return max(d.x, d.y);
}

/**
 * SDF for a 5-pointed star.
 * Based on Inigo Quilez's star SDF.
 */
float sdStar5(vec2 p, float r, float rf) {
  const vec2 k1 = vec2(0.809016994375, -0.587785252292); // cos/sin of 2π/5
  const vec2 k2 = vec2(-k1.x, k1.y);
  
  p.x = abs(p.x);
  p -= 2.0 * max(dot(k1, p), 0.0) * k1;
  p -= 2.0 * max(dot(k2, p), 0.0) * k2;
  p.x = abs(p.x);
  p.y -= r;
  
  vec2 ba = rf * vec2(-k1.y, k1.x) - vec2(0.0, 1.0);
  float h = clamp(dot(p, ba) / dot(ba, ba), 0.0, r);
  
  return length(p - ba * h) * sign(p.y * ba.x - p.x * ba.y);
}

/**
 * SDF for a heart shape.
 * Based on Inigo Quilez's heart SDF.
 */
float sdHeart(vec2 p) {
  p.x = abs(p.x);
  
  if (p.y + p.x > 1.0) {
    return sqrt(dot(p - vec2(0.25, 0.75), p - vec2(0.25, 0.75))) - sqrt(2.0) / 4.0;
  }
  
  return sqrt(min(
    dot(p - vec2(0.0, 1.0), p - vec2(0.0, 1.0)),
    dot(p - 0.5 * max(p.x + p.y, 0.0), p - 0.5 * max(p.x + p.y, 0.0))
  )) * sign(p.x - p.y);
}

/**
 * SDF for a 4-pointed sparkle/diamond star.
 */
float sdSparkle(vec2 p, float r) {
  // Rotate 45 degrees for diamond orientation
  float c = 0.707106781; // cos(45°)
  float s = 0.707106781; // sin(45°)
  p = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
  
  // Create 4-pointed star by combining two perpendicular lines
  vec2 d = abs(p);
  float star = (d.x + d.y) / 1.414 - r * 0.5;
  
  return star;
}

/**
 * SDF for a 4-pointed star with glow effect.
 */
float sdStar4(vec2 p, float r, float rf) {
  const float an = PI / 4.0;
  const float en = PI / 2.0;
  vec2 acs = vec2(cos(an), sin(an));
  vec2 ecs = vec2(cos(en), sin(en));
  
  float bn = mod(atan(p.x, p.y), 2.0 * an) - an;
  p = length(p) * vec2(cos(bn), abs(sin(bn)));
  p -= r * acs;
  p += ecs * clamp(-dot(p, ecs), 0.0, r * acs.y / ecs.y);
  
  return length(p) * sign(p.x);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Rotate a 2D point around origin.
 */
vec2 rotate2D(vec2 p, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}

/**
 * Soft edge using smoothstep.
 */
float softEdge(float d, float edge) {
  return 1.0 - smoothstep(-edge, edge, d);
}

// ============================================================================
// Main Fragment Shader
// ============================================================================

void main() {
  // Get UV from point sprite coordinates and apply rotation
  vec2 uv = gl_PointCoord * 2.0 - 1.0; // Center UV (-1 to 1)
  uv = rotate2D(uv, vRotation);
  
  float alpha = 1.0;
  float edgeSoftness = 0.1;
  
  // ========================================
  // Shape Selection via SDF
  // ========================================
  
  if (uShapeType == 0) {
    // Circle - soft glowing particle
    float d = sdCircle(uv, 0.8);
    alpha = softEdge(d, edgeSoftness);
    
    // Add inner glow
    float glow = 1.0 - smoothstep(0.0, 0.8, length(uv));
    alpha *= 0.5 + 0.5 * glow;
    
  } else if (uShapeType == 1) {
    // Square - pixel-style particle
    float d = sdSquare(uv, 0.7);
    alpha = softEdge(d, edgeSoftness * 0.5);
    
  } else if (uShapeType == 2) {
    // Star (5-pointed)
    float d = sdStar5(uv * 1.2, 0.5, 0.4);
    alpha = softEdge(d, edgeSoftness);
    
  } else if (uShapeType == 3) {
    // Heart
    vec2 heartUV = uv * 1.3;
    heartUV.y = -heartUV.y + 0.2; // Flip and offset
    float d = sdHeart(heartUV);
    alpha = softEdge(d, edgeSoftness);
    
  } else if (uShapeType == 4) {
    // Sparkle (4-pointed star with glow)
    float d = sdStar4(uv, 0.4, 4.0);
    alpha = softEdge(d, edgeSoftness * 2.0);
    
    // Add radial glow for sparkle effect
    float glow = 1.0 - smoothstep(0.0, 1.0, length(uv));
    alpha = max(alpha, glow * 0.3);
    
  } else if (uShapeType == 5) {
    // Smoke - soft, fuzzy circle
    float d = length(uv);
    alpha = 1.0 - smoothstep(0.0, 1.0, d);
    alpha *= alpha; // Softer falloff
    
  } else if (uShapeType == 6) {
    // Fire - teardrop/flame shape
    vec2 fireUV = uv;
    fireUV.y = -fireUV.y; // Flip
    
    // Elongate vertically
    fireUV.y *= 0.6;
    fireUV.y -= 0.2;
    
    float d = length(fireUV);
    
    // Taper at top
    float taper = 1.0 - smoothstep(-0.5, 0.5, uv.y);
    d += taper * 0.3;
    
    alpha = 1.0 - smoothstep(0.3, 0.8, d);
    
  } else if (uShapeType == 7) {
    // Snow - soft hexagonal flake
    float d = sdCircle(uv, 0.7);
    alpha = softEdge(d, edgeSoftness * 2.0);
    
    // Add subtle crystalline pattern
    float angle = atan(uv.y, uv.x);
    float pattern = 0.5 + 0.5 * cos(angle * 6.0);
    alpha *= 0.7 + 0.3 * pattern;
    
  } else if (uShapeType == 8) {
    // Confetti - rectangular with slight rotation variation
    vec2 confettiUV = uv;
    confettiUV.x *= 1.5; // Make rectangular
    float d = sdSquare(confettiUV, 0.6);
    alpha = softEdge(d, edgeSoftness * 0.3);
    
  } else {
    // Default: texture sample (for custom textures)
    vec2 texUV = gl_PointCoord;
    texUV = rotate2D(texUV - 0.5, vRotation) + 0.5;
    alpha = texture(uTexture, texUV).a;
  }
  
  // ========================================
  // Final Color Output
  // ========================================
  
  // Apply alpha from shape
  fragColor = vec4(vColor.rgb, vColor.a * alpha);
  
  // Discard fully transparent pixels for performance
  if (fragColor.a < 0.01) {
    discard;
  }
}
