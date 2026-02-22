const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { db, auth } = require('../config/firebase');

/**
 * Middleware: Verify Firebase ID token and attach user to req
 */
async function verifyFirebaseToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required',
      });
    }
    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(idToken);
    req.firebaseUser = {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };
    next();
  } catch (err) {
    console.error('[verifyFirebaseToken]', err);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
}

// ─── Valid enum lists ────────────────────────────────────────

const VALID_STAGES = [
  'preconception',
  'trimester-1', 'trimester-2', 'trimester-3',
  'postpartum-0-6w', 'postpartum-6w-6m', 'postpartum-6m+',
];

const VALID_CONDITIONS = [
  'pcos', 'endometriosis', 'thyroid-disorder', 'diabetes-type-1', 'diabetes-type-2',
  'hypertension', 'anemia', 'asthma', 'depression', 'anxiety',
  'gestational-diabetes', 'gestational-hypertension', 'preeclampsia',
  'hyperemesis-gravidarum', 'placenta-previa', 'multiples-pregnancy',
];

const VALID_ALLERGIES = [
  'peanuts', 'tree-nuts', 'dairy', 'eggs', 'soy', 'wheat', 'shellfish', 'fish', 'sesame',
];

const VALID_INTOLERANCES = ['lactose', 'gluten', 'histamine', 'fodmap'];

const VALID_DIET_PREFS = [
  'vegetarian', 'vegan', 'pescatarian', 'omnivore', 'keto', 'paleo',
  'mediterranean', 'halal', 'kosher', 'gluten-free', 'dairy-free',
];

const VALID_FITNESS = ['sedentary', 'beginner', 'moderate', 'active', 'athlete'];
const VALID_ACTIVITY = ['low', 'moderate', 'high'];
const VALID_RECOVERY = ['vaginal', 'c-section', 'assisted-vaginal', 'other'];

// ─── Validators ──────────────────────────────────────────────

const validateCompleteProfile = [
  // ── Step 1 ──────────────────────────────────────────────────
  body('name')
    .trim()
    .escape()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be 2–100 characters'),

  body('pregnancyStage')
    .isIn(VALID_STAGES)
    .withMessage(`Invalid pregnancy stage. Must be one of: ${VALID_STAGES.join(', ')}`),

  body('dueDate')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('Invalid due date format'),

  // ── Step 2: Body metrics ─────────────────────────────────────
  body('age')
    .optional({ nullable: true })
    .isInt({ min: 15, max: 60 })
    .withMessage('Age must be between 15 and 60'),

  body('heightCm')
    .optional({ nullable: true })
    .isFloat({ min: 100, max: 250 })
    .withMessage('Height must be between 100 and 250 cm'),

  body('prePregnancyWeightKg')
    .optional({ nullable: true })
    .isFloat({ min: 30, max: 300 })
    .withMessage('Weight must be between 30 and 300 kg'),

  body('currentWeightKg')
    .optional({ nullable: true })
    .isFloat({ min: 30, max: 300 })
    .withMessage('Current weight must be between 30 and 300 kg'),

  body('fitnessLevel')
    .optional({ nullable: true })
    .isIn(VALID_FITNESS)
    .withMessage(`Fitness level must be one of: ${VALID_FITNESS.join(', ')}`),

  body('activityLevel')
    .optional({ nullable: true })
    .isIn(VALID_ACTIVITY)
    .withMessage(`Activity level must be one of: ${VALID_ACTIVITY.join(', ')}`),

  // ── Step 3: Health profile ───────────────────────────────────
  body('conditions')
    .optional({ nullable: true })
    .isArray()
    .withMessage('Conditions must be an array'),

  body('conditions.*')
    .optional()
    .isIn(VALID_CONDITIONS)
    .withMessage('Invalid condition value'),

  body('allergies')
    .optional({ nullable: true })
    .isArray()
    .withMessage('Allergies must be an array'),

  body('allergies.*')
    .optional()
    .isIn(VALID_ALLERGIES)
    .withMessage('Invalid allergy value'),

  body('foodIntolerances')
    .optional({ nullable: true })
    .isArray()
    .withMessage('Food intolerances must be an array'),

  body('foodIntolerances.*')
    .optional()
    .isIn(VALID_INTOLERANCES)
    .withMessage('Invalid food intolerance value'),

  body('dietaryPreferences')
    .optional({ nullable: true })
    .isArray()
    .withMessage('Dietary preferences must be an array'),

  body('dietaryPreferences.*')
    .optional()
    .isIn(VALID_DIET_PREFS)
    .withMessage('Invalid dietary preference value'),

  // ── Step 4: Postpartum-specific ──────────────────────────────
  body('deliveryDate')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('Invalid delivery date format'),

  body('recoveryType')
    .optional({ nullable: true })
    .isIn(VALID_RECOVERY)
    .withMessage(`Recovery type must be one of: ${VALID_RECOVERY.join(', ')}`),

  body('breastfeeding')
    .optional({ nullable: true })
    .isBoolean()
    .withMessage('Breastfeeding must be true or false'),

  body('pumping')
    .optional({ nullable: true })
    .isBoolean()
    .withMessage('Pumping must be true or false'),
];

