"use client";

import React, { createContext, useContext, useMemo, useReducer, useRef } from 'react';
import type { ToolId } from '@/data/tools';
import { IconRegistryProvider } from '@/lib/icons-registry';

export type QuestionnaireAnswers = {
  subject: string;
  style: string;
  artists: string;
  techniques: string;
  feedbackFocus: string;
  additionalContext: string;
};

type State = {
  activeToolId: ToolId;
  primaryColor: string;
  brushSize: number;
  layers: { id: string; name: string; visible: boolean; opacity: number; imageData?: HTMLImageElement; imagePosition?: { x: number; y: number; width: number; height: number } }[];
  activeLayerId: string;
  questionnaireAnswers: QuestionnaireAnswers | null;
  feedback: string | null;
  uploadedImageForLayer: { layerId: string; image: HTMLImageElement } | null;
  canvasHistory: ImageData[][];
  historyIndex: number;
};

type Action =
  | { type: 'SET_TOOL'; id: ToolId }
  | { type: 'SET_COLOR'; color: string }
  | { type: 'SET_BRUSH'; size: number }
  | { type: 'ADD_LAYER'; name?: string }
  | { type: 'TOGGLE_LAYER_VIS'; id: string }
  | { type: 'SET_LAYER_OPACITY'; id: string; opacity: number }
  | { type: 'SET_ACTIVE_LAYER'; id: string }
  | { type: 'SET_QUESTIONNAIRE'; answers: QuestionnaireAnswers }
  | { type: 'SET_FEEDBACK'; feedback: string | null }
  | { type: 'SET_UPLOADED_IMAGE'; layerId: string; image: HTMLImageElement }
  | { type: 'UPDATE_LAYER_IMAGE_POS'; layerId: string; position: { x: number; y: number; width: number; height: number } }
  | { type: 'SAVE_HISTORY'; canvasStates: ImageData[] }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'MERGE_LAYER_DOWN'; layerId: string };

const initial: State = {
  activeToolId: 'pencil',
  primaryColor: '#1f2937',
  brushSize: 4,
  layers: [{ id: 'background', name: 'Background', visible: true, opacity: 1 }],
  activeLayerId: 'background',
  questionnaireAnswers: null,
  feedback: null,
  uploadedImageForLayer: null,
  canvasHistory: [],
  historyIndex: -1
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
    case 'SET_QUESTIONNAIRE': return { ...state, questionnaireAnswers: action.answers };
    case 'SET_FEEDBACK': return { ...state, feedback: action.feedback };
    case 'SET_UPLOADED_IMAGE': return { ...state, uploadedImageForLayer: { layerId: action.layerId, image: action.image } };
    case 'UPDATE_LAYER_IMAGE_POS': {
      return {
        ...state,
        layers: state.layers.map(l =>
          l.id === action.layerId ? { ...l, imagePosition: action.position } : l
        )
      };
    }
    case 'SAVE_HISTORY': {
      const MAX_HISTORY = 50;
      const newHistory = state.canvasHistory.slice(0, state.historyIndex + 1);
      newHistory.push(action.canvasStates);
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
      }
      return {
        ...state,
        canvasHistory: newHistory,
        historyIndex: newHistory.length - 1
      };
    }
    case 'UNDO': {
      if (state.historyIndex <= 0) return state;
      return {
        ...state,
        historyIndex: state.historyIndex - 1
      };
    }
    case 'REDO': {
      if (state.historyIndex >= state.canvasHistory.length - 1) return state;
      return {
        ...state,
        historyIndex: state.historyIndex + 1
      };
    }
    case 'MERGE_LAYER_DOWN': {
      const layerIndex = state.layers.findIndex(l => l.id === action.layerId);
      if (layerIndex === -1 || layerIndex === state.layers.length - 1) return state; // Can't merge bottom layer

      // Remove the layer that was merged (it will be merged into the layer below)
      const newLayers = state.layers.filter((_, i) => i !== layerIndex);

      return {
        ...state,
        layers: newLayers,
        // If the merged layer was active, set the layer below as active
        activeLayerId: state.activeLayerId === action.layerId ? newLayers[layerIndex]?.id || newLayers[0]?.id : state.activeLayerId
      };
    }
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
  setQuestionnaireAnswers: (answers: QuestionnaireAnswers) => void;
  setFeedback: (feedback: string | null) => void;
  setUploadedImage: (layerId: string, image: HTMLImageElement) => void;
  updateLayerImagePosition: (layerId: string, position: { x: number; y: number; width: number; height: number }) => void;
  registerExportCanvas: (fn: () => string | null) => void;
  getExportCanvas: () => (() => string | null) | null;
  saveHistory: (canvasStates: ImageData[]) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  registerRestoreCanvas: (fn: (states: ImageData[]) => void) => void;
  getRestoreCanvas: () => ((states: ImageData[]) => void) | null;
  mergeLayerDown: (layerId: string) => void;
  registerMergeLayerCanvas: (fn: (layerId: string) => void) => void;
}) | null>(null);

