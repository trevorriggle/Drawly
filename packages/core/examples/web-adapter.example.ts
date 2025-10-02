/**
 * Example: Web Canvas 2D Adapter for @drawevolve/core
 *
 * This demonstrates how to integrate the core drawing engine
 * with a browser Canvas 2D context.
 */

import {
  createHistory,
  createBeginStroke,
  createAppendPoints,
  createEndStroke,
  addCommand,
  undo,
  redo,
  type HistoryState,
  type ToolConfig,
  type StrokePoint,
  type DrawingCommand,
  smoothCatmullRom,
} from '@drawevolve/core';

/**
 * Canvas 2D Renderer Adapter
 */
export class CanvasAdapter {
  private history: HistoryState;
  private activeStrokeId: string | null = null;
  private activePoints: StrokePoint[] = [];

  constructor(
    private canvas: HTMLCanvasElement,
    private ctx: CanvasRenderingContext2D
  ) {
    this.history = createHistory();
  }

  /**
   * Begin a new stroke
   */
  beginStroke(
    layerId: string,
    tool: ToolConfig,
    x: number,
    y: number,
    pressure = 1.0
  ) {
    const point: StrokePoint = {
      x,
      y,
      pressure,
      timestamp: Date.now(),
    };

    this.activeStrokeId = `stroke-${Date.now()}`;
    this.activePoints = [point];

    const command = createBeginStroke(
      this.activeStrokeId,
      layerId,
      tool,
      point
    );

    this.history = addCommand(this.history, command);
    this.renderCommand(command);
  }

  /**
   * Add points to the active stroke
   */
  appendPoints(points: { x: number; y: number; pressure?: number }[]) {
    if (!this.activeStrokeId) return;

    const strokePoints: StrokePoint[] = points.map(p => ({
      x: p.x,
      y: p.y,
      pressure: p.pressure ?? 1.0,
      timestamp: Date.now(),
    }));

    this.activePoints.push(...strokePoints);

    const command = createAppendPoints(this.activeStrokeId, strokePoints);
    this.history = addCommand(this.history, command);
    this.renderCommand(command);
  }

  /**
   * End the active stroke
   */
  endStroke() {
    if (!this.activeStrokeId) return;

    const command = createEndStroke(this.activeStrokeId);
    this.history = addCommand(this.history, command);

    this.activeStrokeId = null;
    this.activePoints = [];
  }

  /**
   * Undo the last action
   */
  undoAction() {
    const result = undo(this.history);
    this.history = result.history;

    if (result.command) {
      this.redrawFromHistory();
    }
  }

  /**
   * Redo the next action
   */
  redoAction() {
    const result = redo(this.history);
    this.history = result.history;

    if (result.command) {
      this.renderCommand(result.command);
    }
  }

  /**
   * Render a single command to the canvas
   */
  private renderCommand(command: DrawingCommand) {
    switch (command.type) {
      case 'BEGIN_STROKE':
        this.setupTool(command.tool);
        this.ctx.beginPath();
        this.ctx.moveTo(command.point.x, command.point.y);
        break;

      case 'APPEND_POINTS':
        command.points.forEach(point => {
          this.ctx.lineTo(point.x, point.y);
        });
        this.ctx.stroke();
        break;

      case 'END_STROKE':
        // Optionally smooth the stroke here
        if (this.activePoints.length > 3) {
          const smoothed = smoothCatmullRom(this.activePoints);
          this.ctx.beginPath();
          this.ctx.moveTo(smoothed[0].x, smoothed[0].y);
          smoothed.slice(1).forEach(p => this.ctx.lineTo(p.x, p.y));
          this.ctx.stroke();
        }
        break;

      case 'FILL':
        // Implement flood fill
        break;

      case 'LAYER_OP':
        // Handle layer operations
        break;
    }
  }

  /**
   * Setup canvas context for a specific tool
   */
  private setupTool(tool: ToolConfig) {
    this.ctx.strokeStyle = tool.color;
    this.ctx.lineWidth = tool.size;
    this.ctx.globalAlpha = tool.opacity;
    this.ctx.globalCompositeOperation = tool.blendMode;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  }

  /**
   * Redraw entire canvas from history
   */
  private redrawFromHistory() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // TODO: Replay all active commands
    // This would iterate through history.commands up to currentIndex
  }
}

/**
 * Example usage in a React component:
 *
 * ```tsx
 * function DrawingCanvas() {
 *   const canvasRef = useRef<HTMLCanvasElement>(null);
 *   const adapterRef = useRef<CanvasAdapter | null>(null);
 *
 *   useEffect(() => {
 *     if (canvasRef.current) {
 *       const ctx = canvasRef.current.getContext('2d');
 *       if (ctx) {
 *         adapterRef.current = new CanvasAdapter(canvasRef.current, ctx);
 *       }
 *     }
 *   }, []);
 *
 *   const handlePointerDown = (e: React.PointerEvent) => {
 *     const tool: ToolConfig = {
 *       type: 'brush',
 *       size: 10,
 *       color: '#000000',
 *       opacity: 1,
 *       hardness: 0.5,
 *       blendMode: 'source-over',
 *     };
 *
 *     adapterRef.current?.beginStroke(
 *       'layer-0',
 *       tool,
 *       e.nativeEvent.offsetX,
 *       e.nativeEvent.offsetY
 *     );
 *   };
 *
 *   const handlePointerMove = (e: React.PointerEvent) => {
 *     adapterRef.current?.appendPoints([{
 *       x: e.nativeEvent.offsetX,
 *       y: e.nativeEvent.offsetY,
 *     }]);
 *   };
 *
 *   const handlePointerUp = () => {
 *     adapterRef.current?.endStroke();
 *   };
 *
 *   return (
 *     <canvas
 *       ref={canvasRef}
 *       onPointerDown={handlePointerDown}
 *       onPointerMove={handlePointerMove}
 *       onPointerUp={handlePointerUp}
 *       width={800}
 *       height={600}
 *     />
 *   );
 * }
 * ```
 */
