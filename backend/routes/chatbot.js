const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const { db } = require('../config/firebase');

// ============================================
// FAQ Pattern Database
// ============================================

const faqPatterns = [
  {
    keywords: ['nausea', 'morning sickness', 'vomit', 'sick', 'queasy'],
    response:
      'Try these for nausea relief: ginger tea, small frequent meals (6+/day), eat before getting out of bed, avoid strong smells, B vitamins. If severe, consult your doctor.',
    category: 'Health',
  },
  {
    keywords: ['exercise', 'yoga', 'walk', 'fitness', 'workout', 'training'],
    response:
      'Pregnancy-safe exercises include prenatal yoga, walking, swimming, and light strength training. Avoid high-impact sports. Duration: 30-45 min per session, 3-5x per week when approved.',
    category: 'Wellness',
  },
  {
    keywords: ['nutrition', 'diet', 'food', 'eat', 'calorie', 'protein', 'iron'],
    response:
      'Focus on: iron (leafy greens, lean meat), folic acid (broccoli, beans), calcium (dairy, almonds), protein (eggs, fish). Avoid: raw eggs, high-mercury fish, unpasteurized dairy, excess caffeine (>200mg/day).',
    category: 'Nutrition',
  },
  {
    keywords: ['sleep', 'insomnia', 'rest', 'tired', 'exhausted', 'fatigue'],
    response:
      'Improve sleep: comfortable pillow position (left side best), consistent sleep schedule, avoid caffeine after 2pm, use pregnancy pillow for support, try relaxation techniques. 7-9 hours recommended.',
    category: 'Wellness',
  },
  {
    keywords: ['pain', 'cramp', 'ache', 'hurt', 'discomfort', 'back pain'],
    response:
      'Mild cramping is normal. For relief: warm compress, gentle stretching, prenatal yoga, safe pain relief (ask doctor). SEEK IMMEDIATE CARE if pain is severe, persistent, or accompanied by bleeding.',
    category: 'Health Alert',
  },
  {
    keywords: [
      'postpartum',
      'PPD',
      'depression',
      'anxiety',
      'mood',
      'emotional',
      'sad',
      'overwhelmed',
    ],
    response:
      'Postpartum depression/anxiety is treatable. Please reach out to your healthcare provider or call the Postpartum Support International hotline. You\'re not alone. Support available 24/7.',
    category: 'Mental Health',
  },
  {
    keywords: ['cry', 'baby', 'newborn', 'infant', 'sound', 'noise'],
    response:
      'Our Baby Cry Monitor uses audio analysis to identify your baby\'s needs: pain (sharp), hungry (rhythmic), sleepy (fussy), discomfort (varied). Access it from the Dashboard. Try it in cry-detection section!',
    category: 'Features',
  },
  {
    keywords: ['emergency', 'danger', 'help', 'urgent', 'crisis', 'bleeding'],
    response:
      'In IMMEDIATE DANGER: Call 911. Use our Shake-to-Alert on the Safety page to quickly notify your emergency contacts. Set up your contacts on your profile first.',
    category: 'Emergency',
  },
  {
    keywords: ['location', 'share', 'contact', 'family', 'safe'],
    response:
      'You can securely share your live location with up to 2 emergency contacts via the Safety page. Grant/revoke access anytime. Your contacts receive location updates when you use shake-to-alert.',
    category: 'Safety',
  },
  {
    keywords: [
      'appointment',
      'doctor',
      'prenatal',
      'checkup',
      'ultrasound',
      'OB',
      'GYN',
    ],
    response:
      'Regular prenatal appointments are essential for monitoring your health and baby\'s development. Schedule: monthly (until 28 weeks), every 2 weeks (28-36 weeks), weekly (36+ weeks). Always discuss concerns with your OB.',
    category: 'Healthcare',
  },
  {
    keywords: ['water', 'hydration', 'thirsty', 'drink', 'fluids'],
    response:
      'Stay hydrated! Drink 8-10 glasses (64-80 oz) of water daily, more if exercising or in hot weather. Signs of dehydration: dark urine, dizziness, reduced urination. Keep water nearby always.',
    category: 'Wellness',
  },
  {
    keywords: ['kick', 'movement', 'fetal', 'active', 'baby moving', 'flutter'],
    response:
      'Normal fetal movement varies. Most mothers feel first movements at 16-25 weeks. Track daily movements after 28 weeks: expect 10+ movements within 2 hours. Reduced movement warrants immediate doctor consultation.',
    category: 'Pregnancy Care',
  },
];

// ============================================
// POST /api/chatbot/message
// Process user message and generate response
// ============================================

router.post(
  '/message',
  auth,
  [
    body('message')
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Message must be between 1 and 1000 characters'),
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

      const { message } = req.body;
      const messageLower = message.toLowerCase();

      // Find matching FAQ pattern
      let response = null;
      let category = 'General';

      for (const pattern of faqPatterns) {
        if (pattern.keywords.some(kw => messageLower.includes(kw))) {
          response = pattern.response;
          category = pattern.category;
          break;
        }
      }

      // Fallback response if no match
      if (!response) {
        response =
          "I'm here to help with pregnancy and postpartum wellness questions. Try asking about exercise, nutrition, sleep, symptoms, or use our other tools like Baby Monitor or Safety features!";
        category = 'Help';
      }

      // Store message in Firestore for history/analytics
      const messageRecord = {
        userEmail: req.user.email,
        userMessage: message,
        botResponse: response,
        category,
        timestamp: new Date().toISOString(),
      };

      await db.collection('chat-history').add(messageRecord);

      res.status(201).json({
        success: true,
        response,
        category,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[Chatbot Message Error]', err);
      res.status(500).json({
        success: false,
        message: 'Sorry, there was an error processing your message. Try again.',
      });
    }
  }
);

// ============================================
// GET /api/chatbot/history
// Get conversation history
// ============================================

router.get('/history', auth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);

    const historySnap = await db
      .collection('chat-history')
      .where('userEmail', '==', req.user.email)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    const history = historySnap.docs
      .map(d => ({
        id: d.id,
        ...d.data(),
      }))
      .reverse(); // Reverse to show oldest first

    res.json({
      success: true,
      history,
      totalMessages: history.length,
    });
  } catch (err) {
    console.error('[Chat History Error]', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chat history',
    });
  }
});

// ============================================
// GET /api/chatbot/faq
// Get all FAQ patterns (for client-side reference)
// ============================================

router.get('/faq', async (req, res) => {
  try {
    const faqList = faqPatterns.map(p => ({
      category: p.category,
      keywords: p.keywords,
      response: p.response,
    }));

    res.json({
      success: true,
      totalPatterns: faqList.length,
      faq: faqList,
    });
  } catch (err) {
    console.error('[FAQ Error]', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch FAQ',
    });
  }
});

// ============================================
// DELETE /api/chatbot/history/:id
// Delete a specific message from history
// ============================================

router.delete('/history/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const messageDoc = await db.collection('chat-history').doc(id).get();

    if (!messageDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    // Verify ownership
    if (messageDoc.data().userEmail !== req.user.email) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to delete this message',
      });
    }

    await db.collection('chat-history').doc(id).delete();

    res.json({
      success: true,
      message: 'Message deleted',
    });
  } catch (err) {
    console.error('[Delete Message Error]', err);
    res.status(500).json({
      success: false,
      message: 'Failed to delete message',
    });
  }
});

module.exports = router;
