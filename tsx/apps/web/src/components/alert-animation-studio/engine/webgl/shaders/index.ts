/**
 * WebGL Shader Utilities
 *
 * Functions for compiling shaders and creating shader programs.
 * Includes shader source code as embedded strings.
 */

import { WebGLParticleError } from '../types';

// ============================================================================
// Shader Sources (Embedded)
// ============================================================================

/**
 * Vertex shader source code for particle rendering.
 * GLSL ES 3.0 (WebGL2)
 */
export const PARTICLE_VERTEX_SHADER = `#version 300 es
precision highp float;

// Per-Instance Attributes (from buffer)
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
uniform float uGlobalOpacity;

// Output to Fragment Shader
out vec4 vColor;
out vec2 vUV;
out float vLifetime;
out float vRotation;

// Pseudo-random function
float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

// Simple 2D noise
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

// Fractal Brownian Motion
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

void main() {
  float particleTime = uTime * (1.0 + aSeed * 0.2);
  vec3 pos = aPosition;
  
  // Gravity
  float gravityEffect = 0.5 * uGravity * particleTime * particleTime * 500.0;
  pos.y += gravityEffect;
  
  // Wind
  pos.xy += uWind * particleTime * 100.0;
  
  // Turbulence
  if (uTurbulence > 0.0) {
    float noiseScale = 0.01;
    float timeScale = 0.5;
    float noiseX = fbm(vec2(pos.x * noiseScale + particleTime * timeScale, pos.y * noiseScale)) - 0.5;
    float noiseY = fbm(vec2(pos.y * noiseScale + particleTime * timeScale, pos.x * noiseScale)) - 0.5;
    pos.xy += vec2(noiseX, noiseY) * uTurbulence * 50.0;
  }
  
  // Velocity
  pos += aVelocity * particleTime;
  
  // Clip space
  vec2 clipPos = (pos.xy / uResolution) * 2.0 - 1.0;
  clipPos.y *= -1.0;
  gl_Position = vec4(clipPos, 0.0, 1.0);
  
  // Point size
  float lifetimeFade = 1.0 - aLifetime;
  float sizeMultiplier = mix(1.0, 0.3, aLifetime * aLifetime);
  float baseSize = aSize * sizeMultiplier;
  float resolutionScale = uResolution.y / 512.0;
  gl_PointSize = clamp(baseSize * resolutionScale, 1.0, 256.0);
  
  // Output
  vColor = aColor;
  vColor.a *= lifetimeFade * lifetimeFade * uGlobalOpacity;
  vLifetime = aLifetime;
  vRotation = aRotation + particleTime * 0.5 * aSeed;
  vUV = vec2(0.0);
}`;

/**
 * Fragment shader source code for particle rendering.
 * GLSL ES 3.0 (WebGL2)
 */
export const PARTICLE_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec4 vColor;
in vec2 vUV;
in float vLifetime;
in float vRotation;

uniform sampler2D uTexture;
uniform int uShapeType;

out vec4 fragColor;

const float PI = 3.14159265359;

// SDF functions
float sdCircle(vec2 p, float r) {
  return length(p) - r;
}

float sdSquare(vec2 p, float s) {
  vec2 d = abs(p) - vec2(s);
  return max(d.x, d.y);
}

