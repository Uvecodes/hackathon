const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const { db } = require('../config/firebase');

// ============================================
// Gemini AI Setup
// ============================================

let genAI = null;
let geminiModel = null;

try {
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    console.log('✓ Gemini AI initialized for Tasha chatbot');
  } else {
    console.warn('WARNING: GEMINI_API_KEY not set — Tasha will use FAQ fallback mode.');
  }
} catch (err) {
  console.error('WARNING: Failed to initialize Gemini AI —', err.message);
}

// ============================================
// Tasha System Prompt
// ============================================

const TASHA_SYSTEM_PROMPT = `You are Tasha, a warm, empathetic, and knowledgeable maternal health assistant for The Mother Suite app. You were designed specifically to support mothers and expectant mothers through their journey.

Your areas of expertise include:
- **Prenatal care**: Pregnancy nutrition, safe exercises, common symptoms (nausea, fatigue, back pain), prenatal appointments, fetal development
- **Postnatal recovery**: Healing after birth, breastfeeding support, sleep deprivation coping
- **Postpartum mental health**: Recognising and addressing postpartum depression (PPD), anxiety, mood changes, emotional support
- **Baby care**: Newborn feeding schedules, sleep patterns, development milestones, soothing techniques, baby cry interpretation
- **Safe exercise**: Prenatal yoga, walking, swimming, pelvic floor exercises, postnatal fitness return
- **Maternal nutrition**: Iron, folate, calcium, protein needs during pregnancy and breastfeeding; foods to avoid

Your communication style:
- Warm, caring, and non-judgmental — like a trusted friend who happens to be an expert
- Use the user's name if you know it
- Keep responses concise and clear (3-5 sentences for most answers)
- Use bullet points for lists; avoid walls of text
- Celebrate small wins and acknowledge the challenges of motherhood
- Always validate feelings before giving advice

Safety rules you must follow:
- NEVER diagnose medical conditions
- For any emergency symptoms (heavy bleeding, chest pain, severe headache, reduced fetal movement, signs of preeclampsia), ALWAYS direct the user to call emergency services (911) or go to the ER immediately
- For postpartum depression or mental health crises, always provide the Postpartum Support International helpline: 1-800-944-4773
- Recommend consulting a healthcare provider for any specific medical advice
- Do not prescribe medications or specific dosages

Remember: You are Tasha. You are not a general AI assistant — you focus exclusively on maternal and infant health topics. If asked about unrelated topics, gently redirect to your expertise area.`;

// ============================================
// FAQ Fallback Patterns (used when Gemini unavailable)
// ============================================

