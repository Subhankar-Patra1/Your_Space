import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Compute pixel coordinates for a caret position in a textarea.
 * Based on the "textarea-caret-position" algorithm — creates a mirror div
 * that exactly replicates the textarea, sets text up to the cursor,
 * then reads offsetTop/offsetLeft of a marker span.
 */
function getCaretCoordinates(textarea, position) {
  const cs = window.getComputedStyle(textarea);

  const div = document.createElement('div');
  div.id = 'remote-cursor-mirror';

  // Copy every relevant style property
  const properties = [
    'direction', 'boxSizing',
    'width', // explicitly set to match
    'overflowX', 'overflowY',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
    'borderStyle',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch',
    'fontSize', 'fontSizeAdjust', 'lineHeight', 'fontFamily',
    'textAlign', 'textTransform', 'textIndent', 'textDecoration',
    'letterSpacing', 'wordSpacing',
    'tabSize', 'MozTabSize'
  ];

  div.style.whiteSpace = 'pre-wrap';
  div.style.wordWrap = 'break-word';
  div.style.position = 'absolute';
  div.style.visibility = 'hidden';
  div.style.overflow = 'hidden';

  properties.forEach(prop => {
    div.style[prop] = cs[prop];
  });

  // Use offsetWidth to match the actual rendered width (includes border + padding)
  div.style.width = textarea.offsetWidth + 'px';

  div.textContent = textarea.value.substring(0, position);

  const span = document.createElement('span');
  // Use the rest of the text or a dot if at the end — this ensures the span
  // has height and sits on the correct baseline
  span.textContent = textarea.value.substring(position) || '.';
  div.appendChild(span);

  document.body.appendChild(div);

  // Calculate line height and font size for height adjustment
  const lineHeight = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
  const fontSize = parseFloat(cs.fontSize);
  
  // Use a reduced height (1.2x font size instead of full line height)
  // This makes the selection look cleaner and less blocky
  const targetHeight = fontSize * 1.2;
  // Shift up slightly (subtract 3px) to better center text vertically
  const topOffset = (lineHeight - targetHeight) / 2 - 3;

  const coords = {
    top: span.offsetTop + parseInt(cs.borderTopWidth, 10) + topOffset,
    left: span.offsetLeft + parseInt(cs.borderLeftWidth, 10),
    height: targetHeight
  };

  document.body.removeChild(div);
  return coords;
}

/**
 * RemoteCursors — Renders floating cursor labels for other users
 * at their exact cursor position within the textarea.
 */
