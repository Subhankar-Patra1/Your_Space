import { useEffect, useRef, useState } from 'react';

const COMMANDS = [
  { id: 'h1', label: 'Heading 1', icon: 'H1', value: '# ' },
  { id: 'h2', label: 'Heading 2', icon: 'H2', value: '## ' },
  { id: 'h3', label: 'Heading 3', icon: 'H3', value: '### ' },
  { id: 'bold', label: 'Bold', icon: 'B', value: '**text**', select: true },
  { id: 'italic', label: 'Italic', icon: 'I', value: '*text*', select: true },
  { id: 'list', label: 'Bullet List', icon: '•', value: '- ' },
  { id: 'chk', label: 'Checklist', icon: '☑', value: '- [ ] ' },
  { id: 'code', label: 'Code Block', icon: '</>', value: '```\n\n```', select: true },
  { id: 'date', label: 'Date', icon: '📅', value: () => new Date().toLocaleDateString() }
];

export default function SlashMenu({ position, onSelect, onClose }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % COMMANDS.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + COMMANDS.length) % COMMANDS.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onSelect(COMMANDS[selectedIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, onSelect, onClose]);

  // Close if clicked outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (!position) return null;

  return (
    <div
      ref={menuRef}
      style={{
        position: 'absolute',
        top: position.top + 24, // Offset below cursor
        left: position.left,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        boxShadow: 'var(--shadow-lg)',
        padding: '4px',
        zIndex: 1000,
        minWidth: '200px',
        maxHeight: '300px',
        overflowY: 'auto'
      }}
    >
      {COMMANDS.map((cmd, index) => (
        <button
          key={cmd.id}
          onClick={() => onSelect(cmd)}
          onMouseEnter={() => setSelectedIndex(index)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            width: '100%',
            padding: '8px 12px',
            background: index === selectedIndex ? 'var(--bg-tertiary)' : 'transparent',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            textAlign: 'left',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-sans)',
            fontSize: '0.875rem'
          }}
        >
          <span style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '24px',
            height: '24px',
            background: 'var(--bg-primary)',
            borderRadius: '4px',
            border: '1px solid var(--border-color)',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--text-secondary)'
          }}>
            {cmd.icon}
          </span>
          <span>{cmd.label}</span>
        </button>
      ))}
    </div>
  );
}
