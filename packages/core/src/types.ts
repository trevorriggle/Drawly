/**
 * Core drawing types - framework agnostic
 * These types define the fundamental data structures for strokes and tools
 */

/**
 * A single point in a stroke
 */
export interface StrokePoint {
  /** X coordinate in logical canvas space */
  x: number;
  /** Y coordinate in logical canvas space */
  y: number;
  /** Pressure (0-1), defaults to 1 for non-pressure-sensitive input */
  pressure: number;
  /** Timestamp in milliseconds (relative to stroke start or absolute) */
  timestamp: number;
}

/**
 * Blend modes for drawing operations
 */
export type BlendMode =
  | 'source-over'    // Normal painting
  | 'destination-out' // Eraser
  | 'multiply'
  | 'screen'
  | 'overlay';

/**
 * Tool type identifiers
 */
export type ToolType =
  | 'pencil'
  | 'brush'
  | 'eraser'
  | 'marker'
  | 'smudge'
  | 'clone'
  | 'fill'
  | 'gradient'
  | 'line'
  | 'rectangle'
  | 'circle'
  | 'triangle';

/**
 * Configuration for a drawing tool
 */
export interface ToolConfig {
  /** Type of tool */
  type: ToolType;
  /** Brush size in pixels */
  size: number;
  /** Color in hex format (#RRGGBB) */
  color: string;
  /** Opacity 0-1 */
  opacity: number;
  /** Hardness 0-1 (0 = soft, 1 = hard edge) */
  hardness: number;
  /** Blend mode */
  blendMode: BlendMode;
  /** Spacing between stamps (for stamp-based rendering) */
  spacing?: number;
}

/**
 * A complete stroke with all its data
 */
export interface Stroke {
  /** Unique identifier */
  id: string;
  /** Layer this stroke belongs to */
  layerId: string;
  /** Tool configuration used for this stroke */
  tool: ToolConfig;
  /** Array of points in the stroke */
  points: StrokePoint[];
  /** When the stroke was created */
  createdAt: number;
  /** Optional metadata */
  metadata?: {
    /** Was this stroke smoothed? */
    smoothed?: boolean;
    /** Original point count before smoothing */
    originalPointCount?: number;
    /** Any other custom data */
    [key: string]: unknown;
  };
}

/**
 * Layer information
 */
export interface Layer {
  /** Unique identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Is layer visible */
  visible: boolean;
  /** Layer opacity 0-1 */
  opacity: number;
  /** Z-index for ordering */
  zIndex: number;
}

/**
 * Canvas dimensions
 */
export interface CanvasSize {
  width: number;
  height: number;
}
