const prisma = require('../config/db');
const Y = require('yjs');

// Track active users per document room
const activeUsers = new Map();

// In-memory Yjs documents for active rooms
const activeDocs = new Map();

// Debounce timers for auto-save per document
const saveTimers = new Map();

const SAVE_DEBOUNCE_MS = 2000;

function setupCollaboration(io) {
  io.on('connection', (socket) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🔌 User connected: ${socket.id}`);
    }

    let currentRoom = null;
    let userInfo = null;

    // Join a document room
    socket.on('join-document', async ({ shortId, guestId, userName }) => {
      try {
        // Leave previous room if any
        if (currentRoom) {
          socket.leave(currentRoom);
          removeUserFromRoom(currentRoom, socket.id);
          io.to(currentRoom).emit('presence-update', getActiveUsers(currentRoom));
        }

        currentRoom = shortId;
        userInfo = {
          id: socket.id,
          guestId: guestId || 'anonymous',
          name: userName || 'Anonymous',
          color: generateColor(socket.id),
          joinedAt: new Date()
        };

        socket.join(shortId);
        addUserToRoom(shortId, socket.id, userInfo);

        // Broadcast presence update
        io.to(shortId).emit('presence-update', getActiveUsers(shortId));

        // --- Yjs Sync Logic ---
        let doc = activeDocs.get(shortId);
        
        if (!doc) {
          doc = new Y.Doc();
          activeDocs.set(shortId, doc);
          
          // Load content from DB into Y.Doc
          const dbDoc = await prisma.document.findUnique({ where: { shortId } });
          if (dbDoc && dbDoc.content) {
            const ytext = doc.getText('codemirror');
            doc.transact(() => {
              ytext.delete(0, ytext.length);
              ytext.insert(0, dbDoc.content);
            });
            
            socket.emit('document-metadata', {
              title: dbDoc.title,
              images: dbDoc.images || []
            });
          }
        } else {
          // Existing active doc — send metadata from DB
          const dbDoc = await prisma.document.findUnique({ where: { shortId } });
          if (dbDoc) {
            socket.emit('document-metadata', {
              title: dbDoc.title,
              images: dbDoc.images || []
            });
          }
        }

        // Send full document state to the new client
        const fullState = Y.encodeStateAsUpdate(doc);
        socket.emit('sync-update', Buffer.from(fullState));

        if (process.env.NODE_ENV !== 'production') {
          console.log(`📄 User ${socket.id} joined document: ${shortId}`);
        }
      } catch (error) {
        console.error('Error joining document:', error);
        socket.emit('error', { message: 'Failed to join document' });
      }
    });

    // Handle Yjs Updates from clients
    socket.on('sync-update', (update) => {
      const room = currentRoom;
      if (!room) return;

      const doc = activeDocs.get(room);
      if (doc) {
        try {
          Y.applyUpdate(doc, new Uint8Array(update));
        } catch (e) {
          console.error('Error applying Yjs update:', e);
          return;
        }

        // Broadcast to ALL other clients in the room
        socket.to(room).emit('sync-update', update);

        // Schedule auto-save to DB
        debouncedSave(room, doc);
      }
    });
    
    // Support full state request for resync
    socket.on('sync-step-1', (stateVector) => {
      const room = currentRoom;
      if (!room) return;
      const doc = activeDocs.get(room);
      if (doc) {
        const diff = Y.encodeStateAsUpdate(doc, new Uint8Array(stateVector));
        socket.emit('sync-update', Buffer.from(diff));
      }
    });

    // Handle cursor movements — relay Yjs relative positions as-is
    socket.on('cursor-move', ({ shortId, relativePosition, relativeSelectionEnd }) => {
      if (!shortId || !userInfo) return;
      socket.to(shortId).emit('cursor-move', {
        userId: socket.id,
        relativePosition,
        relativeSelectionEnd,
        userInfo
      });
    });

    // Handle Image Updates
    socket.on('image-update', async ({ shortId, image, action }) => {
      socket.to(shortId).emit('image-update', { image, action });
      
      try {
        const dbDoc = await prisma.document.findUnique({ where: { shortId } });
        if (!dbDoc) return;
        
        let images = dbDoc.images || [];
        if (!Array.isArray(images)) images = [];
        
        if (action === 'delete') {
          images = images.filter(img => img.id !== image.id);
        } else if (action === 'add') {
          images.push(image);
        } else if (action === 'update') {
          const index = images.findIndex(img => img.id === image.id);
          if (index !== -1) {
            images[index] = { ...images[index], ...image };
          }
        }
        
        await prisma.document.update({
          where: { shortId },
          data: { images }
        });
      } catch (err) {
        console.error('Error saving image update:', err);
      }
    });

    // Handle title changes
    socket.on('title-change', ({ shortId, title }) => {
      socket.to(shortId).emit('title-change', { title, userId: socket.id });
      prisma.document.update({
        where: { shortId },
        data: { title }
      }).catch(err => console.error('Error saving title:', err));
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`🔌 User disconnected: ${socket.id}`);
      }
      if (currentRoom) {
        removeUserFromRoom(currentRoom, socket.id);
        const users = getActiveUsers(currentRoom);
        io.to(currentRoom).emit('presence-update', users);
        io.to(currentRoom).emit('user-left', { userId: socket.id });
        
        // Clean up if room is empty
        if (users.length === 0) {
          const doc = activeDocs.get(currentRoom);
          if (doc) {
            saveToDB(currentRoom, doc).then(() => {
              if (getActiveUsers(currentRoom).length === 0) {
                doc.destroy();
                activeDocs.delete(currentRoom);
              }
            });
          }
        }
      }
    });
  });
}

// --- Helper functions ---

function addUserToRoom(room, socketId, info) {
  if (!activeUsers.has(room)) {
    activeUsers.set(room, new Map());
  }
  activeUsers.get(room).set(socketId, info);
}

function removeUserFromRoom(room, socketId) {
  if (activeUsers.has(room)) {
    activeUsers.get(room).delete(socketId);
    if (activeUsers.get(room).size === 0) {
      activeUsers.delete(room);
    }
  }
}

function getActiveUsers(room) {
  if (!activeUsers.has(room)) return [];
  return Array.from(activeUsers.get(room).values());
}

async function saveToDB(shortId, doc) {
  const content = doc.getText('codemirror').toString();
  try {
    const existing = await prisma.document.findUnique({ where: { shortId } });
    if (!existing) return;
    await prisma.document.update({
      where: { shortId },
      data: { content, updatedAt: new Date() }
    });
  } catch (error) {
    console.error(`Error saving document ${shortId}:`, error);
  }
}

function debouncedSave(shortId, doc) {
  if (saveTimers.has(shortId)) {
    clearTimeout(saveTimers.get(shortId));
  }

  const timer = setTimeout(async () => {
    await saveToDB(shortId, doc);
    saveTimers.delete(shortId);
  }, SAVE_DEBOUNCE_MS);

  saveTimers.set(shortId, timer);
}

function generateColor(id) {
  const colors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
    '#f97316', '#eab308', '#22c55e', '#14b8a6',
    '#06b6d4', '#3b82f6'
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

module.exports = setupCollaboration;
