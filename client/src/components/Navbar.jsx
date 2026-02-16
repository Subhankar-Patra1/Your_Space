import { Link, useLocation } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import PresenceIndicator from './PresenceIndicator';

export default function Navbar({
  onShare,
  activeUsers = [],
  saveStatus = 'idle',
  title,
  onTitleChange,
  isEditor = true,
  isPreview = false,
  onTogglePreview
}) {
  const location = useLocation(); // Corrected from instruction's typo
  // The original `isEditor` calculation is removed as `isEditor` is now a prop with a default.
  // If the intent was to *also* use the location-based `isEditor` alongside the prop,
  // the prop name would need to be different or the logic adjusted.
  // For now, assuming the prop `isEditor` takes precedence or replaces the internal calculation.

  return (
    <nav className="navbar">
      {/* Left section */}
      <div className="flex items-center gap-1.5 sm:gap-3">
        <Link
          to="/"
          className={`items-center gap-2.5 no-underline group ${isEditor ? 'hidden md:flex' : 'flex'}`}
        >
          <div className="w-8 h-8 rounded-lg border border-[var(--text-primary)] flex items-center justify-center overflow-hidden">
            <img src="/favicon.svg" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <span className={`${isEditor ? 'hidden lg:block' : 'hidden sm:block'} text-base font-semibold text-[var(--text-primary)] tracking-tight`}>
            Your Space
          </span>
        </Link>

        {/* Editable title (editor only) */}
        {isEditor && (
          <div className="flex items-center">
            <span className="hidden sm:inline text-[var(--border-color)] text-xl font-light mx-1">/</span>
            <input
              type="text"
              value={title || ''}
              onChange={(e) => onTitleChange?.(e.target.value)}
              placeholder="Untitled"
              className="h-8 bg-transparent border border-transparent hover:border-[var(--border-color)] focus:bg-[var(--bg-secondary)] focus:border-[var(--border-color)] rounded-lg outline-none text-sm font-semibold text-[var(--text-primary)] w-16 xs:w-16 sm:w-48 transition-all placeholder:text-[var(--text-tertiary)]"
              style={{ paddingLeft: '4px', paddingRight: '4px' }}
              onFocus={(e) => { e.target.placeholder = ''; }}
              onBlur={(e) => { e.target.placeholder = 'Untitled'; }}
            />
          </div>
        )}
      </div>

      {/* Center section — Presence (editor only) */}
      {isEditor && (
        <div className="absolute left-1/2 -translate-x-1/2 hidden lg:flex">
          <PresenceIndicator users={activeUsers} />
        </div>
      )}

      {/* Right section */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Save status (editor only) */}
        {isEditor && (
          <div className={`save-indicator ${saveStatus} hidden lg:flex`}>
            <span className="dot" />
            <span>
              {saveStatus === 'saving' && 'Saving'}
              {saveStatus === 'saved' && 'Saved'}
            </span>
          </div>
        )}

        {/* Preview Toggle */}
        {isEditor && (
          <button
            onClick={onTogglePreview}
            className="btn-ghost tooltip p-1.5 hidden sm:flex"
            data-tip={isPreview ? 'Edit mode' : 'Preview mode'}
            aria-label="Toggle preview"
          >
            {isPreview ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        )}

        {/* Share button (editor only) */}
        {isEditor && (
          <button className="btn-primary p-0 w-9 h-9 flex items-center justify-center rounded-full sm:rounded-lg sm:py-1.5 sm:px-4 sm:w-auto" onClick={onShare} style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)', border: 'none' }}>
            <span className="hidden sm:inline">Share</span>
            <span className="sm:hidden">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            </span>
          </button>
        )}

        {/* Dashboard link */}
        <Link to="/dashboard" className="no-underline">
          <button
            className="btn-ghost sm:px-3 sm:py-1.5 p-0 sm:w-auto w-9 h-9 flex items-center justify-center rounded-full"
            style={location.pathname === '/dashboard' ? {
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
            } : {}}
          >
             <span className="hidden sm:inline">My Notes</span>
             <span className="sm:hidden leading-none">
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
             </span>
          </button>
        </Link>

        <div className="w-px h-6 bg-[var(--border-color)] mx-1" />

        <ThemeToggle />
      </div>
    </nav>
  );
}
