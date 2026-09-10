'use client';

import React, { useState, useEffect, useRef } from 'react';

const TABS = ['attempt1', 'rubric', 'attempt2'] as const;
type TabType = typeof TABS[number];

export default function InteractiveHeroPreview() {
  const [activeTab, setActiveTab] = useState<TabType>('attempt1');
  const [cycleKey, setCycleKey] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Automatically shift to next tab every 3.2 seconds continuously
  const startAutoShift = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActiveTab((prev) => {
        const nextIndex = (TABS.indexOf(prev) + 1) % TABS.length;
        return TABS[nextIndex];
      });
      setCycleKey((k) => k + 1);
    }, 3200);
  };

  useEffect(() => {
    startAutoShift();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleTabClick = (tab: TabType) => {
    setActiveTab(tab);
    setCycleKey((k) => k + 1);
    startAutoShift(); // Reset cycle timer to give full duration to clicked tab
  };

  return (
    <div
      className="preview-mockup-frame hero-preview-animate"
      style={{
        borderRadius: 'var(--radius-card)',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-medium)',
        boxShadow: 'var(--shadow-floating)',
        overflow: 'hidden',
        textAlign: 'left',
        maxWidth: '1080px',
        margin: '0 auto',
        position: 'relative',
      }}
    >
      {/* Simulated Browser Chrome */}
      <div
        style={{
          padding: '12px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: '#fafafa',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '11px', height: '11px', borderRadius: '50%', backgroundColor: '#f87171' }} />
          <div style={{ width: '11px', height: '11px', borderRadius: '50%', backgroundColor: '#fbbf24' }} />
          <div style={{ width: '11px', height: '11px', borderRadius: '50%', backgroundColor: '#34d399' }} />
        </div>

        <div
          style={{
            fontSize: '0.775rem',
            color: 'var(--text-muted)',
            backgroundColor: '#ffffff',
            padding: '5px 18px',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid var(--border-subtle)',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-faint)' }}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          cipherschools.com/practice/parking-lot-system
        </div>

        {/* Automatic Tab Switcher with Continuous Auto-Shift */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Continuous live indicator pill */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.725rem',
              padding: '4px 10px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--accent-emerald-bg)',
              color: 'var(--accent-emerald)',
              border: '1px solid var(--accent-emerald-border)',
              fontWeight: 600,
              cursor: 'default',
            }}
          >
            <div className="pulse-green-container" style={{ width: '8px', height: '8px' }}>
              <span className="pulse-green-ring" style={{ width: '8px', height: '8px' }} />
              <span className="pulse-green-dot" style={{ width: '6px', height: '6px' }} />
            </div>
            Auto-Cycling
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => handleTabClick('attempt1')}
              className={`mockup-tab-btn ${activeTab === 'attempt1' ? 'mockup-tab-btn-active' : 'mockup-tab-btn-inactive'}`}
              style={{ position: 'relative', overflow: 'hidden' }}
            >
              Attempt #1
              {activeTab === 'attempt1' && (
                <span className="tab-progress-track">
                  <span
                    key={`p1-${cycleKey}`}
                    className="tab-progress-fill"
                  />
                </span>
              )}
            </button>

            <button
              onClick={() => handleTabClick('rubric')}
              className={`mockup-tab-btn ${activeTab === 'rubric' ? 'mockup-tab-btn-active' : 'mockup-tab-btn-inactive'}`}
              style={{ position: 'relative', overflow: 'hidden' }}
            >
              Rubric View
              {activeTab === 'rubric' && (
                <span className="tab-progress-track">
                  <span
                    key={`p2-${cycleKey}`}
                    className="tab-progress-fill"
                  />
                </span>
              )}
            </button>

            <button
              onClick={() => handleTabClick('attempt2')}
              className={`mockup-tab-btn ${activeTab === 'attempt2' ? 'mockup-tab-btn-active' : 'mockup-tab-btn-inactive'}`}
              style={{ position: 'relative', overflow: 'hidden' }}
            >
              Attempt #2 (Iterated)
              {activeTab === 'attempt2' && (
                <span className="tab-progress-track">
                  <span
                    key={`p3-${cycleKey}`}
                    className="tab-progress-fill"
                  />
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Inner Product Preview Dashboard */}
      <div style={{ padding: '2rem 2.25rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '1.25rem',
            borderBottom: '1px solid var(--border-subtle)',
            marginBottom: '1.75rem',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--text-muted)',
              }}
            >
              Interactive Workspace Preview
            </div>
            <h2
              key={`title-${activeTab}`}
              className="fade-in-view"
              style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px', letterSpacing: '-0.02em' }}
            >
              {activeTab === 'attempt1' && 'Parking Lot System · Attempt #1 Evaluation'}
              {activeTab === 'rubric' && 'Parking Lot System · 8-Dimension Rubric Analysis'}
              {activeTab === 'attempt2' && 'Parking Lot System · Attempt #2 (Iterated Refinement)'}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {activeTab === 'attempt1' && (
              <span
                key="badge-1"
                className="fade-in-view"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '5px 14px',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: 'var(--accent-emerald-bg)',
                  color: 'var(--accent-emerald)',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  border: '1px solid var(--accent-emerald-border)',
                }}
              >
                <div className="pulse-green-container">
                  <span className="pulse-green-ring" />
                  <span className="pulse-green-dot" />
                </div>
                Completed · Score: 63 / 80
              </span>
            )}

            {activeTab === 'rubric' && (
              <span
                key="badge-2"
                className="fade-in-view"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '5px 14px',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: 'rgba(79, 70, 229, 0.08)',
                  color: '#4f46e5',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  border: '1px solid rgba(79, 70, 229, 0.2)',
                }}
              >
                <div className="pulse-green-container">
                  <span className="pulse-green-ring" style={{ borderColor: '#818cf8' }} />
                  <span className="pulse-green-dot" style={{ backgroundColor: '#4f46e5' }} />
                </div>
                8 Rubric Dimensions Evaluated
              </span>
            )}

            {activeTab === 'attempt2' && (
              <span
                key="badge-3"
                className="fade-in-view"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '5px 14px',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: 'var(--accent-emerald-bg)',
                  color: 'var(--accent-emerald)',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  border: '1px solid var(--accent-emerald-border)',
                }}
              >
                <div className="pulse-green-container">
                  <span className="pulse-green-ring" />
                  <span className="pulse-green-dot" />
                </div>
                Completed · Score: 78 / 80 (+15 pts)
              </span>
            )}
          </div>
        </div>

        {/* Tab 1: Attempt #1 Baseline */}
        {activeTab === 'attempt1' && (
          <div
            key={`tab-1-${cycleKey}`}
            className="fade-in-view"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {/* Box 1: Problem Scope Card */}
            <div
              className="card-slide-in-1"
              style={{
                padding: '1.35rem',
                borderRadius: 'var(--radius-inner)',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: '0.775rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Problem Scope & Requirements
              </div>
              <div style={{ fontSize: '0.925rem', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '0.5rem' }}>
                Multi-level parking lot with dynamic vehicle spot assignment
              </div>
              <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                Supports Motorcycles, Compact Cars, Trucks, and Electric Vehicles. Evaluates Strategy Pattern for tariffs, single responsibility for floors vs. gates, and concurrency locks.
              </div>
            </div>

            {/* Box 2: Grounded Feedback Card */}
            <div
              className="card-slide-in-2"
              style={{
                padding: '1.35rem',
                borderRadius: 'var(--radius-inner)',
                backgroundColor: '#ffffff',
                border: '1px solid var(--border-medium)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Class Responsibilities (SRP)
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                  8 / 10
                </span>
              </div>
              <div
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  backgroundColor: 'var(--bg-subtle)',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontStyle: 'italic',
                  marginBottom: '0.5rem',
                  borderLeft: '3px solid var(--accent-black)',
                }}
              >
                &ldquo;Explicit delineation of class responsibilities: ParkingLot coordinates floors, Spot marks vacancy.&rdquo;
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <strong>Suggestion:</strong> Separate entity state from payment processing to preserve SRP.
              </div>
            </div>

            {/* Box 3: Iteration Lineage */}
            <div
              className="card-slide-in-3"
              style={{
                padding: '1.35rem',
                borderRadius: 'var(--radius-inner)',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: '0.775rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Deliberate Iteration Loop
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                Attempt #1 ➔ Feedback ➔ Attempt #2
              </div>
              <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                Clicking &ldquo;Iterate &amp; Retry&rdquo; spawns Attempt #2 linked via parent ID with prior text pre-filled, so you can refine architecture concerns without starting over.
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: 8 Rubric Dimensions Breakdown */}
        {activeTab === 'rubric' && (
          <div
            key={`tab-2-${cycleKey}`}
            className="fade-in-view"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
            }}
          >
            {[
              { dim: 'Class Responsibilities (SRP)', score: 8, bar: '80%', delay: '0.04s' },
              { dim: 'Coupling & Cohesion', score: 7, bar: '70%', delay: '0.08s' },
              { dim: 'Interface Segregation', score: 8, bar: '80%', delay: '0.12s' },
              { dim: 'Design Patterns (Strategy)', score: 8, bar: '80%', delay: '0.16s' },
              { dim: 'Extensibility & OCP', score: 8, bar: '80%', delay: '0.20s' },
              { dim: 'Concurrency & Thread Safety', score: 7, bar: '70%', delay: '0.24s' },
              { dim: 'Trade-off Articulation', score: 8, bar: '80%', delay: '0.28s' },
              { dim: 'Edge Case Reasoning', score: 9, bar: '90%', delay: '0.32s' },
            ].map((item, idx) => (
              <div
                key={idx}
                className="card-slide-in-1"
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-inner)',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  animationDelay: item.delay,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.785rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {item.dim}
                  </span>
                  <span style={{ fontSize: '0.785rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                    {item.score}/10
                  </span>
                </div>
                <div style={{ width: '100%', height: '5px', backgroundColor: '#e4e4e7', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: item.bar,
                      height: '100%',
                      backgroundColor: 'var(--accent-emerald)',
                      borderRadius: '9999px',
                      transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Attempt #2 Lineage Outcome */}
        {activeTab === 'attempt2' && (
          <div
            key={`tab-3-${cycleKey}`}
            className="fade-in-view"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {/* Box 1: Refactored Solution */}
            <div
              className="card-slide-in-1"
              style={{
                padding: '1.35rem',
                borderRadius: 'var(--radius-inner)',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: '0.775rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Refactored Architecture
              </div>
              <div style={{ fontSize: '0.925rem', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '0.5rem' }}>
                PaymentService decoupled from physical ParkingSpot
              </div>
              <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                Following Attempt #1 feedback, payment processing logic was extracted into a dedicated <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', backgroundColor: '#ffffff', padding: '1px 4px', borderRadius: '4px' }}>IPaymentStrategy</code> service, preserving pure entity state in ParkingSpot.
              </div>
            </div>

            {/* Box 2: Upgraded Score Card */}
            <div
              className="card-slide-in-2"
              style={{
                padding: '1.35rem',
                borderRadius: 'var(--radius-inner)',
                backgroundColor: '#ffffff',
                border: '1.5px solid var(--accent-emerald)',
                boxShadow: '0 4px 14px rgba(5, 150, 105, 0.08)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Class Responsibilities (SRP)
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                  10 / 10 ★
                </span>
              </div>
              <div
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  backgroundColor: 'var(--accent-emerald-bg)',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontStyle: 'italic',
                  marginBottom: '0.5rem',
                  borderLeft: '3px solid var(--accent-emerald)',
                }}
              >
                &ldquo;PaymentService cleanly isolated into an injectable dependency. Single responsibility strictly maintained.&rdquo;
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>
                Score increased by +2 pts on SRP and +15 pts overall!
              </div>
            </div>

            {/* Box 3: Preserved Lineage */}
            <div
              className="card-slide-in-3"
              style={{
                padding: '1.35rem',
                borderRadius: 'var(--radius-inner)',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: '0.775rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Lineage & Progression
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                Parent: Attempt #1 (63) ➔ Active: Attempt #2 (78)
              </div>
              <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                Both attempts remain permanently viewable in the Attempt History drawer. Learners can toggle between them to observe concrete architectural growth.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
