const express = require('express');
const router = express.Router();
const prisma = require('../config/db');
const { nanoid } = require('nanoid');

// Create a new document
router.post('/', async (req, res) => {
  try {
    const shortId = nanoid(8);
    const { owner } = req.body;
    
    const doc = await prisma.document.create({
      data: {
        shortId,
        owner: owner || null,
        title: 'Untitled',
        content: ''
      }
    });

    res.status(201).json({ shortId: doc.shortId, id: doc.id });
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ error: 'Failed to create document' });
  }
});

// Fetch multiple documents by shortId list (for shared notes dashboard)
router.post('/batch', async (req, res) => {
  try {
    const { shortIds } = req.body;
    if (!Array.isArray(shortIds) || shortIds.length === 0) {
      return res.json([]);
    }
    
    // Limit to 50 to prevent abuse
    const ids = shortIds.slice(0, 50);
    
    const docs = await prisma.document.findMany({
      where: { shortId: { in: ids } },
      orderBy: { updatedAt: 'desc' },
      select: {
        shortId: true,
        title: true,
        content: true,
        owner: true,
        updatedAt: true,
        createdAt: true
      }
    });
    
    res.json(docs);
  } catch (error) {
    console.error('Error fetching batch documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Get a document by shortId
router.get('/:shortId', async (req, res) => {
  try {
    const doc = await prisma.document.findUnique({
      where: { shortId: req.params.shortId }
    });
    
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json(doc);
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// List documents by owner (for dashboard)
router.get('/', async (req, res) => {
  try {
    const { owner } = req.query;
    if (!owner) {
      return res.status(400).json({ error: 'Owner parameter required' });
    }
    
    const docs = await prisma.document.findMany({
      where: { owner },
      orderBy: { updatedAt: 'desc' },
      select: {
        shortId: true,
        title: true,
        content: true,
        updatedAt: true,
        createdAt: true
      }
    });
    
    res.json(docs);
  } catch (error) {
    console.error('Error listing documents:', error);
    res.status(500).json({ error: 'Failed to list documents' });
  }
});

// Update document title
router.patch('/:shortId', async (req, res) => {
  try {
    const { title } = req.body;
    const doc = await prisma.document.update({
      where: { shortId: req.params.shortId },
      data: { title }
    });
    
    res.json(doc);
  } catch (error) {
    if (error.code === 'P2025') { // Prisma record not found error code
       return res.status(404).json({ error: 'Document not found' });
    }
    console.error('Error updating document:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// Delete a document
router.delete('/:shortId', async (req, res) => {
  try {
    await prisma.document.delete({
      where: { shortId: req.params.shortId }
    });
    res.json({ message: 'Document deleted' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Document not found' });
    }
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

module.exports = router;