export function DrawlyProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const exportCanvasRef = useRef<(() => string | null) | null>(null);
  const restoreCanvasRef = useRef<((states: ImageData[]) => void) | null>(null);
  const mergeLayerCanvasRef = useRef<((layerId: string) => void) | null>(null);

  const api = useMemo(() => ({
    ...state,
    setActiveToolId: (id: ToolId) => dispatch({ type: 'SET_TOOL', id }),
    setPrimaryColor: (c: string) => dispatch({ type: 'SET_COLOR', color: c }),
    setBrushSize: (n: number) => dispatch({ type: 'SET_BRUSH', size: n }),
    addLayer: (name?: string) => dispatch({ type: 'ADD_LAYER', name }),
    toggleLayer: (id: string) => dispatch({ type: 'TOGGLE_LAYER_VIS', id }),
    setLayerOpacity: (id: string, opacity: number) => dispatch({ type: 'SET_LAYER_OPACITY', id, opacity }),
    setActiveLayer: (id: string) => dispatch({ type: 'SET_ACTIVE_LAYER', id }),
    setQuestionnaireAnswers: (answers: QuestionnaireAnswers) => dispatch({ type: 'SET_QUESTIONNAIRE', answers }),
    setFeedback: (feedback: string | null) => dispatch({ type: 'SET_FEEDBACK', feedback }),
    setUploadedImage: (layerId: string, image: HTMLImageElement) => dispatch({ type: 'SET_UPLOADED_IMAGE', layerId, image }),
    updateLayerImagePosition: (layerId: string, position: { x: number; y: number; width: number; height: number }) => dispatch({ type: 'UPDATE_LAYER_IMAGE_POS', layerId, position }),
    registerExportCanvas: (fn: () => string | null) => {
      exportCanvasRef.current = fn;
    },
    getExportCanvas: () => exportCanvasRef.current,
    saveHistory: (canvasStates: ImageData[]) => dispatch({ type: 'SAVE_HISTORY', canvasStates }),
    undo: () => dispatch({ type: 'UNDO' }),
    redo: () => dispatch({ type: 'REDO' }),
    canUndo: state.historyIndex > 0,
    canRedo: state.historyIndex < state.canvasHistory.length - 1,
    registerRestoreCanvas: (fn: (states: ImageData[]) => void) => {
      restoreCanvasRef.current = fn;
    },
    getRestoreCanvas: () => restoreCanvasRef.current,
    mergeLayerDown: (layerId: string) => {
      // First trigger canvas merge
      if (mergeLayerCanvasRef.current) {
        mergeLayerCanvasRef.current(layerId);
      }
      // Then remove the layer from state
      dispatch({ type: 'MERGE_LAYER_DOWN', layerId });
    },
    registerMergeLayerCanvas: (fn: (layerId: string) => void) => {
      mergeLayerCanvasRef.current = fn;
    }
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
