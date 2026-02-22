const express = require('express');
const router = express.Router();
const { body, validationResult, param } = require('express-validator');
const auth = require('../middleware/auth');
const { db } = require('../config/firebase');

// ============================================
// GET /api/safety/contacts
// Fetch user's emergency contacts
// ============================================

router.get('/contacts', auth, async (req, res) => {
  try {
    const contactsSnap = await db
      .collection('emergency-contacts')
      .where('userEmail', '==', req.user.email)
      .get();

    const contacts = contactsSnap.docs.map(d => ({
      id: d.id,
      ...d.data(),
    }));

    res.json({
      success: true,
      contacts,
      totalContacts: contacts.length,
    });
  } catch (err) {
    console.error('[Get Contacts Error]', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contacts',
    });
  }
});

// ============================================
// POST /api/safety/emergency-contact
// Add emergency contact (max 2 per user)
// ============================================

router.post(
  '/emergency-contact',
  auth,
  [
    body('name')
      .trim()
      .escape()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),

    body('email')
      .trim()
      .isEmail()
      .withMessage('Valid email is required'),

    body('phone')
      .trim()
      .notEmpty()
      .withMessage('Phone number is required')
      .isLength({ min: 6, max: 20 })
      .withMessage('Phone number must be between 6 and 20 characters'),

    body('relationship')
      .trim()
      .escape()
      .isLength({ min: 2, max: 50 })
      .withMessage('Relationship must be between 2 and 50 characters'),
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

      // Check if user has already added 2 contacts
      const existingContacts = await db
        .collection('emergency-contacts')
        .where('userEmail', '==', req.user.email)
        .get();

      if (existingContacts.size >= 2) {
        return res.status(400).json({
          success: false,
          message: 'Maximum 2 emergency contacts allowed',
        });
      }

      const { name, email, phone, relationship } = req.body;

      // Add new contact
      const docRef = await db.collection('emergency-contacts').add({
        userEmail: req.user.email,
        name,
        email: email.trim().toLowerCase(),
        phone,
        relationship,
        createdAt: new Date().toISOString(),
      });

      res.status(201).json({
        success: true,
        message: 'Emergency contact added',
        contactId: docRef.id,
        contact: { name, email, phone, relationship },
      });
    } catch (err) {
      console.error('[Add Contact Error]', err);
      res.status(500).json({
        success: false,
        message: 'Failed to add contact',
      });
    }
  }
);

// ============================================
// DELETE /api/safety/emergency-contact/:id
// Delete emergency contact
// ============================================

router.delete('/emergency-contact/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify contact belongs to user
    const contactDoc = await db.collection('emergency-contacts').doc(id).get();
    if (!contactDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found',
      });
    }

    const contact = contactDoc.data();
    if (contact.userEmail !== req.user.email) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to delete this contact',
      });
    }

    // Delete contact
    await db.collection('emergency-contacts').doc(id).delete();

    res.json({
      success: true,
      message: 'Emergency contact deleted',
    });
  } catch (err) {
    console.error('[Delete Contact Error]', err);
    res.status(500).json({
      success: false,
      message: 'Failed to delete contact',
    });
  }
});

// ============================================
// POST /api/safety/shake-alert
// Send emergency alert with location to contacts
// ============================================

router.post(
  '/shake-alert',
  auth,
  [
    body('lat')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Invalid latitude'),

    body('lon')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Invalid longitude'),

    body('addressText')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Address text too long'),
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

      const { lat, lon, addressText } = req.body;

      // Fetch emergency contacts
      const contactsSnap = await db
        .collection('emergency-contacts')
        .where('userEmail', '==', req.user.email)
        .get();

      const contacts = contactsSnap.docs.map(d => d.data());

      if (contacts.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No emergency contacts configured. Add at least one contact.',
        });
      }

      // Mock SMS sending (in production, integrate Twilio)
      const alert = {
        userEmail: req.user.email,
        timestamp: new Date().toISOString(),
        location: { lat, lon },
        address: addressText,
        contactsNotified: contacts.length,
        contactDetails: contacts.map(c => ({
          name: c.name,
          email: c.email,
          phone: c.phone,
          relationship: c.relationship,
        })),
      };

      // Log alert in Firestore
      const alertDocRef = await db.collection('emergency-alerts').add(alert);

      // Mock Twilio SMS (just log for now)
      console.log('═══════════════════════════════════════════');
      console.log(`[EMERGENCY ALERT ${new Date().toISOString()}]`);
      console.log(`User: ${req.user.email}`);
      console.log(`Location: ${lat}, ${lon}`);
      if (addressText) console.log(`Address: ${addressText}`);
      console.log(`Contacts to notify: ${contacts.length}`);
      contacts.forEach(c => {
        console.log(
          `  → Notify ${c.name} (${c.email}, ${c.phone} - ${c.relationship}): "ALERT: I need help! Location: ${lat},${lon}. ${addressText || 'See app for details.'}"`,
        );
      });
      console.log('═══════════════════════════════════════════');

      res.status(201).json({
        success: true,
        message: `Alert sent to ${contacts.length} contact(s)`,
        alertId: alertDocRef.id,
        contactsNotified: contacts.length,
        contacts: contacts.map(c => ({
          name: c.name,
          email: c.email,
          phone: c.phone,
        })),
      });
    } catch (err) {
      console.error('[Shake Alert Error]', err);
      res.status(500).json({
        success: false,
        message: 'Failed to send alert',
      });
    }
  }
);

// ============================================
// GET /api/safety/alert-history
// Get history of alerts sent
// ============================================

router.get('/alert-history', auth, async (req, res) => {
  try {
    const alertsSnap = await db
      .collection('emergency-alerts')
      .where('userEmail', '==', req.user.email)
      .orderBy('timestamp', 'desc')
      .limit(20)
      .get();

    const alerts = alertsSnap.docs.map(d => ({
      id: d.id,
      ...d.data(),
    }));

    res.json({
      success: true,
      alerts,
      totalAlerts: alerts.length,
    });
  } catch (err) {
    console.error('[Alert History Error]', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alert history',
    });
  }
});

module.exports = router;
