"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useDrawly } from '@/context/DrawlyProvider';

/**
 * Minimal raster canvas that supports:
 * - Pencil/Brush drawing (pressure-naive; we can add pointer pressure later)
 * - Eraser (composite operation)
 * - Pan with spacebar + drag
 * - Zoom with wheel + Ctrl/Cmd
 *
 * This is intentionally small but stable so the UI can be built around it.
 */
export default function DrawCanvas() {
  const { activeToolId, primaryColor, brushSize, setActiveToolId, layers, activeLayerId } = useDrawly();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const layerCanvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const isPanning = useRef(false);
  const isDrawing = useRef(false);
  const isDrawingLine = useRef(false);
  const lineStart = useRef<{x:number;y:number}|null>(null);
  const linePreviewImageData = useRef<ImageData | null>(null);
  const last = useRef<{x:number;y:number}|null>(null);

  const canvasSize = { width: 1600, height: 1000 };

  // Proper flood fill function
  function fillArea(ctx: CanvasRenderingContext2D, x: number, y: number, fillColor: string, size: { width: number, height: number }) {
    const canvas = ctx.canvas;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Convert fill color to RGB
    const fillColorRgb = hexToRgb(fillColor);
    if (!fillColorRgb) return;

    const startX = Math.floor(x);
    const startY = Math.floor(y);

    if (startX < 0 || startX >= canvas.width || startY < 0 || startY >= canvas.height) return;

    const startIndex = (startY * canvas.width + startX) * 4;
    const startR = data[startIndex];
    const startG = data[startIndex + 1];
    const startB = data[startIndex + 2];
    const startA = data[startIndex + 3];

    // Don't fill if already the same color
    if (startR === fillColorRgb.r && startG === fillColorRgb.g && startB === fillColorRgb.b) return;

    const stack: [number, number][] = [[startX, startY]];
    const visited = new Set<string>();

    while (stack.length > 0) {
      const [px, py] = stack.pop()!;
      const key = `${px},${py}`;

      if (visited.has(key) || px < 0 || px >= canvas.width || py < 0 || py >= canvas.height) continue;
      visited.add(key);

      const index = (py * canvas.width + px) * 4;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const a = data[index + 3];

      // Check if pixel matches start color
      if (r !== startR || g !== startG || b !== startB || a !== startA) continue;

      // Fill pixel
      data[index] = fillColorRgb.r;
      data[index + 1] = fillColorRgb.g;
      data[index + 2] = fillColorRgb.b;
      data[index + 3] = 255;

      // Add neighbors to stack
      stack.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]);
    }

    ctx.putImageData(imageData, 0, 0);
  }

  function hexToRgb(hex: string): {r: number, g: number, b: number} | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  // Initialize canvases for all layers
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const dpr = window.devicePixelRatio || 1;

    // Only clear if we need to rebuild everything (first time or major changes)
    const existingCanvases = Array.from(container.children).filter(child => child.tagName === 'CANVAS');
    const needsRebuild = existingCanvases.length === 0 || existingCanvases.length !== layers.length;

    if (needsRebuild) {
      container.innerHTML = '';
      layerCanvasRefs.current.clear();
    }

    // Create/update canvas for each layer
    layers.forEach((layer, index) => {
      let canvas = layerCanvasRefs.current.get(layer.id);

      if (!canvas) {
        // Create new canvas only if it doesn't exist
        canvas = document.createElement('canvas');
        canvas.width = Math.floor(canvasSize.width * dpr);
        canvas.height = Math.floor(canvasSize.height * dpr);
        canvas.style.width = canvasSize.width + 'px';
        canvas.style.height = canvasSize.height + 'px';
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.touchAction = 'none';

        const ctx = canvas.getContext('2d')!;
        ctx.scale(dpr, dpr);

        layerCanvasRefs.current.set(layer.id, canvas);
        container.appendChild(canvas);
      }

      // Update canvas properties (these can change)
      canvas.style.pointerEvents = layer.id === activeLayerId ? 'auto' : 'none';
      canvas.style.visibility = layer.visible ? 'visible' : 'hidden';
      canvas.style.opacity = String(layer.opacity);
      canvas.style.zIndex = String(index + 1); // Start at 1 to leave space for background
    });

    // Add background div only once for bottom layer
    if (!container.querySelector('.canvas-background')) {
      const bgDiv = document.createElement('div');
      bgDiv.className = 'canvas-background';
      bgDiv.style.position = 'absolute';
      bgDiv.style.top = '0';
      bgDiv.style.left = '0';
      bgDiv.style.width = canvasSize.width + 'px';
      bgDiv.style.height = canvasSize.height + 'px';
      bgDiv.style.backgroundColor = '#ffffff';
      bgDiv.style.zIndex = '-1';
      container.appendChild(bgDiv);
    }

    // Add test drawing to first layer only once
    const firstLayerCanvas = layerCanvasRefs.current.get(layers[0]?.id);
    if (firstLayerCanvas && layers.length > 0) {
      const ctx = firstLayerCanvas.getContext('2d')!;
      const hasTestCircle = ctx.getImageData(100, 100, 1, 1).data[0] === 255;
      if (!hasTestCircle) {
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(100, 100, 20, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [layers, activeLayerId, canvasSize.width, canvasSize.height]);

  function getActiveLayerCtx() {
    const canvas = layerCanvasRefs.current.get(activeLayerId);
    if (!canvas) throw new Error(`Canvas for layer ${activeLayerId} not found`);
    return canvas.getContext('2d')!;
  }

  function getActiveLayerCanvas() {
    const canvas = layerCanvasRefs.current.get(activeLayerId);
    if (!canvas) throw new Error(`Canvas for layer ${activeLayerId} not found`);
    return canvas;
  }

  function toCanvasCoords(clientX:number, clientY:number) {
    const canvas = getActiveLayerCanvas();
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left - view.x) / view.scale;
    const y = (clientY - rect.top - view.y) / view.scale;
    return { x, y };
  }

  function onPointerDown(e: React.PointerEvent) {
    e.preventDefault();
    // Get the active canvas for pointer capture
    const activeCanvas = getActiveLayerCanvas();
    if (activeCanvas) {
      activeCanvas.setPointerCapture(e.pointerId);
    }

    if (e.button === 1 || e.button === 0 && (e.nativeEvent as any).isPrimary === false) return; // ignore middle/secondary

    // Handle panning first (spacebar + drag)
    if (panKey) {
      isPanning.current = true;
      last.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // Tools that don't draw on pointer down/move
    const nonDrawingTools = ['zoom', 'select', 'lasso', 'wand', 'transform', 'crop', 'text'];
    if (nonDrawingTools.includes(activeToolId)) {
      console.log(`${activeToolId} tool selected - no drawing action`);
      return;
    }

    // All other tools should draw
    const drawingTools = ['pencil', 'brush', 'eraser', 'fill', 'gradient', 'shapes', 'line', 'smudge', 'clone'];
    if (!drawingTools.includes(activeToolId)) {
      return;
    }

    const ctx = getActiveLayerCtx();
    const { x, y } = toCanvasCoords(e.clientX, e.clientY);
    last.current = { x, y };

    // Debug logging
    console.log(`Drawing with ${activeToolId} on layer ${activeLayerId}, color: ${primaryColor}, pos: ${x},${y}`);

    // Handle special tools that don't use traditional drawing
    if (activeToolId === 'fill') {
      // Flood fill at click point
      fillArea(ctx, x, y, primaryColor, canvasSize);
      return;
    }

    if (activeToolId === 'line') {
      // Start line drawing mode
      isDrawingLine.current = true;
      lineStart.current = { x, y };
      // Save current canvas state for preview
      const canvas = getActiveLayerCanvas();
      linePreviewImageData.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
      console.log(`Starting line at ${x}, ${y}`);
      return;
    }

    if (activeToolId === 'shapes') {
      // Start shape drawing mode - for now just draw a circle
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = brushSize;
      ctx.beginPath();
      ctx.arc(x, y, brushSize * 2, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }

    // Configure tool-specific drawing properties for brush-based tools
    if (activeToolId === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)'; // Color doesn't matter for destination-out
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = 1; // Ensure full erase strength
    } else if (activeToolId === 'pencil') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = primaryColor;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.imageSmoothingEnabled = true;
    } else if (activeToolId === 'brush') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = primaryColor;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.imageSmoothingEnabled = true;
    } else if (activeToolId === 'smudge') {
      // Smudge tool: sample colors and blend them
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = primaryColor;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = 0.3; // Blend effect
    } else if (activeToolId === 'clone') {
      // Clone tool: copy from another area (simplified for now)
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = primaryColor;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    } else if (activeToolId === 'gradient') {
      // Gradient tool: create gradient brush
      const gradient = ctx.createLinearGradient(x - brushSize, y - brushSize, x + brushSize, y + brushSize);
      gradient.addColorStop(0, primaryColor);
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = gradient;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    } else {
      // Default behavior for other tools
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = primaryColor;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }

    // Only start drawing path for brush-based tools
    if (['pencil', 'brush', 'eraser', 'smudge', 'clone', 'gradient'].includes(activeToolId)) {
      ctx.lineWidth = brushSize;
      ctx.beginPath();
      ctx.moveTo(x, y);
      isDrawing.current = true;
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!last.current && !isDrawingLine.current) return;

    // panning
    if (isPanning.current && last.current) {
      const dx = e.clientX - last.current.x;
      const dy = e.clientY - last.current.y;
      setView(v => ({ ...v, x: v.x + dx, y: v.y + dy }));
      last.current = { x: e.clientX, y: e.clientY };
      return;
    }

    const ctx = getActiveLayerCtx();
    const { x, y } = toCanvasCoords(e.clientX, e.clientY);

    // Handle line tool preview
    if (isDrawingLine.current && lineStart.current && linePreviewImageData.current) {
      // Restore canvas to state before preview
      ctx.putImageData(linePreviewImageData.current, 0, 0);

      // Draw preview line
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.setLineDash([5, 5]); // Dashed preview
      ctx.beginPath();
      ctx.moveTo(lineStart.current.x, lineStart.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.setLineDash([]); // Reset line dash
      return;
    }

    // Regular brush drawing
    if (isDrawing.current && last.current) {
      ctx.lineTo(x, y);
      ctx.stroke();
      last.current = { x, y };
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    // Handle line tool completion
    if (isDrawingLine.current && lineStart.current) {
      const ctx = getActiveLayerCtx();
      const { x, y } = toCanvasCoords(e.clientX, e.clientY);

      // Draw final line
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.setLineDash([]); // Solid line
      ctx.beginPath();
      ctx.moveTo(lineStart.current.x, lineStart.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();

      isDrawingLine.current = false;
      lineStart.current = null;
      linePreviewImageData.current = null;
    }

    isPanning.current = false;
    isDrawing.current = false;
    last.current = null;
  }

  // keyboard: hold space to pan
  const [panKey, setPanKey] = useState(false);
  useEffect(() => {
    const d = (e: KeyboardEvent) => {
      if (e.code === 'Space') { setPanKey(true); (e as any).isPanActive = true; }
      if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey)) e.preventDefault(); // stop browser undo zoom

      // Tool shortcuts (only if no modifier keys)
      if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        switch (e.code) {
          case 'KeyP': e.preventDefault(); setActiveToolId('pencil'); break;
          case 'KeyB': e.preventDefault(); setActiveToolId('brush'); break;
          case 'KeyE': e.preventDefault(); setActiveToolId('eraser'); break;
          case 'KeyV': e.preventDefault(); setActiveToolId('select'); break;
          case 'KeyZ': e.preventDefault(); setActiveToolId('zoom'); break;
          case 'KeyG': e.preventDefault(); setActiveToolId('fill'); break;
          case 'KeyT': e.preventDefault(); setActiveToolId('text'); break;
          case 'KeyL': e.preventDefault(); setActiveToolId('line'); break;
          case 'KeyU': e.preventDefault(); setActiveToolId('shapes'); break;
          case 'KeyQ': e.preventDefault(); setActiveToolId('lasso'); break;
        }
      }
    };
    const u = (e: KeyboardEvent) => { if (e.code === 'Space') setPanKey(false); };
    window.addEventListener('keydown', d);
    window.addEventListener('keyup', u);
    return () => { window.removeEventListener('keydown', d); window.removeEventListener('keyup', u); };
  }, [setActiveToolId]);

  // wheel zoom with ctrl/cmd
  function onWheel(e: React.WheelEvent) {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    const scaleBy = 1.05;
    setView(v => {
      const direction = e.deltaY > 0 ? 1 / scaleBy : scaleBy;
      return { ...v, scale: Math.max(0.2, Math.min(6, v.scale * direction)) };
    });
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          width: canvasSize.width,
          height: canvasSize.height,
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
          transformOrigin: '0 0',
          border: '1px solid #222',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.05) inset'
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      />
      <div style={{ position:'absolute', left:12, bottom:12, opacity:.8, fontSize:12, background: 'rgba(0,0,0,0.8)', color: 'white', padding: '8px 12px', borderRadius: 6 }}>
        <span style={{ fontWeight: 600 }}>{activeToolId.toUpperCase()}</span>
        {activeToolId === 'pencil' && <span style={{ marginLeft: 8, color: '#10b981' }}>(P) DRAWS</span>}
        {activeToolId === 'brush' && <span style={{ marginLeft: 8, color: '#10b981' }}>(B) DRAWS</span>}
        {activeToolId === 'eraser' && <span style={{ marginLeft: 8, color: '#ef4444' }}>(E) ERASES</span>}
        {activeToolId === 'smudge' && <span style={{ marginLeft: 8, color: '#10b981' }}>SMUDGES</span>}
        {activeToolId === 'fill' && <span style={{ marginLeft: 8, color: '#10b981' }}>(G) FILLS</span>}
        {activeToolId === 'gradient' && <span style={{ marginLeft: 8, color: '#10b981' }}>GRADIENT</span>}
        {activeToolId === 'shapes' && <span style={{ marginLeft: 8, color: '#10b981' }}>(U) SHAPES</span>}
        {activeToolId === 'line' && <span style={{ marginLeft: 8, color: '#10b981' }}>(L) LINES</span>}
        {activeToolId === 'clone' && <span style={{ marginLeft: 8, color: '#10b981' }}>CLONES</span>}
        {['zoom', 'select', 'lasso', 'wand', 'transform', 'crop', 'text'].includes(activeToolId) && <span style={{ marginLeft: 8, color: '#f59e0b' }}>NO DRAW</span>}
        <span style={{ margin: '0 8px' }}>·</span>
        <span>Layer: <span className="kbd" style={{ color: '#3b82f6' }}>{layers.find(l => l.id === activeLayerId)?.name || activeLayerId}</span></span>
        <span style={{ margin: '0 8px' }}>·</span>
        <span>Size: <span className="kbd">{brushSize}px</span></span>
        <span style={{ margin: '0 8px' }}>·</span>
        <span>Color: <span className="kbd">{primaryColor}</span></span>
      </div>
    </div>
  );
}
