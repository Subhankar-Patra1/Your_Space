import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import socket from '../lib/socket';
import Navbar from '../components/Navbar';
import ShareModal from '../components/ShareModal';
import RemoteCursors from '../components/RemoteCursors';
import SlashMenu from '../components/SlashMenu';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import getCaretCoordinates from 'textarea-caret';
import axios from 'axios';
import ImageLayer from '../components/ImageLayer';
import * as Y from 'yjs';

function getGuestId() {
  let id = localStorage.getItem('yourspace-guest-id');
  if (!id) {
    id = 'guest_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    localStorage.setItem('yourspace-guest-id', id);
  }
  return id;
}

function getUserName() {
  return localStorage.getItem('yourspace-username');
}

export default function Editor() {
  const { shortId } = useParams();
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('Untitled');
  const [saveStatus, setSaveStatus] = useState('idle');
  const [activeUsers, setActiveUsers] = useState([]);
  const [showShare, setShowShare] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [charCount, setCharCount] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [remoteCursors, setRemoteCursors] = useState({});
  const [localSelection, setLocalSelection] = useState(null);
  const [isPreview, setIsPreview] = useState(false);
  const [slashMenu, setSlashMenu] = useState({ isOpen: false, position: null });
  const [images, setImages] = useState([]);
  const [selectedImageId, setSelectedImageId] = useState(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const [nameInput, setNameInput] = useState('');
  
  const textareaRef = useRef(null);
  const saveTimerRef = useRef(null);
  
  // Yjs references
  const ydocRef = useRef(null);
  const ytextRef = useRef(null);
  
  // Flag to suppress local echo when Yjs observer fires from our own edits
  const isLocalChangeRef = useRef(false);
  
  // Flag to suppress cursor emission during remote content updates
  const isRemoteUpdateRef = useRef(false);
  
  // Store the cursor's Yjs relative position so we can restore it after remote edits
  const cursorRelPosRef = useRef(null);
  const cursorRelEndRef = useRef(null);

  // Connect socket and join document
  useEffect(() => {
    if (!shortId) return;

    const name = getUserName();
    if (!name) {
      setShowNameModal(true);
      return;
    }

    if (!socket.connected) {
      socket.connect();
    }

    // Initialize Yjs Doc
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;
    const ytext = ydoc.getText('codemirror');
    ytextRef.current = ytext;

    // Send local Yjs updates to server
    const handleYjsUpdate = (update, origin) => {
      if (origin !== 'remote') {
        socket.emit('sync-update', update);
      }
    };
    ydoc.on('update', handleYjsUpdate);

    // When Yjs text changes from a remote update, sync to React state
    const handleYtextObserve = (event) => {
      if (event.transaction.origin === 'remote') {
        // Suppress cursor emission while we update content from remote
        isRemoteUpdateRef.current = true;
        
        const newText = ytext.toString();
        
        // Save cursor relative position BEFORE updating content
        const textarea = textareaRef.current;
        if (textarea && document.activeElement === textarea) {
          const curStart = textarea.selectionStart;
          const curEnd = textarea.selectionEnd;
          
          try {
            cursorRelPosRef.current = Y.createRelativePositionFromTypeIndex(ytext, Math.min(curStart, newText.length));
            cursorRelEndRef.current = Y.createRelativePositionFromTypeIndex(ytext, Math.min(curEnd, newText.length));
          } catch (e) {
            cursorRelPosRef.current = null;
            cursorRelEndRef.current = null;
          }
        }
        
        setContent(newText);
        setCharCount(newText.length);
        setWordCount(countWords(newText));
      }
    };
    ytext.observe(handleYtextObserve);

    socket.emit('join-document', {
      shortId,
      guestId: getGuestId(),
      userName: name
    });

    // Listen for Yjs sync updates from server
    const handleSyncUpdate = (update) => {
      try {
        Y.applyUpdate(ydoc, new Uint8Array(update), 'remote');
        setIsLoading(false);
      } catch (e) {
        console.error('Yjs sync error:', e);
      }
    };
    
    // Listen for document metadata
    const handleDocumentMetadata = ({ title: docTitle, images: docImages }) => {
      setTitle(docTitle || 'Untitled');
      setImages(docImages || []);
    };

    // Listen for remote title changes
    const handleTitleChange = ({ title: newTitle }) => {
      setTitle(newTitle);
    };

    // Listen for presence updates
    const handlePresenceUpdate = (users) => {
      setActiveUsers(users);
    };

    // Listen for remote cursor movements (Yjs relative positions)
    const handleCursorMove = ({ userId, relativePosition, relativeSelectionEnd, userInfo }) => {
      setRemoteCursors(prev => ({
        ...prev,
        [userId]: { 
          relativePosition, 
          relativeSelectionEnd, 
          userInfo, 
          lastUpdate: Date.now() 
        }
      }));
    };

    // Listen for user leaving
    const handleUserLeft = ({ userId }) => {
      setRemoteCursors(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    };

    socket.on('sync-update', handleSyncUpdate);
    socket.on('document-metadata', handleDocumentMetadata);
    socket.on('title-change', handleTitleChange);
    socket.on('presence-update', handlePresenceUpdate);
    socket.on('cursor-move', handleCursorMove);
    socket.on('user-left', handleUserLeft);
    
    // Handle incoming image updates
    socket.on('image-update', ({ image, action }) => {
      setImages(prev => {
        if (action === 'add') {
           return [...prev, image];
        } else if (action === 'delete') {
           return prev.filter(img => img.id !== image.id);
        } else if (action === 'update') {
           return prev.map(img => img.id === image.id ? { ...img, ...image } : img);
        }
        return prev;
      });
    });

    return () => {
      socket.off('sync-update', handleSyncUpdate);
      socket.off('document-metadata', handleDocumentMetadata);
      socket.off('title-change', handleTitleChange);
      socket.off('presence-update', handlePresenceUpdate);
      socket.off('cursor-move', handleCursorMove);
      socket.off('user-left', handleUserLeft);
      socket.off('image-update');
      ydoc.off('update', handleYjsUpdate);
      ytext.unobserve(handleYtextObserve);
      ydoc.destroy();
    };
  }, [shortId]);

  // Restore cursor position after React re-renders content from remote edits
  useEffect(() => {
    const textarea = textareaRef.current;
    const ydoc = ydocRef.current;
    if (!textarea || !ydoc || document.activeElement !== textarea) {
      // Clear the remote update flag even if we can't restore
      isRemoteUpdateRef.current = false;
      return;
    }
    
    if (cursorRelPosRef.current && cursorRelEndRef.current) {
      try {
        const absStart = Y.createAbsolutePositionFromRelativePosition(cursorRelPosRef.current, ydoc);
        const absEnd = Y.createAbsolutePositionFromRelativePosition(cursorRelEndRef.current, ydoc);
        if (absStart && absEnd) {
          const maxLen = content.length;
          textarea.setSelectionRange(
            Math.min(absStart.index, maxLen),
            Math.min(absEnd.index, maxLen)
          );
        }
      } catch (e) {
        // Ignore — cursor will just go to default position
      }
      cursorRelPosRef.current = null;
      cursorRelEndRef.current = null;
    }
    
    // Clear the suppression flag after cursor is restored
    // Use rAF to ensure selectionchange events from setSelectionRange are also suppressed
    requestAnimationFrame(() => {
      isRemoteUpdateRef.current = false;
    });
  }, [content]);

  // Clean up stale cursors (no update in 10s)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setRemoteCursors(prev => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach(id => {
          if (now - next[id].lastUpdate > 10000) {
            delete next[id];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Emit cursor position as Yjs relative position
  const emitCursorPosition = useCallback(() => {
    // Don't emit cursor during remote content updates (prevents flash)
    if (isRemoteUpdateRef.current) return;
    
    const textarea = textareaRef.current;
    const ytext = ytextRef.current;
    if (!textarea || !ytext || !shortId) return;
    
    const { selectionStart, selectionEnd } = textarea;

    if (selectionStart !== selectionEnd) {
      setLocalSelection({ start: selectionStart, end: selectionEnd });
    } else {
      setLocalSelection(null);
    }

    try {
      const textLen = ytext.toString().length;
      const clampedStart = Math.min(selectionStart, textLen);
      const clampedEnd = Math.min(selectionEnd, textLen);
      
      const relPos = Y.createRelativePositionFromTypeIndex(ytext, clampedStart);
      const relEnd = Y.createRelativePositionFromTypeIndex(ytext, clampedEnd);
      
      socket.emit('cursor-move', {
        shortId,
        relativePosition: Y.relativePositionToJSON(relPos),
        relativeSelectionEnd: Y.relativePositionToJSON(relEnd)
      });
    } catch (e) {
      // If Yjs text is not ready yet, skip
    }
  }, [shortId]);

  // Convert remote relative cursor positions to absolute indices for rendering
  const visibleCursors = useMemo(() => {
    if (!ydocRef.current) return {};
    
    const ydoc = ydocRef.current;
    const myId = socket.id;
    
    const derived = {};
    Object.entries(remoteCursors).forEach(([userId, data]) => {
      if (userId === myId) return;

      try {
        if (!data.relativePosition) return;
        
        const rPos = Y.createRelativePositionFromJSON(data.relativePosition);
        const rEnd = data.relativeSelectionEnd 
          ? Y.createRelativePositionFromJSON(data.relativeSelectionEnd) 
          : rPos;
        
        const absPos = Y.createAbsolutePositionFromRelativePosition(rPos, ydoc);
        const absEnd = Y.createAbsolutePositionFromRelativePosition(rEnd, ydoc);
        
        if (absPos && absEnd) {
          derived[userId] = {
            position: absPos.index,
            selectionEnd: absEnd.index,
            userInfo: data.userInfo,
            lastUpdate: data.lastUpdate
          };
        }
      } catch (err) {
        // Skip this cursor if resolution fails
      }
    });
    return derived;
  }, [remoteCursors, content]);

  // Handle local text changes — apply diff to Yjs
  const handleContentChange = useCallback((e) => {
    const textarea = e.target;
    const newValue = textarea.value;
    const ytext = ytextRef.current;
    const ydoc = ydocRef.current;
    if (!ytext || !ydoc) return;
    
    const oldValue = ytext.toString();
    
    // Find the changed region by comparing old and new values
    // This is more reliable than diff-match-patch for textarea edits
    let commonPrefixLen = 0;
    const minLen = Math.min(oldValue.length, newValue.length);
    while (commonPrefixLen < minLen && oldValue[commonPrefixLen] === newValue[commonPrefixLen]) {
      commonPrefixLen++;
    }
    
    let commonSuffixLen = 0;
    const maxSuffix = minLen - commonPrefixLen;
    while (
      commonSuffixLen < maxSuffix &&
      oldValue[oldValue.length - 1 - commonSuffixLen] === newValue[newValue.length - 1 - commonSuffixLen]
    ) {
      commonSuffixLen++;
    }
    
    const deleteCount = oldValue.length - commonPrefixLen - commonSuffixLen;
    const insertText = newValue.substring(commonPrefixLen, newValue.length - commonSuffixLen);
    
    if (deleteCount > 0 || insertText.length > 0) {
      isLocalChangeRef.current = true;
      ydoc.transact(() => {
        if (deleteCount > 0) {
          ytext.delete(commonPrefixLen, deleteCount);
        }
        if (insertText.length > 0) {
          ytext.insert(commonPrefixLen, insertText);
        }
      });
      isLocalChangeRef.current = false;
    }

    setContent(newValue);
    setCharCount(newValue.length);
    setWordCount(countWords(newValue));
    
    // Visual save status
    setSaveStatus('saving');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      setSaveStatus('saved');
    }, 1000);

  }, []);

  // Handle title changes
  const handleTitleChange = useCallback((newTitle) => {
    setTitle(newTitle);
    socket.emit('title-change', { shortId, title: newTitle });
  }, [shortId]);

  // Auto-focus textarea
  useEffect(() => {
    if (!isLoading && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isLoading]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Image Deletion
      if (selectedImageId && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        handleImageUpdate(selectedImageId, null);
        setSelectedImageId(null);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        setIsPreview(prev => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedImageId]);

  // Image Update Handler
  const handleImageUpdate = useCallback((id, updates) => {
     if (!socket) return;
     if (updates === null) {
        setImages(prev => prev.filter(i => i.id !== id));
        socket.emit('image-update', { shortId, image: { id }, action: 'delete' });
     } else {
         setImages(prev => prev.map(img => img.id === id ? { ...img, ...updates } : img));
         socket.emit('image-update', { shortId, image: { id, ...updates }, action: 'update' });
     }
  }, [shortId]);

  // Handle Textarea specific keys (Slash command)
  const handleTextareaKeyDown = (e) => {
    if (slashMenu.isOpen) {
      if (['ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(e.key)) {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Enter') {
          e.preventDefault();
        }
      }
      return;
    }

    if (e.key === '/') {
      const textarea = e.target;
      const { selectionStart } = textarea;
      const caret = getCaretCoordinates(textarea, selectionStart);
      
      setSlashMenu({
        isOpen: true,
        position: { 
          top: caret.top + caret.height,
          left: caret.left 
        }
      });
    }
  };

  const executeSlashCommand = (cmd) => {
    const textarea = textareaRef.current;
    const ytext = ytextRef.current;
    const ydoc = ydocRef.current;
    if (!textarea || !ytext || !ydoc) return;

    const { selectionStart, value } = textarea;
    
    const charBefore = value.charAt(selectionStart - 1);
    const hasSlash = charBefore === '/';
    
    const textBefore = value.substring(0, selectionStart - (hasSlash ? 1 : 0));
    const textAfter = value.substring(selectionStart);
    
    const insertText = typeof cmd.value === 'function' ? cmd.value() : cmd.value;
    
    const newValue = textBefore + insertText + textAfter;
    
    // Apply to Yjs
    const oldValue = ytext.toString();
    let commonPrefixLen = 0;
    const minLen = Math.min(oldValue.length, newValue.length);
    while (commonPrefixLen < minLen && oldValue[commonPrefixLen] === newValue[commonPrefixLen]) {
      commonPrefixLen++;
    }
    let commonSuffixLen = 0;
    const maxSuffix = minLen - commonPrefixLen;
    while (
      commonSuffixLen < maxSuffix &&
      oldValue[oldValue.length - 1 - commonSuffixLen] === newValue[newValue.length - 1 - commonSuffixLen]
    ) {
      commonSuffixLen++;
    }
    const deleteCount = oldValue.length - commonPrefixLen - commonSuffixLen;
    const insert = newValue.substring(commonPrefixLen, newValue.length - commonSuffixLen);
    
    ydoc.transact(() => {
      if (deleteCount > 0) ytext.delete(commonPrefixLen, deleteCount);
      if (insert.length > 0) ytext.insert(commonPrefixLen, insert);
    });

    setContent(newValue);
    setSlashMenu({ isOpen: false, position: null });
    
    setTimeout(() => {
      textarea.focus();
      
      let newCursorPos = textBefore.length + insertText.length;
      let selEnd = newCursorPos;
      
      if (cmd.id === 'bold' || cmd.id === 'italic') {
        const offset = cmd.id === 'bold' ? 2 : 1;
        newCursorPos = textBefore.length + offset;
        selEnd = newCursorPos + 4;
      } else if (cmd.id === 'code') {
        newCursorPos = textBefore.length + 4;
        selEnd = newCursorPos;
      }
      
      textarea.setSelectionRange(newCursorPos, selEnd);
      emitCursorPosition();
    }, 0);
  };

  // Image Upload Handler
  const uploadImage = async (file, x, y) => {
    const formData = new FormData();
    formData.append('image', file);

    try {
      const apiUrl = import.meta.env.VITE_SERVER_URL || import.meta.env.VITE_API_URL || '';
      const res = await axios.post(`${apiUrl}/api/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const newImage = {
        id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        url: res.data.url,
        x: x || 100,
        y: y || 100,
        width: 300,
        height: 'auto'
      };

      setImages(prev => [...prev, newImage]);
      socket.emit('image-update', { shortId, image: newImage, action: 'add' });
    } catch (err) {
      console.error('Upload failed', err);
      alert('Failed to upload image: ' + (err.response?.data?.error || err.message));
    }
  };

  const handlePaste = (e) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        uploadImage(file, 200 + Math.random() * 50, 200 + Math.random() * 50); 
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
        const rect = textareaRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left + textareaRef.current.scrollLeft;
        const y = e.clientY - rect.top + textareaRef.current.scrollTop;
        uploadImage(files[0], x, y);
    }
  };

  const handleNameSubmit = (e) => {
    e.preventDefault();
    if (nameInput.trim()) {
      localStorage.setItem('yourspace-username', nameInput.trim());
      setShowNameModal(false);
      window.location.reload(); 
    }
  };

  const handleDragOver = (e) => {
     e.preventDefault(); 
  };

  useEffect(() => {
    const handleSelectionChange = () => {
      if (document.activeElement === textareaRef.current) {
        emitCursorPosition();
      }
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [emitCursorPosition]);

  if (showNameModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-primary)] p-4">
        <div className="w-full max-w-md p-6 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] shadow-xl">
          <h2 className="text-xl font-bold mb-4 text-[var(--text-primary)]">Welcome to Your Space</h2>
          <p className="mb-6 text-[var(--text-secondary)]">Please enter your name to join this document.</p>
          <form onSubmit={handleNameSubmit}>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Your Name"
              className="w-full px-4 py-2 mb-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-[var(--accent)] text-[var(--text-primary)]"
              autoFocus
              required
            />
            <button
              type="submit"
              className="w-full py-2 px-4 bg-[var(--accent)] text-[var(--accent-content)] rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Join Document
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!socket || !socket.connected) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        gap: '1rem'
      }}>
        <div className="bg-gradient-animated" />
        <div className="spinner" />
        <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
          Loading your note...
        </p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="bg-gradient-animated" />
      
      <Navbar
        onShare={() => setShowShare(true)}
        activeUsers={activeUsers}
        saveStatus={saveStatus}
        title={title}
        onTitleChange={handleTitleChange}
        isPreview={isPreview}
        onTogglePreview={() => setIsPreview(!isPreview)}
      />

      <div style={{
        flex: 1,
        maxWidth: '780px',
        width: '100%',
        margin: '0 auto',
        padding: '0 2rem',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {!isPreview && (
          <RemoteCursors
            cursors={visibleCursors}
            textareaRef={textareaRef}
            content={content}
          />
        )}
        
        <ImageLayer 
            images={images} 
            onUpdate={handleImageUpdate} 
            isPreview={isPreview} 
            selectedImageId={selectedImageId}
            onSelect={setSelectedImageId}
        />

        {isPreview ? (
          <div className="markdown-preview prose prose-invert max-w-none" style={{ padding: '0 0 3rem 0', minHeight: '50vh' }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </div>
        ) : (
          <>
            <textarea
              ref={textareaRef}
              className="editor-textarea"
              value={content}
              onChange={handleContentChange}
              onKeyUp={emitCursorPosition}
              onClick={(e) => { emitCursorPosition(); setSelectedImageId(null); }}
              onSelect={emitCursorPosition}
              onKeyDown={handleTextareaKeyDown}
              onPaste={handlePaste}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              placeholder={"Start typing or drop an image..."}
              spellCheck="true"
              autoFocus
            />
            {slashMenu.isOpen && (
              <SlashMenu 
                position={slashMenu.position || { top: 60, left: 20 }} 
                onSelect={executeSlashCommand} 
                onClose={() => setSlashMenu({ isOpen: false, position: null })} 
              />
            )}
          </>
        )}
      </div>

      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '8px 24px',
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '16px',
        fontSize: '0.75rem',
        color: 'var(--text-tertiary)',
        fontFamily: 'var(--font-mono)',
        pointerEvents: 'none'
      }}>
        <span>{charCount.toLocaleString()} chars</span>
        <span>{wordCount.toLocaleString()} words</span>
      </div>

      <ShareModal
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        shortId={shortId}
      />
    </div>
  );
}

function countWords(text) {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}
