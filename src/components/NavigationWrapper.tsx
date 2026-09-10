'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NavigationWrapper() {
  const pathname = usePathname();

  // Remove the floating marketing navbar on problem practice pages
  if (pathname && pathname.startsWith('/problems/')) {
    return null;
  }

  return (
    <div
      style={{
        position: 'sticky',
        top: '1.25rem',
        zIndex: 100,
        padding: '0 1.5rem',
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <header
        className="nav-floating-container"
        style={{
          pointerEvents: 'auto',
          width: '100%',
          maxWidth: '1080px',
          height: '60px',
          borderRadius: 'var(--radius-pill)',
          backgroundColor: 'rgba(255, 255, 255, 0.96)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-floating)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 0.875rem 0 1.25rem',
          transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
        }}
      >
        {/* Brand Identity */}
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            textDecoration: 'none',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent-black)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '14px',
              letterSpacing: '-0.02em',
              transition: 'transform 0.2s ease',
            }}
          >
            L
          </div>
          <span
            style={{
              fontWeight: 700,
              fontSize: '0.95rem',
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
            }}
          >
            LLD Practice
          </span>
        </Link>

        {/* Center Navigation Links */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.75rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: 'var(--text-secondary)',
          }}
        >
          <Link
            href="/#problems"
            className="nav-link-item"
            style={{
              color: 'var(--text-secondary)',
            }}
          >
            Problems
          </Link>
          <Link
            href="/#how-it-works"
            className="nav-link-item"
            style={{
              color: 'var(--text-secondary)',
            }}
          >
            How It Works
          </Link>
        </nav>

        {/* Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link
            href="/#problems"
            className="btn-pill-primary"
            style={{
              padding: '8px 18px',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            Get Started <span className="btn-arrow">➔</span>
          </Link>
        </div>
      </header>
    </div>
  );
}
