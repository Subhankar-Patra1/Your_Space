import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';

function getGuestId() {
  return localStorage.getItem('yourspace-guest-id') || '';
}

function timeAgo(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getPreview(content, maxLen = 120) {
  if (!content) return 'Empty note';
  const clean = content.replace(/\n/g, ' ').trim();
  return clean.length > maxLen ? clean.substring(0, maxLen) + '...' : clean;
}

export default function Dashboard() {
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const navigate = useNavigate();
  const guestId = getGuestId();

  useEffect(() => {
    const fetchNotes = async () => {
      if (!guestId) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/documents?owner=${guestId}`);
        const data = await res.json();
        setNotes(data);
      } catch (error) {
        console.error('Failed to fetch notes:', error);
      }
      setIsLoading(false);
    };
    fetchNotes();
  }, [guestId]);

  const handleCreateNew = async () => {
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner: guestId })
      });
      const data = await res.json();
      navigate(`/note/${data.shortId}`);
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  const confirmDelete = async () => {
    if (!noteToDelete) return;
    try {
      await fetch(`/api/documents/${noteToDelete.shortId}`, { method: 'DELETE' });
      setNotes(prev => prev.filter(n => n.shortId !== noteToDelete.shortId));
      setNoteToDelete(null);
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const handleDeleteClick = (e, note) => {
    e.stopPropagation();
    setNoteToDelete(note);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)' }}>
      <Navbar isEditor={false} />

      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '3rem 1.5rem'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '3rem'
        }}>
          <div>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              marginBottom: '0.5rem'
            }}>
              Notes
            </h1>
            <p style={{
              fontSize: '0.9375rem',
              color: 'var(--text-secondary)'
            }}>
              {notes.length} {notes.length === 1 ? 'note' : 'notes'} • Saved locally
            </p>
          </div>

          <button className="btn-primary" onClick={handleCreateNew}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Note
          </button>
        </div>

        {/* Loading */}
        {isLoading && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '4rem 0'
          }}>
            <div className="spinner" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && notes.length === 0 && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6rem 2rem',
            background: 'var(--bg-primary)',
            borderRadius: '16px',
            border: '1px dashed var(--border-color)',
            textAlign: 'center'
          }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '14px',
              background: 'var(--bg-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.5rem',
              color: 'var(--text-tertiary)'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            </div>
            <h2 style={{
              fontSize: '1.125rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: '0.5rem'
            }}>
              No notes found
            </h2>
            <p style={{
              fontSize: '0.9375rem',
              color: 'var(--text-secondary)',
              marginBottom: '2rem',
              maxWidth: '400px'
            }}>
              Get started by creating a new note. It will be saved automatically to this device.
            </p>
            <button className="btn-primary" onClick={handleCreateNew}>
              Create Note
            </button>
          </div>
        )}

        {/* Notes Grid */}
        {!isLoading && notes.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1.5rem'
          }}>
            {notes.map(note => (
              <div
                key={note.shortId}
                className="note-card"
                onClick={() => navigate(`/note/${note.shortId}`)}
              >
                {/* Card header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  marginBottom: '1rem'
                }}>
                  <h3 style={{
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                    marginRight: '1rem'
                  }}>
                    {note.title || 'Untitled'}
                  </h3>
                  <button
                    className="btn-icon"
                    onClick={(e) => handleDeleteClick(e, note)}
                    style={{ 
                      width: 32, 
                      height: 32, 
                      color: 'var(--text-tertiary)',
                      transition: 'all 0.2s',
                    }}
                    title="Delete note"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>

                {/* Preview */}
                <p style={{
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                  marginBottom: '1.5rem',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  height: '4.2em'
                }}>
                  {getPreview(note.content, 140)}
                </p>

                {/* Footer */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.75rem',
                  color: 'var(--text-tertiary)',
                  paddingTop: '1rem',
                  borderTop: '1px solid var(--border-color)'
                }}>
                  <span>{timeAgo(note.updatedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <DeleteConfirmationModal 
        isOpen={!!noteToDelete} 
        onClose={() => setNoteToDelete(null)}
        onConfirm={confirmDelete}
        noteTitle={noteToDelete?.title}
      />
    </div>
  );
}
