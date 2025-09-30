'use client';

import { useState } from 'react';
import DrawCanvas from '../../components/panels/canvas/DrawCanvas';
import ColorPanel from '../../components/panels/ColorPanel';
import LayersPanel from '../../components/panels/LayersPanel';
import ToolButton from '../../components/ToolButton';
import { useDrawly } from '../../context/DrawlyProvider';
import { DEFAULT_TOOLS } from '../../data/tools';

export default function StudioPage() {
  const { activeToolId, setActiveToolId, exportCanvas, questionnaireAnswers } = useDrawly();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleDone = async () => {
    if (!exportCanvas) {
      alert('Canvas export not ready yet!');
      return;
    }

    if (!questionnaireAnswers) {
      alert('Please fill out the questionnaire first!');
      return;
    }

    setIsAnalyzing(true);
    try {
      const imageBase64 = exportCanvas();
      if (!imageBase64) {
        alert('Failed to export canvas!');
        return;
      }

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

    } catch (error) {
      console.error('Error getting feedback:', error);
      alert('Failed to get feedback. Please try again.');
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
      </aside>

      <section className="canvas-wrap">
        <DrawCanvas />
      </section>

      <aside className="right-panel">
        <ColorPanel />
        <div style={{ height: 20 }} />
        <LayersPanel />
      </aside>

      <button
        onClick={handleDone}
        disabled={isAnalyzing}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          padding: '12px 24px',
          backgroundColor: isAnalyzing ? '#6b7280' : '#10b981',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          fontSize: 16,
          fontWeight: 600,
          cursor: isAnalyzing ? 'not-allowed' : 'pointer',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          zIndex: 100
        }}
      >
        {isAnalyzing ? 'Analyzing...' : 'I&apos;m done!'}
      </button>

      {feedback && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: 12,
            padding: 32,
            maxWidth: 700,
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 16 }}>
              Your Feedback from Drawly
            </h2>
            <div style={{ fontSize: 16, color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {feedback}
            </div>
            <button
              onClick={() => setFeedback(null)}
              style={{
                marginTop: 24,
                width: '100%',
                padding: '12px 24px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
