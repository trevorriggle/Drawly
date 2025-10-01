/**
 * Serialization utilities for saving/loading drawings
 * Format is JSON-based for portability across platforms
 */

import type { Stroke, Layer, CanvasSize } from './types.js';
import type { DrawingCommand } from './commands.js';

/**
 * Complete drawing document format
 */
export interface DrawingDocument {
  /** Document format version */
  version: string;
  /** When the document was created */
  createdAt: number;
  /** Last modified timestamp */
  modifiedAt: number;
  /** Canvas dimensions */
  canvasSize: CanvasSize;
  /** All layers */
  layers: Layer[];
  /** All strokes across all layers */
  strokes: Stroke[];
  /** Optional: command history for replay */
  commandHistory?: DrawingCommand[];
  /** Optional: PNG preview (base64 encoded) */
  preview?: string;
  /** Optional metadata */
  metadata?: {
    title?: string;
    author?: string;
    description?: string;
    [key: string]: unknown;
  };
}

/**
 * Serialize a drawing to JSON string
 */
export function serializeDrawing(document: DrawingDocument): string {
  return JSON.stringify(document, null, 2);
}

/**
 * Deserialize a drawing from JSON string
 */
export function deserializeDrawing(json: string): DrawingDocument {
  const doc = JSON.parse(json) as DrawingDocument;

  // Validate version
  if (!doc.version) {
    throw new Error('Invalid drawing document: missing version');
  }

  // Basic validation
  if (!doc.canvasSize || !doc.layers || !doc.strokes) {
    throw new Error('Invalid drawing document: missing required fields');
  }

  return doc;
}

/**
 * Create an empty drawing document
 */
export function createEmptyDocument(
  canvasSize: CanvasSize,
  metadata?: DrawingDocument['metadata']
): DrawingDocument {
  const now = Date.now();
  return {
    version: '1.0.0',
    createdAt: now,
    modifiedAt: now,
    canvasSize,
    layers: [
      {
        id: 'layer-0',
        name: 'Background',
        visible: true,
        opacity: 1,
        zIndex: 0,
      },
    ],
    strokes: [],
    commandHistory: [],
    metadata,
  };
}

/**
 * Export to minimal format (strokes only, no history)
 */
export function exportMinimal(document: DrawingDocument): string {
  const minimal: DrawingDocument = {
    ...document,
    commandHistory: undefined, // Remove history to reduce size
    modifiedAt: Date.now(),
  };

  return serializeDrawing(minimal);
}

/**
 * Import from minimal format
 */
export function importMinimal(json: string): DrawingDocument {
  return deserializeDrawing(json);
}

/**
 * Export strokes for a specific layer
 */
export function exportLayerStrokes(
  document: DrawingDocument,
  layerId: string
): Stroke[] {
  return document.strokes.filter((s) => s.layerId === layerId);
}

/**
 * Calculate document statistics
 */
export function getDocumentStats(document: DrawingDocument) {
  const totalPoints = document.strokes.reduce(
    (sum, stroke) => sum + stroke.points.length,
    0
  );

  const toolUsage = document.strokes.reduce((acc, stroke) => {
    const type = stroke.tool.type;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    layers: document.layers.length,
    strokes: document.strokes.length,
    totalPoints,
    toolUsage,
    sizeBytes: JSON.stringify(document).length,
  };
}
