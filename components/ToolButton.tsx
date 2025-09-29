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
      className={`tool-button ${active ? 'active' : ''}`}
    >
      <Icon name={tool.icon} />
    </button>
  );
}
