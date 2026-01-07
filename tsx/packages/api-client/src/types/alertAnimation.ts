/**
 * Alert Animation Studio Types
 *
 * TypeScript interfaces for the 3D Alert Animation Studio.
 * All types use camelCase (transformed from snake_case in API responses).
 */

// ============================================================================
// Enums / Union Types
// ============================================================================

export type AnimationCategory = 'entry' | 'loop' | 'depth' | 'particles';
export type ExportFormat = 'webm' | 'gif' | 'apng';
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export type EntryType = 'pop_in' | 'slide_in' | 'fade_in' | 'burst' | 'glitch' | 'bounce' | 'spin_in' | 'drop_in';
export type LoopType = 'float' | 'pulse' | 'glow' | 'wiggle' | 'rgb_glow' | 'breathe' | 'shake' | 'swing';
export type DepthType = 'parallax' | 'tilt' | 'pop_out' | 'float_3d';
export type ParticleType = 'sparkles' | 'confetti' | 'fire' | 'hearts' | 'pixels' | 'snow' | 'bubbles' | 'stars';

export type SlideDirection = 'left' | 'right' | 'top' | 'bottom';
export type TriggerType = 'mouse' | 'on_enter' | 'always' | 'auto';
export type SpawnArea = 'around' | 'above' | 'below' | 'center';

// ============================================================================
// Animation Config Types
// ============================================================================

export interface EntryAnimation {
  type: EntryType;
  durationMs: number;
  easing?: string;
  scaleFrom?: number;
  opacityFrom?: number;
  rotationFrom?: number;
  direction?: SlideDirection;
  distancePercent?: number;
  bounce?: number;
  glitchIntensity?: number;
  bounces?: number;
  height?: number;
  // spin_in specific
  rotations?: number;
  // drop_in specific
  dropHeight?: number;
  // glitch specific
  seed?: number;
  rgbSplit?: boolean;
  scanlines?: boolean;
}

export interface LoopAnimation {
  type: LoopType;
  frequency?: number;
  easing?: string;
  // Float
  amplitudeY?: number;
  amplitudeX?: number;
  phaseOffset?: number;
  // Pulse
  scaleMin?: number;
  scaleMax?: number;
  // Glow
  color?: string;
  intensityMin?: number;
  intensityMax?: number;
  blurRadius?: number;
  // Wiggle
  angleMax?: number;
  decay?: number;
  // RGB Glow
  speed?: number;
  saturation?: number;
  // Shake
  shakeIntensity?: number;
  // Swing
  swingAngle?: number;
}

export interface DepthEffect {
  type: DepthType;
  intensity?: number;
  trigger?: TriggerType;
  // Parallax
  invert?: boolean;
  smoothFactor?: number;
  // Tilt
  maxAngleX?: number;
  maxAngleY?: number;
  perspective?: number;
  scaleOnHover?: number;
  // Pop Out
  depthScale?: number;
  durationMs?: number;
  easing?: string;
}

export interface ParticleEffect {
  type: ParticleType;
  count?: number;
  color?: string;
  colors?: string[];
  colorVariance?: number;
  sizeMin?: number;
  sizeMax?: number;
  size?: number;
  speed?: number;
  lifetimeMs?: number;
  spawnArea?: SpawnArea;
  // Confetti
  gravity?: number;
  spread?: number;
  // Hearts
  floatSpeed?: number;
  swayAmount?: number;
  // Fire
  turbulence?: number;
}

export interface AnimationConfig {
  entry: EntryAnimation | null;
  loop: LoopAnimation | null;
  depthEffect: DepthEffect | null;
  particles: ParticleEffect | null;
  durationMs: number;
  loopCount: number;
  effects?: string[];
}

// ============================================================================
// API Response Types
// ============================================================================

export interface AnimationExport {
  id: string;
  format: ExportFormat;
  url: string;
  fileSize: number | null;
  width: number;
  height: number;
  fps: number;
  durationMs: number;
  obsBrowserUrl: string | null;
  createdAt: string;
}

