# Integration Guide: Using @drawly/core

## Quick Start

### 1. Import the Core Package

```typescript
import {
  // Types
  type ToolConfig,
  type StrokePoint,
  type DrawingDocument,

  // Command creators
  createBeginStroke,
  createAppendPoints,
  createEndStroke,

  // History management
  createHistory,
  addCommand,
  undo,
  redo,

  // Serialization
  serializeDrawing,
  deserializeDrawing,
  createEmptyDocument,

  // Smoothing
  smoothCatmullRom,
  interpolatePoints,
} from '@drawly/core';
```

### 2. Initialize History

```typescript
let history = createHistory(100); // Max 100 undo steps
```

### 3. Define Your Tool

```typescript
const brushTool: ToolConfig = {
  type: 'brush',
  size: 10,
  color: '#000000',
  opacity: 1.0,
  hardness: 0.5, // 0 = soft, 1 = hard edge
  blendMode: 'source-over',
  spacing: 0.15, // 15% of brush size
};
```

### 4. Handle Drawing Events

```typescript
let currentStrokeId: string | null = null;

// On pointer down
function onPointerDown(x: number, y: number, pressure = 1.0) {
  currentStrokeId = `stroke-${Date.now()}`;

  const point: StrokePoint = {
    x,
    y,
    pressure,
    timestamp: Date.now(),
  };

  const command = createBeginStroke(
    currentStrokeId,
    'layer-0', // Current layer ID
    brushTool,
    point
  );

  history = addCommand(history, command);

  // Render the command (your adapter's job)
  renderCommand(command);
}

// On pointer move
function onPointerMove(x: number, y: number, pressure = 1.0) {
  if (!currentStrokeId) return;

  const points: StrokePoint[] = [{
    x,
    y,
    pressure,
    timestamp: Date.now(),
  }];

  const command = createAppendPoints(currentStrokeId, points);
  history = addCommand(history, command);

  renderCommand(command);
}

// On pointer up
function onPointerUp() {
  if (!currentStrokeId) return;

  const command = createEndStroke(currentStrokeId);
  history = addCommand(history, command);

  currentStrokeId = null;
}
```

### 5. Implement Undo/Redo

```typescript
function handleUndo() {
  const result = undo(history);
  history = result.history;

  if (result.command) {
    // Redraw canvas from history
    redrawFromHistory();
  }
}

function handleRedo() {
  const result = redo(history);
  history = result.history;

  if (result.command) {
    renderCommand(result.command);
  }
}
```

### 6. Save/Load Drawings

```typescript
// Save
function saveDrawing() {
  const document: DrawingDocument = {
    version: '1.0.0',
    createdAt: Date.now(),
    modifiedAt: Date.now(),
    canvasSize: { width: 1600, height: 1000 },
    layers: [
      { id: 'layer-0', name: 'Background', visible: true, opacity: 1, zIndex: 0 }
    ],
    strokes: getAllStrokesFromHistory(history),
    commandHistory: getActiveCommands(history),
    metadata: {
      title: 'My Drawing',
      author: 'User',
    },
  };

  const json = serializeDrawing(document);
  // Save to file, database, etc.
  localStorage.setItem('drawing', json);
}

// Load
function loadDrawing() {
  const json = localStorage.getItem('drawing');
  if (!json) return;

  const document = deserializeDrawing(json);

  // Restore strokes and commands
  // Your renderer will need to draw all strokes
  document.strokes.forEach(stroke => {
    renderStroke(stroke);
  });
}
```

## React Integration Example

