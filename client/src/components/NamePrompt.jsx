import { useState, useEffect } from 'react';

export default function NamePrompt({ onNameSet }) {
  const [name, setName] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setIsAnimating(true);
    localStorage.setItem('yourspace-username', trimmed);

    // Brief animation before proceeding
    setTimeout(() => {
      onNameSet(trimmed);
    }, 400);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit(e);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      padding: '2rem',
      transition: 'opacity 0.4s ease, transform 0.4s ease',
      opacity: isAnimating ? 0 : 1,
      transform: isAnimating ? 'scale(0.98)' : 'scale(1)'
    }}>
      {/* Logo */}
      <div style={{
        width: 48,
        height: 48,
        borderRadius: '12px',
        background: 'var(--text-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--bg-primary)',
        marginBottom: '2rem'
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
        </svg>
      </div>

      {/* Title */}
      <h1 style={{
        fontSize: '1.75rem',
        fontWeight: 700,
        color: 'var(--text-primary)',
        letterSpacing: '-0.02em',
        marginBottom: '0.75rem',
        textAlign: 'center'
      }}>
        Welcome to Your Space
      </h1>
      <p style={{
        fontSize: '0.9375rem',
        color: 'var(--text-secondary)',
        marginBottom: '2.5rem',
        textAlign: 'center',
        maxWidth: '320px',
        lineHeight: 1.6
      }}>
        Enter your name to start writing.
      </p>

      {/* Name Input */}
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '320px' }}>
        <div style={{
          position: 'relative',
          marginBottom: '1.25rem'
        }}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Your name"
            autoFocus
            maxLength={30}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '0.9375rem',
              fontFamily: 'var(--font-sans)',
              fontWeight: 500,
              outline: 'none',
              transition: 'all 0.15s ease',
              textAlign: 'center'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--text-primary)';
              e.target.style.background = 'var(--bg-primary)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--border-color)';
              e.target.style.background = 'var(--bg-secondary)';
            }}
          />
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={!name.trim()}
          style={{
            width: '100%',
            justifyContent: 'center',
            padding: '12px 20px',
            fontSize: '0.9375rem',
            borderRadius: '10px',
            opacity: name.trim() ? 1 : 0.6,
            cursor: name.trim() ? 'pointer' : 'default'
          }}
        >
          Start Writing
        </button>
      </form>

      {/* Footer hint */}
      <p style={{
        marginTop: '2rem',
        fontSize: '0.75rem',
        color: 'var(--text-tertiary)',
        textAlign: 'center'
      }}>
        Your name is visible to collaborators on shared notes.
      </p>
    </div>
  );
}
