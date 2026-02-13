import React from 'react';

export default function DeleteConfirmationModal({ isOpen, onClose, onConfirm, noteTitle }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '320px', padding: '1.5rem', textAlign: 'center' }}
      >
        <div style={{
          width: 48,
          height: 48,
          borderRadius: '12px',
          background: 'rgba(239, 68, 68, 0.1)',
          color: 'var(--danger)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1rem'
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </div>

        <h3 style={{
          fontSize: '1.125rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: '0.5rem'
        }}>
          Delete Note?
        </h3>
        
        <p style={{
          fontSize: '0.875rem',
          color: 'var(--text-secondary)',
          marginBottom: '1.5rem',
          lineHeight: 1.5
        }}>
          Are you sure you want to delete <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>"{noteTitle || 'Untitled'}"</span>? This action cannot be undone.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            className="btn-ghost" 
            onClick={onClose}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            Cancel
          </button>
          <button 
            className="btn-primary" 
            onClick={onConfirm}
            style={{ 
              flex: 1, 
              justifyContent: 'center',
              background: 'var(--danger)',
              borderColor: 'var(--danger)',
              color: 'white'
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
