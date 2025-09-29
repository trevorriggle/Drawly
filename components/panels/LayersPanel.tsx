"use client";
import { useDrawly } from '@/context/DrawlyProvider';
import Icon from '@/components/Icon';

export default function LayersPanel() {
  const { layers, activeLayerId, setActiveLayer, addLayer, toggleLayer, setLayerOpacity } = useDrawly();
  return (
    <div className="panel">
      <h3 className="panel-title">
        <Icon name="layers" /> Layers
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {layers.map(l => (
          <div key={l.id} style={{
            display:'flex', flexDirection: 'column', gap:8, padding:10,
            border:'1px solid #e5e7eb', borderRadius:6,
            background: l.id === activeLayerId ? '#f3f4f6' : '#ffffff',
            transition: 'all 0.15s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="radio"
                checked={l.id===activeLayerId}
                onChange={()=>setActiveLayer(l.id)}
                style={{ margin: 0, cursor: 'pointer' }}
              />
              <span style={{flex:1, fontSize: 14, color: '#374151'}}>{l.name}</span>
              <button
                className="kbd"
                onClick={()=>toggleLayer(l.id)}
                style={{
                  fontSize: 11,
                  padding: '2px 6px'
                }}
              >
                {l.visible ? 'Hide' : 'Show'}
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 20 }}>
              <span style={{ fontSize: 12, color: '#6b7280', minWidth: 50 }}>Opacity:</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={l.opacity}
                onChange={(e) => setLayerOpacity(l.id, parseFloat(e.target.value))}
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: 11, color: '#6b7280', minWidth: 30 }}>{Math.round(l.opacity * 100)}%</span>
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
