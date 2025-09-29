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
  const { activeToolId, primaryColor, brushSize, setActiveToolId } = useDrawly();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const isPanning = useRef(false);
  const last = useRef<{x:number;y:number}|null>(null);

  // Ensure a crisp default canvas size
  useEffect(() => {
    const canvas = canvasRef.current!;
    const dpr = window.devicePixelRatio || 1;
    const w = 1600, h = 1000;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    // background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
  }, []);

  function getCtx() {
    const c = canvasRef.current!;
    return c.getContext('2d')!;
  }

  function toCanvasCoords(clientX:number, clientY:number) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = (clientX - rect.left - view.x) / view.scale;
    const y = (clientY - rect.top - view.y) / view.scale;
    return { x, y };
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);

    if (e.button === 1 || e.button === 0 && (e.nativeEvent as any).isPrimary === false) return; // ignore middle/secondary

    if ((e.nativeEvent as any).which === 1 && (e.nativeEvent as PointerEvent).buttons === 1) {
      if (activeToolId === 'zoom') return;
      if (e.nativeEvent instanceof PointerEvent && (e.nativeEvent as any).isPanActive) return;
    }

    if (activeToolId === 'zoom') return;

    if (panKey) {
      isPanning.current = true;
      last.current = { x: e.clientX, y: e.clientY };
      return;
    }

    const ctx = getCtx();
    const { x, y } = toCanvasCoords(e.clientX, e.clientY);
    last.current = { x, y };

    ctx.save();
    ctx.translate(view.x, view.y);
    ctx.scale(view.scale, view.scale);

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
    const ctx = getCtx();
    ctx.save();
    ctx.translate(view.x, view.y);
    ctx.scale(view.scale, view.scale);

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
      <canvas
        ref={canvasRef}
        style={{
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
          transformOrigin: '0 0',
          touchAction: 'none',
          background: '#fff',
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
        {activeToolId === 'pencil' && <span style={{ marginLeft: 8 }}>(P)</span>}
        {activeToolId === 'brush' && <span style={{ marginLeft: 8 }}>(B)</span>}
        {activeToolId === 'eraser' && <span style={{ marginLeft: 8 }}>(E)</span>}
        <span style={{ margin: '0 8px' }}>·</span>
        <span>Size: <span className="kbd">{brushSize}px</span></span>
        <span style={{ margin: '0 8px' }}>·</span>
        <span>Color: <span className="kbd">{primaryColor}</span></span>
      </div>
    </div>
  );
}
