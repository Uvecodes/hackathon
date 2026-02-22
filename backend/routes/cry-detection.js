const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const { db } = require('../config/firebase');
const crypto = require('crypto');
const https = require('https');

// ─── Encryption helpers (AES-256-CBC) ─────────────────────────────────────────
// Key must be 64 hex chars (32 bytes). Gracefully skips encryption if not set.

function isValidKey(k) {
  return k && /^[0-9a-fA-F]{64}$/.test(k);
}

function tryEncrypt(value) {
  const key = process.env.DATA_ENCRYPTION_KEY;
  if (!isValidKey(key) || value == null) return value;
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
    const enc = Buffer.concat([cipher.update(String(value)), cipher.final()]);
    return `enc:${iv.toString('hex')}:${enc.toString('hex')}`;
  } catch {
    return value;
  }
}

function tryDecrypt(value) {
  const key = process.env.DATA_ENCRYPTION_KEY;
  if (!isValidKey(key) || typeof value !== 'string' || !value.startsWith('enc:')) return value;
  try {
    const parts = value.split(':');
    if (parts.length < 3) return value;
    const iv = Buffer.from(parts[1], 'hex');
    const enc = Buffer.from(parts[2], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString();
  } catch {
    return value;
  }
}

function decryptLog(log) {
  return {
    ...log,
    cryType: tryDecrypt(log.cryType),
    label: tryDecrypt(log.label),
    description: tryDecrypt(log.description),
    notes: log.notes ? tryDecrypt(log.notes) : null,
  };
}

// ─── Cry classification ────────────────────────────────────────────────────────
// Uses duration + RMS amplitude + spectral band energy ratios.
// spectral: { lowRatio, fundamentalRatio, midRatio, highRatio }

function classifyCry({ duration, rms, spectral }) {
  const h = spectral ? (spectral.highRatio || 0) : 0;
  const f = spectral ? (spectral.fundamentalRatio || 0) : 0;
  const m = spectral ? (spectral.midRatio || 0) : 0;

  // Pain: dominant high-frequency energy + short intense burst
  if (h > 0.40 && duration <= 6 && rms > 0.04) return 'pain';

  // Hungry: strong fundamental + mid energy, persistent, moderate-high amplitude
  if (f + m > 0.45 && duration >= 3 && duration <= 20 && rms >= 0.03) return 'hungry';

  // Sleepy: low energy or very long cry (overtired)
  if (rms < 0.025 || duration > 20) return 'sleepy';

  return 'discomfort';
}

// ─── Cry type metadata ─────────────────────────────────────────────────────────
const CRY_TYPES = {
  pain: {
    emoji: '😣',
    label: 'Pain',
    description: 'Sharp, high-frequency cry pattern — likely discomfort or pain.',
    suggestions: [
      'Check for diaper rash or skin irritation',
      'Ensure proper feeding position to reduce gas',
      'Check for tight clothing or hair tourniquet syndrome',
      'If persistent, consult your pediatrician',
    ],
    actionItems: ['Check physical comfort', 'Offer comfort measures', 'Monitor symptoms'],
  },
  hungry: {
    emoji: '👶',
    label: 'Hungry',
    description: 'Rhythmic, persistent cry — typical hunger pattern.',
    suggestions: [
      'Offer breast or bottle feed',
      'Check feeding frequency (8–12× daily for newborns)',
      'Look for hunger cues: rooting, hands to mouth',
      'Burp during and after feeding',
    ],
    actionItems: ['Feed baby', 'Monitor intake', 'Watch for satisfaction cues'],
  },
  sleepy: {
    emoji: '😴',
    label: 'Sleepy',
    description: 'Whiny, low-energy cry — baby may be overtired.',
    suggestions: [
      'Dim lights and reduce noise',
      'Swaddle or provide gentle rocking',
      'Establish a consistent sleep routine',
      'Watch for tired cues (rubbing eyes, yawning)',
    ],
    actionItems: ['Prepare sleep environment', 'Soothe baby', 'Establish routine'],
  },
  discomfort: {
    emoji: '😖',
    label: 'Discomfort',
    description: 'Fussy, varied cry — possible environmental discomfort.',
    suggestions: [
      'Check room temperature (ideal 68–72°F / 20–22°C)',
      'Check for dirty or wet diaper',
      'Ensure clothing is not too tight or hot',
      'Try skin-to-skin contact or a pacifier',
    ],
    actionItems: ['Check comfort factors', 'Adjust environment', 'Soothe baby'],
  },
};

// ─── IBM Watson Speech-to-Text call ───────────────────────────────────────────
async function callWatsonSTT(audioBuffer, mimeType) {
  const url = process.env.WATSON_SERVICE_URL;
  const key = process.env.WATSON_API_KEY;
  if (!url || !key || key === 'your_watson_api_key_here') return null;

  return new Promise((resolve) => {
    try {
      const parsed = new URL(`${url}/v1/recognize`);
      const authHeader = `Basic ${Buffer.from(`apikey:${key}`).toString('base64')}`;

      const options = {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: 'POST',
        headers: {
          'Content-Type': mimeType || 'audio/webm;codecs=opus',
          'Authorization': authHeader,
          'Content-Length': audioBuffer.length,
        },
        timeout: 30000,
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try { resolve(JSON.parse(data)); } catch { resolve(null); }
        });
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
      req.write(audioBuffer);
      req.end();
    } catch {
      resolve(null);
    }
  });
}

