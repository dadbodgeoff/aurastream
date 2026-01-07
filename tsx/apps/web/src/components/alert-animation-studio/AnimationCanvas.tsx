'use client';

/**
 * Animation Canvas - Enterprise WebGL Implementation
 *
 * Three.js-powered 3D animation canvas with:
 * - Depth-based parallax using custom shaders
 * - Spring physics for smooth motion
 * - Entry/loop/particle animations
 * - Real-time preview and export support
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import type { AnimationConfig } from '@aurastream/api-client';
import type { TransformState, ToolMode } from './CanvasToolbar';
import {
  DepthParallaxEngine,
  type ParallaxConfig,
} from './engine/DepthParallaxEngine';
import {
  depthParallaxVertexShader,
  depthParallaxFragmentShader,
} from './shaders/depthParallax';

interface AnimationCanvasProps {
  sourceUrl: string;
  depthMapUrl: string | null;
  config: AnimationConfig;
  canvasRef?: React.RefObject<HTMLCanvasElement>;
  isPlaying?: boolean;
  currentTime?: number;
  onTimeUpdate?: (time: number) => void;
  transform?: TransformState;
  toolMode?: ToolMode;
  onTransformChange?: (transform: TransformState) => void;
  /** V2: Timeline evaluated values from useTimeline hook */
  timelineValues?: Record<string, number>;
  /** V2: Audio analysis data from useAnimationStudioV2 */
  audioAnalysis?: import('./engine/audio/types').AudioAnalysis | null;
  /** V2: Audio reactive mappings */
  audioMappings?: import('./engine/audio/types').AudioReactiveMapping[];
}

