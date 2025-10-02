# DrawEvolve Architecture

## Overview

DrawEvolve uses a **framework-agnostic core** architecture that separates drawing logic from rendering implementation. This enables portability across platforms (web, iOS, Android, desktop) without rewriting the core drawing engine.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Platform Layer                            │
│  (Next.js App, iOS App, Android App, Desktop App)           │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    │ Uses
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                  @drawevolve/core                            │
│  Framework-agnostic drawing engine (Pure TypeScript)        │
│  • Stroke models & tool configs                             │
│  • Command pattern (BeginStroke, AppendPoints, etc.)        │
│  • History/undo-redo                                         │
│  • Serialization (JSON)                                      │
│  • Smoothing algorithms                                      │
└─────────────────────────────────────────────────────────────┘
                    │
                    │ Commands
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                  Renderer Adapters                           │
│  • Web: Canvas 2D / WebGL                                    │
│  • iOS: PencilKit / Metal                                    │
│  • Android: Canvas API                                       │
│  • Desktop: Skia / GPU                                       │
└─────────────────────────────────────────────────────────────┘
```

## Core Concepts

### 1. **Separation of Concerns**

- **Core (`@drawevolve/core`)**: Pure drawing logic, no platform dependencies
- **Adapters**: Platform-specific rendering implementations
- **UI Layer**: React components, iOS views, etc.

### 2. **Command Pattern**

All drawing operations are represented as commands:

```typescript
// User draws → Generate command → Store in history → Render
const command = createBeginStroke(strokeId, layerId, tool, point);
history = addCommand(history, command);
renderer.render(command);
```

Benefits:
- Serializable (save/load)
- Replay-able (undo/redo)
- Platform-agnostic

### 3. **Data Flow**

```
User Input (pointer/touch)
    ↓
Event Handler (platform-specific)
    ↓
Create Core Command
    ↓
Add to History
    ↓
Render with Adapter
    ↓
Display on Screen
```

## Project Structure

```
drawevolve/
├── packages/
│   └── core/                    # @drawevolve/core package
│       ├── src/
│       │   ├── types.ts         # Stroke, Point, Tool types
│       │   ├── commands.ts      # Command pattern
│       │   ├── history.ts       # Undo/redo
│       │   ├── serialization.ts # Save/load
│       │   ├── smoothing.ts     # Stroke algorithms
│       │   └── index.ts         # Public API
│       ├── package.json
│       └── tsconfig.json
│
├── components/                  # React UI components
│   └── panels/
│       └── canvas/
│           └── DrawCanvas.tsx   # Canvas renderer (to be refactored)
│
├── context/                     # React state management
│   └── DrawEvolveProvider.tsx   # App state
│
├── lib/                         # Utilities
├── app/                         # Next.js pages
└── package.json                 # Root package (workspace)
```

## Integration Guide

### Current State (Before Refactor)

The existing `DrawCanvas.tsx` component has:
- Direct canvas manipulation
- State stored in React context
- ImageData-based undo/redo
- Tightly coupled to browser APIs

### Future State (After Refactor)

`DrawCanvas.tsx` becomes an **adapter**:

```typescript
import { CanvasAdapter } from './adapters/CanvasAdapter';
import { createBeginStroke, type ToolConfig } from '@drawevolve/core';

function DrawCanvas() {
  const adapterRef = useRef<CanvasAdapter>();

  // Translate DOM events → Core commands
  const handlePointerDown = (e) => {
    const tool: ToolConfig = { /* from context */ };
    adapter.beginStroke(layerId, tool, e.offsetX, e.offsetY);
  };

  return <canvas ref={canvasRef} onPointerDown={handlePointerDown} />;
}
```

### iOS Integration (Future)

```swift
import DrawEvolveCore // Swift bindings to @drawevolve/core

class DrawingViewController: UIViewController {
    func loadDrawing(json: String) {
        let document = DrawEvolveCore.deserializeDrawing(json)

        // Render strokes using PencilKit
        for stroke in document.strokes {
            let pkStroke = convertToPencilKitStroke(stroke)
            canvasView.drawing.strokes.append(pkStroke)
        }
    }
}
```

## Benefits of This Architecture

### ✅ **Portability**
- Core logic works on any platform
- Only need platform-specific renderers

### ✅ **Testability**
- Pure functions, easy to unit test
- No mocking required for core logic

### ✅ **Performance**
- Commands are lightweight
- Can optimize rendering per platform

### ✅ **Interoperability**
- Drawings created on web work on iOS
- Same file format across platforms

### ✅ **Future-Proof**
- Easy to add new platforms
- Easy to swap rendering engines (Canvas → WebGL)

## Next Steps

1. **Refactor DrawCanvas.tsx** to use `@drawevolve/core`
2. **Create CanvasAdapter class** for web rendering
3. **Migrate state** from ImageData to core commands
4. **Add serialization** to save/load drawings
5. **Test** with existing drawing functionality
6. **Optimize** rendering performance

## Example: Web to iOS

### Web (Today)
```typescript
// User draws with mouse
// → Canvas 2D rendering
// → ImageData stored in React state
```

### Web (With Core)
```typescript
// User draws with mouse
// → createBeginStroke() command
// → Stored in core history
// → CanvasAdapter renders to Canvas 2D
// → serializeDrawing() to JSON
```

### iOS (Tomorrow)
```swift
// Load JSON from web
// → deserializeDrawing()
// → Convert commands to PencilKit strokes
// → Render with Metal/PencilKit
// → User continues drawing on iPad
```

## Resources

- Core package: `packages/core/`
- Example adapter: `packages/core/examples/web-adapter.example.ts`
- Core README: `packages/core/README.md`