const faqPatterns = [
  {
    keywords: ['nausea', 'morning sickness', 'vomit', 'sick', 'queasy'],
    response:
      "Morning sickness is very common, especially in the first trimester! Try eating small, frequent meals (every 2-3 hours), ginger tea or ginger candies, and eating dry crackers before getting out of bed. Staying hydrated is really important — try cold or sparkling water if warm water triggers nausea. If it becomes severe or you can't keep anything down, please talk to your doctor about prescription options.",
    category: 'Health',
  },
  {
    keywords: ['exercise', 'yoga', 'walk', 'fitness', 'workout', 'training'],
    response:
      "Staying active during pregnancy is wonderful for both you and baby! Safe options include prenatal yoga, walking, swimming, and light strength training. Aim for about 30 minutes most days, but always listen to your body. Avoid contact sports, heavy lifting, or lying flat on your back after the first trimester. Always get your OB's approval before starting any new exercise routine.",
    category: 'Wellness',
  },
  {
    keywords: ['nutrition', 'diet', 'food', 'eat', 'calorie', 'protein', 'iron'],
    response:
      "Good nutrition is so important right now! Focus on iron-rich foods (leafy greens, lean meat), folic acid (broccoli, fortified cereals), calcium (dairy or plant-based alternatives), and protein (eggs, legumes, fish). Foods to avoid: raw/undercooked meat, high-mercury fish (shark, swordfish), unpasteurized dairy, and limit caffeine to under 200mg/day. A good prenatal vitamin fills any gaps!",
    category: 'Nutrition',
  },
  {
    keywords: ['sleep', 'insomnia', 'rest', 'tired', 'exhausted', 'fatigue'],
    response:
      "Sleep struggles are so common in pregnancy — you're not alone! Try sleeping on your left side with a pregnancy pillow between your knees for comfort. Keep a consistent bedtime, avoid screens an hour before bed, and limit fluids in the evening to reduce bathroom trips. Gentle stretching or a warm (not hot) bath before bed can also help. Aim for 7-9 hours, and nap when you can!",
    category: 'Wellness',
  },
  {
    keywords: ['pain', 'cramp', 'ache', 'hurt', 'discomfort', 'back pain'],
    response:
      "Some discomfort is normal in pregnancy, but I want you to be safe. Mild cramping or back pain can often be eased with a warm compress, gentle stretching, or prenatal yoga. However, if you experience severe or persistent pain, heavy bleeding, or pain accompanied by fever — please seek medical care immediately or call 911. It's always better to get checked out.",
    category: 'Health Alert',
  },
  {
    keywords: ['postpartum', 'PPD', 'depression', 'anxiety', 'mood', 'emotional', 'sad', 'overwhelmed'],
    response:
      "What you're feeling is real and valid, and you don't have to go through it alone. Postpartum depression and anxiety are medical conditions that affect 1 in 5 mothers — this is not a sign of weakness or bad mothering. Please reach out to your healthcare provider, or call the Postpartum Support International helpline at 1-800-944-4773. They have support available 24/7. You are so important, mama. 💛",
    category: 'Mental Health',
  },
  {
    keywords: ['cry', 'baby', 'newborn', 'infant', 'sound', 'noise', 'wail'],
    response:
      "Decoding your baby's cries takes practice! Our Baby Cry Monitor feature uses audio analysis to help identify whether your baby is hungry (rhythmic cries), in pain (sharp, intense), sleepy (fussy, whimpering), or uncomfortable (varied pitch). Access it from the Dashboard in the Cry Detection section. Remember — no app replaces your instinct as a parent!",
    category: 'Features',
  },
  {
    keywords: ['emergency', 'danger', 'help', 'urgent', 'crisis', 'bleeding', '911'],
    response:
      "If you are in immediate danger, please call 911 right now. For obstetric emergencies (heavy bleeding, severe pain, signs of preeclampsia like sudden swelling or vision changes), go to your nearest emergency room immediately. You can also use the Shake-to-Alert feature on the Safety page to instantly notify your emergency contacts. Your safety comes first.",
    category: 'Emergency',
  },
  {
    keywords: ['breastfeeding', 'latch', 'milk', 'nursing', 'lactation'],
    response:
      "Breastfeeding can be beautiful and challenging at the same time! A good latch is everything — baby's mouth should cover most of the areola, not just the nipple. Feed on demand, usually every 2-3 hours (8-12 times/day for newborns). If you're experiencing pain, cracking, or low milk supply, a lactation consultant can be life-changing — ask your hospital or OB for a referral.",
    category: 'Baby Care',
  },
  {
    keywords: ['appointment', 'doctor', 'prenatal', 'checkup', 'ultrasound', 'OB', 'GYN'],
    response:
      "Regular prenatal appointments are so important! Typical schedule: monthly visits until 28 weeks, every 2 weeks from 28-36 weeks, then weekly until delivery. At each visit, your provider will check your blood pressure, weight, baby's heartbeat, and uterine growth. Never hesitate to bring a list of questions — no question is too small when it comes to your health and baby's.",
    category: 'Healthcare',
  },
  {
    keywords: ['water', 'hydration', 'thirsty', 'drink', 'fluids'],
    response:
      "Staying hydrated is especially important during pregnancy and breastfeeding! Aim for 8-10 glasses (64-80 oz) of water daily — more if you're active or it's hot. Signs of dehydration include dark urine, dizziness, and headaches. Herbal teas (ginger, peppermint, chamomile — avoid in excess), coconut water, and water-rich fruits like watermelon also count toward your fluid intake.",
    category: 'Wellness',
  },
  {
    keywords: ['kick', 'movement', 'fetal', 'active', 'baby moving', 'flutter'],
    response:
      "Feeling your baby move is one of the most magical parts of pregnancy! Most mothers feel first movements (\"quickening\") between 16-25 weeks. After 28 weeks, try to do daily kick counts — you should feel at least 10 movements within 2 hours. If you notice a significant decrease in movement, don't wait — contact your healthcare provider or go to triage right away.",
    category: 'Pregnancy Care',
  },
];

