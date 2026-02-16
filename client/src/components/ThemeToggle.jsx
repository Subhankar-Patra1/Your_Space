import { useTheme } from '../context/ThemeContext';
import { flushSync } from 'react-dom';

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  const handleToggle = async (e) => {
    // Check if View Transitions are supported
    if (!document.startViewTransition) {
      toggleTheme();
      return;
    }

    // Get click position or fallback to center of button
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX || rect.left + rect.width / 2;
    const y = e.clientY || rect.top + rect.height / 2;

    // Calculate distance to furthest corner
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    // Start transition
    const transition = document.startViewTransition(() => {
      flushSync(() => {
        toggleTheme();
      });
    });

    // Wait for pseudo-elements to be created
    await transition.ready;

    // Animate the circle
    const clipPath = [
      `circle(0px at ${x}px ${y}px)`,
      `circle(${endRadius}px at ${x}px ${y}px)`,
    ];

    document.documentElement.animate(
      {
        clipPath: isDark ? [...clipPath].reverse() : clipPath,
      },
      {
        duration: 500,
        easing: 'ease-in',
        pseudoElement: isDark
          ? '::view-transition-old(root)'
          : '::view-transition-new(root)',
      }
    );
  };

  return (
    <button
      onClick={handleToggle}
      className="btn-icon theme-toggle tooltip"
      data-tip={isDark ? 'Light mode' : 'Dark mode'}
      aria-label="Toggle theme"
      style={{
        color: isDark ? 'var(--text-primary)' : 'var(--text-secondary)'
      }}
    >
      <div style={{ position: 'relative', width: 20, height: 20 }}>
        {/* Sun icon */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            width: 20,
            height: 20,
            position: 'absolute',
            top: 0,
            left: 0,
            transition: 'all 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55)',
            transform: isDark ? 'rotate(0deg) scale(1)' : 'rotate(180deg) scale(0)',
            opacity: isDark ? 1 : 0
          }}
        >
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>

        {/* Moon icon */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            width: 20,
            height: 20,
            position: 'absolute',
            top: 0,
            left: 0,
            transition: 'all 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55)',
            transform: !isDark ? 'rotate(0deg) scale(1)' : 'rotate(-180deg) scale(0)',
            opacity: !isDark ? 1 : 0
          }}
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </div>
    </button>
  );
}