export function AnimationCanvas({
  sourceUrl,
  depthMapUrl,
  config,
  canvasRef: externalCanvasRef,
  isPlaying = false,
  currentTime = 0,
  onTimeUpdate,
  transform,
  toolMode = 'select',
  onTransformChange,
  timelineValues,
  audioAnalysis,
  audioMappings,
}: AnimationCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const internalCanvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const engineRef = useRef<DepthParallaxEngine | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const textureRef = useRef<THREE.Texture | null>(null);
  const depthTextureRef = useRef<THREE.Texture | null>(null);

  const [isInitialized, setIsInitialized] = useState(false);
  const [depthLoaded, setDepthLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);

  // Use external canvas ref if provided, otherwise internal
  const canvasRef = externalCanvasRef || internalCanvasRef;

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 400;

    // Create scene
    const scene = new THREE.Scene();
    scene.background = null; // Transparent background
    sceneRef.current = scene;

    // Create orthographic camera for 2D-style rendering
    const aspect = width / height;
    const frustumSize = 2;
    const camera = new THREE.OrthographicCamera(
      (frustumSize * aspect) / -2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      frustumSize / -2,
      0.1,
      1000
    );
    camera.position.z = 5;
    cameraRef.current = camera;

    // Create renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true, // Required for export
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Initialize depth parallax engine
    const parallaxConfig: ParallaxConfig = {
      intensity: config.depthEffect?.intensity ?? 0.5,
      smoothFactor: 0.1,
      maxOffset: config.depthEffect?.depthScale ?? 30,
      perspective: config.depthEffect?.perspective ?? 1000,
      trigger: (config.depthEffect?.trigger as 'mouse' | 'auto') ?? 'mouse',
      invert: config.depthEffect?.invert ?? false,
    };
    engineRef.current = new DepthParallaxEngine(parallaxConfig);

    setIsInitialized(true);

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      const newAspect = w / h;

      cameraRef.current.left = (frustumSize * newAspect) / -2;
      cameraRef.current.right = (frustumSize * newAspect) / 2;
      cameraRef.current.updateProjectionMatrix();

      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);


  // Load source texture
  useEffect(() => {
    if (!isInitialized || !sceneRef.current) return;

    const textureLoader = new THREE.TextureLoader();
    textureLoader.crossOrigin = 'anonymous';

    textureLoader.load(
      sourceUrl,
      (texture) => {
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        textureRef.current = texture;

        // Create or update mesh with texture
        createMesh(texture, depthTextureRef.current);
      },
      undefined,
      (err) => {
        console.error('Failed to load source texture:', err);
        setError('Failed to load image');
      }
    );

    return () => {
      if (textureRef.current) {
        textureRef.current.dispose();
      }
    };
  }, [sourceUrl, isInitialized]);

  // Load depth map texture
  useEffect(() => {
    if (!isInitialized || !depthMapUrl) {
      setDepthLoaded(false);
      return;
    }

    const textureLoader = new THREE.TextureLoader();
    textureLoader.crossOrigin = 'anonymous';

    textureLoader.load(
      depthMapUrl,
      (texture) => {
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        depthTextureRef.current = texture;
        setDepthLoaded(true);

        // Update material with depth texture
        if (materialRef.current) {
          materialRef.current.uniforms.uDepthMap.value = texture;
          materialRef.current.needsUpdate = true;
        }
      },
      undefined,
      (err) => {
        console.error('Failed to load depth map:', err);
        setDepthLoaded(false);
      }
    );

    return () => {
      if (depthTextureRef.current) {
        depthTextureRef.current.dispose();
      }
    };
  }, [depthMapUrl, isInitialized]);

  // Create mesh with shader material
  const createMesh = useCallback(
    (texture: THREE.Texture, depthTexture: THREE.Texture | null) => {
      if (!sceneRef.current) return;

      // Remove existing mesh
      if (meshRef.current) {
        sceneRef.current.remove(meshRef.current);
        meshRef.current.geometry.dispose();
        if (materialRef.current) {
          materialRef.current.dispose();
        }
      }

      // Calculate aspect ratio from texture
      const img = texture.image as HTMLImageElement;
      const imageAspect = img.width / img.height;
      const planeWidth = imageAspect > 1 ? 1.8 : 1.8 * imageAspect;
      const planeHeight = imageAspect > 1 ? 1.8 / imageAspect : 1.8;

      // Create plane geometry with subdivisions for depth displacement
      const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight, 64, 64);

      // Create shader material
      const uniforms = {
        uTime: { value: 0 },
        uTexture: { value: texture },
        uDepthMap: { value: depthTexture },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uParallaxIntensity: { value: config.depthEffect?.intensity ?? 0.5 },
        uDepthScale: { value: (config.depthEffect?.depthScale ?? 30) / 100 },
        uSmoothFactor: { value: 0.1 },
        uGlowIntensity: { value: config.loop?.type === 'glow' ? (config.loop.intensityMax ?? 0.5) : 0 },
        uGlowColor: { value: new THREE.Color(config.loop?.color ?? '#ffffff') },
        uOpacity: { value: 1.0 },
        uEdgeGlow: { value: 0.3 },
        uAmbientLight: { value: new THREE.Color(1, 1, 1) },
      };

      const material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: depthParallaxVertexShader,
        fragmentShader: depthParallaxFragmentShader,
        transparent: true,
        side: THREE.DoubleSide,
      });

      materialRef.current = material;

      // Create mesh
      const mesh = new THREE.Mesh(geometry, material);
      meshRef.current = mesh;
      sceneRef.current.add(mesh);
    },
    [config.depthEffect, config.loop]
  );

  // Handle mouse movement for parallax
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !engineRef.current || !materialRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // Update shader uniform
    materialRef.current.uniforms.uMouse.value.set(x, y);

    // Update engine for spring physics
    const normalizedX = (x - 0.5) * 2;
    const normalizedY = (y - 0.5) * 2;
    engineRef.current.setInput(normalizedX, normalizedY);
    engineRef.current.setHovering(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (engineRef.current && materialRef.current) {
      engineRef.current.setInput(0, 0);
      engineRef.current.setHovering(false);
      materialRef.current.uniforms.uMouse.value.set(0.5, 0.5);
    }
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  // Pan drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (toolMode !== 'pan' || !transform || !onTransformChange) return;
    
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      offsetX: transform.offsetX,
      offsetY: transform.offsetY,
    };
  }, [toolMode, transform, onTransformChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  const handleDrag = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current || !transform || !onTransformChange) return;
    
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    
    onTransformChange({
      ...transform,
      offsetX: dragStartRef.current.offsetX + dx,
      offsetY: dragStartRef.current.offsetY + dy,
    });
  }, [isDragging, transform, onTransformChange]);

  // Wheel zoom handler
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (!transform || !onTransformChange) return;
    
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.25, Math.min(5, transform.scale * delta));
    
    onTransformChange({
      ...transform,
      scale: newScale,
    });
  }, [transform, onTransformChange]);


  // Animation loop
  useEffect(() => {
    if (!isInitialized || !rendererRef.current || !sceneRef.current || !cameraRef.current) return;

    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;

    if (!isPlaying) {
      // Still render one frame for static preview
      if (meshRef.current && materialRef.current && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        applyAnimationState(
          meshRef.current,
          materialRef.current,
          config,
          currentTime,
          false,
          rect.width || 512,
          rect.height || 512,
          0,
          0,
          false,
          timelineValues,
          audioAnalysis,
          audioMappings
        );
        renderer.render(scene, camera);
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    startTimeRef.current = performance.now() - currentTime;
    lastFrameTimeRef.current = performance.now();

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;

      // Calculate delta time for physics
      const deltaTime = (timestamp - lastFrameTimeRef.current) / 1000;
      lastFrameTimeRef.current = timestamp;

      // Update engine physics
      engineRef.current?.update(deltaTime);

      const elapsed = timestamp - startTimeRef.current;
      const loopedTime = elapsed % config.durationMs;

      onTimeUpdate?.(loopedTime);

      // Update shader time uniform
      if (materialRef.current) {
        materialRef.current.uniforms.uTime.value = elapsed / 1000;
      }

      // Apply animation state to mesh
      if (meshRef.current && materialRef.current) {
        applyAnimationState(
          meshRef.current,
          materialRef.current,
          config,
          loopedTime,
          true,
          512,
          512,
          0,
          0,
          false,
          timelineValues,
          audioAnalysis,
          audioMappings
        );
      }

      renderer.render(scene, camera);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, config, onTimeUpdate, isInitialized, currentTime, timelineValues, audioAnalysis, audioMappings]);

  // Auto-animate depth effect when not playing (subtle idle motion)
  useEffect(() => {
    if (isPlaying || !depthLoaded || !config.depthEffect || !isInitialized) return;
    if (config.depthEffect.trigger !== 'auto') return;

    let idleAnimationId: number | null = null;
    let time = 0;

    const idleAnimate = () => {
      time += 0.016;

      // Subtle automatic motion
      if (engineRef.current && materialRef.current) {
        const autoX = Math.sin(time * 0.5) * 0.3;
        const autoY = Math.cos(time * 0.7) * 0.2;
        engineRef.current.setInput(autoX, autoY);
        engineRef.current.update(0.016);

        materialRef.current.uniforms.uMouse.value.set(
          0.5 + autoX * 0.25,
          0.5 + autoY * 0.25
        );
        materialRef.current.uniforms.uTime.value = time;
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current && meshRef.current && materialRef.current) {
        applyAnimationState(
          meshRef.current,
          materialRef.current,
          config,
          currentTime,
          false,
          512,
          512,
          0,
          0,
          false,
          timelineValues,
          audioAnalysis,
          audioMappings
        );
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      idleAnimationId = requestAnimationFrame(idleAnimate);
    };

    idleAnimationId = requestAnimationFrame(idleAnimate);

    return () => {
      if (idleAnimationId) cancelAnimationFrame(idleAnimationId);
    };
  }, [isPlaying, depthLoaded, config, currentTime, isInitialized]);

  // Update config changes
  useEffect(() => {
    if (!materialRef.current || !engineRef.current) return;

    // Update parallax engine config
    const parallaxConfig: ParallaxConfig = {
      intensity: config.depthEffect?.intensity ?? 0.5,
      smoothFactor: 0.1,
      maxOffset: config.depthEffect?.depthScale ?? 30,
      perspective: config.depthEffect?.perspective ?? 1000,
      trigger: (config.depthEffect?.trigger as 'mouse' | 'auto') ?? 'mouse',
      invert: config.depthEffect?.invert ?? false,
    };

    // Recreate engine with new config
    engineRef.current = new DepthParallaxEngine(parallaxConfig);

    // Update shader uniforms
    materialRef.current.uniforms.uParallaxIntensity.value = config.depthEffect?.intensity ?? 0.5;
    materialRef.current.uniforms.uDepthScale.value = (config.depthEffect?.depthScale ?? 30) / 100;
    materialRef.current.uniforms.uGlowIntensity.value =
      config.loop?.type === 'glow' ? (config.loop.intensityMax ?? 0.5) : 0;
    if (config.loop?.color) {
      materialRef.current.uniforms.uGlowColor.value.set(config.loop.color);
    }
  }, [config]);

  // Apply external transform (zoom/pan from toolbar)
  useEffect(() => {
    if (!meshRef.current || !transform) return;
    
    // Apply scale from transform
    const baseScale = meshRef.current.userData.baseScale || { x: 1, y: 1, z: 1 };
    meshRef.current.scale.set(
      baseScale.x * transform.scale,
      baseScale.y * transform.scale,
      baseScale.z * transform.scale
    );
    
    // Apply offset (convert pixels to world units - approximate)
    const offsetScale = 0.002; // Adjust based on camera frustum
    meshRef.current.position.x = transform.offsetX * offsetScale;
    meshRef.current.position.y = -transform.offsetY * offsetScale; // Invert Y for screen coords
    
    // Re-render
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
  }, [transform]);

  return (
    <div
      ref={containerRef}
      className={`relative flex h-full w-full items-center justify-center overflow-hidden bg-gray-900/50 rounded-lg ${
        toolMode === 'pan' ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
      }`}
      onMouseMove={(e) => {
        handleMouseMove(e);
        if (isDragging) handleDrag(e);
      }}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      style={{
        minHeight: 400,
        perspective: config.depthEffect?.perspective ?? 1000,
      }}
    >
      {/* Hidden canvas for export */}
      <canvas ref={internalCanvasRef} width={512} height={512} className="hidden" />

      {/* Loading state */}
      {!isInitialized && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-2 text-white text-sm">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Initializing WebGL...
          </div>
        </div>
      )}

      {/* Depth map loading indicator */}
      {depthMapUrl && !depthLoaded && isInitialized && (
        <div className="absolute top-2 left-2 bg-yellow-600/80 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 z-10">
          <div className="w-2 h-2 border border-white border-t-transparent rounded-full animate-spin" />
          Loading depth map...
        </div>
      )}

      {/* Depth active indicator */}
      {depthLoaded && (
        <div className="absolute top-2 right-2 bg-purple-600/80 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 z-10">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          3D Depth Active
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900/50">
          <div className="text-white text-sm">{error}</div>
        </div>
      )}

      {/* Particle overlay */}
      {config.particles && (
        <ParticleOverlay config={config.particles} isPlaying={isPlaying} />
      )}
    </div>
  );
}


// ============================================================================
// Animation State Application (using modular animation system + V2 pipeline)
// ============================================================================

import {
  applyEntryAnimation,
  applyLoopAnimation,
  DEFAULT_TRANSFORM,
  type AnimationTransform,
  type AnimationContext,
  type EntryAnimationConfig,
  type LoopAnimationConfig,
} from './engine/animations';

import type {
  AudioAnalysis,
  AudioReactiveMapping,
} from './engine/audio/types';

function applyAnimationState(
  mesh: THREE.Mesh,
  material: THREE.ShaderMaterial,
  config: AnimationConfig,
  timeMs: number,
  isPlaying: boolean = true,
  canvasWidth: number = 512,
  canvasHeight: number = 512,
  mouseX: number = 0,
  mouseY: number = 0,
  isHovering: boolean = false,
  timelineValues?: Record<string, number>,
  audioAnalysis?: AudioAnalysis | null,
  audioMappings?: AudioReactiveMapping[]
): void {
  const t = timeMs / config.durationMs;
  
  // Start with default transform
  let transform: AnimationTransform = { ...DEFAULT_TRANSFORM };
  
  // When not playing, show the "resting" state (after entry animation completes)
  const showRestingState = !isPlaying && timeMs === 0;
  
  // Check if we should use V2 pipeline (when timeline or audio data is available)
  const useV2Pipeline = (timelineValues && Object.keys(timelineValues).length > 0) || 
                        (audioAnalysis && audioMappings && audioMappings.length > 0);
  
  if (useV2Pipeline) {
    // Apply timeline values directly to transform if available
    if (timelineValues && Object.keys(timelineValues).length > 0) {
      // Map timeline property names to transform properties
      if (timelineValues.scaleX !== undefined) transform.scaleX = timelineValues.scaleX;
      if (timelineValues.scaleY !== undefined) transform.scaleY = timelineValues.scaleY;
      if (timelineValues.scaleZ !== undefined) transform.scaleZ = timelineValues.scaleZ;
      if (timelineValues.scaleUniform !== undefined) {
        transform.scaleX = timelineValues.scaleUniform;
        transform.scaleY = timelineValues.scaleUniform;
        transform.scaleZ = timelineValues.scaleUniform;
      }
      if (timelineValues.positionX !== undefined) transform.positionX = timelineValues.positionX;
      if (timelineValues.positionY !== undefined) transform.positionY = timelineValues.positionY;
      if (timelineValues.positionZ !== undefined) transform.positionZ = timelineValues.positionZ;
      if (timelineValues.rotationX !== undefined) transform.rotationX = timelineValues.rotationX;
      if (timelineValues.rotationY !== undefined) transform.rotationY = timelineValues.rotationY;
      if (timelineValues.rotationZ !== undefined) transform.rotationZ = timelineValues.rotationZ;
      if (timelineValues.opacity !== undefined) transform.opacity = Math.max(0, Math.min(1, timelineValues.opacity));
    }
    
    // Apply audio reactivity if available
    if (audioAnalysis && audioMappings && audioMappings.length > 0) {
      for (const mapping of audioMappings) {
        if (!mapping.enabled) continue;
        
        // Get source value from audio analysis
        let sourceValue = 0;
        switch (mapping.source.type) {
          case 'energy':
            sourceValue = audioAnalysis.energy;
            break;
          case 'beat':
            sourceValue = audioAnalysis.timeSinceLastBeat < 50 ? 1 : Math.exp(-audioAnalysis.timeSinceLastBeat / 100);
            break;
          case 'beatPhase':
            sourceValue = audioAnalysis.beatPhase;
            break;
          case 'band':
            const bandSource = mapping.source as { type: 'band'; band: string };
            const band = audioAnalysis.bands.find(b => b.name === bandSource.band);
            sourceValue = band?.value ?? 0;
            break;
        }
        
        // Map input to output range
        const normalizedInput = Math.max(0, Math.min(1, 
          (sourceValue - mapping.inputMin) / (mapping.inputMax - mapping.inputMin)
        ));
        const processedInput = mapping.invert ? 1 - normalizedInput : normalizedInput;
        let outputValue = mapping.outputMin + processedInput * (mapping.outputMax - mapping.outputMin);
        
        if (mapping.clamp) {
          outputValue = Math.max(mapping.outputMin, Math.min(mapping.outputMax, outputValue));
        }
        
        // Apply to target property
        const target = mapping.target as keyof AnimationTransform;
        if (target in transform) {
          (transform as any)[target] = outputValue;
        }
      }
    }
    
    // Still apply entry/loop animations on top
    const context: AnimationContext = {
      t,
      timeMs,
      durationMs: config.durationMs,
      deltaTime: 0.016,
      isPlaying,
      mesh,
      material,
      canvasWidth,
      canvasHeight,
      mouseX,
      mouseY,
      isHovering,
    };
    
    // Apply entry animation
    if (config.entry && !showRestingState) {
      const entryConfig = config.entry as EntryAnimationConfig;
      transform = applyEntryAnimation(entryConfig, context, transform);
    }
    
    // Apply loop animation (after entry completes)
    const entryDuration = config.entry?.durationMs ?? 0;
    const entryNormalized = entryDuration / config.durationMs;
    
    if (config.loop && t > entryNormalized) {
      const loopT = (t - entryNormalized) / (1 - entryNormalized);
      const loopConfig = config.loop as LoopAnimationConfig;
      transform = applyLoopAnimation(loopConfig, context, transform, loopT);
    }
  } else {
    // Fallback to legacy animation system
    const context: AnimationContext = {
      t,
      timeMs,
      durationMs: config.durationMs,
      deltaTime: 0.016,
      isPlaying,
      mesh,
      material,
      canvasWidth,
      canvasHeight,
      mouseX,
      mouseY,
      isHovering,
    };
    
    // Apply entry animation
    if (config.entry && !showRestingState) {
      const entryConfig = config.entry as EntryAnimationConfig;
      transform = applyEntryAnimation(entryConfig, context, transform);
    }
    
    // Apply loop animation (after entry completes)
    const entryDuration = config.entry?.durationMs ?? 0;
    const entryNormalized = entryDuration / config.durationMs;
    
    if (config.loop && t > entryNormalized) {
      const loopT = (t - entryNormalized) / (1 - entryNormalized);
      const loopConfig = config.loop as LoopAnimationConfig;
      transform = applyLoopAnimation(loopConfig, context, transform, loopT);
    }
  }
  
  // Apply final transforms to mesh
  mesh.scale.set(transform.scaleX, transform.scaleY, transform.scaleZ);
  mesh.rotation.set(transform.rotationX, transform.rotationY, transform.rotationZ);
  mesh.position.set(transform.positionX, transform.positionY, transform.positionZ);
  material.uniforms.uOpacity.value = transform.opacity;
}

// ============================================================================
// Particle Overlay (CSS-based for now, can upgrade to Three.js particles)
// ============================================================================

interface ParticleOverlayProps {
  config: AnimationConfig['particles'];
  isPlaying: boolean;
}

function ParticleOverlay({ config, isPlaying }: ParticleOverlayProps) {
  if (!config) return null;

  const count = Math.min(config.count ?? 20, 50);
  const particles = Array.from({ length: count }, (_, i) => i);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-20">
      {particles.map((i) => (
        <Particle
          key={i}
          type={config.type}
          color={config.color ?? '#ffd700'}
          colors={config.colors}
          index={i}
          isPlaying={isPlaying}
          lifetimeMs={config.lifetimeMs ?? 2000}
          gravity={config.gravity}
          speed={config.speed ?? 1}
        />
      ))}
    </div>
  );
}

