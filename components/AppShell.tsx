"use client";

import React from 'react';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="header">
        <div className="brand">Drawly</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="kbd">⌘S</span>
          <div style={{
            width: 32, height: 32, borderRadius: 20, background: 'white',
            color: '#111', display: 'grid', placeItems: 'center', fontWeight: 700
          }}>TR</div>
        </div>
      </header>
      {children}
    </>
  );
}
