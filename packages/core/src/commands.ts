/**
 * Command pattern for all drawing operations
 * Commands are serializable and can be replayed for undo/redo
 */

import type { StrokePoint, ToolConfig, Layer } from './types.js';

/**
 * Base command interface
 */
export interface Command {
  /** Command type discriminator */
  type: string;
  /** When this command was created */
  timestamp: number;
  /** Unique command ID */
  id: string;
}

/**
 * Begin a new stroke
 */
export interface BeginStrokeCommand extends Command {
  type: 'BEGIN_STROKE';
  /** Unique stroke ID */
  strokeId: string;
  /** Layer to draw on */
  layerId: string;
  /** Tool configuration */
  tool: ToolConfig;
  /** Initial point */
  point: StrokePoint;
}

/**
 * Add points to an active stroke
 */
export interface AppendPointsCommand extends Command {
  type: 'APPEND_POINTS';
  /** Stroke ID to append to */
  strokeId: string;
  /** Points to add */
  points: StrokePoint[];
}

/**
 * End the current stroke
 */
export interface EndStrokeCommand extends Command {
  type: 'END_STROKE';
  /** Stroke ID to end */
  strokeId: string;
  /** Optional final point */
  finalPoint?: StrokePoint;
}

/**
 * Erase at a location
 */
export interface EraseCommand extends Command {
  type: 'ERASE';
  /** Layer to erase from */
  layerId: string;
  /** Eraser config */
  tool: ToolConfig;
  /** Points to erase */
  points: StrokePoint[];
}

/**
 * Fill an area with color
 */
export interface FillCommand extends Command {
  type: 'FILL';
  /** Layer to fill */
  layerId: string;
  /** Fill location */
  point: StrokePoint;
  /** Fill color */
  color: string;
  /** Tolerance for flood fill (0-255) */
  tolerance?: number;
}

/**
 * Layer operations
 */
export interface LayerCommand extends Command {
  type: 'LAYER_OP';
  /** Operation type */
  operation: 'CREATE' | 'DELETE' | 'REORDER' | 'MERGE' | 'UPDATE_PROPS';
  /** Layer data */
  layer?: Partial<Layer> & { id: string };
  /** For reordering */
  fromIndex?: number;
  toIndex?: number;
  /** For merging */
  sourceLayerId?: string;
  targetLayerId?: string;
}

/**
 * Union type of all commands
 */
export type DrawingCommand =
  | BeginStrokeCommand
  | AppendPointsCommand
  | EndStrokeCommand
  | EraseCommand
  | FillCommand
  | LayerCommand;

/**
 * Helper to create a BeginStroke command
 */
export function createBeginStroke(
  strokeId: string,
  layerId: string,
  tool: ToolConfig,
  point: StrokePoint
): BeginStrokeCommand {
  return {
    type: 'BEGIN_STROKE',
    id: `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    strokeId,
    layerId,
    tool,
    point,
  };
}

/**
 * Helper to create an AppendPoints command
 */
export function createAppendPoints(
  strokeId: string,
  points: StrokePoint[]
): AppendPointsCommand {
  return {
    type: 'APPEND_POINTS',
    id: `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    strokeId,
    points,
  };
}

/**
 * Helper to create an EndStroke command
 */
export function createEndStroke(
  strokeId: string,
  finalPoint?: StrokePoint
): EndStrokeCommand {
  return {
    type: 'END_STROKE',
    id: `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    strokeId,
    finalPoint,
  };
}

/**
 * Helper to create a Fill command
 */
export function createFill(
  layerId: string,
  point: StrokePoint,
  color: string,
  tolerance = 32
): FillCommand {
  return {
    type: 'FILL',
    id: `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    layerId,
    point,
    color,
    tolerance,
  };
}

/**
 * Helper to create a Layer command
 */
export function createLayerCommand(
  operation: LayerCommand['operation'],
  data: Omit<LayerCommand, 'type' | 'id' | 'timestamp' | 'operation'>
): LayerCommand {
  return {
    type: 'LAYER_OP',
    id: `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    operation,
    ...data,
  };
}
