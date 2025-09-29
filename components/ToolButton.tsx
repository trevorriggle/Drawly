"use client";
import Icon from '@/components/Icon';
import type { ToolDef } from '@/data/tools';

export default function ToolButton({
  tool, active, onClick
}: { tool: ToolDef; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      title={`${tool.label}${tool.key ? ` (${tool.key})` : ''}`}
      style={{
        width: '100%',
        display: 'grid',
        placeItems: 'center',
        padding: 8,
        marginBottom: 8,
        borderRadius: 8,
        background: active ? '#111827' : 'transparent',
        color: active ? 'white' : 'black',
        border: active ? '1px solid #374151' : '1px solid transparent',
        cursor: 'pointer'
      }}
    >
      <Icon name={tool.icon} />
      <div style={{ fontSize: 11, marginTop: 4 }}>{tool.label}</div>
    </button>
  );
}
