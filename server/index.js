require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
// const connectDB = require('./config/db'); // Deprecated, using Prisma now
const documentRoutes = require('./routes/documents');
const setupCollaboration = require('./socket/collaboration');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

// Routes
app.use('/api/documents', documentRoutes);
app.use('/api/users', require('./routes/users'));

// File Upload Setup
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Serve uploads statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Upload Endpoint
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const fileUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/uploads/${req.file.filename}`;
  // Actually, usually we serve from server URL. 
  // If client is 5173 and server is 3001, we should return server URL 3001.
  // But due to proxy in Vite (client), /uploads might be proxied?
  // No, vite proxy is for /api.
  // If we serve static at /uploads, we access it via http://localhost:3001/uploads/...
  // So return relative or absolute URL.
  // Let's return absolute URL based on request host or env.
  const protocol = req.protocol;
  const host = req.get('host');
  const fullUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
  
  res.json({ url: fullUrl, filename: req.file.filename });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Setup Socket.io collaboration
setupCollaboration(io);

// Start server
server.listen(PORT, () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`
╔══════════════════════════════════════╗
║     🚀 Your Space Server v1.0       ║
║                                      ║
║   API:    http://localhost:${PORT}      ║
║   Socket: ws://localhost:${PORT}       ║
║   DB:     PostgreSQL (Neon)          ║
╚══════════════════════════════════════╝
    `);
  } else {
    console.log(`🚀 Server running on port ${PORT}`);
  }
});
