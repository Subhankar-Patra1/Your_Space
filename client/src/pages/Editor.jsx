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
  let name = localStorage.getItem('yourspace-username');
  if (!name) {
    name = `Guest ${Math.floor(Math.random() * 10000)}`;
    localStorage.setItem('yourspace-username', name);
  }
  return name;
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
  
  const textareaRef = useRef(null);
  const isRemoteUpdate = useRef(false);
  const saveTimerRef = useRef(null);
  const cursorTimerRef = useRef(null);

  // Connect socket and join document
  useEffect(() => {
    if (!shortId) return;

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit('join-document', {
      shortId,
      guestId: getGuestId(),
      userName: getUserName()
    });

    // Listen for document content
    const handleDocumentLoaded = ({ content: docContent, title: docTitle, images: docImages }) => {
      setContent(docContent || '');
      setTitle(docTitle || 'Untitled');
      setImages(docImages || []);
      setCharCount(docContent?.length || 0);
      setWordCount(countWords(docContent || ''));
      setIsLoading(false);
    };

    // Listen for remote text changes — also update cursor position atomically
    const handleTextChange = ({ content: newContent, patches, cursorPosition, selectionEnd, userId, userInfo }) => {
      isRemoteUpdate.current = true;
      
      let finalContent = newContent;

      if (patches && patches.length > 0) {
        // Apply patches to current local content
        // Note: dmp.patch_apply returns [newText, results]
        const [patchedText] = dmp.patch_apply(patches, content);
        finalContent = patchedText;
      }
      
      setContent(finalContent);
      setCharCount(finalContent.length);
      setWordCount(countWords(finalContent));

      // Update remote cursor from the same event to keep position & content in sync
      if (userId && cursorPosition != null) {
        setRemoteCursors(prev => ({
          ...prev,
          [userId]: {
            position: cursorPosition,
            selectionEnd: selectionEnd, // Update selectionEnd
            userInfo: userInfo || prev[userId]?.userInfo,
            lastUpdate: Date.now()
          }
        }));
      }
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

    // Listen for user leaving — remove their cursor
    const handleUserLeft = ({ userId }) => {
      setRemoteCursors(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    };

    socket.on('document-loaded', handleDocumentLoaded);
    socket.on('text-change', handleTextChange);
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
      socket.off('document-loaded', handleDocumentLoaded);
      socket.off('text-change', handleTextChange);
      socket.off('title-change', handleTitleChange);
      socket.off('presence-update', handlePresenceUpdate);
      socket.off('cursor-move', handleCursorMove);
      socket.off('user-left', handleUserLeft);
      socket.off('image-update');
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

    // Update local selection immediately
    if (selectionStart !== selectionEnd) {
      setLocalSelection({ start: selectionStart, end: selectionEnd });
    } else {
      setLocalSelection(null);
    }

    // Set pending cursor state
    pendingCursorRef.current = { position: selectionStart, selectionEnd };
    // Removed localSelection logic from original

    // Removed pendingCursorRef and debouncing logic from original
    socket.emit('cursor-move', { shortId, position: selectionStart, selectionEnd });
  }, [shortId, socket]); // Added socket to dependencies

  // Handle local text changes with debounced emit
  const handleContentChange = useCallback((e) => {
    const newContent = e.target.value;
    
    // Calculate patches (diff) from previous content to new content
    const patches = dmp.patch_make(content, newContent);

    setContent(newContent);
    setCharCount(newContent.length);
    setWordCount(countWords(newContent));
    
    // Set saving status
    setSaveStatus('saving');
    
    // Clear previous timer
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    
    // Set timer to switch to 'saved'
    saveTimerRef.current = setTimeout(() => {
      setSaveStatus('saved');
    }, 1000);

    // Emit change to server (send both full content and patches)
    socket.emit('text-change', {
      shortId,
      content: newContent,
      patches: patches,
      cursorPosition: e.target.selectionStart,
      selectionEnd: e.target.selectionEnd
    });
  }, [shortId, socket, content]); // Needs 'content' to calc diff

  // Handle title changes
  const handleTitleChange = useCallback((newTitle) => {
    setTitle(newTitle);
    socket.emit('title-change', { shortId, title: newTitle });
  }, [shortId, socket]); // Added socket to dependencies

  // Auto-focus textarea
  useEffect(() => {
    // Original had isLoading, now using status
    if (status === 'connected' && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [status]);

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

      // Ctrl/Cmd + S to manual save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
      }
      
      // Toggle Preview with Ctrl/Cmd + P
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        setIsPreview(prev => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedImageId]); // Depends on selectedImageId

  // ... (handleTextareaKeyDown is separate)

  // Image Update Handler for ImageLayer
  const handleImageUpdate = useCallback((id, updates) => {
     if (!socket) return;
     if (updates === null) {
        // Delete
        setImages(prev => prev.filter(i => i.id !== id));
        socket.emit('image-update', { shortId, image: { id }, action: 'delete' });
     } else {
        // Update
         setImages(prev => prev.map(img => img.id === id ? { ...img, ...updates } : img));
         // Debounce this emit in real app, but for now:
         socket.emit('image-update', { shortId, image: { id, ...updates }, action: 'update' });
     }
  }, [socket, shortId]);
  // Handle Textarea specific keys (Slash command)
  const handleTextareaKeyDown = (e) => {
    if (slashMenu.isOpen) {
      // Let SlashMenu handle navigation keys via its own listener
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
      
      // Calculate coordinates using textarea-caret
      const caret = getCaretCoordinates(textarea, selectionStart);
      
      setSlashMenu({
        isOpen: true,
        position: { 
          top: caret.top + caret.height, // Position below the cursor line
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
    
    // Insert text
    const newValue = textBefore + insertText + textAfter;
    
    // Update content
    setContent(newValue);
    setSlashMenu({ isOpen: false, position: null });
    
    // Update cursor, focus, emit change...
    setTimeout(() => {
      textarea.focus();
      
      // Calculate new cursor position
      let newCursorPos = textBefore.length + insertText.length;
      let selectionEnd = newCursorPos;
      
      if (cmd.id === 'bold' || cmd.id === 'italic') {
        const offset = cmd.id === 'bold' ? 2 : 1;
        const textLen = 4; // "text"
        newCursorPos = textBefore.length + offset;
        selectionEnd = newCursorPos + textLen;
      } else if (cmd.id === 'code') {
        newCursorPos = textBefore.length + 4; // ```\n
        selectionEnd = newCursorPos;
      }
      
      textarea.setSelectionRange(newCursorPos, selectionEnd);
      
      // Emit change
       socket.emit('text-change', {
        shortId,
        content: newValue,
        cursorPosition: newCursorPos,
        selectionEnd: selectionEnd
      });
    }, 0);
  };


  // Image Upload Handler
  const uploadImage = async (file, x, y) => {
    // console.log('Uploading image...', file.name);
    const formData = new FormData();
    formData.append('image', file);

    try {
      // Use relative path to leverage Vite proxy
      const apiUrl = import.meta.env.VITE_SERVER_URL || import.meta.env.VITE_API_URL || '';
      const res = await axios.post(`${apiUrl}/api/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      // console.log('Upload success:', res.data);

      const newImage = {
        id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        url: res.data.url,
        x: x || 100,
        y: y || 100,
        width: 300,
        height: 'auto'
      };

      // Optimistic update
      setImages(prev => [...prev, newImage]);
      
      // Emit to server
      socket.emit('image-update', { shortId, image: newImage, action: 'add' });
    } catch (err) {
      console.error('Upload failed', err);
      alert('Failed to upload image: ' + (err.response?.data?.error || err.message));
    }
  };

  // Handle Paste (Images)
  const handlePaste = (e) => {
    const items = e.clipboardData.items;
    let foundImage = false;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        foundImage = true;
        const file = items[i].getAsFile();
        // Upload to a default position (center-ish)
        // We can randomize slightly so they don't stack perfectly
        uploadImage(file, 200 + Math.random() * 50, 200 + Math.random() * 50); 
      }
    }
    if (!foundImage) {
        // console.log('No image found in paste');
    }
  };

  // Handle Drop (Images)
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

  const handleDragOver = (e) => {
     e.preventDefault(); 
  };

  // Use document-level selectionchange for robust tracking
  // This catches all selection updates (click inside, drag, arrow keys, etc.)
  useEffect(() => {
    const handleSelectionChange = () => {
      if (document.activeElement === textareaRef.current) {
        emitCursorPositionFull();
      }
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [emitCursorPositionFull]);



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

      {/* Editor Container */}
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
        {/* Remote Cursors Overlay - Only show in Edit mode */}
        {!isPreview && (
          <RemoteCursors
            cursors={remoteCursors}
            textareaRef={textareaRef}
            content={content}
          />
        )}
        
        {/* Image Layer - Overlay */}
        <ImageLayer 
            images={images} 
            onUpdate={handleImageUpdate} 
            isPreview={isPreview} 
            selectedImageId={selectedImageId}
            onSelect={setSelectedImageId}
        />

        {/* Markdown Preview */}
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
              onPaste={handlePaste} // Added
              onDrop={handleDrop} // Added
              onDragOver={handleDragOver} // Added
              placeholder={"Start typing or drop an image..."} // Updated placeholder
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

      {/* Bottom status bar */}
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

      {/* Share Modal */}
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