// ============================================
// Helper: Generate Gemini response
// ============================================

async function getGeminiResponse(message, conversationHistory = []) {
  if (!geminiModel) return null;

  try {
    // Build conversation with history for context
    const chat = geminiModel.startChat({
      history: conversationHistory,
      systemInstruction: TASHA_SYSTEM_PROMPT,
      generationConfig: {
        maxOutputTokens: 400,
        temperature: 0.75,
      },
    });

    const result = await chat.sendMessage(message);
    const text = result.response.text();
    return text && text.trim() ? text.trim() : null;
  } catch (err) {
    console.error('[Gemini API Error]', err.message);
    return null;
  }
}

// ============================================
// Helper: FAQ fallback
// ============================================

function getFaqResponse(message) {
  const messageLower = message.toLowerCase();
  for (const pattern of faqPatterns) {
    if (pattern.keywords.some(kw => messageLower.includes(kw))) {
      return { response: pattern.response, category: pattern.category };
    }
  }
  return {
    response:
      "Hi there! I'm Tasha, your maternal health companion. I'm here to help with questions about prenatal care, postnatal recovery, postpartum wellbeing, baby care, nutrition, and safe exercise. What's on your mind today? 🌸",
    category: 'General',
  };
}

// ============================================
// POST /api/chatbot/message
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

      const { message, history: clientHistory = [] } = req.body;

      let response = null;
      let category = 'General';
      let source = 'gemini';

      // Try Gemini first
      if (geminiModel) {
        response = await getGeminiResponse(message, clientHistory);
      }

      // Fall back to FAQ patterns
      if (!response) {
        const faq = getFaqResponse(message);
        response = faq.response;
        category = faq.category;
        source = 'faq';
      }

      // Store in Firestore
      if (db) {
        try {
          await db.collection('chat-history').add({
            userEmail: req.user.email,
            userMessage: message,
            botResponse: response,
            category,
            source,
            timestamp: new Date().toISOString(),
          });
        } catch (dbErr) {
          console.error('[Chatbot Firestore Error]', dbErr.message);
          // Non-fatal — continue
        }
      }

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
        message: 'Sorry, there was an error processing your message. Please try again.',
      });
    }
  }
);

// ============================================
// GET /api/chatbot/history
// ============================================

router.get('/history', auth, async (req, res) => {
  try {
    if (!db) {
      return res.json({ success: true, history: [], totalMessages: 0 });
    }

    const limit = Math.min(parseInt(req.query.limit) || 50, 200);

    const historySnap = await db
      .collection('chat-history')
      .where('userEmail', '==', req.user.email)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    const history = historySnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .reverse();

    res.json({ success: true, history, totalMessages: history.length });
  } catch (err) {
    console.error('[Chat History Error]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch chat history' });
  }
});

// ============================================
// GET /api/chatbot/faq
// ============================================

router.get('/faq', async (_req, res) => {
  try {
    const faqList = faqPatterns.map(p => ({
      category: p.category,
      keywords: p.keywords,
      response: p.response,
    }));
    res.json({ success: true, totalPatterns: faqList.length, faq: faqList });
  } catch (err) {
    console.error('[FAQ Error]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch FAQ' });
  }
});

// ============================================
// DELETE /api/chatbot/history/:id
// ============================================

router.delete('/history/:id', auth, async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ success: false, message: 'Database not available' });
    }

    const { id } = req.params;
    const messageDoc = await db.collection('chat-history').doc(id).get();

    if (!messageDoc.exists) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    if (messageDoc.data().userEmail !== req.user.email) {
      return res.status(403).json({ success: false, message: 'Unauthorized to delete this message' });
    }

    await db.collection('chat-history').doc(id).delete();
    res.json({ success: true, message: 'Message deleted' });
  } catch (err) {
    console.error('[Delete Message Error]', err);
    res.status(500).json({ success: false, message: 'Failed to delete message' });
  }
});

module.exports = router;
