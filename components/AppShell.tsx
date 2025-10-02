"use client";

import React from 'react';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const handleProfileClick = () => {
    // TODO: Navigate to profile page
    console.log('Profile clicked');
  };

  return (
    <>
      <header className="header">
        <div className="brand">DrawEvolve</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span className="kbd">⌘S</span>
          <button
            onClick={handleProfileClick}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#2563eb';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#3b82f6';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            TR
          </button>
        </div>
      </header>
      {children}
    </>
  );
}
