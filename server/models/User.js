const mongoose = require('mongoose');

// Phase 2 stub — will be expanded for Google OAuth
const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  email: {
    type: String,
    unique: true,
    sparse: true
  },
  displayName: {
    type: String,
    default: 'Anonymous'
  },
  avatar: {
    type: String,
    default: null
  },
  guestId: {
    type: String,
    unique: true,
    sparse: true
  },
  documents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