```tsx
import { useRef, useReducer, useCallback } from 'react';
import {
  createHistory,
  createBeginStroke,
  createAppendPoints,
  createEndStroke,
  addCommand,
  type HistoryState,
  type ToolConfig,
} from '@drawly/core';

function DrawingCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [history, updateHistory] = useReducer(
    (state: HistoryState, action: any) => {
      switch (action.type) {
        case 'ADD_COMMAND':
          return addCommand(state, action.command);
        case 'UNDO':
          return undo(state).history;
        case 'REDO':
          return redo(state).history;
        default:
          return state;
      }
    },
    createHistory()
  );

  const tool: ToolConfig = {
    type: 'brush',
    size: 10,
    color: '#000000',
    opacity: 1,
    hardness: 0.5,
    blendMode: 'source-over',
  };

  const strokeIdRef = useRef<string | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    strokeIdRef.current = `stroke-${Date.now()}`;
    const command = createBeginStroke(
      strokeIdRef.current,
      'layer-0',
      tool,
      { x, y, pressure: 1, timestamp: Date.now() }
    );

    updateHistory({ type: 'ADD_COMMAND', command });
  }, [tool]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!strokeIdRef.current) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const command = createAppendPoints(strokeIdRef.current, [
      { x, y, pressure: 1, timestamp: Date.now() }
    ]);

    updateHistory({ type: 'ADD_COMMAND', command });
  }, []);

  const handlePointerUp = useCallback(() => {
    if (!strokeIdRef.current) return;

    const command = createEndStroke(strokeIdRef.current);
    updateHistory({ type: 'ADD_COMMAND', command });

    strokeIdRef.current = null;
  }, []);

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
      <button onClick={() => updateHistory({ type: 'UNDO' })}>Undo</button>
      <button onClick={() => updateHistory({ type: 'REDO' })}>Redo</button>
    </div>
  );
}
```

## Advanced: Custom Renderer

```typescript
class MyCanvasRenderer {
  constructor(private ctx: CanvasRenderingContext2D) {}

  render(command: DrawingCommand) {
    switch (command.type) {
      case 'BEGIN_STROKE':
        this.setupTool(command.tool);
        this.ctx.beginPath();
        this.ctx.moveTo(command.point.x, command.point.y);
        break;

      case 'APPEND_POINTS':
        command.points.forEach(p => {
          this.ctx.lineTo(p.x, p.y);
        });
        this.ctx.stroke();
        break;

      case 'END_STROKE':
        // Optional: apply smoothing
        break;
    }
  }

  private setupTool(tool: ToolConfig) {
    this.ctx.strokeStyle = tool.color;
    this.ctx.lineWidth = tool.size;
    this.ctx.globalAlpha = tool.opacity;
    this.ctx.globalCompositeOperation = tool.blendMode;
  }
}
```

## iOS Integration (Conceptual)

```swift
// Future: Swift bindings for @drawly/core
import DrawlyCore

class DrawingViewController: UIViewController {
    var history = DrawlyCore.createHistory()

    func handleTouch(_ location: CGPoint, pressure: CGFloat) {
        let point = StrokePoint(
            x: location.x,
            y: location.y,
            pressure: pressure,
            timestamp: Date.now()
        )

        let command = DrawlyCore.createBeginStroke(
            strokeId: UUID().uuidString,
            layerId: "layer-0",
            tool: currentTool,
            point: point
        )

        history = DrawlyCore.addCommand(history, command)
        render(command)
    }
}
```

## Key Principles

1. **Commands are immutable** - Never modify commands after creation
2. **History is immutable** - Always use the returned history from functions
3. **Separation of concerns** - Core handles data, adapter handles rendering
4. **Platform-agnostic** - Core has no DOM/browser dependencies

## Troubleshooting

### Q: How do I render strokes with varying pressure?

```typescript
// Adjust brush size based on pressure
command.points.forEach(point => {
  const size = baseBrushSize * point.pressure;
  ctx.lineWidth = size;
  ctx.lineTo(point.x, point.y);
  ctx.stroke();
});
```

### Q: How do I smooth strokes?

```typescript
import { smoothCatmullRom } from '@drawly/core';

const smoothedPoints = smoothCatmullRom(rawPoints, 4);
```

### Q: How do I optimize for performance?

- Use `interpolatePoints()` to add points between sparse input
- Use `simplifyStroke()` to reduce point count before saving
- Batch `APPEND_POINTS` commands instead of one per point
- Render to offscreen canvas and composite

## Next Steps

- Read `ARCHITECTURE.md` for system design
- See `examples/web-adapter.example.ts` for full adapter implementation
- Check `packages/core/src/` for API documentation
