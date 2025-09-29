'use client';

import DrawCanvas from '../../components/canvas/DrawCanvas';
import ColorPanel from '../../components/panels/ColorPanel';
import LayersPanel from '../../components/panels/LayersPanel';
import ToolButton from '../../components/ToolButton';
import { useDrawly } from '../../context/DrawlyProvider';
import { DEFAULT_TOOLS } from '../../data/tools';

export default function StudioPage() {
  const { activeToolId, setActiveToolId } = useDrawly();

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
        <div style={{ height: 12 }} />
        <LayersPanel />
      </aside>
    </div>
  );
}
