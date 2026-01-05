/**
 * Line Stabilization Utility
 * 
 * Implements smooth line drawing for mouse users.
 * Uses a moving average algorithm to reduce jitter and create smoother strokes.
 */

export interface Point {
  x: number;
  y: number;
}

export interface StabilizationConfig {
  /** Stabilization strength (0-100). 0 = off, 100 = maximum smoothing */
  strength: number;
  /** Number of points to use for averaging (derived from strength) */
  windowSize: number;
  /** Minimum distance between points to record */
  minDistance: number;
}

/**
 * Calculate stabilization config from strength value
 */
export function getStabilizationConfig(strength: number): StabilizationConfig {
  // Clamp strength to 0-100
  const s = Math.max(0, Math.min(100, strength));
  
  // Window size: 1 (no smoothing) to 12 (heavy smoothing)
  const windowSize = Math.round(1 + (s / 100) * 11);
  
  // Min distance: lower strength = record more points
  const minDistance = 0.2 + (s / 100) * 0.8;
  
  return {
    strength: s,
    windowSize,
    minDistance,
  };
}

/**
 * Line Stabilizer class for managing smooth drawing
 */
export class LineStabilizer {
  private config: StabilizationConfig;
  private pointBuffer: Point[] = [];
  private outputPoints: Point[] = [];
  
  constructor(strength: number = 50) {
    this.config = getStabilizationConfig(strength);
  }
  
  /**
   * Update stabilization strength
   */
  setStrength(strength: number): void {
    this.config = getStabilizationConfig(strength);
  }
  
  /**
   * Start a new stroke
   */
  startStroke(point: Point): Point[] {
    this.pointBuffer = [point];
    this.outputPoints = [point];
    return this.outputPoints;
  }
  
  /**
   * Add a point to the current stroke
   * Returns the smoothed output points
   */
  addPoint(point: Point): Point[] {
    if (this.config.strength === 0) {
      // No stabilization - just add the point
      this.outputPoints.push(point);
      return this.outputPoints;
    }
    
    // Check minimum distance from last point
    const lastOutput = this.outputPoints[this.outputPoints.length - 1];
    const dist = Math.sqrt(
      Math.pow(point.x - lastOutput.x, 2) + 
      Math.pow(point.y - lastOutput.y, 2)
    );
    
    if (dist < this.config.minDistance) {
      return this.outputPoints;
    }
    
    // Add to buffer
    this.pointBuffer.push(point);
    
    // Keep buffer at window size
    if (this.pointBuffer.length > this.config.windowSize) {
      this.pointBuffer.shift();
    }
    
    // Calculate smoothed point using weighted moving average
    const smoothedPoint = this.calculateSmoothedPoint();
    this.outputPoints.push(smoothedPoint);
    
    return this.outputPoints;
  }
  
  /**
   * End the stroke and return final points
   * Adds remaining buffered points with decreasing smoothing
   */
  endStroke(): Point[] {
    if (this.config.strength === 0 || this.pointBuffer.length <= 1) {
      return this.outputPoints;
    }
    
    // Flush remaining buffer with decreasing smoothing
    while (this.pointBuffer.length > 1) {
      this.pointBuffer.shift();
      const smoothedPoint = this.calculateSmoothedPoint();
      
      // Only add if different enough from last point
      const lastOutput = this.outputPoints[this.outputPoints.length - 1];
      const dist = Math.sqrt(
        Math.pow(smoothedPoint.x - lastOutput.x, 2) + 
        Math.pow(smoothedPoint.y - lastOutput.y, 2)
      );
      
      if (dist >= this.config.minDistance * 0.5) {
        this.outputPoints.push(smoothedPoint);
      }
    }
    
    // Add final point
    if (this.pointBuffer.length === 1) {
      const lastOutput = this.outputPoints[this.outputPoints.length - 1];
      const finalPoint = this.pointBuffer[0];
      const dist = Math.sqrt(
        Math.pow(finalPoint.x - lastOutput.x, 2) + 
        Math.pow(finalPoint.y - lastOutput.y, 2)
      );
      
      if (dist >= this.config.minDistance * 0.25) {
        this.outputPoints.push(finalPoint);
      }
    }
    
    return this.outputPoints;
  }
  
