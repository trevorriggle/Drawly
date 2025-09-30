import type { IconToken } from '@/lib/icons-registry';

export type ToolId =
  | 'pencil' | 'brush' | 'eraser' | 'fill' | 'gradient'
  | 'shapes' | 'line' | 'smudge' | 'clone'
  | 'select' | 'lasso' | 'wand' | 'transform' | 'crop' | 'pan'
  | 'text';

export interface ToolDef {
  id: ToolId;
  label: string;
  icon: IconToken;
  key?: string; // keyboard shortcut hint
  group?: 'draw' | 'edit' | 'select' | 'nav' | 'type';
}

export const DEFAULT_TOOLS: ToolDef[] = [
  { id: 'pencil',    label: 'Pencil',    icon: 'pencil',   key: 'P', group: 'draw' },
  { id: 'brush',     label: 'Brush',     icon: 'brush',    key: 'B', group: 'draw' },
  { id: 'eraser',    label: 'Eraser',    icon: 'eraser',   key: 'E', group: 'draw' },
  { id: 'pan',       label: 'Pan',       icon: 'hand',     key: 'H', group: 'nav' },
  { id: 'fill',      label: 'Fill',      icon: 'fill',     key: 'G', group: 'edit' },
  { id: 'gradient',  label: 'Gradient',  icon: 'gradient', key: 'Shift+G', group: 'edit' },
  { id: 'shapes',    label: 'Shapes',    icon: 'shapes',   key: 'U', group: 'draw' },
  { id: 'line',      label: 'Line/Curve',icon: 'line',     key: 'L', group: 'draw' },
  { id: 'smudge',    label: 'Smudge',    icon: 'smudge',   group: 'edit' },
  { id: 'clone',     label: 'Clone',     icon: 'clone',    group: 'edit' },
  { id: 'select',    label: 'Move/Select', icon: 'cursor', key: 'V', group: 'select' },
  { id: 'lasso',     label: 'Lasso',     icon: 'lasso',    key: 'Q', group: 'select' },
  { id: 'wand',      label: 'Magic Wand',icon: 'wand',     group: 'select' },
  { id: 'transform', label: 'Transform', icon: 'transform',group: 'edit' },
  { id: 'crop',      label: 'Crop',      icon: 'crop',     group: 'edit' },
  { id: 'text',      label: 'Text',      icon: 'text',     key: 'T', group: 'type' }
];
