"use client";

import React, { createContext, useContext, ReactNode } from 'react';

/** Icon tokens (stable keys used by ToolButton & elsewhere) */
export type IconToken =
  | "pencil" | "brush" | "eraser" | "fill" | "gradient"
  | "shapes" | "line" | "smudge" | "clone" 
  | "select" | "lasso" | "wand" | "transform" | "crop" | "zoom"
  | "text" | "layers" | "color" | "undo" | "redo";

export type IconMap = Record<IconToken, React.FC<React.SVGProps<SVGSVGElement>>>;

/** Default minimalist SVG icons */
const Def = {
  pencil: (p:any)=>(<svg viewBox="0 0 24 24" {...p}><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42L18.37 3.29a1.003 1.003 0 0 0-1.42 0l-1.34 1.34 3.75 3.75 1.35-1.34z"/></svg>),
  brush: (p:any)=>(<svg viewBox="0 0 24 24" {...p}><path d="M7 16c0 1.66-1.34 3-3 3 1.1-1.1 1-2 .9-2.5-.22-1.1.49-2.38 1.6-2.64l7.5-7.5 3 3-7.5 7.5C8.38 17.51 7 16.78 7 16z"/><path d="M15 5l3 3 1.5-1.5a2.12 2.12 0 0 0-3-3L15 5z"/></svg>),
  eraser: (p:any)=>(<svg viewBox="0 0 24 24" {...p}><path d="M16.24 3.56 21 8.32a2 2 0 0 1 0 2.83l-7.2 7.2a2 2 0 0 1-2.83 0L3.2 11.58a2 2 0 0 1 0-2.83l4.76-4.76a2 2 0 0 1 2.83 0z"/></svg>),
  fill: (p:any)=>(<svg viewBox="0 0 24 24" {...p}><path d="m16 12-8-8-4 4 8 8 4-4z"/><path d="M19 13a3 3 0 1 0 6 0c0-1.66-3-6-3-6s-3 4.34-3 6z"/></svg>),
  gradient: (p:any)=>(<svg viewBox="0 0 24 24" {...p}><defs><linearGradient id="g"><stop offset="0%"/><stop offset="100%"/></linearGradient></defs><rect x="3" y="6" width="18" height="12" fill="url(#g)" stroke="currentColor"/></svg>),
  shapes: (p:any)=>(<svg viewBox="0 0 24 24" {...p}><rect x="3" y="3" width="8" height="8" rx="1"/><circle cx="16.5" cy="16.5" r="4.5"/></svg>),
  line: (p:any)=>(<svg viewBox="0 0 24 24" {...p}><path d="M4 20 20 4" stroke="currentColor" strokeWidth="2" fill="none"/></svg>),
  smudge: (p:any)=>(<svg viewBox="0 0 24 24" {...p}><path d="M3 17c5-2 10-4 18-6-2 6-10 8-18 6z" /></svg>),
  clone: (p:any)=>(<svg viewBox="0 0 24 24" {...p}><rect x="7" y="7" width="10" height="10" rx="2"/><rect x="3" y="3" width="10" height="10" rx="2"/></svg>),
  select: (p:any)=>(<svg viewBox="0 0 24 24" {...p}><path d="M3 3h6v2H5v4H3V3zm12 0h6v6h-2V5h-4V3zM3 15h2v4h4v2H3v-6zm16 0h2v6h-6v-2h4v-4z"/></svg>),
  lasso: (p:any)=>(<svg viewBox="0 0 24 24" {...p}><path d="M4 10c0-3 3-6 8-6s8 3 8 6-3 6-8 6c-2 0-4-.5-5.5-1.5V20" fill="none" stroke="currentColor" strokeWidth="2"/></svg>),
  wand: (p:any)=>(<svg viewBox="0 0 24 24" {...p}><path d="M3 21 21 3M15 3h3M18 6v3M6 18v3M3 15h3" stroke="currentColor" strokeWidth="2" fill="none"/></svg>),
  transform: (p:any)=>(<svg viewBox="0 0 24 24" {...p}><rect x="6" y="6" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M6 10h4V6" stroke="currentColor" strokeWidth="2"/></svg>),
  crop: (p:any)=>(<svg viewBox="0 0 24 24" {...p}><path d="M7 3v14a3 3 0 0 0 3 3h14" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M21 17V3a2 2 0 0 0-2-2H5" stroke="currentColor" strokeWidth="2" fill="none"/></svg>),
  zoom: (p:any)=>(<svg viewBox="0 0 24 24" {...p}><circle cx="10" cy="10" r="6" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M22 22 15 15" stroke="currentColor" strokeWidth="2"/></svg>),
  text: (p:any)=>(<svg viewBox="0 0 24 24" {...p}><path d="M4 6h16M12 6v12" stroke="currentColor" strokeWidth="2"/></svg>),
  layers: (p:any)=>(<svg viewBox="0 0 24 24" {...p}><path d="m12 4 9 5-9 5-9-5 9-5z"/><path d="m3 14 9 5 9-5" /></svg>),
  color: (p:any)=>(<svg viewBox="0 0 24 24" {...p}><circle cx="8" cy="8" r="4"/><circle cx="16" cy="8" r="4"/><circle cx="12" cy="16" r="4"/></svg>),
  undo: (p:any)=>(<svg viewBox="0 0 24 24" {...p}><path d="M9 7H4v5" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M20 17a7 7 0 0 0-11-5l-5 5" stroke="currentColor" strokeWidth="2" fill="none"/></svg>),
  redo: (p:any)=>(<svg viewBox="0 0 24 24" {...p}><path d="M15 7h5v5" stroke="currentColor" strokeWidth="2" fill="none"/><path d="M4 17a7 7 0 0 1 11-5l5 5" stroke="currentColor" strokeWidth="2" fill="none"/></svg>)
} satisfies IconMap;

const IconCtx = createContext<IconMap>(Def);

/** Provider accepts a partial override (your custom icon pack) */
export function IconRegistryProvider({
  overrides,
  children
}: { overrides?: Partial<IconMap>, children: ReactNode }) {
  const merged = { ...Def, ...(overrides || {}) } as IconMap;
  return <IconCtx.Provider value={merged}>{children}</IconCtx.Provider>;
}

export function useIcons() { return useContext(IconCtx); }