export interface AnimationProject {
  id: string;
  userId: string;
  sourceAssetId: string | null;
  sourceUrl: string;
  depthMapUrl: string | null;
  depthMapGeneratedAt: string | null;
  transparentSourceUrl: string | null;
  animationConfig: AnimationConfig;
  exportFormat: ExportFormat;
  exportWidth: number;
  exportHeight: number;
  exportFps: number;
  exports: AnimationExport[];
  name: string;
  thumbnailUrl: string | null;
  requiresTier: 'pro' | 'studio';
  createdAt: string;
  updatedAt: string;
}

export interface AnimationProjectList {
  projects: AnimationProject[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AnimationPreset {
  id: string;
  userId: string | null;
  name: string;
  description: string | null;
  category: AnimationCategory;
  config: Record<string, unknown>;
  previewUrl: string | null;
  icon: string | null;
}

export interface DepthMapJob {
  jobId: string;
  status: JobStatus;
  progress: number | null;
  depthMapUrl: string | null;
  errorMessage: string | null;
  estimatedSeconds: number | null;
}

export interface OBSBrowserSource {
  url: string;
  width: number;
  height: number;
  instructions: string;
}

export interface ExportClientResponse {
  exportMode: 'client';
  animationConfig: AnimationConfig;
  depthMapUrl: string | null;
  sourceUrl: string;
  instructions: string;
}

export interface ExportServerResponse {
  exportMode: 'server';
  jobId: string;
  status: JobStatus;
}

export type ExportResponse = ExportClientResponse | ExportServerResponse;

// ============================================================================
// Request Types
// ============================================================================

export interface CreateAnimationProjectRequest {
  sourceAssetId?: string;
  sourceUrl: string;
  name?: string;
  animationConfig?: Partial<AnimationConfig>;
}

export interface UpdateAnimationProjectRequest {
  name?: string;
  animationConfig?: Partial<AnimationConfig>;
  exportFormat?: ExportFormat;
  exportWidth?: number;
  exportHeight?: number;
  exportFps?: number;
}

export interface ExportAnimationRequest {
  format?: ExportFormat;
  width?: number;
  height?: number;
  fps?: number;
  useServerExport?: boolean;
}

export interface CreatePresetRequest {
  name: string;
  description?: string;
  category: AnimationCategory;
  config: Record<string, unknown>;
}

// ============================================================================
// Transform Functions (snake_case → camelCase)
// ============================================================================

export function transformAnimationProject(data: any): AnimationProject {
  return {
    id: data.id,
    userId: data.user_id,
    sourceAssetId: data.source_asset_id,
    sourceUrl: data.source_url,
    depthMapUrl: data.depth_map_url,
    depthMapGeneratedAt: data.depth_map_generated_at,
    transparentSourceUrl: data.transparent_source_url,
    animationConfig: transformAnimationConfig(data.animation_config),
    exportFormat: data.export_format,
    exportWidth: data.export_width,
    exportHeight: data.export_height,
    exportFps: data.export_fps,
    exports: (data.exports || []).map(transformAnimationExport),
    name: data.name,
    thumbnailUrl: data.thumbnail_url,
    requiresTier: data.requires_tier || 'pro',
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export function transformAnimationConfig(data: any): AnimationConfig {
  if (!data) {
    return {
      entry: null,
      loop: null,
      depthEffect: null,
      particles: null,
      durationMs: 3000,
      loopCount: 1,
    };
  }
  return {
    entry: data.entry ? transformEntryAnimation(data.entry) : null,
    loop: data.loop ? transformLoopAnimation(data.loop) : null,
    depthEffect: data.depth_effect ? transformDepthEffect(data.depth_effect) : null,
    particles: data.particles ? transformParticleEffect(data.particles) : null,
    durationMs: data.duration_ms ?? 3000,
    loopCount: data.loop_count ?? 1,
    effects: data.effects,
  };
}

export function transformEntryAnimation(data: any): EntryAnimation {
  return {
    type: data.type,
    durationMs: data.duration_ms,
    easing: data.easing,
    scaleFrom: data.scale_from,
    opacityFrom: data.opacity_from,
    rotationFrom: data.rotation_from,
    direction: data.direction,
    distancePercent: data.distance_percent,
    bounce: data.bounce,
    glitchIntensity: data.glitch_intensity,
    bounces: data.bounces,
    height: data.height,
    rotations: data.rotations,
    dropHeight: data.drop_height,
    seed: data.seed,
    rgbSplit: data.rgb_split,
    scanlines: data.scanlines,
  };
}

export function transformLoopAnimation(data: any): LoopAnimation {
  return {
    type: data.type,
    frequency: data.frequency,
    easing: data.easing,
    amplitudeY: data.amplitude_y,
    amplitudeX: data.amplitude_x,
    phaseOffset: data.phase_offset,
    scaleMin: data.scale_min,
    scaleMax: data.scale_max,
    color: data.color,
    intensityMin: data.intensity_min,
    intensityMax: data.intensity_max,
    blurRadius: data.blur_radius,
    angleMax: data.angle_max,
    decay: data.decay,
    speed: data.speed,
    saturation: data.saturation,
    shakeIntensity: data.shake_intensity,
    swingAngle: data.swing_angle,
  };
}

export function transformDepthEffect(data: any): DepthEffect {
  return {
    type: data.type,
    intensity: data.intensity,
    trigger: data.trigger,
    invert: data.invert,
    smoothFactor: data.smooth_factor,
    maxAngleX: data.max_angle_x,
    maxAngleY: data.max_angle_y,
    perspective: data.perspective,
    scaleOnHover: data.scale_on_hover,
    depthScale: data.depth_scale,
    durationMs: data.duration_ms,
    easing: data.easing,
  };
}

export function transformParticleEffect(data: any): ParticleEffect {
  return {
    type: data.type,
    count: data.count,
    color: data.color,
    colors: data.colors,
    colorVariance: data.color_variance,
    sizeMin: data.size_min,
    sizeMax: data.size_max,
    size: data.size,
    speed: data.speed,
    lifetimeMs: data.lifetime_ms,
    spawnArea: data.spawn_area,
    gravity: data.gravity,
    spread: data.spread,
    floatSpeed: data.float_speed,
    swayAmount: data.sway_amount,
    turbulence: data.turbulence,
  };
}

export function transformAnimationExport(data: any): AnimationExport {
  return {
    id: data.id,
    format: data.format,
    url: data.url,
    fileSize: data.file_size,
    width: data.width,
    height: data.height,
    fps: data.fps,
    durationMs: data.duration_ms,
    obsBrowserUrl: data.obs_browser_url,
    createdAt: data.created_at,
  };
}

export function transformAnimationPreset(data: any): AnimationPreset {
  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    description: data.description,
    category: data.category,
    config: transformPresetConfig(data.config, data.category),
    previewUrl: data.preview_url,
    icon: data.icon,
  };
}

/**
 * Transform preset config from snake_case to camelCase based on category
 */
function transformPresetConfig(config: any, category: string): Record<string, unknown> {
  if (!config) return {};
  
  // Generic snake_case to camelCase converter
  const toCamelCase = (str: string) => 
    str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  
  const transformed: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(config)) {
    transformed[toCamelCase(key)] = value;
  }
  
  return transformed;
}

export function transformDepthMapJob(data: any): DepthMapJob {
  return {
    jobId: data.job_id,
    status: data.status,
    progress: data.progress,
    depthMapUrl: data.depth_map_url,
    errorMessage: data.error_message,
    estimatedSeconds: data.estimated_seconds,
  };
}

export function transformOBSBrowserSource(data: any): OBSBrowserSource {
  return {
    url: data.url,
    width: data.width,
    height: data.height,
    instructions: data.instructions,
  };
}

// ============================================================================
// AI Animation Suggestions Types
// ============================================================================

export type StreamEventType =
  | 'new_subscriber'
  | 'raid'
  | 'donation_small'
  | 'donation_medium'
  | 'donation_large'
  | 'new_follower'
  | 'milestone'
  | 'bits'
  | 'gift_sub';

export interface AnimationSuggestion {
  vibe: string;
  recommendedPreset: string;
  recommendedEvent: StreamEventType | null;
  config: AnimationConfig;
  reasoning: string;
  alternatives: string[];
}

export interface AnimationSuggestionResponse {
  assetId: string;
  suggestions: AnimationSuggestion | null;
  generatedAt: string | null;
}

export interface StreamEventPreset {
  id: string;
  eventType: StreamEventType;
  name: string;
  description: string | null;
  icon: string | null;
  recommendedDurationMs: number;
  animationConfig: AnimationConfig;
  userId: string | null;
}

export interface StreamEventPresetsList {
  presets: StreamEventPreset[];
}

// Transform functions for suggestions
export function transformAnimationSuggestion(data: any): AnimationSuggestion {
  return {
    vibe: data.vibe,
    recommendedPreset: data.recommended_preset,
    recommendedEvent: data.recommended_event,
    config: transformAnimationConfig(data.config),
    reasoning: data.reasoning,
    alternatives: data.alternatives || [],
  };
}

export function transformAnimationSuggestionResponse(data: any): AnimationSuggestionResponse {
  return {
    assetId: data.asset_id,
    suggestions: data.suggestions ? transformAnimationSuggestion(data.suggestions) : null,
    generatedAt: data.generated_at,
  };
}

export function transformStreamEventPreset(data: any): StreamEventPreset {
  return {
    id: data.id,
    eventType: data.event_type,
    name: data.name,
    description: data.description,
    icon: data.icon,
    recommendedDurationMs: data.recommended_duration_ms,
    animationConfig: transformAnimationConfig(data.animation_config),
    userId: data.user_id,
  };
}

// ============================================================================
// Reverse Transform Functions (camelCase → snake_case for requests)
// ============================================================================

export function toSnakeCaseAnimationConfig(config: Partial<AnimationConfig>): any {
  return {
    entry: config.entry ? toSnakeCaseEntry(config.entry) : null,
    loop: config.loop ? toSnakeCaseLoop(config.loop) : null,
    depth_effect: config.depthEffect ? toSnakeCaseDepth(config.depthEffect) : null,
    particles: config.particles ? toSnakeCaseParticles(config.particles) : null,
    duration_ms: config.durationMs,
    loop_count: config.loopCount,
    effects: config.effects,
  };
}

function toSnakeCaseEntry(entry: EntryAnimation): any {
  return {
    type: entry.type,
    duration_ms: entry.durationMs,
    easing: entry.easing,
    scale_from: entry.scaleFrom,
    opacity_from: entry.opacityFrom,
    rotation_from: entry.rotationFrom,
    direction: entry.direction,
    distance_percent: entry.distancePercent,
    bounce: entry.bounce,
    glitch_intensity: entry.glitchIntensity,
    bounces: entry.bounces,
    height: entry.height,
    rotations: entry.rotations,
    drop_height: entry.dropHeight,
    seed: entry.seed,
    rgb_split: entry.rgbSplit,
    scanlines: entry.scanlines,
  };
}

function toSnakeCaseLoop(loop: LoopAnimation): any {
  return {
    type: loop.type,
    frequency: loop.frequency,
    easing: loop.easing,
    amplitude_y: loop.amplitudeY,
    amplitude_x: loop.amplitudeX,
    phase_offset: loop.phaseOffset,
    scale_min: loop.scaleMin,
    scale_max: loop.scaleMax,
    color: loop.color,
    intensity_min: loop.intensityMin,
    intensity_max: loop.intensityMax,
    blur_radius: loop.blurRadius,
    angle_max: loop.angleMax,
    decay: loop.decay,
    speed: loop.speed,
    saturation: loop.saturation,
    shake_intensity: loop.shakeIntensity,
    swing_angle: loop.swingAngle,
  };
}

function toSnakeCaseDepth(depth: DepthEffect): any {
  return {
    type: depth.type,
    intensity: depth.intensity,
    trigger: depth.trigger,
    invert: depth.invert,
    smooth_factor: depth.smoothFactor,
    max_angle_x: depth.maxAngleX,
    max_angle_y: depth.maxAngleY,
    perspective: depth.perspective,
    scale_on_hover: depth.scaleOnHover,
    depth_scale: depth.depthScale,
    duration_ms: depth.durationMs,
    easing: depth.easing,
  };
}

function toSnakeCaseParticles(particles: ParticleEffect): any {
  return {
    type: particles.type,
    count: particles.count,
    color: particles.color,
    colors: particles.colors,
    color_variance: particles.colorVariance,
    size_min: particles.sizeMin,
    size_max: particles.sizeMax,
    size: particles.size,
    speed: particles.speed,
    lifetime_ms: particles.lifetimeMs,
    spawn_area: particles.spawnArea,
    gravity: particles.gravity,
    spread: particles.spread,
    float_speed: particles.floatSpeed,
    sway_amount: particles.swayAmount,
    turbulence: particles.turbulence,
  };
}
