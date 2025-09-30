'use client';

import { useState } from 'react';
import DrawCanvas from '../../components/panels/canvas/DrawCanvas';
import ColorPanel from '../../components/panels/ColorPanel';
import LayersPanel from '../../components/panels/LayersPanel';
import ToolButton from '../../components/ToolButton';
import { useDrawly } from '../../context/DrawlyProvider';
import { DEFAULT_TOOLS } from '../../data/tools';

export default function StudioPage() {
  const { activeToolId, setActiveToolId, exportCanvas, questionnaireAnswers, setFeedback } = useDrawly();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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
        {isAnalyzing ? 'Analyzing...' : "I'm done!"}
      </button>
    </div>
  );
}
