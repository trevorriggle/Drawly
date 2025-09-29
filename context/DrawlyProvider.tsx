"use client";

import React, { createContext, useContext, useMemo, useReducer } from 'react';
import type { ToolId } from '@/data/tools';
import { IconRegistryProvider } from '@/lib/icons-registry';

type State = {
  activeToolId: ToolId;
  primaryColor: string;
  brushSize: number;
  layers: { id: string; name: string; visible: boolean; opacity: number }[];
  activeLayerId: string;
};

type Action =
  | { type: 'SET_TOOL'; id: ToolId }
  | { type: 'SET_COLOR'; color: string }
  | { type: 'SET_BRUSH'; size: number }
  | { type: 'ADD_LAYER'; name?: string }
  | { type: 'TOGGLE_LAYER_VIS'; id: string }
  | { type: 'SET_LAYER_OPACITY'; id: string; opacity: number }
  | { type: 'SET_ACTIVE_LAYER'; id: string };

const initial: State = {
  activeToolId: 'pencil',
  primaryColor: '#1f2937',
  brushSize: 4,
  layers: [{ id: 'layer-1', name: 'Layer 1', visible: true, opacity: 1 }],
  activeLayerId: 'layer-1'
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_TOOL': return { ...state, activeToolId: action.id };
    case 'SET_COLOR': return { ...state, primaryColor: action.color };
    case 'SET_BRUSH': return { ...state, brushSize: action.size };
    case 'ADD_LAYER': {
      const id = `layer-${state.layers.length + 1}`;
      return { ...state, layers: [...state.layers, { id, name: action.name ?? `Layer ${state.layers.length + 1}`, visible: true, opacity: 1 }], activeLayerId: id };
    }
    case 'TOGGLE_LAYER_VIS': {
      return { ...state, layers: state.layers.map(l => l.id === action.id ? { ...l, visible: !l.visible } : l) };
    }
    case 'SET_LAYER_OPACITY': {
      return { ...state, layers: state.layers.map(l => l.id === action.id ? { ...l, opacity: action.opacity } : l) };
    }
    case 'SET_ACTIVE_LAYER': return { ...state, activeLayerId: action.id };
    default: return state;
  }
}

const Ctx = createContext<(State & {
  setActiveToolId: (id: ToolId) => void;
  setPrimaryColor: (c: string) => void;
  setBrushSize: (n: number) => void;
  addLayer: (name?: string) => void;
  toggleLayer: (id: string) => void;
  setLayerOpacity: (id: string, opacity: number) => void;
  setActiveLayer: (id: string) => void;
}) | null>(null);

export function DrawlyProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);

  const api = useMemo(() => ({
    ...state,
    setActiveToolId: (id: ToolId) => dispatch({ type: 'SET_TOOL', id }),
    setPrimaryColor: (c: string) => dispatch({ type: 'SET_COLOR', color: c }),
    setBrushSize: (n: number) => dispatch({ type: 'SET_BRUSH', size: n }),
    addLayer: (name?: string) => dispatch({ type: 'ADD_LAYER', name }),
    toggleLayer: (id: string) => dispatch({ type: 'TOGGLE_LAYER_VIS', id }),
    setLayerOpacity: (id: string, opacity: number) => dispatch({ type: 'SET_LAYER_OPACITY', id, opacity }),
    setActiveLayer: (id: string) => dispatch({ type: 'SET_ACTIVE_LAYER', id })
  }), [state]);

  return (
    <IconRegistryProvider>
      <Ctx.Provider value={api}>{children}</Ctx.Provider>
    </IconRegistryProvider>
  );
}

export function useDrawly() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useDrawly must be used within DrawlyProvider');
  return ctx;
}
