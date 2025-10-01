# @drawly/core

Framework-agnostic drawing engine for Drawly.

## Overview

`@drawly/core` is a pure TypeScript library that defines the core drawing primitives, command pattern, and data structures for Drawly. It has **zero dependencies** and no DOM/browser APIs, making it suitable for:

- Web (Canvas 2D, WebGL, OffscreenCanvas)
- iOS (PencilKit, Metal, Core Graphics)
- Android (Canvas, Custom Views)
- Desktop (Electron, Tauri)
- Server-side rendering

## Architecture

The core is organized around these key concepts:

### 1. **Stroke Model** (`types.ts`)
Defines points, pressure, timestamps, and tool configurations.

```typescript
interface StrokePoint {
  x: number;
  y: number;
  pressure: number;
  timestamp: number;
}

interface Stroke {
  id: string;
  layerId: string;
  tool: ToolConfig;
  points: StrokePoint[];
}
```

### 2. **Command Pattern** (`commands.ts`)
All drawing operations are commands that can be serialized and replayed.

```typescript
// Begin a stroke
const cmd = createBeginStroke(strokeId, layerId, toolConfig, point);

// Add points
const append = createAppendPoints(strokeId, points);

// End stroke
const end = createEndStroke(strokeId);
```

### 3. **History Stack** (`history.ts`)
Undo/redo via command replay.

```typescript
let history = createHistory();
history = addCommand(history, command);

const { history: newHistory, command } = undo(history);
```

### 4. **Serialization** (`serialization.ts`)
Save/load drawings as JSON.

```typescript
const doc: DrawingDocument = {
  version: '1.0.0',
  canvasSize: { width: 1600, height: 1000 },
  layers: [...],
  strokes: [...],
};

const json = serializeDrawing(doc);
const loaded = deserializeDrawing(json);
```

### 5. **Smoothing Utilities** (`smoothing.ts`)
Various algorithms for stroke smoothing.

```typescript
// Catmull-Rom spline
const smoothed = smoothCatmullRom(points);

// Douglas-Peucker simplification
const simplified = simplifyStroke(points, tolerance);
```

## Usage

### Installation

```bash
cd packages/core
npm install
npm run build
```

### In Your App

```typescript
import {
  createHistory,
  createBeginStroke,
  createAppendPoints,
  createEndStroke,
  addCommand,
  type ToolConfig,
  type StrokePoint,
} from '@drawly/core';

// Setup
let history = createHistory();

// Define a tool
const tool: ToolConfig = {
  type: 'brush',
  size: 10,
  color: '#000000',
  opacity: 1,
  hardness: 0.5,
  blendMode: 'source-over',
};

// Start drawing
const strokeId = 'stroke-1';
const layerId = 'layer-0';
const point: StrokePoint = { x: 100, y: 100, pressure: 1, timestamp: Date.now() };

const beginCmd = createBeginStroke(strokeId, layerId, tool, point);
history = addCommand(history, beginCmd);

// Your renderer handles this command
// e.g., renderer.beginStroke(beginCmd);
```

## Platform Integration

### Web (Canvas 2D)
Your Next.js app becomes a **renderer adapter**:
1. Listen to pointer events
2. Create core commands
3. Render commands to Canvas 2D

### iOS (PencilKit)
1. Import `@drawly/core` types
2. Deserialize drawings
3. Render strokes using PencilKit or Metal
4. Use same command history for undo/redo

## Benefits

- ✅ **Portable**: Works everywhere TypeScript runs
- ✅ **Testable**: Pure functions, no side effects
- ✅ **Serializable**: All commands can be saved/replayed
- ✅ **Type-safe**: Full TypeScript support
- ✅ **Zero dependencies**: No bloat

## Future Enhancements

- Pressure curve mapping
- Advanced blend modes
- Texture support
- Vector mode
- Real-time collaboration (CRDT-based commands)