interface ParticleProps {
  type: string;
  color: string;
  colors?: string[];
  index: number;
  isPlaying: boolean;
  lifetimeMs: number;
  gravity?: number;
  speed: number;
}

function Particle({ type, color, colors, index, isPlaying, lifetimeMs, speed }: ParticleProps) {
  const delay = index * 0.08;
  const duration = (lifetimeMs / 1000) * (0.8 + Math.random() * 0.4);
  const left = Math.random() * 100;
  const size = 6 + Math.random() * 10;
  const particleColor = colors ? colors[index % colors.length] : color;

  const getEmoji = () => {
    switch (type) {
      case 'hearts': return '💕';
      case 'confetti': return '🎊';
      case 'fire': return '🔥';
      case 'sparkles': return '✨';
      case 'pixels': return '▪️';
      default: return '✨';
    }
  };

  const animationClass = type === 'confetti' 
    ? 'animate-confetti-fall' 
    : type === 'fire' 
    ? 'animate-fire-rise' 
    : 'animate-float-up';

  return (
    <span
      className={`absolute ${isPlaying ? animationClass : ''}`}
      style={{
        left: `${left}%`,
        bottom: type === 'fire' ? '10%' : '-20px',
        fontSize: `${size}px`,
        animationDelay: `${delay}s`,
        animationDuration: `${duration / speed}s`,
        opacity: isPlaying ? 1 : 0,
        color: particleColor,
        filter: type === 'sparkles' ? `drop-shadow(0 0 4px ${particleColor})` : undefined,
      }}
    >
      {getEmoji()}
    </span>
  );
}
