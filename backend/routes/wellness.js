const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const { db } = require('../config/firebase');
const { calculateBaseNutrition, getMicronutrientRequirements, generateMealPlan } = require('../utils/nutrition-engine');
const { getExercises } = require('../utils/exercise-engine');

// ============================================
// GET /api/wellness/dashboard
// Fetch wellness dashboard metrics
// ============================================

router.get('/dashboard', auth, async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.email).get();

    if (!userDoc.exists) {
      return res.status(404).json({ success: false, message: 'User profile not found' });
    }

    const user = userDoc.data();

    // Calculate pregnancy week from due date
    let pregnancyWeek = 1;
    if (user.dueDate) {
      const daysLeft = Math.ceil((new Date(user.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
      pregnancyWeek = Math.max(1, 40 - Math.floor(daysLeft / 7));
    }

    // Fetch check-ins without orderBy to avoid composite-index requirement
    const checkinsSnap = await db
      .collection('checkins')
      .where('email', '==', req.user.email)
      .get();

    const checkins = checkinsSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
      .slice(0, 10);

    // ── Multi-factor wellness score ────────────────────────────
    // Mood  40% | Sleep 30% | Nutrition 20% | Symptom penalty -10%
    const moodScores    = { great: 5, good: 4, okay: 3, bad: 2, terrible: 1 };
    const nutritionMap  = { excellent: 5, good: 4, okay: 3, poor: 2, skipped: 1 };

    let wellnessScore = null; // null = not enough data

    if (checkins.length > 0) {
      const avgMood = checkins.reduce((s, c) => s + (moodScores[c.mood] || 3), 0) / checkins.length;
      const moodComponent = (avgMood / 5) * 40;

      const sleepEntries = checkins.filter(c => c.sleep != null);
      const avgSleep = sleepEntries.length
        ? sleepEntries.reduce((s, c) => s + c.sleep, 0) / sleepEntries.length
        : null;
      const sleepComponent = avgSleep != null
        ? Math.min(1, avgSleep / 8) * 30
        : 15; // partial score if no sleep data

      const nutritionEntries = checkins.filter(c => c.nutrition);
      const avgNutrition = nutritionEntries.length
        ? nutritionEntries.reduce((s, c) => s + (nutritionMap[c.nutrition] || 3), 0) / nutritionEntries.length
        : null;
      const nutritionComponent = avgNutrition != null
        ? (avgNutrition / 5) * 20
        : 10;

      const avgSymptomCount = checkins.reduce((s, c) => {
        const syms = (c.symptoms || []).filter(sym => sym !== 'none');
        return s + syms.length;
      }, 0) / checkins.length;
      const symptomPenalty = Math.min(10, avgSymptomCount * 2);

      wellnessScore = Math.round(
        Math.max(0, Math.min(100,
          moodComponent + sleepComponent + nutritionComponent - symptomPenalty
        ))
      );
    }

    res.json({
      success: true,
      dashboardData: {
        pregnancyWeek,
        pregnancyStage: user.pregnancyStage,
        wellnessScore,
        totalCheckins: checkins.length,
        recentCheckins: checkins.slice(0, 5),
        userName: user.name,
      },
    });
  } catch (err) {
    console.error('[Dashboard Error]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard' });
  }
});

// ============================================
// POST /api/wellness/checkin
// Log a daily wellness check-in
// ============================================

router.post(
  '/checkin',
  auth,
  [
    body('mood')
      .isIn(['great', 'good', 'okay', 'bad', 'terrible'])
      .withMessage('Invalid mood value'),
    body('symptoms')
      .optional()
      .isArray()
      .withMessage('Symptoms must be an array'),
    body('nutrition')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Nutrition notes too long'),
    body('sleep')
      .optional()
      .isFloat({ min: 0, max: 24 })
      .withMessage('Sleep hours must be between 0 and 24'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Notes too long'),
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

      const { mood, symptoms, nutrition, sleep, notes } = req.body;

      const checkInData = {
        email: req.user.email,
        mood,
        symptoms: symptoms || [],
        nutrition: nutrition || null,
        sleep: sleep != null ? parseFloat(sleep) : null,
        notes: notes || null,
        timestamp: new Date().toISOString(),
      };

      const docRef = await db.collection('checkins').add(checkInData);

      res.status(201).json({
        success: true,
        message: 'Check-in saved successfully',
        checkinId: docRef.id,
        checkin: checkInData,
      });
    } catch (err) {
      console.error('[Check-in Error]', err);
      res.status(500).json({ success: false, message: 'Failed to save check-in' });
    }
  }
);

// ============================================
// GET /api/wellness/exercises
// Personalised, condition-aware exercise recommendations
// ============================================

router.get('/exercises', auth, async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.email).get();
    const user = userDoc.exists ? userDoc.data() : {};

    const result = getExercises(
      user.pregnancyStage || 'trimester-1',
      user.conditions || [],
      user.fitnessLevel || 'moderate',
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error('[Exercises Error]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch exercises' });
  }
});

// ============================================
// GET /api/wellness/nutrition
// Personalised nutrition: calories, macros, micronutrients, meal plan
// ============================================

router.get('/nutrition', auth, async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.email).get();
    const user = userDoc.exists ? userDoc.data() : {};

    const calorieData    = calculateBaseNutrition(user);
    const micronutrients = getMicronutrientRequirements(
      user.pregnancyStage || 'trimester-1',
      user.conditions || [],
      user.dietaryPreferences || [],
    );
    const mealPlan = generateMealPlan(user);

    res.json({
      success: true,
      stage: user.pregnancyStage || 'trimester-1',
      calorieTarget: calorieData.dailyCalories,
      macros: calorieData.macros,
      hydrationMl: calorieData.hydrationMl,
      bmr: calorieData.bmr,
      tdee: calorieData.tdee,
      micronutrients,
      mealPlan,
    });
  } catch (err) {
    console.error('[Nutrition Error]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch nutrition guide' });
  }
});

module.exports = router;
