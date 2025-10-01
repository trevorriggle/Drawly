'use client';

import { useState, useEffect } from 'react';
import DrawCanvas from '../../components/panels/canvas/DrawCanvas';
import ColorPanel from '../../components/panels/ColorPanel';
import LayersPanel from '../../components/panels/LayersPanel';
import ToolButton from '../../components/ToolButton';
import { useDrawly } from '../../context/DrawlyProvider';
import { DEFAULT_TOOLS } from '../../data/tools';

export default function StudioPage() {
  const { activeToolId, setActiveToolId, getExportCanvas, questionnaireAnswers, setFeedback, addLayer, setUploadedImage, layers, undo, redo, canUndo, canRedo } = useDrawly();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadedImageBase64, setUploadedImageBase64] = useState<string | null>(null);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        if (canUndo) undo();
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        if (canRedo) redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        // Alternative redo shortcut
        e.preventDefault();
        if (canRedo) redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setUploadedImageBase64(base64.split(',')[1]); // Store base64 without prefix for API

      // Create image object to render on canvas
      const img = new Image();
      img.onload = () => {
        // Get the current layers to determine the next layer ID
        const currentLayers = layers;
        const newLayerId = `layer-${currentLayers.length + 1}`;

        // Add a new layer for the uploaded image
        addLayer(`Uploaded`);

        // Wait for the layer to be created, then set the image
        setTimeout(() => {
          setUploadedImage(newLayerId, img);
        }, 100);
      };
      img.src = base64;
    };
    reader.readAsDataURL(file);
  };

  const handleDownload = () => {
    const exportCanvas = getExportCanvas();
    if (!exportCanvas) {
      alert('Canvas not ready!');
      return;
    }

    const imageBase64 = exportCanvas();
    if (!imageBase64) {
      alert('Failed to export canvas!');
      return;
    }

    // Create download link
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${imageBase64}`;
    link.download = `drawly-${Date.now()}.png`;
    link.click();
  };

  const handleDone = async () => {
    if (!questionnaireAnswers) {
      alert('Please fill out the questionnaire first!');
      return;
    }

    let imageBase64: string | null = null;

    // Use uploaded image if available, otherwise export canvas
    if (uploadedImageBase64) {
      imageBase64 = uploadedImageBase64;
    } else {
      const exportCanvas = getExportCanvas();
      if (!exportCanvas) {
        alert('Canvas export not ready yet!');
        return;
      }
      imageBase64 = exportCanvas();
    }

    if (!imageBase64) {
      alert('No image to analyze!');
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          questionnaireAnswers
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get feedback');
      }

      const data = await response.json();
      setFeedback(data.feedback);
      console.log('Visual Analysis:', data.visualAnalysis);
      console.log('Feedback:', data.feedback);

    } catch (error: any) {
      console.error('Error getting feedback:', error);
      const errorMsg = error?.message || 'Unknown error';
      alert(`Failed to get feedback: ${errorMsg}\n\nCheck console for details.`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="shell">
      <aside className="tool-rail">
        {DEFAULT_TOOLS.map((t) => (
          <ToolButton
            key={t.id}
            tool={t}
            active={activeToolId === t.id}
            onClick={() => setActiveToolId(t.id)}
          />
        ))}

        {/* Undo/Redo buttons */}
        <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid #374151' }}>
          <button
            onClick={undo}
            disabled={!canUndo}
            style={{
              width: '100%',
              padding: 12,
              background: canUndo ? '#1f2937' : '#111827',
              color: canUndo ? 'white' : '#6b7280',
              border: '1px solid #374151',
              borderRadius: 8,
              cursor: canUndo ? 'pointer' : 'not-allowed',
              marginBottom: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
            title="Undo (Ctrl+Z)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 7H4v5" stroke="currentColor" strokeWidth="2" fill="none"/>
              <path d="M20 17a7 7 0 0 0-11-5l-5 5" stroke="currentColor" strokeWidth="2" fill="none"/>
            </svg>
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            style={{
              width: '100%',
              padding: 12,
              background: canRedo ? '#1f2937' : '#111827',
              color: canRedo ? 'white' : '#6b7280',
              border: '1px solid #374151',
              borderRadius: 8,
              cursor: canRedo ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
            title="Redo (Ctrl+Shift+Z)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15 7h5v5" stroke="currentColor" strokeWidth="2" fill="none"/>
              <path d="M4 17a7 7 0 0 1 11-5l5 5" stroke="currentColor" strokeWidth="2" fill="none"/>
            </svg>
          </button>
        </div>
      </aside>

      <section className="canvas-wrap">
        <DrawCanvas />
      </section>

      <aside className="right-panel">
        <ColorPanel />
        <div style={{ height: 20 }} />
        <LayersPanel />
      </aside>

      {/* Action buttons */}
      <div style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        display: 'flex',
        gap: 12,
        zIndex: 100
      }}>
        {/* Upload button */}
        <label style={{
          padding: '12px 24px',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          fontSize: 16,
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          📤 Upload
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            style={{ display: 'none' }}
          />
        </label>

        {/* Download button */}
        <button
          onClick={handleDownload}
          style={{
            padding: '12px 24px',
            backgroundColor: '#8b5cf6',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
          }}
        >
          💾 Download
        </button>

        {/* I'm done button */}
        <button
          onClick={handleDone}
          disabled={isAnalyzing}
          style={{
            padding: '12px 24px',
            backgroundColor: isAnalyzing ? '#6b7280' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 600,
            cursor: isAnalyzing ? 'not-allowed' : 'pointer',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
          }}
        >
          {isAnalyzing ? 'Analyzing...' : "I'm done!"}
        </button>
      </div>

      {/* Upload preview indicator */}
      {uploadedImageBase64 && (
        <div style={{
          position: 'fixed',
          top: 80,
          right: 24,
          padding: '8px 16px',
          backgroundColor: '#10b981',
          color: 'white',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 500,
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          zIndex: 100
        }}>
          ✓ Image uploaded - will use this for feedback
        </div>
      )}
    </div>
  );
}