// ============================================================
// POST /api/cry-detection/analyze
// Real-time heuristic analysis (logs to Firestore, encrypted)
// ============================================================

router.post(
  '/analyze',
  auth,
  [
    body('duration').isFloat({ min: 0.1, max: 60 }).withMessage('Duration must be 0.1–60 seconds'),
    body('rms').isFloat({ min: 0 }).withMessage('RMS must be a positive number'),
    body('confidence').isFloat({ min: 0, max: 1 }).withMessage('Confidence must be 0–1'),
    body('decibels').optional().isFloat().withMessage('Decibels must be a number'),
    body('spectral').optional().isObject(),
    body('notes').optional().trim().isLength({ max: 500 }),
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

      const { duration, rms, confidence, decibels, spectral, notes } = req.body;

      const cryType = classifyCry({ duration, rms, spectral });
      const cryData = CRY_TYPES[cryType];
      const confidencePct = Math.round(Math.min(95, Math.max(40, confidence * 100)));

      const logEntry = {
        userEmail: req.user.email,
        cryType: tryEncrypt(cryType),
        emoji: cryData.emoji,
        label: tryEncrypt(cryData.label),
        description: tryEncrypt(cryData.description),
        suggestions: cryData.suggestions,
        duration: parseFloat(duration.toFixed(2)),
        confidence: confidencePct,
        rms: parseFloat(rms.toFixed(4)),
        decibels: decibels != null ? parseFloat(parseFloat(decibels).toFixed(1)) : null,
        spectral: spectral || null,
        notes: notes ? tryEncrypt(notes) : null,
        source: 'heuristic',
        timestamp: new Date().toISOString(),
      };

      const docRef = await db.collection('cry-log').add(logEntry);

      res.status(201).json({
        success: true,
        message: 'Cry analysis complete',
        analysis: {
          id: docRef.id,
          emoji: cryData.emoji,
          label: cryData.label,
          description: cryData.description,
          confidence: confidencePct,
          suggestions: cryData.suggestions,
          actionItems: cryData.actionItems,
          duration: parseFloat(duration.toFixed(2)),
          source: 'heuristic',
        },
      });
    } catch (err) {
      console.error('[Cry Analysis Error]', err);
      res.status(500).json({ success: false, message: 'Cry analysis failed' });
    }
  }
);

// ============================================================
// POST /api/cry-detection/advanced-analyze
// 10-second recording → IBM Watson STT → enhanced classification
// ============================================================