float sdStar5(vec2 p, float r, float rf) {
  const vec2 k1 = vec2(0.809016994375, -0.587785252292);
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

vec2 rotate2D(vec2 p, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}

float softEdge(float d, float edge) {
  return 1.0 - smoothstep(-edge, edge, d);
}

void main() {
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  uv = rotate2D(uv, vRotation);
  
  float alpha = 1.0;
  float edgeSoftness = 0.1;
  
  if (uShapeType == 0) {
    float d = sdCircle(uv, 0.8);
    alpha = softEdge(d, edgeSoftness);
    float glow = 1.0 - smoothstep(0.0, 0.8, length(uv));
    alpha *= 0.5 + 0.5 * glow;
  } else if (uShapeType == 1) {
    float d = sdSquare(uv, 0.7);
    alpha = softEdge(d, edgeSoftness * 0.5);
  } else if (uShapeType == 2) {
    float d = sdStar5(uv * 1.2, 0.5, 0.4);
    alpha = softEdge(d, edgeSoftness);
  } else if (uShapeType == 3) {
    vec2 heartUV = uv * 1.3;
    heartUV.y = -heartUV.y + 0.2;
    float d = sdHeart(heartUV);
    alpha = softEdge(d, edgeSoftness);
  } else if (uShapeType == 4) {
    float d = sdStar4(uv, 0.4, 4.0);
    alpha = softEdge(d, edgeSoftness * 2.0);
    float glow = 1.0 - smoothstep(0.0, 1.0, length(uv));
    alpha = max(alpha, glow * 0.3);
  } else if (uShapeType == 5) {
    float d = length(uv);
    alpha = 1.0 - smoothstep(0.0, 1.0, d);
    alpha *= alpha;
  } else if (uShapeType == 6) {
    vec2 fireUV = uv;
    fireUV.y = -fireUV.y;
    fireUV.y *= 0.6;
    fireUV.y -= 0.2;
    float d = length(fireUV);
    float taper = 1.0 - smoothstep(-0.5, 0.5, uv.y);
    d += taper * 0.3;
    alpha = 1.0 - smoothstep(0.3, 0.8, d);
  } else if (uShapeType == 7) {
    float d = sdCircle(uv, 0.7);
    alpha = softEdge(d, edgeSoftness * 2.0);
    float angle = atan(uv.y, uv.x);
    float pattern = 0.5 + 0.5 * cos(angle * 6.0);
    alpha *= 0.7 + 0.3 * pattern;
  } else if (uShapeType == 8) {
    vec2 confettiUV = uv;
    confettiUV.x *= 1.5;
    float d = sdSquare(confettiUV, 0.6);
    alpha = softEdge(d, edgeSoftness * 0.3);
  } else {
    vec2 texUV = gl_PointCoord;
    texUV = rotate2D(texUV - 0.5, vRotation) + 0.5;
    alpha = texture(uTexture, texUV).a;
  }
  
  fragColor = vec4(vColor.rgb, vColor.a * alpha);
  if (fragColor.a < 0.01) discard;
}`;

// ============================================================================
// Shader Compilation
// ============================================================================

/**
 * Compile a shader from source code.
 *
 * @param gl - WebGL2 rendering context
 * @param type - Shader type (gl.VERTEX_SHADER or gl.FRAGMENT_SHADER)
 * @param source - GLSL source code
 * @returns Compiled shader object
 * @throws WebGLParticleError if compilation fails
 */
export function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string
): WebGLShader {
  const shader = gl.createShader(type);

  if (!shader) {
    throw new WebGLParticleError(
      'Failed to create shader object',
      'SHADER_COMPILE_ERROR'
    );
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  // Check compilation status
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);

    const shaderType = type === gl.VERTEX_SHADER ? 'vertex' : 'fragment';
    throw new WebGLParticleError(
      `Failed to compile ${shaderType} shader: ${info}`,
      'SHADER_COMPILE_ERROR',
      { source, info }
    );
  }

  return shader;
}

/**
 * Create a shader program from vertex and fragment shaders.
 *
 * @param gl - WebGL2 rendering context
 * @param vertexShader - Compiled vertex shader
 * @param fragmentShader - Compiled fragment shader
 * @returns Linked shader program
 * @throws WebGLParticleError if linking fails
 */
export function createProgram(
  gl: WebGL2RenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader
): WebGLProgram {
  const program = gl.createProgram();

  if (!program) {
    throw new WebGLParticleError(
      'Failed to create shader program',
      'PROGRAM_LINK_ERROR'
    );
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  // Check link status
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);

    throw new WebGLParticleError(
      `Failed to link shader program: ${info}`,
      'PROGRAM_LINK_ERROR',
      { info }
    );
  }

  // Clean up shaders (they're now part of the program)
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  return program;
}

/**
 * Create the particle shader program with default shaders.
 *
 * @param gl - WebGL2 rendering context
 * @returns Linked shader program
 */
export function createParticleProgram(gl: WebGL2RenderingContext): WebGLProgram {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, PARTICLE_VERTEX_SHADER);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, PARTICLE_FRAGMENT_SHADER);

  return createProgram(gl, vertexShader, fragmentShader);
}

/**
 * Get all uniform locations for the particle shader.
 *
 * @param gl - WebGL2 rendering context
 * @param program - Shader program
 * @returns Map of uniform names to locations
 */
export function getUniformLocations(
  gl: WebGL2RenderingContext,
  program: WebGLProgram
): Map<string, WebGLUniformLocation> {
  const uniforms = new Map<string, WebGLUniformLocation>();

  const uniformNames = [
    'uTime',
    'uDeltaTime',
    'uResolution',
    'uGravity',
    'uWind',
    'uTurbulence',
    'uGlobalOpacity',
    'uTexture',
    'uShapeType',
  ];

  for (const name of uniformNames) {
    const location = gl.getUniformLocation(program, name);
    if (location !== null) {
      uniforms.set(name, location);
    }
  }

  return uniforms;
}

/**
 * Get all attribute locations for the particle shader.
 *
 * @param gl - WebGL2 rendering context
 * @param program - Shader program
 * @returns Map of attribute names to locations
 */
export function getAttributeLocations(
  gl: WebGL2RenderingContext,
  program: WebGLProgram
): Map<string, number> {
  const attributes = new Map<string, number>();

  const attributeNames = [
    'aPosition',
    'aVelocity',
    'aColor',
    'aSize',
    'aRotation',
    'aLifetime',
    'aSeed',
  ];

  for (const name of attributeNames) {
    const location = gl.getAttribLocation(program, name);
    if (location !== -1) {
      attributes.set(name, location);
    }
  }

  return attributes;
}
