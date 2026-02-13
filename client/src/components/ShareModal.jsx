import { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function ShareModal({ isOpen, onClose, shortId }) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('link');
  const inputRef = useRef(null);

  if (!isOpen) return null;

  const noteUrl = `${window.location.origin}/note/${shortId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(noteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      inputRef.current?.select();
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{
            fontSize: '1.125rem',
            fontWeight: 700,
            color: 'var(--text-primary)'
          }}>
            Share this note
          </h2>
          <button className="btn-icon" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '2px',
          padding: '2px',
          background: 'var(--bg-tertiary)',
          borderRadius: '8px',
          marginBottom: '1.5rem'
        }}>
          {['link', 'qr'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.8125rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                fontFamily: 'var(--font-sans)',
                background: activeTab === tab ? 'var(--bg-primary)' : 'transparent',
                color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-tertiary)',
                boxShadow: activeTab === tab ? 'var(--shadow-sm)' : 'none'
              }}
            >
              {tab === 'link' ? 'Link' : 'QR Code'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'link' ? (
          <div>
            <div style={{
              display: 'flex',
              gap: '8px'
            }}>
              <input
                ref={inputRef}
                type="text"
                value={noteUrl}
                readOnly
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.8125rem',
                  fontFamily: 'var(--font-mono)',
                  outline: 'none'
                }}
              />
              <button
                className="btn-primary"
                onClick={handleCopy}
                style={{
                  minWidth: '80px',
                  background: copied ? 'var(--success)' : undefined,
                  border: copied ? '1px solid var(--success)' : undefined
                }}
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            
            <p style={{
              marginTop: '1rem',
              fontSize: '0.75rem',
              color: 'var(--text-tertiary)',
              lineHeight: 1.5
            }}>
              Anyone with this link can view and edit freely.
            </p>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div style={{
              padding: '1rem',
              background: 'white',
              borderRadius: '12px',
              border: '1px solid var(--border-color)'
            }}>
              <QRCodeSVG
                value={noteUrl}
                size={160}
                bgColor="#ffffff"
                fgColor="#000000"
                level="M"
                includeMargin={false}
              />
            </div>
            <span style={{
              fontSize: '0.75rem',
              color: 'var(--text-tertiary)',
              fontFamily: 'var(--font-mono)'
            }}>
              /note/{shortId}
            </span>
          </div>
        )}

        {/* Info */}
        <div style={{
          marginTop: '1.5rem',
          padding: '12px 16px',
          background: 'var(--bg-tertiary)',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Notes are saved automatically. No sign-up required.
          </span>
        </div>
      </div>
    </div>
  );
}