  /**
   * Calculate smoothed point from buffer using weighted average
   * More recent points have higher weight
   */
  private calculateSmoothedPoint(): Point {
    if (this.pointBuffer.length === 0) {
      return { x: 0, y: 0 };
    }
    
    if (this.pointBuffer.length === 1) {
      return { ...this.pointBuffer[0] };
    }
    
    let totalWeight = 0;
    let sumX = 0;
    let sumY = 0;
    
    // Exponential weighting - more recent points have higher weight
    for (let i = 0; i < this.pointBuffer.length; i++) {
      // Weight increases exponentially towards the end
      const weight = Math.pow(2, i);
      totalWeight += weight;
      sumX += this.pointBuffer[i].x * weight;
      sumY += this.pointBuffer[i].y * weight;
    }
    
    return {
      x: sumX / totalWeight,
      y: sumY / totalWeight,
    };
  }
  
  /**
   * Get current output points
   */
  getPoints(): Point[] {
    return [...this.outputPoints];
  }
  
  /**
   * Reset the stabilizer
   */
  reset(): void {
    this.pointBuffer = [];
    this.outputPoints = [];
  }
}

/**
 * Simplify a path by removing points that are too close together
 * Uses Ramer-Douglas-Peucker algorithm
 */
export function simplifyPath(points: Point[], tolerance: number = 0.5): Point[] {
  if (points.length <= 2) return points;
  
  // Find the point with the maximum distance from the line between first and last
  let maxDist = 0;
  let maxIndex = 0;
  
  const first = points[0];
  const last = points[points.length - 1];
  
  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], first, last);
    if (dist > maxDist) {
      maxDist = dist;
      maxIndex = i;
    }
  }
  
  // If max distance is greater than tolerance, recursively simplify
  if (maxDist > tolerance) {
    const left = simplifyPath(points.slice(0, maxIndex + 1), tolerance);
    const right = simplifyPath(points.slice(maxIndex), tolerance);
    
    // Combine results (remove duplicate point at junction)
    return [...left.slice(0, -1), ...right];
  }
  
  // All points are within tolerance, return just endpoints
  return [first, last];
}

/**
 * Calculate perpendicular distance from a point to a line
 */
function perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  
  // Line length squared
  const lineLengthSq = dx * dx + dy * dy;
  
  if (lineLengthSq === 0) {
    // Line is a point
    return Math.sqrt(
      Math.pow(point.x - lineStart.x, 2) + 
      Math.pow(point.y - lineStart.y, 2)
    );
  }
  
  // Calculate perpendicular distance
  const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lineLengthSq;
  
  if (t < 0) {
    return Math.sqrt(
      Math.pow(point.x - lineStart.x, 2) + 
      Math.pow(point.y - lineStart.y, 2)
    );
  }
  
  if (t > 1) {
    return Math.sqrt(
      Math.pow(point.x - lineEnd.x, 2) + 
      Math.pow(point.y - lineEnd.y, 2)
    );
  }
  
  const projX = lineStart.x + t * dx;
  const projY = lineStart.y + t * dy;
  
  return Math.sqrt(
    Math.pow(point.x - projX, 2) + 
    Math.pow(point.y - projY, 2)
  );
}

/**
 * Smooth a path using Catmull-Rom spline interpolation
 */
export function smoothPathCatmullRom(points: Point[], segments: number = 10): Point[] {
  if (points.length < 4) return points;
  
  const result: Point[] = [];
  
  // Add first point
  result.push(points[0]);
  
  // Interpolate between each pair of points
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[Math.min(points.length - 1, i + 1)];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    
    for (let t = 1; t <= segments; t++) {
      const tNorm = t / segments;
      const point = catmullRomPoint(p0, p1, p2, p3, tNorm);
      result.push(point);
    }
  }
  
  return result;
}

/**
 * Calculate a point on a Catmull-Rom spline
 */
function catmullRomPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const t2 = t * t;
  const t3 = t2 * t;
  
  const x = 0.5 * (
    (2 * p1.x) +
    (-p0.x + p2.x) * t +
    (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
    (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
  );
  
  const y = 0.5 * (
    (2 * p1.y) +
    (-p0.y + p2.y) * t +
    (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
    (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
  );
  
  return { x, y };
}

export default LineStabilizer;
