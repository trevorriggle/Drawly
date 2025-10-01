"use client";
import { useState, useRef } from 'react';
import { useDrawly } from '@/context/DrawlyProvider';
import Icon from '@/components/Icon';

export default function LayersPanel() {
  const { layers, activeLayerId, setActiveLayer, addLayer, toggleLayer, setLayerOpacity, mergeLayerDown, deleteLayer, moveLayer } = useDrawly();
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [dragOverLayerId, setDragOverLayerId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, layerId: string) => {
    setDraggedLayerId(layerId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, layerId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedLayerId && draggedLayerId !== layerId) {
      setDragOverLayerId(layerId);
    }
  };

  const handleDragLeave = () => {
    setDragOverLayerId(null);
  };

  const handleDrop = (e: React.DragEvent, targetLayerId: string) => {
    e.preventDefault();
    if (!draggedLayerId || draggedLayerId === targetLayerId) {
      setDraggedLayerId(null);
      setDragOverLayerId(null);
      return;
    }

    const draggedIndex = layers.findIndex(l => l.id === draggedLayerId);
    const targetIndex = layers.findIndex(l => l.id === targetLayerId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Move layer multiple times to reach target position
    if (draggedIndex < targetIndex) {
      // Move down
      for (let i = draggedIndex; i < targetIndex; i++) {
        moveLayer(draggedLayerId, 'down');
      }
    } else {
      // Move up
      for (let i = draggedIndex; i > targetIndex; i--) {
        moveLayer(draggedLayerId, 'up');
      }
    }

    setDraggedLayerId(null);
    setDragOverLayerId(null);
  };

  const handleDragEnd = () => {
    setDraggedLayerId(null);
    setDragOverLayerId(null);
  };

  return (
    <div className="panel">
      <h3 className="panel-title">
        <Icon name="layers" /> Layers
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {[...layers].reverse().map(l => {
          const layerIndex = layers.findIndex(layer => layer.id === l.id);
          const isBottomLayer = layerIndex === layers.length - 1;
          const isTopLayer = layerIndex === 0;
          const isLastLayer = layers.length === 1;

          return (
            <div
              key={l.id}
              draggable
              onDragStart={(e) => handleDragStart(e, l.id)}
              onDragOver={(e) => handleDragOver(e, l.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, l.id)}
              onDragEnd={handleDragEnd}
              onClick={() => setActiveLayer(l.id)}
              style={{
                display:'flex', flexDirection: 'column', gap:8, padding:10,
                border: dragOverLayerId === l.id ? '2px solid #10b981' : l.id === activeLayerId ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                borderRadius:6,
                background: draggedLayerId === l.id ? '#f3f4f6' : l.id === activeLayerId ? '#eff6ff' : '#ffffff',
                cursor: 'grab',
                transition: 'all 0.15s ease',
                opacity: draggedLayerId === l.id ? 0.5 : 1
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
                  disabled={isBottomLayer}
                  style={{
                    flex: 1,
                    padding: '4px 8px',
                    fontSize: 11,
                    background: isBottomLayer ? '#f3f4f6' : '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 4,
                    cursor: isBottomLayer ? 'not-allowed' : 'pointer',
                    color: isBottomLayer ? '#9ca3af' : '#374151'
                  }}
                >
                  Merge ↓
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteLayer(l.id);
                  }}
                  disabled={isLastLayer}
                  style={{
                    flex: 1,
                    padding: '4px 8px',
                    fontSize: 11,
                    background: isLastLayer ? '#f3f4f6' : '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 4,
                    cursor: isLastLayer ? 'not-allowed' : 'pointer',
                    color: isLastLayer ? '#9ca3af' : '#ef4444'
                  }}
                >
                  Delete
                </button>
              </div>

            </div>
          );
        })}
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
