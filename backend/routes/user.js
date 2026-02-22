const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const { db, auth: firebaseAuth } = require('../config/firebase');

// ============================================
// GET /api/user/profile
// Fetch user profile information
// ============================================

router.get('/profile', auth, async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.email).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const user = userDoc.data();

    // Calculate pregnancy week if due date exists
    let pregnancyWeek = null;
    if (user.dueDate) {
      const dueDate = new Date(user.dueDate);
      const today = new Date();
      const daysLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      pregnancyWeek = Math.max(1, 40 - Math.floor(daysLeft / 7));
    }

    res.json({
      success: true,
      user: {
        email: user.email,
        name: user.name,
        pregnancyStage: user.pregnancyStage,
        dueDate: user.dueDate,
        pregnancyWeek,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (err) {
    console.error('[Get Profile Error]', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
    });
  }
});

// ============================================
// PUT /api/user/profile
// Update user profile
// ============================================

router.put(
  '/profile',
  auth,
  [
    body('name')
      .optional()
      .trim()
      .escape()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),

    body('pregnancyStage')
      .optional()
      .isIn(['pre-conception', 'trimester-1', 'trimester-2', 'trimester-3', 'postpartum'])
      .withMessage('Invalid pregnancy stage'),

    body('dueDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid due date format'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
        });
      }

      const { name, pregnancyStage, dueDate } = req.body;

      // Build update object (only include provided fields)
      const updateData = {
        updatedAt: new Date().toISOString(),
      };

      if (name !== undefined) updateData.name = name;
      if (pregnancyStage !== undefined) updateData.pregnancyStage = pregnancyStage;
      if (dueDate !== undefined) updateData.dueDate = dueDate;

      // Update Firestore document
      await db.collection('users').doc(req.user.email).update(updateData);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: updateData,
      });
    } catch (err) {
      console.error('[Update Profile Error]', err);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
      });
    }
  }
);

// ============================================
// DELETE /api/user/profile
// Delete user account (careful operation)
// ============================================

router.delete('/profile', auth, async (req, res) => {
  try {
    const { confirm } = req.body;

    if (confirm !== 'DELETE') {
      return res.status(400).json({
        success: false,
        message: 'Type DELETE to confirm account deletion',
      });
    }

    // Delete Firestore user document
    await db.collection('users').doc(req.user.email).delete();

    // Delete Firebase Auth user
    if (req.user.uid) {
      try {
        await firebaseAuth.deleteUser(req.user.uid);
      } catch (err) {
        console.error('[Delete Firebase User]', err);
        // Firestore doc is already deleted; auth deletion may fail if user was created differently
      }
    }

    res.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (err) {
    console.error('[Delete Profile Error]', err);
    res.status(500).json({
      success: false,
      message: 'Failed to delete account',
    });
  }
});

module.exports = router;
