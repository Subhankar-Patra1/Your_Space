export default function PresenceIndicator({ users = [] }) {
  if (users.length <= 1) return null;

  const otherUsers = users.length - 1;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '4px'
    }}>
      {/* Stacked dots */}
      <div style={{
        display: 'flex',
        flexDirection: 'row-reverse',
        marginRight: `${Math.min(users.length - 1, 3) * 2}px`
      }}>
        {users.slice(0, 4).map((user, i) => (
          <div
            key={user.id}
            className="presence-dot pulse"
            style={{
              backgroundColor: user.color,
              marginRight: i > 0 ? '-4px' : '0',
              zIndex: users.length - i,
              boxShadow: `0 0 0 2px var(--bg-secondary), 0 0 8px ${user.color}40`
            }}
            title={user.name}
          />
        ))}
      </div>
      
      {/* Count label */}
      <span style={{
        fontSize: '0.75rem',
        fontWeight: 600,
        color: 'var(--text-secondary)',
        marginLeft: '4px'
      }}>
        {otherUsers} other{otherUsers !== 1 ? 's' : ''} editing
      </span>
    </div>
  );
}
