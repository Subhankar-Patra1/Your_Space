import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';

function getGuestId() {
  return localStorage.getItem('yourspace-guest-id') || '';
}

function getSharedNoteIds() {
  try {
    return JSON.parse(localStorage.getItem('yourspace-shared-notes') || '[]');
  } catch {
    return [];
  }
}

function removeSharedNoteId(shortId) {
  try {
    const shared = getSharedNoteIds().filter(id => id !== shortId);
    localStorage.setItem('yourspace-shared-notes', JSON.stringify(shared));
  } catch { /* ignore */ }
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
  const [sharedNotes, setSharedNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingShared, setIsLoadingShared] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [selectedNotes, setSelectedNotes] = useState(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [activeTab, setActiveTab] = useState('my-notes');
  const navigate = useNavigate();
  const guestId = getGuestId();

  const isSelectMode = selectedNotes.size > 0;

  useEffect(() => {
    const fetchNotes = async () => {
      if (!guestId) {
        setIsLoading(false);
        return;
      }
      try {
        const apiUrl = import.meta.env.VITE_SERVER_URL || import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${apiUrl}/api/documents?owner=${guestId}`);
        const data = await res.json();
        setNotes(data);
      } catch (error) {
        console.error('Failed to fetch notes:', error);
      }
      setIsLoading(false);
    };
    fetchNotes();
  }, [guestId]);

  // Fetch shared notes from localStorage shortIds
  useEffect(() => {
    const fetchSharedNotes = async () => {
      const sharedIds = getSharedNoteIds();
      if (sharedIds.length === 0) {
        setIsLoadingShared(false);
        return;
      }
      try {
        const apiUrl = import.meta.env.VITE_SERVER_URL || import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${apiUrl}/api/documents/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shortIds: sharedIds })
        });
        const data = await res.json();
        const filtered = data.filter(doc => doc.owner !== guestId);
        setSharedNotes(filtered);
      } catch (error) {
        console.error('Failed to fetch shared notes:', error);
      }
      setIsLoadingShared(false);
    };
    fetchSharedNotes();
  }, [guestId]);

  // Clear selection when switching tabs
  useEffect(() => {
    setSelectedNotes(new Set());
  }, [activeTab]);

  const handleCreateNew = async () => {
    setIsCreating(true);
    try {
      const apiUrl = import.meta.env.VITE_SERVER_URL || import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${apiUrl}/api/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner: guestId })
      });
      const data = await res.json();
      navigate(`/note/${data.shortId}`);
    } catch (error) {
      console.error('Failed to create note:', error);
      setIsCreating(false);
    }
  };

  // Toggle selection of a single note
  const toggleSelect = (e, shortId) => {
    e.stopPropagation();
    setSelectedNotes(prev => {
      const next = new Set(prev);
      if (next.has(shortId)) {
        next.delete(shortId);
      } else {
        next.add(shortId);
      }
      return next;
    });
  };

  // Select/deselect all notes in the active tab
  const toggleSelectAll = () => {
    const currentNotes = activeTab === 'my-notes' ? notes : sharedNotes;
    if (selectedNotes.size === currentNotes.length) {
      setSelectedNotes(new Set());
    } else {
      setSelectedNotes(new Set(currentNotes.map(n => n.shortId)));
    }
  };

  // Single delete click (from trash icon)
  const handleDeleteClick = (e, note) => {
    e.stopPropagation();
    setNoteToDelete(note);
    setShowDeleteModal(true);
  };

  // Multi-delete button
  const handleBulkDelete = () => {
    setNoteToDelete(null); // null = bulk mode
    setShowDeleteModal(true);
  };

  // Confirm delete (single or bulk)
  const confirmDelete = async () => {
    setIsDeleting(true);
    const apiUrl = import.meta.env.VITE_SERVER_URL || import.meta.env.VITE_API_URL || '';

    try {
      if (noteToDelete) {
        // Single delete
        await fetch(`${apiUrl}/api/documents/${noteToDelete.shortId}`, { method: 'DELETE' });
        setNotes(prev => prev.filter(n => n.shortId !== noteToDelete.shortId));
      } else {
        // Bulk delete
        const idsToDelete = [...selectedNotes];
        await Promise.all(
          idsToDelete.map(id => fetch(`${apiUrl}/api/documents/${id}`, { method: 'DELETE' }))
        );
        if (activeTab === 'my-notes') {
          setNotes(prev => prev.filter(n => !selectedNotes.has(n.shortId)));
        } else {
          // For shared tab, just remove from localStorage
          idsToDelete.forEach(id => removeSharedNoteId(id));
          setSharedNotes(prev => prev.filter(n => !selectedNotes.has(n.shortId)));
        }
        setSelectedNotes(new Set());
      }
    } catch (error) {
      console.error('Failed to delete:', error);
    }
    setIsDeleting(false);
    setShowDeleteModal(false);
    setNoteToDelete(null);
  };

  const handleRemoveShared = (e, shortId) => {
    e.stopPropagation();
    removeSharedNoteId(shortId);
    setSharedNotes(prev => prev.filter(n => n.shortId !== shortId));
  };

  const totalShared = sharedNotes.length;
  const deleteCount = noteToDelete ? 1 : selectedNotes.size;

  // Checkbox component
  const Checkbox = ({ checked, onClick }) => (
    <div
      onClick={onClick}
      style={{
        width: 20,
        height: 20,
        borderRadius: '6px',
        border: checked ? 'none' : '2px solid var(--border-color)',
        background: checked ? 'var(--accent)' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        flexShrink: 0,
      }}
    >
      {checked && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </div>
  );

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
          marginBottom: '2rem'
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

          <button className="btn-primary" onClick={handleCreateNew} disabled={isCreating}>
            {isCreating ? (
              <>
                <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderTopColor: 'var(--accent-content)', borderRightColor: 'rgba(255,255,255,0.2)', borderBottomColor: 'rgba(255,255,255,0.2)', borderLeftColor: 'rgba(255,255,255,0.2)' }} />
                <span>Creating...</span>
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New Note
              </>
            )}
          </button>
        </div>

        {/* Tabs + Selection Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '2rem',
          borderBottom: '1px solid var(--border-color)',
        }}>
          {/* Tab buttons */}
          <div style={{ display: 'flex', gap: '0' }}>
            <button
              onClick={() => setActiveTab('my-notes')}
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: activeTab === 'my-notes' ? 'var(--accent)' : 'var(--text-tertiary)',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'my-notes' ? '2px solid var(--accent)' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              My Notes
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: activeTab === 'my-notes' ? 'var(--accent)' : 'var(--bg-primary)',
                color: activeTab === 'my-notes' ? 'var(--accent-content)' : 'var(--text-tertiary)',
                transition: 'all 0.2s ease',
              }}>
                {notes.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('shared')}
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: activeTab === 'shared' ? 'var(--accent)' : 'var(--text-tertiary)',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'shared' ? '2px solid var(--accent)' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Shared with me
              {totalShared > 0 && (
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: activeTab === 'shared' ? 'var(--accent)' : 'var(--bg-primary)',
                  color: activeTab === 'shared' ? 'var(--accent-content)' : 'var(--text-tertiary)',
                  transition: 'all 0.2s ease',
                }}>
                  {totalShared}
                </span>
              )}
            </button>
          </div>

          {/* Selection actions (visible when items exist) */}
          {((activeTab === 'my-notes' && notes.length > 0) || (activeTab === 'shared' && sharedNotes.length > 0)) && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              paddingBottom: '2px',
            }}>
              {isSelectMode && (
                <>
                  <span style={{
                    fontSize: '0.8125rem',
                    color: 'var(--accent)',
                    fontWeight: 600,
                  }}>
                    {selectedNotes.size} selected
                  </span>
                  <button
                    onClick={handleBulkDelete}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      color: 'white',
                      background: 'var(--danger)',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    Delete
                  </button>
                </>
              )}
              <button
                onClick={toggleSelectAll}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {selectedNotes.size === (activeTab === 'my-notes' ? notes : sharedNotes).length && selectedNotes.size > 0
                  ? 'Deselect all'
                  : 'Select all'}
              </button>
            </div>
          )}
        </div>

        {/* My Notes Tab */}
        {activeTab === 'my-notes' && (
          <>
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
                {notes.map(note => {
                  const isSelected = selectedNotes.has(note.shortId);
                  return (
                    <div
                      key={note.shortId}
                      className="note-card"
                      onClick={() => isSelectMode ? toggleSelect({ stopPropagation: () => {} }, note.shortId) : navigate(`/note/${note.shortId}`)}
                      style={{
                        outline: isSelected ? '2px solid var(--accent)' : 'none',
                        outlineOffset: '-2px',
                      }}
                    >
                      {/* Card header */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        marginBottom: '1rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                          <Checkbox
                            checked={isSelected}
                            onClick={(e) => toggleSelect(e, note.shortId)}
                          />
                          <h3 style={{
                            fontSize: '1rem',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1,
                          }}>
                            {note.title || 'Untitled'}
                          </h3>
                        </div>
                        <button
                          className="btn-icon"
                          onClick={(e) => handleDeleteClick(e, note)}
                          style={{
                            width: 32,
                            height: 32,
                            color: 'var(--text-tertiary)',
                            transition: 'all 0.2s',
                            flexShrink: 0,
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
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Shared Tab */}
        {activeTab === 'shared' && (
          <>
            {/* Loading */}
            {isLoadingShared && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                padding: '4rem 0'
              }}>
                <div className="spinner" />
              </div>
            )}

            {/* Empty State */}
            {!isLoadingShared && sharedNotes.length === 0 && (
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
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <h2 style={{
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: '0.5rem'
                }}>
                  No shared notes yet
                </h2>
                <p style={{
                  fontSize: '0.9375rem',
                  color: 'var(--text-secondary)',
                  maxWidth: '400px'
                }}>
                  When someone shares a note link with you and you open it, it will appear here for quick access.
                </p>
              </div>
            )}

            {/* Shared Notes Grid */}
            {!isLoadingShared && sharedNotes.length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '1.5rem'
              }}>
                {sharedNotes.map(note => {
                  const isSelected = selectedNotes.has(note.shortId);
                  return (
                    <div
                      key={note.shortId}
                      className="note-card"
                      onClick={() => isSelectMode ? toggleSelect({ stopPropagation: () => {} }, note.shortId) : navigate(`/note/${note.shortId}`)}
                      style={{
                        outline: isSelected ? '2px solid var(--accent)' : 'none',
                        outlineOffset: '-2px',
                      }}
                    >
                      {/* Card header */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        marginBottom: '1rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                          <Checkbox
                            checked={isSelected}
                            onClick={(e) => toggleSelect(e, note.shortId)}
                          />
                          <h3 style={{
                            fontSize: '1rem',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1,
                          }}>
                            {note.title || 'Untitled'}
                          </h3>
                        </div>
                        <button
                          className="btn-icon"
                          onClick={(e) => handleRemoveShared(e, note.shortId)}
                          style={{
                            width: 32,
                            height: 32,
                            color: 'var(--text-tertiary)',
                            transition: 'all 0.2s',
                            flexShrink: 0,
                          }}
                          title="Remove from shared"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
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
                        <span style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                          </svg>
                          Shared
                        </span>
                        <span>{timeAgo(note.updatedAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => { if (!isDeleting) { setShowDeleteModal(false); setNoteToDelete(null); } }}
        onConfirm={confirmDelete}
        noteTitle={noteToDelete?.title}
        count={deleteCount}
        isDeleting={isDeleting}
      />
    </div>
  );
}
