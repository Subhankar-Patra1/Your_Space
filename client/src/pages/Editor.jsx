import { useState, useEffect, useRef, useCallback } from 'react';
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
import DiffMatchPatch from 'diff-match-patch';
import * as Y from 'yjs';

const dmp = new DiffMatchPatch();

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
  const contentRef = useRef(content); // Track latest content for diffing
  
  // Yjs References
  const ydocRef = useRef(null);

  // Keep contentRef in sync
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

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

    // Handle Yjs local updates -> Socket
    ydoc.on('update', (update, origin) => {
        if (origin !== 'remote') {
            socket.emit('sync-update', update);
        }
    });

    // Handle Yjs remote updates -> Local State
    ytext.observe((event) => {
        if (event.transaction.origin === 'remote') {
            const newText = ytext.toString();
            setContent(newText);
            setCharCount(newText.length);
            setWordCount(countWords(newText));
        }
    });

    socket.emit('join-document', {
      shortId,
      guestId: getGuestId(),
      userName: name
    });

    // Listen for Yjs sync updates
    const handleSyncUpdate = (update) => {
        try {
            Y.applyUpdate(ydoc, new Uint8Array(update), 'remote');
            setIsLoading(false);
        } catch (e) {
            console.error('Yjs sync error:', e);
        }
    };
    
    // Listen for document metadata (title, images, initial content fallback)
    const handleDocumentMetadata = ({ title: docTitle, images: docImages }) => {
      setTitle(docTitle || 'Untitled');
      setImages(docImages || []);
      // Content is handled by Yjs sync, but if we wanted to be sure...
      // actually Yjs sync handles content.
    };

    // Listen for remote title changes
    const handleTitleChange = ({ title: newTitle }) => {
      setTitle(newTitle);
    };

    // Listen for presence updates
    const handlePresenceUpdate = (users) => {
      setActiveUsers(users);
    };

    // Listen for remote cursor movements
    const handleCursorMove = ({ userId, position, selectionEnd, userInfo }) => {
      setRemoteCursors(prev => ({
        ...prev,
        [userId]: { position, selectionEnd, userInfo, lastUpdate: Date.now() }
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

    // Clean up handle
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
      ydoc.destroy();
    };
  }, [shortId]);

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

  const pendingCursorRef = useRef(null);

  // Emit cursor position on selection/click/keyup
  const emitCursorPositionFull = useCallback(() => {
    if (!textareaRef.current || !shortId) return;
    const { selectionStart, selectionEnd } = textareaRef.current;

    if (selectionStart !== selectionEnd) {
      setLocalSelection({ start: selectionStart, end: selectionEnd });
    } else {
      setLocalSelection(null);
    }

    socket.emit('cursor-move', { shortId, position: selectionStart, selectionEnd });
  }, [shortId, socket]);

  // Handle local text changes
  const handleContentChange = useCallback((e) => {
    const newContent = e.target.value;
    const currentContent = contentRef.current;
    
    if (!ydocRef.current) return;
    const ytext = ydocRef.current.getText('codemirror');
    
    // Calculate Diff
    const diffs = dmp.diff_main(currentContent, newContent);
    dmp.diff_cleanupSemantic(diffs);
    
    // Apply diffs to Y.Text
    ydocRef.current.transact(() => {
        let index = 0;
        diffs.forEach(([op, text]) => {
            if (op === 0) { // Equal
                index += text.length;
            } else if (op === -1) { // Delete
                ytext.delete(index, text.length);
            } else if (op === 1) { // Insert
                ytext.insert(index, text);
                index += text.length;
            }
        });
    });

    setContent(newContent);
    setCharCount(newContent.length);
    setWordCount(countWords(newContent));
    
    // Set saving status (Visual only, sync handles save)
    setSaveStatus('saving');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      setSaveStatus('saved');
    }, 1000);

  }, [shortId]); // Removed 'socket' and 'content' dependencies, using refs

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

  // Image Update Handler for ImageLayer
  const handleImageUpdate = useCallback((id, updates) => {
     if (!socket) return;
     if (updates === null) {
        setImages(prev => prev.filter(i => i.id !== id));
        socket.emit('image-update', { shortId, image: { id }, action: 'delete' });
     } else {
         setImages(prev => prev.map(img => img.id === id ? { ...img, ...updates } : img));
         socket.emit('image-update', { shortId, image: { id, ...updates }, action: 'update' });
     }
  }, [socket, shortId]);

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
    if (!textarea) return;

    const { selectionStart, value } = textarea;
    
    const charBefore = value.charAt(selectionStart - 1);
    const hasSlash = charBefore === '/';
    
    const textBefore = value.substring(0, selectionStart - (hasSlash ? 1 : 0));
    const textAfter = value.substring(selectionStart);
    
    const insertText = typeof cmd.value === 'function' ? cmd.value() : cmd.value;
    
    const newValue = textBefore + insertText + textAfter;
    
    // Manual Update for Slash Command (mimic handleContentChange logic)
    if (ydocRef.current) {
        const ytext = ydocRef.current.getText('codemirror');
        // Simple replace for slash command efficiency? Or use dmp?
        // Let's use dmp to be consistent and safe
        const diffs = dmp.diff_main(contentRef.current, newValue);
        dmp.diff_cleanupSemantic(diffs);
        ydocRef.current.transact(() => {
            let index = 0;
            diffs.forEach(([op, text]) => {
                if (op === 0) index += text.length;
                else if (op === -1) ytext.delete(index, text.length);
                else if (op === 1) { ytext.insert(index, text); index += text.length; }
            });
        });
    }

    setContent(newValue);
    setSlashMenu({ isOpen: false, position: null });
    
    setTimeout(() => {
      textarea.focus();
      
      let newCursorPos = textBefore.length + insertText.length;
      let selectionEnd = newCursorPos;
      
      if (cmd.id === 'bold' || cmd.id === 'italic') {
        const offset = cmd.id === 'bold' ? 2 : 1;
        newCursorPos = textBefore.length + offset;
        selectionEnd = newCursorPos + 4;
      } else if (cmd.id === 'code') {
        newCursorPos = textBefore.length + 4;
        selectionEnd = newCursorPos;
      }
      
      textarea.setSelectionRange(newCursorPos, selectionEnd);
      // Cursor move emit handled by click/keyup/select listeners or next tick
      socket.emit('cursor-move', { shortId, position: newCursorPos, selectionEnd });
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
        emitCursorPositionFull();
      }
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [emitCursorPositionFull]);

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
            cursors={remoteCursors}
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
              onKeyUp={emitCursorPositionFull}
              onClick={(e) => { emitCursorPositionFull(); setSelectedImageId(null); }}
              onSelect={(e) => { emitCursorPositionFull(); }}
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
