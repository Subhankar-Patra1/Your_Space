const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  shortId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  title: {
    type: String,
    default: 'Untitled'
  },
  content: {
    type: String,
    default: ''
  },
  owner: {
    type: String,
    default: null
  },
  lastEditedBy: {
    type: String,
    default: null
  },
  images: {
    type: Array, // [{ id, url, x, y, width, height }]
    default: []
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Document', documentSchema);
