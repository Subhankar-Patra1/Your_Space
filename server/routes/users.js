const express = require('express');
const router = express.Router();
const prisma = require('../config/db');

// Get user profile by guestId
router.get('/:guestId', async (req, res) => {
  try {
    const { guestId } = req.params;
    let user = await prisma.user.findUnique({
      where: { guestId }
    });

    if (!user) {
      // If user doesn't exist, create one with default name
      user = await prisma.user.create({
        data: {
          guestId,
          displayName: 'Anonymous'
        }
      });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile
router.put('/:guestId', async (req, res) => {
  try {
    const { guestId } = req.params;
    const { displayName } = req.body;

    const user = await prisma.user.upsert({
      where: { guestId },
      update: { displayName },
      create: {
        guestId,
        displayName: displayName || 'Anonymous'
      }
    });

    res.json(user);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
