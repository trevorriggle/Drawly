"use client";
import { useDrawly } from '@/context/DrawlyProvider';
import Icon from '@/components/Icon';

export default function ColorPanel() {
  const { primaryColor, setPrimaryColor, brushSize, setBrushSize } = useDrawly();
  return (
    <section>
      <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon name="color" /> Color & Brush
      </h3>
      <div style={{ marginTop: 10 }}>
        <input type="color" value={primaryColor} onChange={(e)=>setPrimaryColor(e.target.value)} />
        <span style={{ marginLeft: 10, opacity: .7 }}>{primaryColor}</span>
      </div>
      <div style={{ marginTop: 12 }}>
        <label>Brush Size: <span className="kbd">{brushSize}</span></label>
        <input type="range" min={1} max={64} value={brushSize} onChange={(e)=>setBrushSize(parseInt(e.target.value))} />
      </div>
    </section>
  );
}
