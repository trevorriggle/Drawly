"use client";
import { useDrawEvolve } from '@/context/DrawEvolveProvider';
import Icon from '@/components/Icon';

export default function ColorPanel() {
  const { primaryColor, setPrimaryColor, brushSize, setBrushSize, activeToolId, brushHardness, setBrushHardness } = useDrawEvolve();
  return (
    <div className="panel">
      <h3 className="panel-title">
        <Icon name="color" /> Color & Brush
      </h3>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <input
            type="color"
            value={primaryColor}
            onChange={(e)=>setPrimaryColor(e.target.value)}
            style={{
              width: 32,
              height: 32,
              border: '1px solid #e5e7eb',
              borderRadius: 6,
              cursor: 'pointer'
            }}
          />
          <span style={{ fontSize: 14, color: '#6b7280', fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>{primaryColor}</span>
        </div>
      </div>
      <div>
        <label style={{ display: 'block', fontSize: 14, color: '#374151', marginBottom: 8 }}>
          Brush Size: <span className="kbd">{brushSize}px</span>
        </label>
        <input
          type="range"
          min={1}
          max={64}
          value={brushSize}
          onChange={(e)=>setBrushSize(parseInt(e.target.value))}
          style={{
            width: '100%',
            height: 6,
            borderRadius: 3,
            background: '#e5e7eb',
            outline: 'none',
            cursor: 'pointer'
          }}
        />
      </div>

      {activeToolId === 'brush' && (
        <div style={{ marginTop: 16 }}>
          <label style={{ display: 'block', fontSize: 14, color: '#374151', marginBottom: 8 }}>
            Hardness: <span className="kbd">{Math.round(brushHardness * 100)}%</span>
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={brushHardness}
            onChange={(e)=>setBrushHardness(parseFloat(e.target.value))}
            style={{
              width: '100%',
              height: 6,
              borderRadius: 3,
              background: '#e5e7eb',
              outline: 'none',
              cursor: 'pointer'
            }}
          />
        </div>
      )}
    </div>
  );
}
