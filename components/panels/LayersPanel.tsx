"use client";
import { useState } from 'react';
import { useDrawly } from '@/context/DrawlyProvider';
import Icon from '@/components/Icon';

export default function LayersPanel() {
  const { layers, activeLayerId, setActiveLayer, addLayer, toggleLayer, setLayerOpacity, mergeLayerDown } = useDrawly();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; layerId: string } | null>(null);
  return (
    <div className="panel" onContextMenu={(e) => e.preventDefault()}>
      <h3 className="panel-title">
        <Icon name="layers" /> Layers
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {[...layers].reverse().map(l => (
          <div
            key={l.id}
            onClick={() => setActiveLayer(l.id)}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu({ x: e.clientX, y: e.clientY, layerId: l.id });
            }}
            style={{
              display:'flex', flexDirection: 'column', gap:8, padding:10,
              border: l.id === activeLayerId ? '2px solid #3b82f6' : '1px solid #e5e7eb',
              borderRadius:6,
              background: l.id === activeLayerId ? '#eff6ff' : '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                flex:1,
                fontSize: 14,
                color: l.id === activeLayerId ? '#1e40af' : '#374151',
                fontWeight: l.id === activeLayerId ? 600 : 400
              }}>{l.name}</span>
              <button
                className="kbd"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLayer(l.id);
                }}
                style={{
                  fontSize: 11,
                  padding: '2px 6px'
                }}
              >
                {l.visible ? 'Hide' : 'Show'}
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#6b7280', minWidth: 45 }}>Opacity:</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={l.opacity}
                onChange={(e) => {
                  e.stopPropagation();
                  setLayerOpacity(l.id, parseFloat(e.target.value));
                }}
                onClick={(e) => e.stopPropagation()}
                style={{ flex: 1, minWidth: 0 }}
              />
              <span style={{ fontSize: 11, color: '#6b7280', minWidth: 35, textAlign: 'right' }}>{Math.round(l.opacity * 100)}%</span>
            </div>
          </div>
        ))}
      </div>
      <button
        className="kbd"
        onClick={()=>addLayer()}
        style={{
          width: '100%',
          padding: '8px 12px',
          fontSize: 12,
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: 6,
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
      >
        + Add Layer
      </button>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999
            }}
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu(null);
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: contextMenu.y,
              left: contextMenu.x,
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              padding: 4,
              zIndex: 1000,
              minWidth: 160
            }}
          >
            <button
              onClick={() => {
                mergeLayerDown(contextMenu.layerId);
                setContextMenu(null);
              }}
              disabled={layers.findIndex(l => l.id === contextMenu.layerId) === layers.length - 1}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'transparent',
                border: 'none',
                textAlign: 'left',
                fontSize: 14,
                cursor: layers.findIndex(l => l.id === contextMenu.layerId) === layers.length - 1 ? 'not-allowed' : 'pointer',
                borderRadius: 6,
                color: layers.findIndex(l => l.id === contextMenu.layerId) === layers.length - 1 ? '#9ca3af' : '#374151',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (layers.findIndex(l => l.id === contextMenu.layerId) !== layers.length - 1) {
                  e.currentTarget.style.background = '#f3f4f6';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              Merge Down
            </button>
          </div>
        </>
      )}
    </div>
  );
}
