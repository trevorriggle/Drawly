"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

/**
 * Drawly Buddy
 * - Draggable floating button (pencil icon)
 * - Click toggles feedback card
 * - Position persists to localStorage
 */

interface FloatingBuddyProps {
  feedback?: string | null;
  onCloseFeedback?: () => void;
}

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

export default function FloatingBuddy({ feedback, onCloseFeedback }: FloatingBuddyProps) {
  const [pos, setPos] = useState(getInitialPosition);
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const press = useRef({ x: 0, y: 0, moved: 0, offX: 0, offY: 0 });
  const ref = useRef<HTMLDivElement | null>(null);
  const [hasFeedback, setHasFeedback] = useState(false);

  // Auto-open when feedback arrives and remember we have feedback
  useEffect(() => {
    if (feedback) {
      setOpen(true);
      setHasFeedback(true);
    }
  }, [feedback]);

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
          background: hasFeedback && !open ? "#10b981" : "#111827",
          border: hasFeedback && !open ? "2px solid #34d399" : "1px solid #374151",
          boxShadow: hasFeedback && !open ? "0 8px 24px rgba(16,185,129,.35)" : "0 8px 24px rgba(0,0,0,.35)",
          color: "white",
          display: "grid",
          placeItems: "center",
          cursor: dragging ? "grabbing" : "grab",
          userSelect: "none",
          transition: "all 0.2s ease"
        }}
        aria-label="Drawly Buddy"
      >
        {/* simple pencil placeholder (swap with animated buddy later) */}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41L18.37 3.29a1 1 0 0 0-1.41 0L15.6 4.65l3.75 3.75 1.36-1.36z"/>
        </svg>
        {/* Notification badge */}
        {hasFeedback && !open && (
          <div style={{
            position: 'absolute',
            top: -4,
            right: -4,
            width: 16,
            height: 16,
            backgroundColor: '#ef4444',
            borderRadius: '50%',
            border: '2px solid white',
            animation: 'pulse 2s ease-in-out infinite'
          }} />
        )}
      </div>

      {open && (
        <div
          style={{
            position: "fixed",
            left: pos.x - 400 + BTN_W, // card to the left of the buddy
            top: pos.y + BTN_H + 8,
            zIndex: 50_001,
            width: feedback ? 450 : 220,
            maxHeight: feedback ? '70vh' : 'auto',
            overflow: feedback ? 'auto' : 'visible',
            background: "#0b1220",
            color: "white",
            border: "1px solid #1f2937",
            borderRadius: 12,
            boxShadow: "0 16px 40px rgba(0,0,0,.45)",
            padding: 16,
          }}
          role="dialog"
          aria-label="Drawly feedback"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Drawly</div>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontSize: 20,
                padding: '0 4px',
                opacity: 0.7
              }}
              aria-label="Collapse feedback"
            >
              −
            </button>
          </div>
          <div style={{
            fontSize: 14,
            opacity: 0.9,
            lineHeight: 1.6
          }}
          className="markdown-content"
          >
            {feedback ? (
              <ReactMarkdown
                components={{
                  h1: ({node, ...props}) => <h1 style={{ fontSize: '1.5em', fontWeight: 'bold', marginTop: '0.5em', marginBottom: '0.5em' }} {...props} />,
                  h2: ({node, ...props}) => <h2 style={{ fontSize: '1.3em', fontWeight: 'bold', marginTop: '0.5em', marginBottom: '0.5em' }} {...props} />,
                  h3: ({node, ...props}) => <h3 style={{ fontSize: '1.1em', fontWeight: 'bold', marginTop: '0.5em', marginBottom: '0.5em' }} {...props} />,
                  p: ({node, ...props}) => <p style={{ marginBottom: '0.75em' }} {...props} />,
                  ul: ({node, ...props}) => <ul style={{ marginLeft: '1.5em', marginBottom: '0.75em', listStyleType: 'disc' }} {...props} />,
                  ol: ({node, ...props}) => <ol style={{ marginLeft: '1.5em', marginBottom: '0.75em', listStyleType: 'decimal' }} {...props} />,
                  li: ({node, ...props}) => <li style={{ marginBottom: '0.25em' }} {...props} />,
                  strong: ({node, ...props}) => <strong style={{ fontWeight: 'bold' }} {...props} />,
                  em: ({node, ...props}) => <em style={{ fontStyle: 'italic' }} {...props} />,
                  code: ({node, ...props}) => <code style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '2px 4px', borderRadius: 3, fontSize: '0.9em' }} {...props} />,
                  pre: ({node, ...props}) => <pre style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '12px', borderRadius: 6, overflow: 'auto', marginBottom: '0.75em' }} {...props} />,
                }}
              >
                {feedback}
              </ReactMarkdown>
            ) : (
              "hey! i'm your friendly pencil. drag me anywhere. draw something and click \"I'm done!\" to get feedback. ✏️"
            )}
          </div>
        </div>
      )}
    </>
  );
}