export default function RemoteCursors({ cursors, textareaRef, content }) {
  const [positions, setPositions] = useState({});

  const computePositions = useCallback(() => {
    const textarea = textareaRef?.current;
    if (!textarea) return;

    const scrollTop = textarea.scrollTop;
    const textareaOffsetLeft = textarea.offsetLeft;
    const textareaOffsetTop = textarea.offsetTop;
    
    // --- 1. Compute Remote Cursors ---
    const entries = Object.entries(cursors);
    const newPositions = {};

    entries.forEach(([userId, cursorData]) => {
      const { position, selectionEnd, userInfo } = cursorData;
      if (position == null || position < 0) return;

      const posNum = Number(position);
      const endNum = selectionEnd != null ? Number(selectionEnd) : posNum;
      const textLength = (content || '').length;
      const start = Math.min(posNum, textLength);
      const end = Math.min(endNum, textLength);

      const caretCoords = getCaretCoordinates(textarea, start);
      let selectionRects = [];

      if (start !== end) {
        selectionRects = getSelectionRects(textarea, start, end, scrollTop, textareaOffsetTop, textareaOffsetLeft);
      }

      newPositions[userId] = {
        top: caretCoords.top - scrollTop + textareaOffsetTop,
        left: caretCoords.left + textareaOffsetLeft,
        height: caretCoords.height,
        name: userInfo?.name || 'Anonymous',
        color: userInfo?.color || '#6366f1',
        selectionRects
      };
    });

    setPositions(newPositions);

  }, [cursors, content, textareaRef]);

  // Helper to calculate selection rects
  const getSelectionRects = (textarea, start, end, scrollTop, offsetTop, offsetLeft) => {
    const rects = [];
    const min = Math.min(start, end);
    const max = Math.max(start, end);
    
    const startCoords = getCaretCoordinates(textarea, min);
    const endCoords = getCaretCoordinates(textarea, max);
    
    const sameLine = Math.abs(startCoords.top - endCoords.top) < 10; // Tolerance

    if (sameLine) {
       rects.push({
         top: startCoords.top - scrollTop + offsetTop,
         left: startCoords.left + offsetLeft,
         width: endCoords.left - startCoords.left,
         height: startCoords.height
       });
    } else {
       // Multi-line selection: 2 or 3 rects
       const styles = window.getComputedStyle(textarea);
       const paddingLeft = parseFloat(styles.paddingLeft) || 0;
       const paddingRight = parseFloat(styles.paddingRight) || 0;
       const contentWidth = textarea.clientWidth - paddingLeft - paddingRight;

       // 1. Top line (from start to end of line)
       rects.push({
         top: startCoords.top - scrollTop + offsetTop,
         left: startCoords.left + offsetLeft,
         width: (textarea.clientWidth - paddingRight) - startCoords.left, // Approx to right edge
         height: startCoords.height
       });

       // 2. Middle lines (full width)
       const middleHeight = endCoords.top - (startCoords.top + startCoords.height);
       if (middleHeight > 5) { // If there is vertical space between lines
          rects.push({
            top: (startCoords.top + startCoords.height) - scrollTop + offsetTop,
            left: offsetLeft + paddingLeft,
            width: contentWidth,
            height: middleHeight
          });
       }

       // 3. Bottom line (from left to end cursor)
       rects.push({
         top: endCoords.top - scrollTop + offsetTop,
         left: offsetLeft + paddingLeft,
         width: endCoords.left - paddingLeft,
         height: endCoords.height
       });
    }
    return rects;
  };

  // Recompute whenever cursors, content, scroll, or local selection changes
  useEffect(() => {
    computePositions();

    const textarea = textareaRef?.current;
    if (!textarea) return;

    textarea.addEventListener('scroll', computePositions);
    window.addEventListener('resize', computePositions);

    return () => {
      textarea.removeEventListener('scroll', computePositions);
      window.removeEventListener('resize', computePositions);
    };
  }, [computePositions, textareaRef]);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 10
      }}
    >
      {/* Remote Cursors & Selections */}
      {Object.entries(positions).map(([userId, pos]) => (
        <div key={userId}>
          {/* Selection Highlights */}
          {pos.selectionRects && pos.selectionRects.map((rect, i) => (
            <div
              key={`sel-${i}`}
              style={{
                position: 'absolute',
                top: `${rect.top}px`,
                left: `${rect.left}px`,
                width: `${rect.width}px`,
                height: `${rect.height}px`,
                backgroundColor: pos.color,
                opacity: 0.4,
                border: `1px solid ${pos.color}`,
                pointerEvents: 'none',
                zIndex: 15
              }}
            />
          ))}

          {/* Cursor & Label */}
          <div
            style={{
              position: 'absolute',
              top: `${pos.top}px`,
              left: `${pos.left}px`,
              zIndex: 20
            }}
          >
            {/* Cursor line */}
            <div style={{
              width: '2px',
              height: '18px',
              background: pos.color,
              borderRadius: '1px',
              boxShadow: `0 0 4px ${pos.color}50`
            }} />

            {/* Name label */}
            <div style={{
              position: 'absolute',
              bottom: '100%',
              left: '0px',
              marginBottom: '2px',
              background: pos.color,
              color: 'white',
              fontSize: '0.6875rem',
              fontWeight: 600,
              fontFamily: 'var(--font-sans)',
              padding: '2px 8px',
              borderRadius: '6px 6px 6px 0',
              whiteSpace: 'nowrap',
              boxShadow: `0 2px 8px ${pos.color}40`,
              lineHeight: '16px',
              letterSpacing: '0.01em'
            }}>
              {pos.name}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
