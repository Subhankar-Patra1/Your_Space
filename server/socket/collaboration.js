const prisma = require('../config/db');
const Y = require('yjs');

// Track active users per document room
const activeUsers = new Map();

// In-memory Yjs documents for active rooms
// Map<shortId, Y.Doc>
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
        // 1. Get or create Y.Doc for this room
        let doc = activeDocs.get(shortId);
        
        if (!doc) {
          doc = new Y.Doc();
          activeDocs.set(shortId, doc);
          
          // Load content from DB into Y.Doc
          const dbDoc = await prisma.document.findUnique({ where: { shortId } });
          if (dbDoc && dbDoc.content) {
             const ytext = doc.getText('codemirror');
             if (ytext.toString() !== dbDoc.content) {
                // Initialize Y.Doc with DB content if simpler
                // Or just trust that if it's new memory doc, it receives DB content.
                doc.transact(() => {
                    ytext.delete(0, ytext.length);
                    ytext.insert(0, dbDoc.content);
                });
             }
             
             // Also emit other metadata like title/images
             socket.emit('document-metadata', {
                title: dbDoc.title,
                images: dbDoc.images || []
             });
          }
        } else {
             // For existing active doc, we might want to send metadata too if we haven't
             const dbDoc = await prisma.document.findUnique({ where: { shortId } });
             if (dbDoc) {
                 socket.emit('document-metadata', {
                    title: dbDoc.title,
                    images: dbDoc.images || []
                 });
             }
        }

        // 2. Send current document state to the new client
        // Encode state as update
        const stateVector = Y.encodeStateVector(doc);
        const diff = Y.encodeStateAsUpdate(doc, stateVector);
        socket.emit('sync-update', Buffer.from(diff));

        if (process.env.NODE_ENV !== 'production') {
          console.log(`📄 User ${socket.id} joined document: ${shortId}`);
        }
      } catch (error) {
        console.error('Error joining document:', error);
        socket.emit('error', { message: 'Failed to join document' });
      }
    });

    // Handle Yjs Updates
    socket.on('sync-update', (update) => {
      const room = currentRoom;
      if (!room) return;

      const doc = activeDocs.get(room);
      if (doc) {
        // Apply update to server in-memory doc
        try {
            Y.applyUpdate(doc, new Uint8Array(update));
        } catch(e) {
            console.error("Error applying update", e);
        }

        // Broadcast update to ALL other clients in the room
        socket.to(room).emit('sync-update', update);

        // Schedule save to DB
        debouncedSave(room, doc);
      }
    });
    
    // Also support getting full update if finding missing sync
    socket.on('sync-step-1', (stateVector) => {
        const room = currentRoom;
        if(!room) return;
        const doc = activeDocs.get(room);
        if(doc) {
            const diff = Y.encodeStateAsUpdate(doc, new Uint8Array(stateVector));
            socket.emit('sync-update', Buffer.from(diff));
        }
    });

    // Handle previous simple text-change? No, completely replace.
    
    // Handle Image Updates (Keep existing logic, independent of Yjs for now or integrate?)
    // Integrating images into Yjs Map is better, but let's stick to the working ad-hoc solution for images 
    // to minimize risk, unless requested. User asked for "OT/CRDT" which usually implies text.
    // We will keep the image handlers as is.
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

    // Handle cursor movements
    socket.on('cursor-move', ({ shortId, position, selectionEnd }) => {
      socket.to(shortId).emit('cursor-move', {
        userId: socket.id,
        position,
        selectionEnd,
        userInfo
      });
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
        
        // If room is empty, we could cleanup activeDocs.get(currentRoom), 
        // but maybe keep it for a while for quick re-joins?
        // For now, let's clean it up to save memory if empty.
        if (users.length === 0) {
             const doc = activeDocs.get(currentRoom);
             if (doc) {
                 // Final save
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
