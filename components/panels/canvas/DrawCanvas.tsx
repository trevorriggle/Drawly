"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useDrawEvolve } from '@/context/DrawEvolveProvider';

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
  const drawEvolveContext = useDrawEvolve();
  const { activeToolId, primaryColor, brushSize, brushHardness, setActiveToolId, layers, activeLayerId, uploadedImageForLayer, updateLayerImagePosition, updateLayerCanvasData, saveHistory, undo, redo, canvasHistory, historyIndex, mergeLayerDown } = drawEvolveContext;
  const mergeRequestRef = useRef<string | null>(null);
  const brushStampCache = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const smudgeBuffer = useRef<ImageData | null>(null);
  const cloneSource = useRef<{x: number; y: number} | null>(null);
  const cloneOffset = useRef<{dx: number; dy: number} | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const layerCanvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const dpr = useRef(typeof window !== 'undefined' ? (window.devicePixelRatio || 1) * 2 : 2);
  const isPanning = useRef(false);
  const isDrawing = useRef(false);
  const isDrawingLine = useRef(false);
  const lineStart = useRef<{x:number;y:number}|null>(null);
  const linePreviewImageData = useRef<ImageData | null>(null);
  const gradientStart = useRef<{x:number;y:number}|null>(null);
  const gradientPreviewImageData = useRef<ImageData | null>(null);
  const last = useRef<{x:number;y:number}|null>(null);
  const rafId = useRef<number | null>(null);
  const pendingDraw = useRef<{x: number, y: number} | null>(null);

  const [canvasSize, setCanvasSize] = useState({ width: 1600, height: 1000 });
  const [mousePos, setMousePos] = useState<{x: number, y: number} | null>(null);
  const [movingLayer, setMovingLayer] = useState<string | null>(null);
  const [moveStartPos, setMoveStartPos] = useState<{x: number, y: number} | null>(null);
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const [resizingHandle, setResizingHandle] = useState<'tl' | 'tr' | 'bl' | 'br' | null>(null);
  const [lassoPath, setLassoPath] = useState<{x: number; y: number}[]>([]);
  const [textInput, setTextInput] = useState<{x: number, y: number, text: string} | null>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const [shapeFillMode, setShapeFillMode] = useState<'stroke' | 'fill' | 'both'>('stroke');

  // Helper functions for undo/redo
  function saveCanvasState() {
    const states: ImageData[] = [];
    layers.forEach((layer) => {
      const canvas = layerCanvasRefs.current.get(layer.id);
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          states.push(imageData);

          // Generate thumbnail (64x64 preview)
          const thumbCanvas = document.createElement('canvas');
          thumbCanvas.width = 64;
          thumbCanvas.height = 64;
          const thumbCtx = thumbCanvas.getContext('2d')!;
          thumbCtx.drawImage(canvas, 0, 0, 64, 64);
          const thumbnail = thumbCanvas.toDataURL('image/png');

          // Save to layer state for proper synchronization
          updateLayerCanvasData(layer.id, imageData, thumbnail);
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

            // Generate thumbnail
            const thumbCanvas = document.createElement('canvas');
            thumbCanvas.width = 64;
            thumbCanvas.height = 64;
            const thumbCtx = thumbCanvas.getContext('2d')!;
            thumbCtx.drawImage(canvas, 0, 0, 64, 64);
            const thumbnail = thumbCanvas.toDataURL('image/png');

            // Also update layer state to keep it in sync
            updateLayerCanvasData(layer.id, imageData, thumbnail);
          }
        }
      }
    });
  }

  // Register restore function
  useEffect(() => {
    drawEvolveContext.registerRestoreCanvas(restoreCanvasState);
  }, [layers, drawEvolveContext]);

  // Handle keyboard shortcuts for shape fill mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['rectangle', 'circle', 'triangle'].includes(activeToolId) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setShapeFillMode(prev => {
          if (prev === 'stroke') return 'fill';
          if (prev === 'fill') return 'both';
          return 'stroke';
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeToolId]);

  // Save initial canvas state on mount
  useEffect(() => {
    if (canvasHistory.length === 0 && layerCanvasRefs.current.size > 0) {
      setTimeout(() => saveCanvasState(), 500);
    }
  }, [layerCanvasRefs.current.size]);

  // Listen to history changes and restore canvas
  useEffect(() => {
    if (historyIndex >= 0 && canvasHistory[historyIndex]) {
      restoreCanvasState(canvasHistory[historyIndex]);
    }
  }, [historyIndex]);

  // Register merge layer canvas function
  useEffect(() => {
    const mergeFunc = (layerId: string) => {
      const layerIndex = layers.findIndex(l => l.id === layerId);
      if (layerIndex === -1 || layerIndex === layers.length - 1) return;

      const sourceCanvas = layerCanvasRefs.current.get(layerId);
      const targetLayer = layers[layerIndex + 1];
      const targetCanvas = layerCanvasRefs.current.get(targetLayer.id);

      if (!sourceCanvas || !targetCanvas) return;

      const sourceCtx = sourceCanvas.getContext('2d');
      const targetCtx = targetCanvas.getContext('2d');
      if (!sourceCtx || !targetCtx) return;

      // Draw source canvas onto target canvas
      targetCtx.globalAlpha = layers[layerIndex].opacity;
      targetCtx.drawImage(sourceCanvas, 0, 0);
      targetCtx.globalAlpha = 1;

      // Save the merged result to layer state
      const mergedImageData = targetCtx.getImageData(0, 0, targetCanvas.width, targetCanvas.height);

      // Generate thumbnail for merged layer
      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = 64;
      thumbCanvas.height = 64;
      const thumbCtx = thumbCanvas.getContext('2d')!;
      thumbCtx.drawImage(targetCanvas, 0, 0, 64, 64);
      const thumbnail = thumbCanvas.toDataURL('image/png');

      updateLayerCanvasData(targetLayer.id, mergedImageData, thumbnail);

      console.log(`Merged layer ${layerId} down into ${targetLayer.id}`);
    };

    drawEvolveContext.registerMergeLayerCanvas(mergeFunc);
  }, [layers, drawEvolveContext, updateLayerCanvasData]);

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
    drawEvolveContext.registerExportCanvas(exportFunc);
    console.log('Export function registered');
  }, [layers, drawEvolveContext]);

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

  // Optimized scanline flood fill algorithm
  function fillArea(ctx: CanvasRenderingContext2D, x: number, y: number, fillColor: string) {
    const canvas = ctx.canvas;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;

    // Convert fill color to RGB
    const fillColorRgb = hexToRgb(fillColor);
    if (!fillColorRgb) return;

    const startX = Math.floor(x);
    const startY = Math.floor(y);

    if (startX < 0 || startX >= width || startY < 0 || startY >= height) return;

    const startIndex = (startY * width + startX) * 4;
    const startR = data[startIndex];
    const startG = data[startIndex + 1];
    const startB = data[startIndex + 2];
    const startA = data[startIndex + 3];

    // Don't fill if already the same color
    if (startR === fillColorRgb.r && startG === fillColorRgb.g && startB === fillColorRgb.b && startA === 255) return;

    // Stack-based flood fill with 4-directional filling
    const stack: [number, number][] = [[startX, startY]];
    const visited = new Uint8Array(width * height);
    const MAX_PIXELS = 2000000;
    let pixelsFilled = 0;

    while (stack.length > 0 && pixelsFilled < MAX_PIXELS) {
      const [px, py] = stack.pop()!;

      if (px < 0 || px >= width || py < 0 || py >= height) continue;

      const pixelIndex = py * width + px;
      if (visited[pixelIndex]) continue;

      const idx = pixelIndex * 4;

      // Check if pixel matches start color
      if (data[idx] !== startR || data[idx + 1] !== startG ||
          data[idx + 2] !== startB || data[idx + 3] !== startA) {
        continue;
      }

      // Fill this pixel
      visited[pixelIndex] = 1;
      data[idx] = fillColorRgb.r;
      data[idx + 1] = fillColorRgb.g;
      data[idx + 2] = fillColorRgb.b;
      data[idx + 3] = 255;
      pixelsFilled++;

      // Add neighboring pixels to stack
      stack.push([px + 1, py]);
      stack.push([px - 1, py]);
      stack.push([px, py + 1]);
      stack.push([px, py - 1]);
    }

    ctx.putImageData(imageData, 0, 0);

    if (pixelsFilled >= MAX_PIXELS) {
      console.warn('Fill area reached maximum pixel limit');
    }
  }

  function hexToRgb(hex: string): {r: number, g: number, b: number} | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  // Create a cached brush stamp (like Photoshop's brush engine)
  function getBrushStamp(size: number, hardness: number, color: string): HTMLCanvasElement {
    // Round values for better cache hits
    const roundedSize = Math.round(size);
    const roundedHardness = Math.round(hardness * 10) / 10;
    const key = `${roundedSize}-${roundedHardness}-${color}`;

    if (brushStampCache.current.has(key)) {
      return brushStampCache.current.get(key)!;
    }

    // Create offscreen canvas for brush stamp
    const stampCanvas = document.createElement('canvas');
    // Limit stamp size for performance (max 128x128)
    const stampSize = Math.min(Math.ceil(roundedSize * 2), 128);
    stampCanvas.width = stampSize;
    stampCanvas.height = stampSize;
    const stampCtx = stampCanvas.getContext('2d', { willReadFrequently: false })!;

    const centerX = stampSize / 2;
    const centerY = stampSize / 2;
    const radius = roundedSize / 2;

    // Parse color to RGB
    const rgb = hexToRgb(color);
    if (!rgb) return stampCanvas;

    // Draw brush using pixel manipulation - Photoshop-style hardness
    const imageData = stampCtx.createImageData(stampSize, stampSize);
    const data = imageData.data;

    // Photoshop hardness curve:
    // - 100% (1.0): Hard edge circle
    // - 0%: Maximum soft falloff
    // The hardness determines where the falloff starts relative to radius
    const hardEdgeRadius = radius * roundedHardness;
    const hardEdgeRadiusSq = hardEdgeRadius * hardEdgeRadius;
    const radiusSq = radius * radius;

    for (let y = 0; y < stampSize; y++) {
      for (let x = 0; x < stampSize; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distanceSq = dx * dx + dy * dy;

        let alpha = 0;
        if (distanceSq <= radiusSq) {
          if (roundedHardness >= 0.99) {
            // 100% hardness - sharp edge
            alpha = 1;
          } else if (distanceSq <= hardEdgeRadiusSq) {
            // Inside hard edge - full opacity
            alpha = 1;
          } else {
            // In falloff zone - smooth gradient from hard edge to outer edge
            const distance = Math.sqrt(distanceSq);
            const falloffDistance = distance - hardEdgeRadius;
            const falloffRange = radius - hardEdgeRadius;
            const falloffRatio = falloffDistance / falloffRange;

            // Use cosine curve for smooth, natural falloff (like Photoshop)
            alpha = Math.cos(falloffRatio * Math.PI / 2);
          }
        }

        const idx = (y * stampSize + x) * 4;
        data[idx] = rgb.r;
        data[idx + 1] = rgb.g;
        data[idx + 2] = rgb.b;
        data[idx + 3] = Math.round(alpha * 255);
      }
    }

    stampCtx.putImageData(imageData, 0, 0);

    // Cache it
    brushStampCache.current.set(key, stampCanvas);

    // Clear cache if too large
    if (brushStampCache.current.size > 50) {
      const firstKey = brushStampCache.current.keys().next().value;
      if (firstKey !== undefined) {
        brushStampCache.current.delete(firstKey);
      }
    }

    return stampCanvas;
  }

  // Layer canvas management - properly sync canvases with layer state
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

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

    // Remove canvases for deleted layers
    const currentLayerIds = new Set(layers.map(l => l.id));
    for (const [layerId, canvas] of layerCanvasRefs.current.entries()) {
      if (!currentLayerIds.has(layerId)) {
        canvas.remove();
        layerCanvasRefs.current.delete(layerId);
        console.log(`Removed canvas for deleted layer: ${layerId}`);
      }
    }

    // Create or update canvases for each layer
    layers.forEach((layer, index) => {
      let canvas = layerCanvasRefs.current.get(layer.id);

      if (!canvas) {
        // Create new canvas
        canvas = document.createElement('canvas');
        canvas.width = canvasSize.width * dpr.current;
        canvas.height = canvasSize.height * dpr.current;
        console.log(`Creating canvas ${layer.id}: ${canvas.width}x${canvas.height} (DPR: ${dpr.current})`);
        canvas.style.cssText = `
          position: absolute; top: 0; left: 0;
          width: ${canvasSize.width}px; height: ${canvasSize.height}px;
        `;

        const ctx = canvas.getContext('2d', {
          alpha: true,
          desynchronized: false,
          colorSpace: 'srgb'
        })!;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.scale(dpr.current, dpr.current);

        // Restore canvas data if it exists in layer state
        // (putImageData ignores transforms and writes directly to pixel buffer)
        if (layer.canvasData) {
          ctx.putImageData(layer.canvasData, 0, 0);
          console.log(`Restored canvas data for layer ${layer.id}`);
        }

        layerCanvasRefs.current.set(layer.id, canvas);
        container.appendChild(canvas);
      }

      // Update canvas properties and z-index for proper layer ordering
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
      const { x, y } = toCanvasCoords(e.clientX, e.clientY);
      setTextInput({ x, y, text: '' });
      // Focus will be handled by useEffect
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

      // Check if clicking on drawn pixels (for layers without imagePosition)
      const ctx = getActiveLayerCtx();
      const canvas = getActiveLayerCanvas();
      const scaledX = Math.floor(x * dpr.current);
      const scaledY = Math.floor(y * dpr.current);

      if (scaledX >= 0 && scaledX < canvas.width && scaledY >= 0 && scaledY < canvas.height) {
        const imageData = ctx.getImageData(scaledX, scaledY, 1, 1);
        const alpha = imageData.data[3];

        // If clicked on non-transparent pixel, treat it as selecting drawn content
        if (alpha > 0) {
          console.log(`Selected drawn pixels on layer ${activeLayerId}`);
          // For now, just log - full implementation would need bounding box detection
          alert('Selection of drawn pixels is partially implemented. Use the magic wand or lasso tools for selecting drawn content.');
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
      // Account for DPR scaling - canvas is 2x logical size
      const scaledX = x * dpr.current;
      const scaledY = y * dpr.current;
      fillArea(ctx, scaledX, scaledY, primaryColor);
      saveCanvasState();
      return;
    }

    // Handle lasso selection
    if (activeToolId === 'lasso') {
      const { x, y } = toCanvasCoords(e.clientX, e.clientY);
      setLassoPath([{ x, y }]);
      isDrawing.current = true;
      last.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // Handle magic wand selection
    if (activeToolId === 'wand') {
      const { x, y } = toCanvasCoords(e.clientX, e.clientY);
      const ctx = getActiveLayerCtx();
      const canvas = getActiveLayerCanvas();

      // Get pixel color at click position
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixelIndex = (Math.floor(y) * canvas.width + Math.floor(x)) * 4;
      const targetR = imageData.data[pixelIndex];
      const targetG = imageData.data[pixelIndex + 1];
      const targetB = imageData.data[pixelIndex + 2];

      console.log(`Magic wand at (${x},${y}): RGB(${targetR},${targetG},${targetB})`);

      // Create selection mask (for now, just log - actual selection would require more state)
      const tolerance = 32; // Color similarity threshold
      let selectedPixels = 0;

      for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];

        const colorDiff = Math.abs(r - targetR) + Math.abs(g - targetG) + Math.abs(b - targetB);
        if (colorDiff <= tolerance) {
          selectedPixels++;
        }
      }

      console.log(`Selected ${selectedPixels} similar pixels`);
      return;
    }

    // Tools that truly don't draw
    const nonDrawingTools = ['transform', 'crop', 'pan'] as const;
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
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Brush uses stamp-based rendering - no traditional stroke needed
      if (brushHardness < 1) {
        // Soft brush - will use stamp compositing
      } else {
        // Hard brush - fallback to normal stroke
        ctx.strokeStyle = primaryColor;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    } else if (activeToolId === 'smudge') {
      // Smudge tool: sample colors at starting point
      ctx.globalCompositeOperation = 'source-over';
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Sample a circular area under the brush
      const radius = Math.ceil(brushSize / 2);
      const sampleSize = radius * 2;
      const canvas = getActiveLayerCanvas();
      try {
        smudgeBuffer.current = ctx.getImageData(
          Math.max(0, x - radius),
          Math.max(0, y - radius),
          Math.min(sampleSize, canvas.width - (x - radius)),
          Math.min(sampleSize, canvas.height - (y - radius))
        );
      } catch (e) {
        console.error('Failed to sample for smudge:', e);
      }
    } else if (activeToolId === 'clone') {
      // Clone tool: Alt+click to set source, then paint from that offset
      if (e.altKey) {
        // Set clone source
        cloneSource.current = { x, y };
        cloneOffset.current = null;
        return; // Don't start drawing
      } else if (cloneSource.current) {
        // Set offset on first click after setting source
        if (!cloneOffset.current) {
          cloneOffset.current = {
            dx: x - cloneSource.current.x,
            dy: y - cloneSource.current.y
          };
        }
        ctx.globalCompositeOperation = 'source-over';
        isDrawing.current = true;
      }
    } else if (activeToolId === 'gradient') {
      // Gradient tool: drag from start to end point to create gradient
      gradientStart.current = { x, y };

      // Save current canvas state for preview
      const canvas = getActiveLayerCanvas();
      if (canvas) {
        const tempCtx = canvas.getContext('2d');
        if (tempCtx) {
          gradientPreviewImageData.current = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
        }
      }
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

    if (!last.current && !isDrawingLine.current && !gradientStart.current && !movingLayer && !resizingHandle) return;

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

    // Handle gradient preview
    if (gradientStart.current && gradientPreviewImageData.current) {
      // Restore canvas to state before preview
      ctx.putImageData(gradientPreviewImageData.current, 0, 0);

      // Draw gradient preview
      const gradient = ctx.createLinearGradient(
        gradientStart.current.x,
        gradientStart.current.y,
        x,
        y
      );
      gradient.addColorStop(0, primaryColor);
      gradient.addColorStop(1, 'rgba(0,0,0,0)'); // Transparent end

      // Fill entire canvas with gradient
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
      return;
    }

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

    // Handle lasso path building
    if (activeToolId === 'lasso' && isDrawing.current) {
      const { x: canvasX, y: canvasY } = toCanvasCoords(e.clientX, e.clientY);
      setLassoPath(prev => [...prev, { x: canvasX, y: canvasY }]);
      return;
    }

    // Regular brush drawing - throttle with RAF
    if (isDrawing.current && last.current) {
      pendingDraw.current = { x, y };

      if (!rafId.current) {
        rafId.current = requestAnimationFrame(() => {
          if (pendingDraw.current && last.current) {
            // Smudge tool - blend sampled pixels
            if (activeToolId === 'smudge' && smudgeBuffer.current) {
              const radius = Math.ceil(brushSize / 2);
              const strength = 0.5; // Smudge strength (0-1)
              const canvas = getActiveLayerCanvas();

              // Get current pixels at the target location
              let currentPixels;
              try {
                currentPixels = ctx.getImageData(
                  Math.max(0, pendingDraw.current.x - radius),
                  Math.max(0, pendingDraw.current.y - radius),
                  Math.min(radius * 2, canvas.width - (pendingDraw.current.x - radius)),
                  Math.min(radius * 2, canvas.height - (pendingDraw.current.y - radius))
                );
              } catch (e) {
                console.error('Failed to get pixels for smudge:', e);
                last.current = pendingDraw.current;
                pendingDraw.current = null;
                rafId.current = null;
                return;
              }

              // Blend the smudge buffer with current pixels
              const smudgeData = smudgeBuffer.current.data;
              const currentData = currentPixels.data;
              const blendedData = new Uint8ClampedArray(currentData.length);

              for (let i = 0; i < currentData.length; i += 4) {
                // Calculate distance from center for circular brush
                const pixelIndex = i / 4;
                const px = pixelIndex % currentPixels.width;
                const py = Math.floor(pixelIndex / currentPixels.width);
                const dx = px - radius;
                const dy = py - radius;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const normalizedDist = dist / radius;

                // Apply circular falloff
                let blendAmount = normalizedDist <= 1 ? (1 - normalizedDist) * strength : 0;

                // Blend colors
                if (i < smudgeData.length) {
                  blendedData[i] = currentData[i] * (1 - blendAmount) + smudgeData[i] * blendAmount;
                  blendedData[i + 1] = currentData[i + 1] * (1 - blendAmount) + smudgeData[i + 1] * blendAmount;
                  blendedData[i + 2] = currentData[i + 2] * (1 - blendAmount) + smudgeData[i + 2] * blendAmount;
                  blendedData[i + 3] = Math.max(currentData[i + 3], smudgeData[i + 3]); // Keep max alpha
                } else {
                  blendedData[i] = currentData[i];
                  blendedData[i + 1] = currentData[i + 1];
                  blendedData[i + 2] = currentData[i + 2];
                  blendedData[i + 3] = currentData[i + 3];
                }
              }

              currentPixels.data.set(blendedData);
              ctx.putImageData(currentPixels,
                Math.max(0, pendingDraw.current.x - radius),
                Math.max(0, pendingDraw.current.y - radius)
              );

              // Update smudge buffer to the blended result for continuous smudging
              smudgeBuffer.current = ctx.getImageData(
                Math.max(0, pendingDraw.current.x - radius),
                Math.max(0, pendingDraw.current.y - radius),
                Math.min(radius * 2, canvas.width - (pendingDraw.current.x - radius)),
                Math.min(radius * 2, canvas.height - (pendingDraw.current.y - radius))
              );

            } else if (activeToolId === 'clone' && cloneSource.current && cloneOffset.current) {
              // Clone stamp tool - sample from source and paint at current location
              const canvas = getActiveLayerCanvas();
              const radius = Math.ceil(brushSize / 2);

              // Calculate source position based on current position and offset
              const sourceX = pendingDraw.current.x - cloneOffset.current.dx;
              const sourceY = pendingDraw.current.y - cloneOffset.current.dy;

              try {
                // Sample from source location
                const sourceData = ctx.getImageData(
                  Math.max(0, sourceX - radius),
                  Math.max(0, sourceY - radius),
                  Math.min(radius * 2, canvas.width - (sourceX - radius)),
                  Math.min(radius * 2, canvas.height - (sourceY - radius))
                );

                // Paint at current location with circular brush mask
                const stamp = getBrushStamp(brushSize, brushHardness, '#000000');
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = sourceData.width;
                tempCanvas.height = sourceData.height;
                const tempCtx = tempCanvas.getContext('2d')!;

                // Draw source data
                tempCtx.putImageData(sourceData, 0, 0);

                // Apply circular mask
                tempCtx.globalCompositeOperation = 'destination-in';
                tempCtx.drawImage(stamp, 0, 0, sourceData.width, sourceData.height);

                // Paint to canvas
                ctx.globalCompositeOperation = 'source-over';
                ctx.drawImage(tempCanvas,
                  Math.max(0, pendingDraw.current.x - radius),
                  Math.max(0, pendingDraw.current.y - radius)
                );
              } catch (e) {
                console.error('Failed to clone stamp:', e);
              }
            } else if (activeToolId === 'brush' && brushHardness < 1) {
              // Optimized soft brush rendering
              const stamp = getBrushStamp(brushSize, brushHardness, primaryColor);

              // Interpolate between points for smooth strokes
              const dist = Math.hypot(pendingDraw.current.x - last.current.x, pendingDraw.current.y - last.current.y);
              // Adaptive spacing - larger brushes need less dense spacing
              const spacing = Math.max(brushSize * 0.15, 2); // Reduced density for performance
              const steps = Math.max(1, Math.ceil(dist / spacing));

              // Cap steps to prevent performance issues with fast strokes
              const maxSteps = 20;
              const actualSteps = Math.min(steps, maxSteps);

              ctx.globalAlpha = 1;
              ctx.globalCompositeOperation = 'source-over';

              for (let i = 0; i <= actualSteps; i++) {
                const t = (i / actualSteps) * (steps / actualSteps); // Adjust for capped steps
                const px = last.current.x + (pendingDraw.current.x - last.current.x) * Math.min(t, 1);
                const py = last.current.y + (pendingDraw.current.y - last.current.y) * Math.min(t, 1);

                // Draw stamp centered at point
                ctx.drawImage(stamp, px - stamp.width / 2, py - stamp.height / 2);
              }
            } else {
              // Hard edge brush/pencil - use normal stroke
              ctx.lineTo(pendingDraw.current.x, pendingDraw.current.y);
              ctx.stroke();
            }
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

    // Handle gradient completion
    if (gradientStart.current && gradientPreviewImageData.current) {
      const ctx = getActiveLayerCtx();
      const { x, y } = toCanvasCoords(e.clientX, e.clientY);

      // Draw final gradient
      const gradient = ctx.createLinearGradient(
        gradientStart.current.x,
        gradientStart.current.y,
        x,
        y
      );
      gradient.addColorStop(0, primaryColor);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

      gradientStart.current = null;
      gradientPreviewImageData.current = null;

      saveCanvasState();
      return;
    }

    // Handle line/shape tool completion
    if (isDrawingLine.current && lineStart.current) {
      const ctx = getActiveLayerCtx();
      const { x, y } = toCanvasCoords(e.clientX, e.clientY);

      // Draw final shape
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = primaryColor;
      ctx.fillStyle = primaryColor;
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

      // Apply fill/stroke based on mode
      if (shapeFillMode === 'fill' || shapeFillMode === 'both') {
        ctx.fill();
      }
      if (shapeFillMode === 'stroke' || shapeFillMode === 'both') {
        ctx.stroke();
      }

      isDrawingLine.current = false;
      lineStart.current = null;
      linePreviewImageData.current = null;

      // Save state after drawing line/shape
      saveCanvasState();
    }

    // Handle lasso completion
    if (activeToolId === 'lasso' && lassoPath.length > 0) {
      // Close the path and create a selection
      console.log('Lasso selection completed with', lassoPath.length, 'points');
      // For now, just clear the path (actual selection masking would be more complex)
      setLassoPath([]);
      isDrawing.current = false;
      return;
    }

    // Save state after brush/pencil/eraser drawing
    if (isDrawing.current) {
      saveCanvasState();
    }

    isPanning.current = false;
    isDrawing.current = false;
    last.current = null;
    smudgeBuffer.current = null; // Clear smudge buffer

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

      {/* Lasso selection path preview */}
      {lassoPath.length > 0 && (
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 999
          }}
        >
          <polyline
            points={lassoPath.map(p => `${view.x + p.x * view.scale},${view.y + p.y * view.scale}`).join(' ')}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeDasharray="5,5"
          />
        </svg>
      )}

      {/* Text input overlay */}
      {textInput && (
        <input
          ref={textInputRef}
          type="text"
          value={textInput.text}
          onChange={(e) => setTextInput({ ...textInput, text: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              // Commit text to canvas
              if (textInput.text.trim()) {
                const ctx = getActiveLayerCtx();
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.font = `${brushSize * 4}px Arial`;
                ctx.fillStyle = primaryColor;
                ctx.textBaseline = 'top';
                ctx.fillText(textInput.text, textInput.x, textInput.y);
                saveCanvasState();
              }
              setTextInput(null);
            } else if (e.key === 'Escape') {
              setTextInput(null);
            }
          }}
          onBlur={() => {
            // Commit on blur
            if (textInput.text.trim()) {
              const ctx = getActiveLayerCtx();
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.font = `${brushSize * 4}px Arial`;
              ctx.fillStyle = primaryColor;
              ctx.textBaseline = 'top';
              ctx.fillText(textInput.text, textInput.x, textInput.y);
              saveCanvasState();
            }
            setTextInput(null);
          }}
          style={{
            position: 'absolute',
            left: view.x + textInput.x * view.scale,
            top: view.y + textInput.y * view.scale,
            fontSize: `${brushSize * 4 * view.scale}px`,
            fontFamily: 'Arial',
            color: primaryColor,
            background: 'transparent',
            border: '2px dashed rgba(59, 130, 246, 0.5)',
            outline: 'none',
            padding: '2px 4px',
            minWidth: '100px',
            zIndex: 1001
          }}
          autoFocus
        />
      )}
      <div style={{ position:'absolute', left:12, bottom:12, opacity:.8, fontSize:12, background: 'rgba(0,0,0,0.8)', color: 'white', padding: '8px 12px', borderRadius: 6 }}>
        <span style={{ fontWeight: 600 }}>{activeToolId.toUpperCase()}</span>
        {activeToolId === 'pencil' && <span style={{ marginLeft: 8, color: '#10b981' }}>(P) DRAWS</span>}
        {activeToolId === 'brush' && <span style={{ marginLeft: 8, color: '#10b981' }}>(B) DRAWS</span>}
        {activeToolId === 'eraser' && <span style={{ marginLeft: 8, color: '#ef4444' }}>(E) ERASES</span>}
        {activeToolId === 'smudge' && <span style={{ marginLeft: 8, color: '#10b981' }}>SMUDGES</span>}
        {activeToolId === 'clone' && <span style={{ marginLeft: 8, color: '#10b981' }}>ALT+CLICK to set source</span>}
        {activeToolId === 'fill' && <span style={{ marginLeft: 8, color: '#10b981' }}>(G) FILLS</span>}
        {activeToolId === 'gradient' && <span style={{ marginLeft: 8, color: '#10b981' }}>DRAG to create gradient</span>}
        {activeToolId === 'rectangle' && <span style={{ marginLeft: 8, color: '#10b981' }}>(U) {shapeFillMode.toUpperCase()} - F to toggle</span>}
        {activeToolId === 'circle' && <span style={{ marginLeft: 8, color: '#10b981' }}>(C) {shapeFillMode.toUpperCase()} - F to toggle</span>}
        {activeToolId === 'triangle' && <span style={{ marginLeft: 8, color: '#10b981' }}>(Y) {shapeFillMode.toUpperCase()} - F to toggle</span>}
        {activeToolId === 'line' && <span style={{ marginLeft: 8, color: '#10b981' }}>(L) LINES</span>}
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
