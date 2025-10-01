"use client";
import { useState } from 'react';
import { useDrawly } from '@/context/DrawlyProvider';
import Icon from '@/components/Icon';

export default function LayersPanel() {
  const { layers, activeLayerId, setActiveLayer, addLayer, toggleLayer, setLayerOpacity, mergeLayerDown, deleteLayer, moveLayer } = useDrawly();
  return (
    <div className="panel">
      <h3 className="panel-title">
        <Icon name="layers" /> Layers
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {[...layers].reverse().map(l => (
          <div
            key={l.id}
            onClick={() => setActiveLayer(l.id)}
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

            {/* Layer controls */}
            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  mergeLayerDown(l.id);
                }}
                disabled={layers.findIndex(layer => layer.id === l.id) === layers.length - 1}
                style={{
                  flex: 1,
                  padding: '4px 8px',
                  fontSize: 11,
                  background: layers.findIndex(layer => layer.id === l.id) === layers.length - 1 ? '#f3f4f6' : '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 4,
                  cursor: layers.findIndex(layer => layer.id === l.id) === layers.length - 1 ? 'not-allowed' : 'pointer',
                  color: layers.findIndex(layer => layer.id === l.id) === layers.length - 1 ? '#9ca3af' : '#374151'
                }}
              >
                Merge ↓
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteLayer(l.id);
                }}
                disabled={layers.length === 1}
                style={{
                  flex: 1,
                  padding: '4px 8px',
                  fontSize: 11,
                  background: layers.length === 1 ? '#f3f4f6' : '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 4,
                  cursor: layers.length === 1 ? 'not-allowed' : 'pointer',
                  color: layers.length === 1 ? '#9ca3af' : '#ef4444'
                }}
              >
                Delete
              </button>
            </div>

            {/* Move layer buttons */}
            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const idx = layers.findIndex(layer => layer.id === l.id);
                  if (idx > 0) moveLayer(l.id, 'up');
                }}
                disabled={layers.findIndex(layer => layer.id === l.id) === 0}
                style={{
                  flex: 1,
                  padding: '4px 8px',
                  fontSize: 11,
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 4,
                  cursor: layers.findIndex(layer => layer.id === l.id) === 0 ? 'not-allowed' : 'pointer',
                  color: layers.findIndex(layer => layer.id === l.id) === 0 ? '#9ca3af' : '#374151'
                }}
              >
                Move ↑
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const idx = layers.findIndex(layer => layer.id === l.id);
                  if (idx < layers.length - 1) moveLayer(l.id, 'down');
                }}
                disabled={layers.findIndex(layer => layer.id === l.id) === layers.length - 1}
                style={{
                  flex: 1,
                  padding: '4px 8px',
                  fontSize: 11,
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 4,
                  cursor: layers.findIndex(layer => layer.id === l.id) === layers.length - 1 ? 'not-allowed' : 'pointer',
                  color: layers.findIndex(layer => layer.id === l.id) === layers.length - 1 ? '#9ca3af' : '#374151'
                }}
              >
                Move ↓
              </button>
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

    </div>
  );
}
