/**
 * @drawevolve/core
 * Framework-agnostic drawing engine
 *
 * This package contains the core drawing logic that can be used
 * across web (Canvas 2D, WebGL), iOS (PencilKit, Metal), or any
 * other rendering platform.
 */

// Types
export type {
  StrokePoint,
  BlendMode,
  ToolType,
  ToolConfig,
  Stroke,
  Layer,
  CanvasSize,
} from './types.js';

// Commands
export type {
  Command,
  BeginStrokeCommand,
  AppendPointsCommand,
  EndStrokeCommand,
  EraseCommand,
  FillCommand,
  LayerCommand,
  DrawingCommand,
} from './commands.js';

export {
  createBeginStroke,
  createAppendPoints,
  createEndStroke,
  createFill,
  createLayerCommand,
} from './commands.js';

// History
export type { HistoryState } from './history.js';

export {
  createHistory,
  addCommand,
  undo,
  redo,
  canUndo,
  canRedo,
  getActiveCommands,
  clearHistory,
  getCommandsByType,
} from './history.js';

// Serialization
export type { DrawingDocument } from './serialization.js';

export {
  serializeDrawing,
  deserializeDrawing,
  createEmptyDocument,
  exportMinimal,
  importMinimal,
  exportLayerStrokes,
  getDocumentStats,
} from './serialization.js';

// Smoothing
export {
  smoothMovingAverage,
  smoothCatmullRom,
  simplifyStroke,
  smoothExponential,
  interpolatePoints,
} from './smoothing.js';
