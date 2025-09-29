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
  const last = useRef<{x:number;y:number}|null>(null);

  const canvasSize = { width: 1600, height: 1000 };

  // Initialize canvases for all layers
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const dpr = window.devicePixelRatio || 1;

    // Clear existing canvases
    container.innerHTML = '';
    layerCanvasRefs.current.clear();

    // Create canvas for each layer
    layers.forEach((layer, index) => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(canvasSize.width * dpr);
      canvas.height = Math.floor(canvasSize.height * dpr);
      canvas.style.width = canvasSize.width + 'px';
      canvas.style.height = canvasSize.height + 'px';
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.touchAction = 'none';
      canvas.style.pointerEvents = layer.id === activeLayerId ? 'auto' : 'none';
      canvas.style.visibility = layer.visible ? 'visible' : 'hidden';
      canvas.style.zIndex = String(index);

      const ctx = canvas.getContext('2d')!;
      ctx.scale(dpr, dpr);

      // Background only for bottom layer
      if (index === 0) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

        // Test drawing - draw a small circle to verify canvas works
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(100, 100, 20, 0, Math.PI * 2);
        ctx.fill();
      }

      layerCanvasRefs.current.set(layer.id, canvas);
      container.appendChild(canvas);
    });
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

    // Non-drawing tools should not draw
    const nonDrawingTools = ['zoom', 'select', 'lasso', 'wand', 'transform', 'crop', 'text', 'fill', 'gradient', 'shapes', 'line', 'smudge', 'clone'];
    if (nonDrawingTools.includes(activeToolId)) {
      console.log(`${activeToolId} tool selected - no drawing action`);
      return;
    }

    // Only pencil, brush, eraser should draw
    const drawingTools = ['pencil', 'brush', 'eraser'];
    if (!drawingTools.includes(activeToolId)) {
      return;
    }

    const ctx = getActiveLayerCtx();
    const { x, y } = toCanvasCoords(e.clientX, e.clientY);
    last.current = { x, y };

    // Debug logging
    console.log(`Drawing with ${activeToolId} on layer ${activeLayerId}, color: ${primaryColor}, pos: ${x},${y}`);

    ctx.save();
    // Don't apply view transforms to the context - they're applied to the container
    // ctx.translate(view.x, view.y);
    // ctx.scale(view.scale, view.scale);

    // Configure tool-specific drawing properties
    if (activeToolId === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    } else if (activeToolId === 'pencil') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = primaryColor;
      ctx.lineCap = 'square'; // Hard edges for pencil
      ctx.lineJoin = 'miter';
      ctx.imageSmoothingEnabled = false; // Crisp pixels for pencil
    } else if (activeToolId === 'brush') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = primaryColor;
      ctx.lineCap = 'round'; // Soft edges for brush
      ctx.lineJoin = 'round';
      ctx.imageSmoothingEnabled = true;
    } else {
      // Default behavior for other tools
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = primaryColor;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }

    ctx.lineWidth = brushSize;
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!last.current) return;

    // panning
    if (isPanning.current) {
      const dx = e.clientX - last.current.x;
      const dy = e.clientY - last.current.y;
      setView(v => ({ ...v, x: v.x + dx, y: v.y + dy }));
      last.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // drawing
    const ctx = getActiveLayerCtx();
    ctx.save();
    // Don't apply view transforms to the context - they're applied to the container
    // ctx.translate(view.x, view.y);
    // ctx.scale(view.scale, view.scale);

    // Apply same tool-specific settings as in onPointerDown
    if (activeToolId === 'pencil') {
      ctx.imageSmoothingEnabled = false;
    } else if (activeToolId === 'brush') {
      ctx.imageSmoothingEnabled = true;
    }

    const { x, y } = toCanvasCoords(e.clientX, e.clientY);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.restore();
  }

  function onPointerUp() {
    isPanning.current = false;
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
        {!['pencil', 'brush', 'eraser'].includes(activeToolId) && <span style={{ marginLeft: 8, color: '#f59e0b' }}>NO DRAW</span>}
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