// ============================================
// POST /api/auth/complete-profile
// Create or update Firestore user profile after Firebase Auth signup
// ============================================

router.post('/complete-profile', verifyFirebaseToken, validateCompleteProfile, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
      });
    }

    const email = req.firebaseUser.email;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required for profile creation',
      });
    }

    const {
      // Step 1
      name, pregnancyStage, dueDate,
      // Step 2
      age, heightCm, prePregnancyWeightKg, currentWeightKg, fitnessLevel, activityLevel,
      // Step 3
      conditions, allergies, foodIntolerances, dietaryPreferences,
      // Step 4
      deliveryDate, recoveryType, breastfeeding, pumping,
    } = req.body;

    const profileData = {
      email,
      name,
      pregnancyStage,
      dueDate: dueDate || null,

      // Body metrics
      age: age != null ? parseInt(age) : null,
      heightCm: heightCm != null ? parseFloat(heightCm) : null,
      prePregnancyWeightKg: prePregnancyWeightKg != null ? parseFloat(prePregnancyWeightKg) : null,
      currentWeightKg: currentWeightKg != null ? parseFloat(currentWeightKg) : null,
      fitnessLevel: fitnessLevel || null,
      activityLevel: activityLevel || null,

      // Health profile
      conditions: Array.isArray(conditions) ? conditions : [],
      allergies: Array.isArray(allergies) ? allergies : [],
      foodIntolerances: Array.isArray(foodIntolerances) ? foodIntolerances : [],
      dietaryPreferences: Array.isArray(dietaryPreferences) ? dietaryPreferences : [],

      // Postpartum
      deliveryDate: deliveryDate || null,
      recoveryType: recoveryType || null,
      breastfeeding: breastfeeding != null ? Boolean(breastfeeding) : null,
      pumping: pumping != null ? Boolean(pumping) : null,

      updatedAt: new Date().toISOString(),
    };

    const existingDoc = await db.collection('users').doc(email).get();
    if (existingDoc.exists) {
      await db.collection('users').doc(email).update(profileData);
    } else {
      await db.collection('users').doc(email).set({
        ...profileData,
        createdAt: new Date().toISOString(),
      });
    }

    // Return the full profile so the frontend can cache it
    res.status(201).json({
      success: true,
      message: 'Profile saved successfully',
      user: {
        email,
        name,
        pregnancyStage,
        dueDate: profileData.dueDate,
        age: profileData.age,
        heightCm: profileData.heightCm,
        prePregnancyWeightKg: profileData.prePregnancyWeightKg,
        currentWeightKg: profileData.currentWeightKg,
        fitnessLevel: profileData.fitnessLevel,
        activityLevel: profileData.activityLevel,
        conditions: profileData.conditions,
        allergies: profileData.allergies,
        foodIntolerances: profileData.foodIntolerances,
        dietaryPreferences: profileData.dietaryPreferences,
        breastfeeding: profileData.breastfeeding,
      },
    });
  } catch (err) {
    console.error('[Complete Profile Error]', err);
    res.status(500).json({
      success: false,
      message: 'Failed to save profile. Please try again.',
    });
  }
});

module.exports = router;
