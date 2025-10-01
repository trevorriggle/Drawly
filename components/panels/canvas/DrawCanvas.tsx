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
  const drawlyContext = useDrawly();
  const { activeToolId, primaryColor, brushSize, setActiveToolId, layers, activeLayerId, uploadedImageForLayer, updateLayerImagePosition, saveHistory, undo, redo, canvasHistory, historyIndex } = drawlyContext;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const layerCanvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const isPanning = useRef(false);
  const isDrawing = useRef(false);
  const isDrawingLine = useRef(false);
  const lineStart = useRef<{x:number;y:number}|null>(null);
  const linePreviewImageData = useRef<ImageData | null>(null);
  const last = useRef<{x:number;y:number}|null>(null);
  const rafId = useRef<number | null>(null);
  const pendingDraw = useRef<{x: number, y: number} | null>(null);

  const [canvasSize, setCanvasSize] = useState({ width: 1600, height: 1000 });
  const [mousePos, setMousePos] = useState<{x: number, y: number} | null>(null);
  const [movingLayer, setMovingLayer] = useState<string | null>(null);
  const [moveStartPos, setMoveStartPos] = useState<{x: number, y: number} | null>(null);
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const [resizingHandle, setResizingHandle] = useState<'tl' | 'tr' | 'bl' | 'br' | null>(null);

  // Helper functions for undo/redo
  function saveCanvasState() {
    const states: ImageData[] = [];
    layers.forEach((layer) => {
      const canvas = layerCanvasRefs.current.get(layer.id);
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          states.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
        }
      }
    });
    saveHistory(states);
  }

  function restoreCanvasState(states: ImageData[]) {
    states.forEach((imageData, index) => {
      const layer = layers[index];
      if (layer) {
        const canvas = layerCanvasRefs.current.get(layer.id);
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.putImageData(imageData, 0, 0);
          }
        }
      }
    });
  }

  // Register restore function
  useEffect(() => {
    drawlyContext.registerRestoreCanvas(restoreCanvasState);
  }, [layers, drawlyContext]);

  // Listen to history changes and restore canvas
  useEffect(() => {
    if (historyIndex >= 0 && canvasHistory[historyIndex]) {
      restoreCanvasState(canvasHistory[historyIndex]);
    }
  }, [historyIndex]);

  // Export canvas function - register it once
  useEffect(() => {
    const exportFunc = () => {
      // Create a temporary canvas to combine all layers
      const tempCanvas = document.createElement('canvas');
      const firstCanvas = layerCanvasRefs.current.values().next().value;
      if (!firstCanvas) {
        console.log('No canvas found to export');
        return null;
      }

      // Use logical size (not DPR scaled) for export to keep file size manageable
      tempCanvas.width = canvasSize.width;
      tempCanvas.height = canvasSize.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return null;

      // Fill with white background
      tempCtx.fillStyle = 'white';
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

      // Draw all visible layers in order (scale down from DPR size)
      layers.forEach((layer) => {
        if (!layer.visible) return;
        const canvas = layerCanvasRefs.current.get(layer.id);
        if (canvas) {
          tempCtx.globalAlpha = layer.opacity;
          // Scale down from high-res canvas to logical size
          tempCtx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);
        }
      });

      console.log(`Canvas exported at ${tempCanvas.width}x${tempCanvas.height}`);
      // Export as base64 PNG (remove data:image/png;base64, prefix)
      // Use JPEG with quality to further reduce size for API
      return tempCanvas.toDataURL('image/jpeg', 0.85).split(',')[1];
    };

    // Register with context
    drawlyContext.registerExportCanvas(exportFunc);
    console.log('Export function registered');
  }, [layers, drawlyContext]);

  // Update canvas size to fill container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const parent = container.parentElement;
      if (parent) {
        // Get the full available space in the canvas-wrap area
        const rect = parent.getBoundingClientRect();
        const width = Math.max(rect.width, 100); // Minimum size
        const height = Math.max(rect.height, 100);
        console.log('Canvas container size:', width, 'x', height);

        // Only update if significantly different to avoid unnecessary re-renders
        setCanvasSize(prev => {
          if (Math.abs(prev.width - width) > 1 || Math.abs(prev.height - height) > 1) {
            return { width, height };
          }
          return prev;
        });
      }
    };

    // Initial size calculation with delay to ensure layout is ready
    setTimeout(updateSize, 100);

    const resizeObserver = new ResizeObserver(updateSize);
    if (container.parentElement) {
      resizeObserver.observe(container.parentElement);
    }

    return () => resizeObserver.disconnect();
  }, []); // Empty dependency array - only run once

  // Proper flood fill function
  function fillArea(ctx: CanvasRenderingContext2D, x: number, y: number, fillColor: string) {
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

  // Simple layer system - just add canvases as needed
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const dpr = (window.devicePixelRatio || 1) * 2; // 2x resolution for balanced performance/quality

    // Add white background once
    if (!container.querySelector('.bg')) {
      const bg = document.createElement('div');
      bg.className = 'bg';
      bg.style.cssText = `
        position: absolute; top: 0; left: 0; z-index: 0;
        width: ${canvasSize.width}px; height: ${canvasSize.height}px;
        background: white;
      `;
      container.appendChild(bg);
    }

    // Create missing canvases
    layers.forEach((layer, index) => {
      if (!layerCanvasRefs.current.has(layer.id)) {
        const canvas = document.createElement('canvas');
        canvas.width = canvasSize.width * dpr;
        canvas.height = canvasSize.height * dpr;
        console.log(`Creating canvas ${layer.id}: ${canvas.width}x${canvas.height} (DPR: ${dpr})`);
        canvas.style.cssText = `
          position: absolute; top: 0; left: 0;
          width: ${canvasSize.width}px; height: ${canvasSize.height}px;
          z-index: ${index + 1};
        `;

        const ctx = canvas.getContext('2d', {
          alpha: true,
          desynchronized: false,
          colorSpace: 'srgb'
        })!;
        // Ultra high-quality rendering settings
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        // Note: textRenderingOptimization not available in all browsers
        ctx.scale(dpr, dpr);

        layerCanvasRefs.current.set(layer.id, canvas);
        container.appendChild(canvas);

      }

      // Update canvas properties
      const canvas = layerCanvasRefs.current.get(layer.id)!;
      canvas.style.opacity = String(layer.opacity);
      canvas.style.visibility = layer.visible ? 'visible' : 'hidden';
      canvas.style.pointerEvents = layer.id === activeLayerId ? 'auto' : 'none';
      canvas.style.zIndex = String(index + 1);
    });
  }, [layers, activeLayerId, canvasSize.width, canvasSize.height]);

  // Render uploaded image on layer
  useEffect(() => {
    if (!uploadedImageForLayer) return;

    console.log('Attempting to render image on layer:', uploadedImageForLayer.layerId);
    console.log('Available layers:', Array.from(layerCanvasRefs.current.keys()));

    const canvas = layerCanvasRefs.current.get(uploadedImageForLayer.layerId);
    if (!canvas) {
      console.log('Canvas not found for uploaded image, trying again in 200ms');
      const timeout = setTimeout(() => {
        const retryCanvas = layerCanvasRefs.current.get(uploadedImageForLayer.layerId);
        if (retryCanvas) {
          renderImageToCanvas(retryCanvas, uploadedImageForLayer.image);
        }
      }, 200);
      return () => clearTimeout(timeout);
    }

    renderImageToCanvas(canvas, uploadedImageForLayer.image);
  }, [uploadedImageForLayer, canvasSize.width, canvasSize.height]);

  function renderImageToCanvas(canvas: HTMLCanvasElement, img: HTMLImageElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Find the layer to get stored position
    const layer = layers.find(l => layerCanvasRefs.current.get(l.id) === canvas);
    let x, y, scaledWidth, scaledHeight;

    if (layer?.imagePosition) {
      // Use stored position
      ({ x, y, width: scaledWidth, height: scaledHeight } = layer.imagePosition);
    } else {
      // Calculate initial centering
      const scale = Math.min(canvasSize.width / img.width, canvasSize.height / img.height);
      scaledWidth = img.width * scale;
      scaledHeight = img.height * scale;
      x = (canvasSize.width - scaledWidth) / 2;
      y = (canvasSize.height - scaledHeight) / 2;

      // Store initial position
      if (layer) {
        updateLayerImagePosition(layer.id, { x, y, width: scaledWidth, height: scaledHeight });
      }
    }

    // Clear and draw
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

    console.log(`✓ Rendered uploaded image: ${scaledWidth}x${scaledHeight} at (${x}, ${y})`);
  }

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
    // Use same coordinate system as mouse tracking for consistency
    const parent = containerRef.current?.parentElement;
    if (!parent) return { x: 0, y: 0 };

    const rect = parent.getBoundingClientRect();
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

    if (e.button === 1) return; // ignore middle button

    // Handle panning (right click, spacebar + drag, OR pan tool)
    if (e.button === 2 || panKey || activeToolId === 'pan') {
      isPanning.current = true;
      last.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // Handle special non-drawing tools
    if (activeToolId === 'text') {
      // Simple text input (placeholder)
      const text = prompt('Enter text:');
      if (text) {
        const { x, y } = toCanvasCoords(e.clientX, e.clientY);
        const ctx = getActiveLayerCtx();
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.font = `${brushSize * 4}px Arial`;
        ctx.fillStyle = primaryColor;
        ctx.textBaseline = 'top';
        ctx.fillText(text, x, y);
        saveCanvasState();
      }
      return;
    }

    // Handle select/move tool
    if (activeToolId === 'select') {
      const { x, y } = toCanvasCoords(e.clientX, e.clientY);

      // Check if clicking on a resize handle first
      if (selectedLayer) {
        const layer = layers.find(l => l.id === selectedLayer);
        if (layer?.imagePosition) {
          const pos = layer.imagePosition;
          const handleSize = 12 / view.scale;

          // Top-left
          if (Math.abs(x - pos.x) < handleSize && Math.abs(y - pos.y) < handleSize) {
            setResizingHandle('tl');
            setMoveStartPos({ x, y });
            return;
          }
          // Top-right
          if (Math.abs(x - (pos.x + pos.width)) < handleSize && Math.abs(y - pos.y) < handleSize) {
            setResizingHandle('tr');
            setMoveStartPos({ x, y });
            return;
          }
          // Bottom-left
          if (Math.abs(x - pos.x) < handleSize && Math.abs(y - (pos.y + pos.height)) < handleSize) {
            setResizingHandle('bl');
            setMoveStartPos({ x, y });
            return;
          }
          // Bottom-right
          if (Math.abs(x - (pos.x + pos.width)) < handleSize && Math.abs(y - (pos.y + pos.height)) < handleSize) {
            setResizingHandle('br');
            setMoveStartPos({ x, y });
            return;
          }
        }
      }

      // Check if clicking on an uploaded image
      for (const layer of layers) {
        if (!layer.visible || !layer.imagePosition) continue;

        const pos = layer.imagePosition;
        if (x >= pos.x && x <= pos.x + pos.width && y >= pos.y && y <= pos.y + pos.height) {
          console.log(`Selected layer ${layer.id}`);
          setSelectedLayer(layer.id);
          setMovingLayer(layer.id);
          setMoveStartPos({ x, y });
          last.current = { x: e.clientX, y: e.clientY };
          return;
        }
      }

      // Clicked outside - deselect
      setSelectedLayer(null);
      return;
    }

    // Handle fill tool (must be before other drawing tools)
    if (activeToolId === 'fill') {
      const { x, y } = toCanvasCoords(e.clientX, e.clientY);
      const ctx = getActiveLayerCtx();
      fillArea(ctx, x, y, primaryColor);
      saveCanvasState();
      return;
    }

    // Tools that truly don't draw
    const nonDrawingTools = ['lasso', 'wand', 'transform', 'crop', 'pan'] as const;
    if (nonDrawingTools.includes(activeToolId as any)) {
      console.log(`${activeToolId} tool selected - no drawing action`);
      return;
    }

    // All other tools should draw
    const drawingTools = ['pencil', 'brush', 'eraser', 'gradient', 'rectangle', 'circle', 'triangle', 'line', 'smudge', 'clone'];
    if (!drawingTools.includes(activeToolId)) {
      return;
    }

    const ctx = getActiveLayerCtx();
    const { x, y } = toCanvasCoords(e.clientX, e.clientY);
    last.current = { x, y };

    // Debug logging
    console.log(`Drawing with ${activeToolId} on layer ${activeLayerId}, color: ${primaryColor}, pos: ${x},${y}`);

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

    if (activeToolId === 'rectangle' || activeToolId === 'circle' || activeToolId === 'triangle') {
      // Start shape drawing mode (similar to line tool)
      isDrawingLine.current = true; // Reuse line drawing logic for shapes
      lineStart.current = { x, y };
      const canvas = getActiveLayerCanvas();
      linePreviewImageData.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
      console.log(`Starting shape at ${x}, ${y}`);
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
      ctx.imageSmoothingQuality = 'high';
    } else if (activeToolId === 'brush') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = primaryColor;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
    } else if (activeToolId === 'smudge') {
      // Smudge tool: sample colors and blend them
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = primaryColor;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
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
    // Always track mouse position for cursor preview - use parent element for accurate positioning
    const parent = containerRef.current?.parentElement;
    if (parent) {
      const rect = parent.getBoundingClientRect();
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }

    if (!last.current && !isDrawingLine.current && !movingLayer && !resizingHandle) return;

    // resizing image
    if (resizingHandle && selectedLayer && moveStartPos) {
      const { x, y } = toCanvasCoords(e.clientX, e.clientY);
      const layer = layers.find(l => l.id === selectedLayer);

      if (layer?.imagePosition) {
        const pos = layer.imagePosition;
        let newX = pos.x, newY = pos.y, newWidth = pos.width, newHeight = pos.height;

        switch (resizingHandle) {
          case 'tl':
            newX = x;
            newY = y;
            newWidth = pos.x + pos.width - x;
            newHeight = pos.y + pos.height - y;
            break;
          case 'tr':
            newY = y;
            newWidth = x - pos.x;
            newHeight = pos.y + pos.height - y;
            break;
          case 'bl':
            newX = x;
            newWidth = pos.x + pos.width - x;
            newHeight = y - pos.y;
            break;
          case 'br':
            newWidth = x - pos.x;
            newHeight = y - pos.y;
            break;
        }

        // Ensure minimum size
        if (newWidth > 20 && newHeight > 20) {
          updateLayerImagePosition(selectedLayer, {
            x: newX,
            y: newY,
            width: newWidth,
            height: newHeight
          });

          // Re-render the layer
          if (uploadedImageForLayer?.layerId === selectedLayer) {
            const canvas = layerCanvasRefs.current.get(selectedLayer);
            if (canvas) {
              renderImageToCanvas(canvas, uploadedImageForLayer.image);
            }
          }
        }
      }
      return;
    }

    // moving image
    if (movingLayer && last.current && moveStartPos && !resizingHandle) {
      const { x, y } = toCanvasCoords(e.clientX, e.clientY);
      const layer = layers.find(l => l.id === movingLayer);

      if (layer?.imagePosition) {
        const dx = x - moveStartPos.x;
        const dy = y - moveStartPos.y;

        updateLayerImagePosition(movingLayer, {
          x: layer.imagePosition.x + dx,
          y: layer.imagePosition.y + dy,
          width: layer.imagePosition.width,
          height: layer.imagePosition.height
        });

        setMoveStartPos({ x, y });

        // Re-render the layer
        if (uploadedImageForLayer?.layerId === movingLayer) {
          const canvas = layerCanvasRefs.current.get(movingLayer);
          if (canvas) {
            renderImageToCanvas(canvas, uploadedImageForLayer.image);
          }
        }
      }
      return;
    }

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

    // Handle line/shape tool preview
    if (isDrawingLine.current && lineStart.current && linePreviewImageData.current) {
      // Restore canvas to state before preview
      ctx.putImageData(linePreviewImageData.current, 0, 0);

      // Draw preview
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.setLineDash([5, 5]); // Dashed preview
      ctx.beginPath();

      if (activeToolId === 'line') {
        // Draw line preview
        ctx.moveTo(lineStart.current.x, lineStart.current.y);
        ctx.lineTo(x, y);
      } else if (activeToolId === 'rectangle') {
        // Draw rectangle preview
        const width = x - lineStart.current.x;
        const height = y - lineStart.current.y;
        ctx.rect(lineStart.current.x, lineStart.current.y, width, height);
      } else if (activeToolId === 'circle') {
        // Draw circle preview
        const radius = Math.sqrt(Math.pow(x - lineStart.current.x, 2) + Math.pow(y - lineStart.current.y, 2));
        ctx.arc(lineStart.current.x, lineStart.current.y, radius, 0, 2 * Math.PI);
      } else if (activeToolId === 'triangle') {
        // Draw triangle preview
        const width = x - lineStart.current.x;
        const height = y - lineStart.current.y;
        ctx.moveTo(lineStart.current.x, lineStart.current.y);
        ctx.lineTo(lineStart.current.x + width, lineStart.current.y + height);
        ctx.lineTo(lineStart.current.x - width, lineStart.current.y + height);
        ctx.closePath();
      }

      ctx.stroke();
      ctx.setLineDash([]); // Reset line dash
      return;
    }

    // Regular brush drawing - throttle with RAF
    if (isDrawing.current && last.current) {
      pendingDraw.current = { x, y };

      if (!rafId.current) {
        rafId.current = requestAnimationFrame(() => {
          if (pendingDraw.current && last.current) {
            ctx.lineTo(pendingDraw.current.x, pendingDraw.current.y);
            ctx.stroke();
            last.current = pendingDraw.current;
            pendingDraw.current = null;
          }
          rafId.current = null;
        });
      }
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    // Stop resizing
    if (resizingHandle) {
      setResizingHandle(null);
      setMoveStartPos(null);
      return;
    }

    // Stop moving
    if (movingLayer) {
      setMovingLayer(null);
      setMoveStartPos(null);
      last.current = null;
      return;
    }

    // Handle line/shape tool completion
    if (isDrawingLine.current && lineStart.current) {
      const ctx = getActiveLayerCtx();
      const { x, y } = toCanvasCoords(e.clientX, e.clientY);

      // Draw final shape
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.setLineDash([]); // Solid line
      ctx.beginPath();

      if (activeToolId === 'line') {
        // Draw final line
        ctx.moveTo(lineStart.current.x, lineStart.current.y);
        ctx.lineTo(x, y);
      } else if (activeToolId === 'rectangle') {
        // Draw final rectangle
        const width = x - lineStart.current.x;
        const height = y - lineStart.current.y;
        ctx.rect(lineStart.current.x, lineStart.current.y, width, height);
      } else if (activeToolId === 'circle') {
        // Draw final circle
        const radius = Math.sqrt(Math.pow(x - lineStart.current.x, 2) + Math.pow(y - lineStart.current.y, 2));
        ctx.arc(lineStart.current.x, lineStart.current.y, radius, 0, 2 * Math.PI);
      } else if (activeToolId === 'triangle') {
        // Draw final triangle
        const width = x - lineStart.current.x;
        const height = y - lineStart.current.y;
        ctx.moveTo(lineStart.current.x, lineStart.current.y);
        ctx.lineTo(lineStart.current.x + width, lineStart.current.y + height);
        ctx.lineTo(lineStart.current.x - width, lineStart.current.y + height);
        ctx.closePath();
      }

      ctx.stroke();

      isDrawingLine.current = false;
      lineStart.current = null;
      linePreviewImageData.current = null;

      // Save state after drawing line/shape
      saveCanvasState();
    }

    // Save state after brush/pencil/eraser drawing
    if (isDrawing.current) {
      saveCanvasState();
    }

    isPanning.current = false;
    isDrawing.current = false;
    last.current = null;

    // Clean up any pending RAF
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
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
          case 'KeyG': e.preventDefault(); setActiveToolId('fill'); break;
          case 'KeyT': e.preventDefault(); setActiveToolId('text'); break;
          case 'KeyL': e.preventDefault(); setActiveToolId('line'); break;
          case 'KeyU': e.preventDefault(); setActiveToolId('rectangle'); break;
          case 'KeyC': e.preventDefault(); setActiveToolId('circle'); break;
          case 'KeyY': e.preventDefault(); setActiveToolId('triangle'); break;
          case 'KeyQ': e.preventDefault(); setActiveToolId('lasso'); break;
          case 'KeyH': e.preventDefault(); setActiveToolId('pan'); break;
        }
      }
    };
    const u = (e: KeyboardEvent) => { if (e.code === 'Space') setPanKey(false); };
    window.addEventListener('keydown', d);
    window.addEventListener('keyup', u);
    return () => { window.removeEventListener('keydown', d); window.removeEventListener('keyup', u); };
  }, [setActiveToolId]);

  // wheel zoom
  function onWheel(e: React.WheelEvent) {
    e.preventDefault();

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const scaleBy = 1.1;
    const direction = e.deltaY > 0 ? 1 / scaleBy : scaleBy;

    setView(v => {
      const newScale = Math.max(0.2, Math.min(6, v.scale * direction));

      // Zoom towards mouse position
      const scaleDiff = newScale - v.scale;
      const newX = v.x - (mouseX * scaleDiff) / v.scale;
      const newY = v.y - (mouseY * scaleDiff) / v.scale;

      return { x: newX, y: newY, scale: newScale };
    });
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          width: canvasSize.width,
          height: canvasSize.height,
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
          transformOrigin: '0 0'
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => setMousePos(null)}
        onWheel={onWheel}
        onContextMenu={(e) => e.preventDefault()}
      />
      {/* Selection handles */}
      {selectedLayer && activeToolId === 'select' && (() => {
        const layer = layers.find(l => l.id === selectedLayer);
        if (!layer?.imagePosition) return null;

        const pos = layer.imagePosition;
        const handleSize = 12;

        return (
          <>
            {/* Selection border */}
            <div style={{
              position: 'absolute',
              left: view.x + pos.x * view.scale,
              top: view.y + pos.y * view.scale,
              width: pos.width * view.scale,
              height: pos.height * view.scale,
              border: '2px dashed #3b82f6',
              pointerEvents: 'none',
              zIndex: 999
            }} />

            {/* Corner handles */}
            {[
              { key: 'tl', x: pos.x, y: pos.y },
              { key: 'tr', x: pos.x + pos.width, y: pos.y },
              { key: 'bl', x: pos.x, y: pos.y + pos.height },
              { key: 'br', x: pos.x + pos.width, y: pos.y + pos.height }
            ].map(handle => (
              <div key={handle.key} style={{
                position: 'absolute',
                left: view.x + handle.x * view.scale - handleSize / 2,
                top: view.y + handle.y * view.scale - handleSize / 2,
                width: handleSize,
                height: handleSize,
                backgroundColor: 'white',
                border: '2px solid #3b82f6',
                borderRadius: '50%',
                cursor: handle.key === 'tl' || handle.key === 'br' ? 'nwse-resize' : 'nesw-resize',
                zIndex: 1000
              }} />
            ))}
          </>
        );
      })()}

      {/* Brush size cursor preview */}
      {mousePos && ['pencil', 'brush', 'eraser'].includes(activeToolId) && (
        <div
          style={{
            position: 'absolute',
            left: mousePos.x - (brushSize * view.scale) / 2,
            top: mousePos.y - (brushSize * view.scale) / 2,
            width: brushSize * view.scale,
            height: brushSize * view.scale,
            borderRadius: '50%',
            border: '1px solid rgba(0,0,0,0.8)',
            backgroundColor: 'rgba(255,255,255,0.3)',
            pointerEvents: 'none',
            zIndex: 1000
          }}
        />
      )}
      <div style={{ position:'absolute', left:12, bottom:12, opacity:.8, fontSize:12, background: 'rgba(0,0,0,0.8)', color: 'white', padding: '8px 12px', borderRadius: 6 }}>
        <span style={{ fontWeight: 600 }}>{activeToolId.toUpperCase()}</span>
        {activeToolId === 'pencil' && <span style={{ marginLeft: 8, color: '#10b981' }}>(P) DRAWS</span>}
        {activeToolId === 'brush' && <span style={{ marginLeft: 8, color: '#10b981' }}>(B) DRAWS</span>}
        {activeToolId === 'eraser' && <span style={{ marginLeft: 8, color: '#ef4444' }}>(E) ERASES</span>}
        {activeToolId === 'smudge' && <span style={{ marginLeft: 8, color: '#10b981' }}>SMUDGES</span>}
        {activeToolId === 'fill' && <span style={{ marginLeft: 8, color: '#10b981' }}>(G) FILLS</span>}
        {activeToolId === 'gradient' && <span style={{ marginLeft: 8, color: '#10b981' }}>GRADIENT</span>}
        {activeToolId === 'rectangle' && <span style={{ marginLeft: 8, color: '#10b981' }}>(U) RECTANGLES</span>}
        {activeToolId === 'circle' && <span style={{ marginLeft: 8, color: '#10b981' }}>(C) CIRCLES</span>}
        {activeToolId === 'triangle' && <span style={{ marginLeft: 8, color: '#10b981' }}>(Y) TRIANGLES</span>}
        {activeToolId === 'line' && <span style={{ marginLeft: 8, color: '#10b981' }}>(L) LINES</span>}
        {activeToolId === 'clone' && <span style={{ marginLeft: 8, color: '#10b981' }}>CLONES</span>}
        {activeToolId === 'text' && <span style={{ marginLeft: 8, color: '#10b981' }}>(T) CLICK TO TYPE</span>}
        {activeToolId === 'pan' && <span style={{ marginLeft: 8, color: '#3b82f6' }}>(H) DRAG TO PAN</span>}
        {['select', 'lasso', 'wand', 'transform', 'crop'].includes(activeToolId) && <span style={{ marginLeft: 8, color: '#f59e0b' }}>NO DRAW</span>}
        <span style={{ margin: '0 8px' }}>·</span>
        <span>Size: <span className="kbd">{brushSize}px</span></span>
        <span style={{ margin: '0 8px' }}>·</span>
        <span>Color: <span className="kbd">{primaryColor}</span></span>
      </div>
    </div>
  );
}
