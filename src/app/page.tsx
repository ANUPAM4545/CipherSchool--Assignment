import Link from 'next/link';
import { getAppContainer } from '@/infrastructure/di/container';
import InteractiveHeroPreview from '@/components/InteractiveHeroPreview';
import TypewriterHeadline from '@/components/TypewriterHeadline';

export const revalidate = 0; // Fresh fetch

export default async function HomePage() {
  const container = await getAppContainer();
  const problems = await container.getProblems.execute();

  const difficultyMeta = {
    EASY: { label: 'Beginner', dot: '#10b981', bg: '#f0fdf4', text: '#15803d', border: 'rgba(21, 128, 61, 0.2)' },
    MEDIUM: { label: 'Intermediate', dot: '#f59e0b', bg: '#fffbeb', text: '#b45309', border: 'rgba(180, 83, 9, 0.2)' },
    HARD: { label: 'Advanced', dot: '#e11d48', bg: '#fff1f2', text: '#be123c', border: 'rgba(190, 18, 60, 0.2)' },
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 1.5rem 5rem 1.5rem' }}>
      {/* Hero Section Inspired by Reference */}
      <section style={{ textAlign: 'center', paddingTop: '3.5rem', paddingBottom: '3.5rem' }}>
        {/* Category Pill Tag */}
        <div
          className="hero-animate-badge"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '6px 14px',
            borderRadius: 'var(--radius-pill)',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-medium)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
            fontSize: '0.825rem',
            fontWeight: 500,
            color: 'var(--text-secondary)',
            marginBottom: '1.75rem',
            cursor: 'default',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent-black)',
              display: 'inline-block',
            }}
          />
          Introducing LLD &amp; Coding Practice Platform
        </div>

        {/* Large Editorial Headline with Typewriter Dynamic Word-by-Word Rotation */}
        <TypewriterHeadline />

        {/* Supporting Copy */}
        <p
          className="hero-subtitle-animate"
          style={{
            fontSize: '1.15rem',
            lineHeight: 1.6,
            color: 'var(--text-secondary)',
            maxWidth: '680px',
            margin: '0 auto 2.25rem auto',
            fontWeight: 400,
          }}
        >
          Build production-grade Low-Level Design and algorithmic Coding skills through focused problems,
          deterministic code execution, and evidence-grounded AI reviews.
        </p>

        {/* CTAs with Interactive Micro-animations */}
        <div
          className="hero-cta-animate"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
            marginBottom: '4.5rem',
          }}
        >
          <Link
            href="/problems/parking-lot-system"
            className="btn-pill-primary"
            style={{
              padding: '14px 32px',
              fontSize: '1rem',
              fontWeight: 600,
            }}
          >
            Start Practicing Free <span className="btn-arrow">➔</span>
          </Link>

          <Link
            href="#problems"
            className="btn-pill-secondary"
            style={{
              padding: '14px 28px',
              fontSize: '1rem',
              fontWeight: 600,
            }}
          >
            Browse Problems <span className="btn-arrow-down">↓</span>
          </Link>
        </div>

        {/* Interactive Product Preview Mockup Window with Tab Switching & Live Status */}
        <InteractiveHeroPreview />
      </section>

      {/* Problem Catalog Section Inspired by Reference */}
      <section id="problems" style={{ paddingTop: '4rem', paddingBottom: '3rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '4px 12px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--bg-subtle)',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-muted)',
              marginBottom: '0.75rem',
            }}
          >
            Curated LLD Library
          </div>
          <h2
            style={{
              fontSize: 'clamp(2rem, 4vw, 2.75rem)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: 'var(--text-primary)',
              marginBottom: '0.75rem',
            }}
          >
            Practice Real Architectural Scenarios
          </h2>
          <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', maxWidth: '620px', margin: '0 auto' }}>
            Choose an industry-standard problem to begin an evaluated practice session with explicit requirements and automated rubric feedback.
          </p>
        </div>

        {/* Problem Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {problems.map((problem) => {
            const meta = difficultyMeta[problem.difficulty];

            return (
              <div
                key={problem.id}
                className="interactive-card"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-card)',
                  border: '1px solid var(--border-medium)',
                  padding: '2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                <div>
                  {/* Card Header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '1.25rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span
                        style={{
                          fontSize: '0.725rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-pill)',
                          backgroundColor: problem.type === 'CODING' ? '#e0e7ff' : '#f1f5f9',
                          color: problem.type === 'CODING' ? '#4338ca' : '#475569',
                          border: problem.type === 'CODING' ? '1px solid rgba(67, 56, 202, 0.2)' : '1px solid rgba(71, 85, 105, 0.2)',
                        }}
                      >
                        {problem.type === 'CODING' ? 'CODING' : 'LLD'}
                      </span>

                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '3px 9px',
                          borderRadius: 'var(--radius-pill)',
                          backgroundColor: meta.bg,
                          color: meta.text,
                          border: `1px solid ${meta.border}`,
                        }}
                      >
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: meta.dot }} />
                        {meta.label}
                      </span>
                    </div>

                    <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                      {problem.type === 'CODING' ? 'Deterministic + AI' : '8 Rubric Dimensions'}
                    </span>
                  </div>

                  {/* Problem Title */}
                  <h3
                    style={{
                      fontSize: '1.35rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      letterSpacing: '-0.02em',
                      marginBottom: '0.75rem',
                    }}
                  >
                    {problem.title}
                  </h3>

                  {/* Problem Description */}
                  <p
                    style={{
                      fontSize: '0.9rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.55,
                      marginBottom: '1.5rem',
                    }}
                  >
                    {problem.shortDescription}
                  </p>

                  {/* Concepts Practiced Tags */}
                  <div style={{ marginBottom: '2rem' }}>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        marginBottom: '0.625rem',
                      }}
                    >
                      Concepts Tested
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                      {problem.conceptsPracticed.map((concept, idx) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-pill)',
                            backgroundColor: 'var(--bg-subtle)',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          {concept}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card CTA Link */}
                <Link
                  href={`/problems/${problem.slug}`}
                  className="btn-pill-primary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    padding: '11px 20px',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                  }}
                >
                  Start Practice <span className="card-arrow-icon">➔</span>
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* How It Works / Value Props Section Inspired by Reference */}
      <section
        id="how-it-works"
        style={{
          paddingTop: '4rem',
          paddingBottom: '3rem',
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '4px 12px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--bg-subtle)',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-muted)',
              marginBottom: '0.75rem',
            }}
          >
            The Learning Philosophy
          </div>
          <h2
            style={{
              fontSize: 'clamp(2rem, 4vw, 2.75rem)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: 'var(--text-primary)',
            }}
          >
            Built for Deliberate Engineering Practice
          </h2>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.5rem',
          }}
        >
          <div
            className="interactive-card"
            style={{
              padding: '2rem',
              borderRadius: 'var(--radius-card)',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-medium)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              01 / STRUCTURED SUBMISSION
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
              7 Architectural Dimensions
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Move beyond free-form code dumping. Articulate Requirements, Assumptions, Classes, Responsibilities, Interfaces, Design Patterns, and Concurrency edge cases.
            </p>
          </div>

          <div
            className="interactive-card"
            style={{
              padding: '2rem',
              borderRadius: 'var(--radius-card)',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-medium)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              02 / TWO-TIER EVALUATION
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
              Evidence-Grounded Feedback
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Instant deterministic pre-checks (&lt; 50ms) catch structure issues before cognitive evaluation judges Single Responsibility, coupling, and trade-off depth.
            </p>
          </div>

          <div
            className="interactive-card"
            style={{
              padding: '2rem',
              borderRadius: 'var(--radius-card)',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-medium)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              03 / DELIBERATE ITERATION
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
              Linked Attempt Lineage
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              True learning happens when you revise. One click instantiates Attempt #2 with your prior design pre-filled so you can address specific architectural concerns.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
