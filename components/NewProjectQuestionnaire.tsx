'use client';

import { useState } from 'react';

interface NewProjectQuestionnaireProps {
  onComplete: (answers: QuestionnaireAnswers) => void;
  onGoToProjects: () => void;
}

export interface QuestionnaireAnswers {
  subject: string;
  style: string;
  artists: string;
  techniques: string;
  feedbackFocus: string;
  additionalContext: string;
}

export default function NewProjectQuestionnaire({ onComplete, onGoToProjects }: NewProjectQuestionnaireProps) {
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({
    subject: '',
    style: '',
    artists: '',
    techniques: '',
    feedbackFocus: '',
    additionalContext: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete(answers);
  };

  const updateAnswer = (field: keyof QuestionnaireAnswers, value: string) => {
    setAnswers(prev => ({ ...prev, [field]: value }));
  };

  return (
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
        maxWidth: 600,
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
          Ready to draw?
        </h2>
        <p style={{ fontSize: 16, color: '#6b7280', marginBottom: 24 }}>
          To give the best feedback, please answer these questions!
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                1. What are you drawing today?
              </label>
              <input
                type="text"
                value={answers.subject}
                onChange={(e) => updateAnswer('subject', e.target.value)}
                placeholder="e.g., A portrait of my dog"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  fontSize: 14,
                  outline: 'none'
                }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                2. What style are you going for?
              </label>
              <input
                type="text"
                value={answers.style}
                onChange={(e) => updateAnswer('style', e.target.value)}
                placeholder="e.g., Realistic, impressionist, abstract"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  fontSize: 14,
                  outline: 'none'
                }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                3. Are you inspired by any artists?
              </label>
              <input
                type="text"
                value={answers.artists}
                onChange={(e) => updateAnswer('artists', e.target.value)}
                placeholder="e.g., Van Gogh, Picasso"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  fontSize: 14,
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                4. What techniques are you planning on implementing?
              </label>
              <input
                type="text"
                value={answers.techniques}
                onChange={(e) => updateAnswer('techniques', e.target.value)}
                placeholder="e.g., Cross-hatching, blending, layering"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  fontSize: 14,
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                5. Is there a specific area you want feedback on?
              </label>
              <input
                type="text"
                value={answers.feedbackFocus}
                onChange={(e) => updateAnswer('feedbackFocus', e.target.value)}
                placeholder="e.g., Proportions, shading, composition"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  fontSize: 14,
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                6. Lastly, is there any additional context you'd like me to have?
              </label>
              <textarea
                value={answers.additionalContext}
                onChange={(e) => updateAnswer('additionalContext', e.target.value)}
                placeholder="Any other details that would help..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  fontSize: 14,
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>
          </div>

          <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px 24px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
              }}
            >
              Start Drawing →
            </button>

            <button
              type="button"
              onClick={onGoToProjects}
              style={{
                width: '100%',
                padding: '12px 24px',
                backgroundColor: 'transparent',
                color: '#6b7280',
                border: '1px solid #d1d5db',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Go to my projects
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}