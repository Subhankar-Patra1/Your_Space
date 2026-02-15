const prisma = require('../config/db');

// Track active users per document room
const activeUsers = new Map();

// Debounce timers for auto-save per document
const saveTimers = new Map();

const SAVE_DEBOUNCE_MS = 1500;

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

        // Fetch document content
        const doc = await prisma.document.findUnique({ where: { shortId } });
        if (doc) {
          socket.emit('document-loaded', {
            content: doc.content,
            title: doc.title,
            images: doc.images || []
          });
        }

        // Broadcast presence update to all users in the room
        io.to(shortId).emit('presence-update', getActiveUsers(shortId));
        
        if (process.env.NODE_ENV !== 'production') {
          console.log(`📄 User ${socket.id} joined document: ${shortId}`);
        }
      } catch (error) {
        console.error('Error joining document:', error);
        socket.emit('error', { message: 'Failed to join document' });
      }
    });

    // Handle text changes
    socket.on('text-change', ({ shortId, content, patches, cursorPosition, selectionEnd }) => {
      // Broadcast to other users in the room — include userInfo so cursor can be updated atomically
      socket.to(shortId).emit('text-change', {
        content,
        patches,
        cursorPosition,
        selectionEnd,
        userId: socket.id,
        userInfo
      });

      // Debounced auto-save to database
      debouncedSave(shortId, content);
    });

    // Handle Image Updates (Add, Move, Resize, Delete)
    socket.on('image-update', async ({ shortId, image, action }) => {
      // Broadcast to others
      socket.to(shortId).emit('image-update', { image, action });
      
      // Persist to DB immediately (or debounce if frequent moves)
      try {
        const doc = await prisma.document.findUnique({ where: { shortId } });
        if (!doc) return;
        
        let images = doc.images || [];
        // Ensure images is an array (Prisma Json might return it as is)
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
      
      // Save title immediately
      prisma.document.update({
        where: { shortId },
        data: { title }
      }).catch(err =>
        console.error('Error saving title:', err)
      );
    });

    // Handle cursor movements (for future enhancement)
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
        io.to(currentRoom).emit('presence-update', getActiveUsers(currentRoom));
        io.to(currentRoom).emit('user-left', { userId: socket.id });
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

function debouncedSave(shortId, content) {
  if (saveTimers.has(shortId)) {
    clearTimeout(saveTimers.get(shortId));
  }

  const timer = setTimeout(async () => {
    try {
      await prisma.document.update({
        where: { shortId },
        data: { content, updatedAt: new Date() }
      });
    } catch (error) {
      console.error(`Error auto-saving document ${shortId}:`, error);
    }
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
