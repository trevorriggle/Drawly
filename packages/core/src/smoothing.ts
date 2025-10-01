/**
 * Stroke smoothing utilities
 * Implements various algorithms for smoothing drawn strokes
 */

import type { StrokePoint } from './types.js';

/**
 * Simple moving average smoothing
 * Fast but can reduce detail
 */
export function smoothMovingAverage(
  points: StrokePoint[],
  windowSize = 3
): StrokePoint[] {
  if (points.length < windowSize) {
    return points;
  }

  const smoothed: StrokePoint[] = [];
  const halfWindow = Math.floor(windowSize / 2);

  for (let i = 0; i < points.length; i++) {
    const start = Math.max(0, i - halfWindow);
    const end = Math.min(points.length, i + halfWindow + 1);
    const window = points.slice(start, end);

    const avgX = window.reduce((sum, p) => sum + p.x, 0) / window.length;
    const avgY = window.reduce((sum, p) => sum + p.y, 0) / window.length;
    const avgPressure =
      window.reduce((sum, p) => sum + p.pressure, 0) / window.length;

    smoothed.push({
      x: avgX,
      y: avgY,
      pressure: avgPressure,
      timestamp: points[i].timestamp,
    });
  }

  return smoothed;
}

/**
 * Catmull-Rom spline interpolation
 * Produces smooth curves through all points
 */
export function smoothCatmullRom(
  points: StrokePoint[],
  segments = 4
): StrokePoint[] {
  if (points.length < 4) {
    return points;
  }

  const smoothed: StrokePoint[] = [];

  // Add first point
  smoothed.push(points[0]);

  for (let i = 0; i < points.length - 3; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const p2 = points[i + 2];
    const p3 = points[i + 3];

    for (let t = 0; t <= segments; t++) {
      const u = t / segments;
      const u2 = u * u;
      const u3 = u2 * u;

      // Catmull-Rom formula
      const x =
        0.5 *
        (2 * p1.x +
          (-p0.x + p2.x) * u +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * u2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * u3);

      const y =
        0.5 *
        (2 * p1.y +
          (-p0.y + p2.y) * u +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * u2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * u3);

      const pressure =
        0.5 *
        (2 * p1.pressure +
          (-p0.pressure + p2.pressure) * u +
          (2 * p0.pressure -
            5 * p1.pressure +
            4 * p2.pressure -
            p3.pressure) *
            u2 +
          (-p0.pressure +
            3 * p1.pressure -
            3 * p2.pressure +
            p3.pressure) *
            u3);

      const timestamp = p1.timestamp + (p2.timestamp - p1.timestamp) * u;

      smoothed.push({ x, y, pressure, timestamp });
    }
  }

  // Add last two points
  smoothed.push(points[points.length - 2]);
  smoothed.push(points[points.length - 1]);

  return smoothed;
}

/**
 * Simplify stroke by removing redundant points (Douglas-Peucker algorithm)
 * Useful for reducing file size while maintaining shape
 */
export function simplifyStroke(
  points: StrokePoint[],
  tolerance = 2.0
): StrokePoint[] {
  if (points.length <= 2) {
    return points;
  }

  // Find point with maximum distance from line
  let maxDistance = 0;
  let index = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const distance = perpendicularDistance(points[i], points[0], points[end]);
    if (distance > maxDistance) {
      maxDistance = distance;
      index = i;
    }
  }

  // If max distance is greater than tolerance, recursively simplify
  if (maxDistance > tolerance) {
    const left = simplifyStroke(points.slice(0, index + 1), tolerance);
    const right = simplifyStroke(points.slice(index), tolerance);

    // Combine results (remove duplicate middle point)
    return [...left.slice(0, -1), ...right];
  } else {
    // All points between start and end can be removed
    return [points[0], points[end]];
  }
}

/**
 * Calculate perpendicular distance from point to line
 */
function perpendicularDistance(
  point: StrokePoint,
  lineStart: StrokePoint,
  lineEnd: StrokePoint
): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;

  const numerator = Math.abs(
    dy * point.x - dx * point.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x
  );

  const denominator = Math.sqrt(dx * dx + dy * dy);

  return numerator / denominator;
}

/**
 * Exponential moving average (1-Euro filter simplified)
 * Good for real-time smoothing with low latency
 */
export function smoothExponential(
  points: StrokePoint[],
  alpha = 0.3
): StrokePoint[] {
  if (points.length === 0) {
    return points;
  }

  const smoothed: StrokePoint[] = [points[0]];

  for (let i = 1; i < points.length; i++) {
    const prev = smoothed[i - 1];
    const curr = points[i];

    smoothed.push({
      x: alpha * curr.x + (1 - alpha) * prev.x,
      y: alpha * curr.y + (1 - alpha) * prev.y,
      pressure: alpha * curr.pressure + (1 - alpha) * prev.pressure,
      timestamp: curr.timestamp,
    });
  }

  return smoothed;
}

/**
 * Interpolate additional points between existing points
 * Useful for creating smoother strokes when rendering
 */
export function interpolatePoints(
  points: StrokePoint[],
  targetSpacing = 5
): StrokePoint[] {
  if (points.length < 2) {
    return points;
  }

  const interpolated: StrokePoint[] = [points[0]];

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const steps = Math.max(1, Math.floor(distance / targetSpacing));

    for (let j = 1; j <= steps; j++) {
      const t = j / steps;
      interpolated.push({
        x: p1.x + dx * t,
        y: p1.y + dy * t,
        pressure: p1.pressure + (p2.pressure - p1.pressure) * t,
        timestamp: p1.timestamp + (p2.timestamp - p1.timestamp) * t,
      });
    }
  }

  return interpolated;
}
