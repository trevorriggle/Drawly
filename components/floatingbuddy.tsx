"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Drawly Buddy (placeholder)
 * - Draggable floating button (pencil icon)
 * - Click toggles a small "thoughts" card
 * - Position persists to localStorage
 * - No model logic, no APIs
 */

const STORAGE_KEY = "drawly_buddy_pos_v1";
const EDGE = 8;         // padding from viewport edges
const BTN_W = 56;       // approx button size (for clamping)
const BTN_H = 56;

const getInitialPosition = () => {
  if (typeof window === "undefined") return { x: 24, y: 24 };
  const vw = window.innerWidth || 1200;
  const vh = window.innerHeight || 800;
  // default to top-right-ish, under the app header
  const x = vw - BTN_W - 24;
  const y = 80;
  return { x, y };
};

export default function FloatingBuddy() {
  const [pos, setPos] = useState(getInitialPosition);
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const press = useRef({ x: 0, y: 0, moved: 0, offX: 0, offY: 0 });
  const ref = useRef<HTMLDivElement | null>(null);

  // restore saved position (or set initial)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setPos(JSON.parse(saved));
      else setPos(getInitialPosition());
    } catch {
      setPos(getInitialPosition());
    }
  }, []);

  // persist position
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
    } catch {}
  }, [pos]);

  // clamp helper
  const clamp = useMemo(() => {
    return (nx: number, ny: number) => {
      const vw = window.innerWidth || 1200;
      const vh = window.innerHeight || 800;
      const maxX = Math.max(EDGE, vw - BTN_W - EDGE);
      const maxY = Math.max(EDGE, vh - BTN_H - EDGE);
      return {
        x: Math.min(Math.max(EDGE, nx), maxX),
        y: Math.min(Math.max(EDGE, ny), maxY),
      };
    };
  }, []);

  function onPointerDown(e: React.PointerEvent) {
    if (e.button === 2) return; // ignore right click
    e.preventDefault();
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    press.current = {
      x: e.clientX,
      y: e.clientY,
      moved: 0,
      offX: e.clientX - r.left,
      offY: e.clientY - r.top,
    };
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    const dx = e.clientX - press.current.x;
    const dy = e.clientY - press.current.y;
    press.current.moved = Math.hypot(dx, dy);
    setPos(clamp(e.clientX - press.current.offX, e.clientY - press.current.offY));
  }

  function onPointerUp(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    const wasDrag = press.current.moved > 5;
    setDragging(false);
    if (!wasDrag) setOpen((v) => !v); // treat as click
  }

  return (
    <>
      <div
        ref={ref}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          position: "fixed",
          left: pos.x,
          top: pos.y,
          zIndex: 50_000,
          width: 48,
          height: 48,
          borderRadius: 12,
          background: "#111827",
          border: "1px solid #374151",
          boxShadow: "0 8px 24px rgba(0,0,0,.35)",
          color: "white",
          display: "grid",
          placeItems: "center",
          cursor: dragging ? "grabbing" : "grab",
          userSelect: "none",
        }}
        aria-label="Drawly Buddy"
      >
        {/* simple pencil placeholder (swap with animated buddy later) */}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41L18.37 3.29a1 1 0 0 0-1.41 0L15.6 4.65l3.75 3.75 1.36-1.36z"/>
        </svg>
      </div>

      {open && (
        <div
          style={{
            position: "fixed",
            left: pos.x - 220 + BTN_W, // card to the left of the buddy by default
            top: pos.y + BTN_H + 8,
            zIndex: 50_001,
            width: 220,
            background: "#0b1220",
            color: "white",
            border: "1px solid #1f2937",
            borderRadius: 12,
            boxShadow: "0 16px 40px rgba(0,0,0,.45)",
            padding: 12,
          }}
          role="dialog"
          aria-label="Drawly thoughts"
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Drawly</div>
          <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.5 }}>
            hey! i’m your friendly pencil. drag me anywhere. soon i’ll be animated
            and pop in with tips, critiques, and shortcuts. ✏️
          </div>
        </div>
      )}
    </>
  );
}