router.post(
  '/advanced-analyze',
  auth,
  [
    body('audioBase64').notEmpty().withMessage('Audio data is required'),
    body('mimeType').optional().isString(),
    body('spectral').optional().isObject(),
    body('duration').optional().isFloat({ min: 0 }),
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

      const { audioBase64, mimeType, spectral, duration } = req.body;
      const dur = parseFloat(duration) || 10;

      let cryType = 'discomfort';
      let confidence = 60;
      let source = 'enhanced-heuristic';

      // Try Watson if configured
      const audioBuffer = Buffer.from(audioBase64, 'base64');
      const watsonResult = await callWatsonSTT(audioBuffer, mimeType);

      if (watsonResult && Array.isArray(watsonResult.results)) {
        source = 'watson';
        const words = watsonResult.results.flatMap(r => r.alternatives?.[0]?.words || []);
        const avgConf = words.length
          ? words.reduce((s, w) => s + (w.confidence || 0), 0) / words.length
          : 0;
        // High STT confidence = adult-like speech patterns = discomfort/environmental
        cryType = avgConf > 0.65
          ? 'discomfort'
          : classifyCry({ duration: dur, rms: 0.05, spectral });
        confidence = Math.round(Math.min(92, 55 + avgConf * 40));
      } else {
        // Watson unavailable — use enhanced heuristics
        cryType = classifyCry({ duration: dur, rms: 0.05, spectral });
        confidence = spectral ? 72 : 62;
      }

      const cryData = CRY_TYPES[cryType];

      const logEntry = {
        userEmail: req.user.email,
        cryType: tryEncrypt(cryType),
        emoji: cryData.emoji,
        label: tryEncrypt(cryData.label),
        description: tryEncrypt(cryData.description),
        suggestions: cryData.suggestions,
        duration: dur,
        confidence,
        source,
        spectral: spectral || null,
        notes: null,
        timestamp: new Date().toISOString(),
      };

      const docRef = await db.collection('cry-log').add(logEntry);

      res.status(201).json({
        success: true,
        message: 'Advanced cry analysis complete',
        analysis: {
          id: docRef.id,
          emoji: cryData.emoji,
          label: cryData.label,
          description: cryData.description,
          confidence,
          suggestions: cryData.suggestions,
          actionItems: cryData.actionItems,
          duration: dur,
          source,
          watsonUsed: source === 'watson',
        },
      });
    } catch (err) {
      console.error('[Advanced Cry Analysis Error]', err);
      res.status(500).json({ success: false, message: 'Advanced cry analysis failed' });
    }
  }
);

// ============================================================
// GET /api/cry-detection/history
// ============================================================

router.get('/history', auth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 30, 100);

    const snap = await db
      .collection('cry-log')
      .where('userEmail', '==', req.user.email)
      .get();

    // Sort in JS to avoid requiring a Firestore composite index
    const logs = snap.docs
      .map(d => decryptLog({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
      .slice(0, limit);

    const stats = {
      totalAnalyses: logs.length,
      typeBreakdown: {
        pain: logs.filter(l => l.cryType === 'pain').length,
        hungry: logs.filter(l => l.cryType === 'hungry').length,
        sleepy: logs.filter(l => l.cryType === 'sleepy').length,
        discomfort: logs.filter(l => l.cryType === 'discomfort').length,
      },
      avgDuration: logs.length
        ? parseFloat((logs.reduce((s, l) => s + (l.duration || 0), 0) / logs.length).toFixed(2))
        : 0,
      avgConfidence: logs.length
        ? Math.round(logs.reduce((s, l) => s + (l.confidence || 0), 0) / logs.length)
        : 0,
    };

    res.json({
      success: true,
      stats,
      logs: logs.slice(0, 10),
      totalRecords: logs.length,
    });
  } catch (err) {
    console.error('[Cry History Error]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch cry history' });
  }
});

// ============================================================
// GET /api/cry-detection/insights
// ============================================================

router.get('/insights', auth, async (req, res) => {
  try {
    const snap = await db
      .collection('cry-log')
      .where('userEmail', '==', req.user.email)
      .get();

    // Sort in JS to avoid requiring a Firestore composite index
    const logs = snap.docs
      .map(d => decryptLog(d.data()))
      .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
      .slice(0, 100);

    let mostCommonType = 'N/A';
    if (logs.length > 0) {
      const counts = {};
      logs.forEach(l => { counts[l.cryType] = (counts[l.cryType] || 0) + 1; });
      mostCommonType = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    }

    res.json({
      success: true,
      insights: {
        totalAnalyses: logs.length,
        mostCommonType,
        trends: logs.length >= 10 ? 'Pattern data available' : 'Collecting data...',
        recommendations: [
          'Continue monitoring cry patterns over time',
          'Note contextual factors (feeding time, sleep, environment)',
          'Share patterns with your pediatrician at checkups',
        ],
      },
    });
  } catch (err) {
    console.error('[Cry Insights Error]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch insights' });
  }
});

module.exports = router;
