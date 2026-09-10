'use client';

import React, { useState, useEffect } from 'react';

const WORDS = [
  'Smarter.',
  'Cleaner.',
  'Faster.',
  'Decoupled.',
  'Extensibly.',
  'Production-Grade.',
];

export default function TypewriterHeadline() {
  const [wordIndex, setWordIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState(WORDS[0]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [typingSpeed, setTypingSpeed] = useState(80);

  useEffect(() => {
    const currentFullWord = WORDS[wordIndex];

    const handleTyping = () => {
      if (!isDeleting) {
        // Typing forward
        if (displayedText.length < currentFullWord.length) {
          setDisplayedText(currentFullWord.slice(0, displayedText.length + 1));
          setTypingSpeed(75);
        } else {
          // Finished typing word, pause before deleting
          setTypingSpeed(1800);
          setIsDeleting(true);
        }
      } else {
        // Deleting backward
        if (displayedText.length > 0) {
          setDisplayedText(currentFullWord.slice(0, displayedText.length - 1));
          setTypingSpeed(45);
        } else {
          // Finished deleting, move to next word
          setIsDeleting(false);
          setWordIndex((prev) => (prev + 1) % WORDS.length);
          setTypingSpeed(350);
        }
      }
    };

    const timer = setTimeout(handleTyping, typingSpeed);
    return () => clearTimeout(timer);
  }, [displayedText, isDeleting, wordIndex, typingSpeed]);

  return (
    <h1
      style={{
        fontSize: 'clamp(2.75rem, 6vw, 4.75rem)',
        fontWeight: 800,
        letterSpacing: '-0.04em',
        lineHeight: 1.08,
        color: 'var(--text-primary)',
        maxWidth: '920px',
        margin: '0 auto 1.5rem auto',
      }}
    >
      <span className="hero-title-line-1" style={{ display: 'block' }}>
        Practice LLD.
      </span>
      <span className="hero-title-line-2" style={{ display: 'block' }}>
        Think Better.
      </span>
      <span
        className="hero-title-line-3"
        style={{
          display: 'inline-flex',
          alignItems: 'baseline',
          justifyContent: 'center',
          flexWrap: 'wrap',
          columnGap: '0.28em',
        }}
      >
        <span>Design</span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'baseline',
            position: 'relative',
            minWidth: '2.5ch',
          }}
        >
          <span style={{ color: 'var(--text-primary)' }}>{displayedText}</span>
          <span className="blinking-cursor" aria-hidden="true" />
        </span>
      </span>
    </h1>
  );
}
