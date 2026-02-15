import React from 'react';

export default function DeleteConfirmationModal({ isOpen, onClose, onConfirm, noteTitle, count = 1, isDeleting = false }) {
  if (!isOpen) return null;

  const isMulti = count > 1;
  const title = isMulti ? `Delete ${count} Notes?` : 'Delete Note?';
  const message = isMulti
    ? `Are you sure you want to delete ${count} notes? This action cannot be undone.`
    : null;

  return (
    <div className="modal-overlay" onClick={isDeleting ? undefined : onClose}>
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
          {title}
        </h3>
        
        <p style={{
          fontSize: '0.875rem',
          color: 'var(--text-secondary)',
          marginBottom: '1.5rem',
          lineHeight: 1.5
        }}>
          {message || (
            <>Are you sure you want to delete <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>"{noteTitle || 'Untitled'}"</span>? This action cannot be undone.</>
          )}
        </p>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            className="btn-ghost" 
            onClick={onClose}
            disabled={isDeleting}
            style={{ flex: 1, justifyContent: 'center', opacity: isDeleting ? 0.5 : 1 }}
          >
            Cancel
          </button>
          <button 
            className="btn-primary" 
            onClick={onConfirm}
            disabled={isDeleting}
            style={{ 
              flex: 1, 
              justifyContent: 'center',
              background: 'var(--danger)',
              borderColor: 'var(--danger)',
              color: 'white',
              opacity: isDeleting ? 0.8 : 1,
            }}
          >
            {isDeleting ? (
              <>
                <div className="spinner" style={{ 
                  width: 14, height: 14, borderWidth: 2,
                  borderTopColor: 'white',
                  borderRightColor: 'rgba(255,255,255,0.3)',
                  borderBottomColor: 'rgba(255,255,255,0.3)',
                  borderLeftColor: 'rgba(255,255,255,0.3)',
                }} />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
