'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks';

// =============================================================================
// ChromaKeyImage Component
// Real-time green screen removal using canvas
// =============================================================================

interface ChromaKeyImageProps {
  src: string;
  alt: string;
  className?: string;
  /** Class name for the container div */
  containerClassName?: string;
  /** Green tolerance (0-255), higher = more aggressive removal */
  tolerance?: number;
  /** Smoothing for edge blending */
  smoothing?: number;
}

export function ChromaKeyImage({ 
  src, 
  alt, 
  className,
  containerClassName,
  tolerance = 100,
  smoothing = 20,
}: ChromaKeyImageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const isMobile = useIsMobile();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      // Constrain dimensions for mobile performance
      const maxWidth = isMobile ? 800 : 1600;
      const scale = Math.min(1, maxWidth / img.width);
      
      const scaledWidth = Math.floor(img.width * scale);
      const scaledHeight = Math.floor(img.height * scale);
      
      // Set canvas dimensions
      canvas.width = scaledWidth;
      canvas.height = scaledHeight;
      setDimensions({ width: scaledWidth, height: scaledHeight });
      
      // Draw image at scaled size
      ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Process each pixel - remove green screen
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Check if pixel is "green enough" to be considered green screen
        // Green screen typically has high G, lower R and B
        const isGreen = g > 100 && g > r * 1.2 && g > b * 1.2;
        const greenDominance = g - Math.max(r, b);
        
        if (isGreen && greenDominance > tolerance - 50) {
          // Calculate alpha based on how "green" the pixel is
          const alpha = Math.max(0, 255 - (greenDominance * (255 / smoothing)));
          data[i + 3] = Math.min(data[i + 3], alpha);
        }
        
        // Also handle bright/neon green (#00FF00 variants)
        if (g > 200 && r < 150 && b < 150) {
          const brightness = (g - Math.max(r, b)) / 255;
          data[i + 3] = Math.floor(data[i + 3] * (1 - brightness * 0.9));
        }
      }
      
      // Put processed image back
      ctx.putImageData(imageData, 0, 0);
      setIsLoaded(true);
    };

    img.onerror = () => {
      console.error('Failed to load image for chroma key:', src);
    };

    img.src = src;
  }, [src, tolerance, smoothing, isMobile]);

  return (
    <div ref={containerRef} className={cn("relative flex items-center justify-center", containerClassName)}>
      {/* Loading skeleton */}
      {!isLoaded && (
        <div 
          className={cn(
            'absolute inset-0 bg-background-elevated rounded-lg animate-pulse',
            className
          )}
          style={{ aspectRatio: '16/9' }}
        />
      )}
      <canvas
        ref={canvasRef}
        className={cn(
          'transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          width: 'auto',
          height: 'auto',
          objectFit: 'contain',
          filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))',
        }}
        aria-label={alt}
      />
    </div>
  );
}

export default ChromaKeyImage;
