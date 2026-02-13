import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function getGuestId() {
  let id = localStorage.getItem('yourspace-guest-id');
  if (!id) {
    id = 'guest_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    localStorage.setItem('yourspace-guest-id', id);
  }
  return id;
}

export default function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    const createNote = async () => {
      try {
        const res = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ owner: getGuestId() })
        });
        const data = await res.json();
        navigate(`/note/${data.shortId}`, { replace: true });
      } catch (error) {
        console.error('Failed to create note:', error);
      }
    };
    createNote();
  }, [navigate]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      gap: '1.5rem'
    }}>
      <div className="bg-gradient-animated" />
      
      {/* Logo */}
      <div style={{
        width: 56,
        height: 56,
        borderRadius: '16px',
        background: 'linear-gradient(135deg, var(--accent), #ec4899)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: 'var(--shadow-glow)',
        animation: 'pulse-dot 2s ease-in-out infinite'
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      </div>

      <div style={{ textAlign: 'center' }}>
        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '-0.03em',
          marginBottom: '0.5rem'
        }}>
          Creating your space...
        </h1>
        <p style={{
          fontSize: '0.875rem',
          color: 'var(--text-tertiary)'
        }}>
          Setting up a fresh new note for you
        </p>
      </div>

      <div className="spinner" />
    </div>
  );
}
