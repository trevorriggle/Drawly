"use client";
import { useDrawly } from '@/context/DrawlyProvider';
import Icon from '@/components/Icon';

export default function LayersPanel() {
  const { layers, activeLayerId, setActiveLayer, addLayer, toggleLayer } = useDrawly();
  return (
    <section>
      <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon name="layers" /> Layers
      </h3>
      <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
        {layers.map(l => (
          <div key={l.id} style={{
            display:'flex', alignItems:'center', gap:8, padding:6,
            border:'1px solid #1f2937', borderRadius:8,
            background: l.id === activeLayerId ? '#0b1220' : 'transparent', cursor:'pointer'
          }}>
            <input type="radio" checked={l.id===activeLayerId} onChange={()=>setActiveLayer(l.id)} />
            <span style={{flex:1}}>{l.name}</span>
            <button className="kbd" onClick={()=>toggleLayer(l.id)}>{l.visible ? 'Hide' : 'Show'}</button>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10 }}>
        <button className="kbd" onClick={()=>addLayer()}>+ Add Layer</button>
      </div>
    </section>
  );
}
