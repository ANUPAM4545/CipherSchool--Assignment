'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function FooterWrapper() {
  const pathname = usePathname();

  // Hide marketing footer on problem workspace pages
  if (pathname && pathname.startsWith('/problems/')) {
    return null;
  }

  return (
    <footer
      style={{
        marginTop: '6rem',
        borderTop: '1px solid var(--border-subtle)',
        backgroundColor: 'var(--bg-surface)',
        padding: '3rem 2rem 2.5rem 2rem',
      }}
    >
      <div
        style={{
          maxWidth: '1120px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-black)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '12px',
              }}
            >
              L
            </div>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              LLD Practice Platform
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <Link href="/#problems" style={{ transition: 'color 0.15s ease' }}>
              Problems
            </Link>
            <Link href="/#how-it-works" style={{ transition: 'color 0.15s ease' }}>
              How It Works
            </Link>
          </div>
        </div>

        <div
          style={{
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            fontSize: '0.775rem',
            color: 'var(--text-muted)',
          }}
        >
          <div>Built for Deliberate Engineering Practice · Clean Architecture &amp; DDD</div>
          <div>CipherSchools Engineering Assignment 2.0</div>
        </div>
      </div>
    </footer>
  );
}
