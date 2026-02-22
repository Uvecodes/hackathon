'use strict';

// ─────────────────────────────────────────────────────────────
// EXERCISE ENGINE
// Condition-aware, fitness-level-filtered exercise recommendations
// for the Maternal Wellness platform.
// ─────────────────────────────────────────────────────────────

// ── Base exercise data per stage ─────────────────────────────

const BASE_EXERCISES = {
  preconception: [
    { name: 'Walking',                    duration: '30 min',    intensity: 'low',      benefit: 'Cardiovascular health and mood boost' },
    { name: 'Prenatal Yoga',              duration: '45 min',    intensity: 'low',      benefit: 'Flexibility, core strength, and stress relief' },
    { name: 'Swimming',                   duration: '30 min',    intensity: 'moderate', benefit: 'Full-body workout, low impact on joints' },
    { name: 'Cycling',                    duration: '30 min',    intensity: 'moderate', benefit: 'Leg strength and cardiovascular endurance' },
    { name: 'Light Strength Training',    duration: '30 min',    intensity: 'moderate', benefit: 'Build muscle tone before pregnancy' },
    { name: 'Pilates',                    duration: '45 min',    intensity: 'low',      benefit: 'Core stability and flexibility' },
    { name: 'HIIT (beginner-friendly)',   duration: '20 min',    intensity: 'high',     benefit: 'Efficient fat-burning and cardiovascular fitness' },
  ],
  'trimester-1': [
    { name: 'Prenatal Yoga',              duration: '30 min',    intensity: 'low',      benefit: 'Nausea relief and relaxation' },
    { name: 'Walking',                    duration: '20–30 min', intensity: 'low',      benefit: 'Gentle cardio, easy to adjust pace' },
    { name: 'Pelvic Floor Exercises',     duration: '10 min',    intensity: 'low',      benefit: 'Strengthen pelvic support muscles early' },
    { name: 'Swimming',                   duration: '20 min',    intensity: 'low',      benefit: 'Low-impact cardio, eases nausea' },
    { name: 'Stretching',                 duration: '15–20 min', intensity: 'low',      benefit: 'Reduce tension and improve flexibility' },
    { name: 'Stationary Cycling',         duration: '20 min',    intensity: 'moderate', benefit: 'Cardio without balance risks' },
  ],
  'trimester-2': [
    { name: 'Prenatal Yoga (Modified)',   duration: '30–45 min', intensity: 'low',      benefit: 'Flexibility, strength, and relaxation' },
    { name: 'Pelvic Floor Exercises',     duration: '10–15 min', intensity: 'low',      benefit: 'Birth preparation and bladder support' },
    { name: 'Walking',                    duration: '30 min',    intensity: 'moderate', benefit: 'Maintain cardiovascular endurance' },
    { name: 'Swimming',                   duration: '30–40 min', intensity: 'moderate', benefit: 'Full-body support, reduces swelling' },
    { name: 'Kegel Exercises',            duration: '5–10 min',  intensity: 'low',      benefit: 'Strengthen pelvic floor muscles' },
    { name: 'Light Resistance Training',  duration: '30 min',    intensity: 'moderate', benefit: 'Maintain muscle tone safely' },
    { name: 'Prenatal Pilates',           duration: '30 min',    intensity: 'moderate', benefit: 'Core stability and posture' },
  ],
  'trimester-3': [
    { name: 'Walking',                    duration: '20–30 min', intensity: 'low',      benefit: 'Gentle movement, encourages engagement' },
    { name: 'Prenatal Yoga (Gentle)',     duration: '20–30 min', intensity: 'low',      benefit: 'Prepare for labor, reduce back pain' },
    { name: 'Pelvic Floor Exercises',     duration: '10 min',    intensity: 'low',      benefit: 'Labor preparation and pelvic strength' },
    { name: 'Cat-Cow Stretches',          duration: '10–15 min', intensity: 'low',      benefit: 'Back pain relief' },
    { name: 'Seated Stretches',           duration: '15 min',    intensity: 'low',      benefit: 'Reduce tension without strain' },
    { name: 'Swimming',                   duration: '20–30 min', intensity: 'low',      benefit: 'Buoyancy relieves joint pressure' },
  ],
  'postpartum-0-6w': [
    { name: 'Pelvic Floor Rehab',         duration: '10–15 min', intensity: 'low',      benefit: 'Recovery, continence, and healing' },
    { name: 'Gentle Walking',             duration: '10–20 min', intensity: 'low',      benefit: 'Start gentle cardio (weeks 2+)' },
    { name: 'Abdominal Breathing',        duration: '5–10 min',  intensity: 'low',      benefit: 'Core activation and diaphragm recovery' },
    { name: 'Stretching',                 duration: '10–15 min', intensity: 'low',      benefit: 'Release tension from labour and newborn care' },
    { name: 'Postnatal Yoga (Very Gentle)', duration: '15–20 min', intensity: 'low',   benefit: 'Mental health support and gentle movement' },
  ],
  'postpartum-6w-6m': [
    { name: 'Pelvic Floor Rehab',         duration: '10–15 min', intensity: 'low',      benefit: 'Progressive recovery' },
    { name: 'Walking',                    duration: '20–30 min', intensity: 'low',      benefit: 'Build cardiovascular base gently' },
    { name: 'Postnatal Yoga',             duration: '20–30 min', intensity: 'low',      benefit: 'Core restoration and flexibility' },
    { name: 'Light Resistance Training',  duration: '20 min',    intensity: 'moderate', benefit: 'Rebuild muscle tone' },
    { name: 'Swimming',                   duration: '20–30 min', intensity: 'moderate', benefit: 'Low-impact full-body recovery' },
    { name: 'Abdominal Activation',       duration: '10–15 min', intensity: 'low',      benefit: 'Safe core strengthening after birth' },
  ],
  'postpartum-6m+': [
    { name: 'Walking / Jogging',          duration: '30 min',    intensity: 'moderate', benefit: 'Progressive cardio return' },
    { name: 'Postnatal Yoga',             duration: '30–45 min', intensity: 'moderate', benefit: 'Strength, flexibility, and mental health' },
    { name: 'Strength Training',          duration: '30–45 min', intensity: 'moderate', benefit: 'Rebuild muscle and bone density' },
    { name: 'Swimming',                   duration: '30–40 min', intensity: 'moderate', benefit: 'Full-body cardiovascular fitness' },
    { name: 'Cycling',                    duration: '30 min',    intensity: 'moderate', benefit: 'Lower-body strength and cardio' },
    { name: 'Pilates / Barre',            duration: '45 min',    intensity: 'moderate', benefit: 'Core, posture, and toning' },
    { name: 'HIIT (cleared by provider)', duration: '20–30 min', intensity: 'high',     benefit: 'Efficient full-body conditioning' },
  ],
};

// ── Condition rules ───────────────────────────────────────────

/**
 * Returns { remove: Set<string>, addNote: Map<name, string>, advisory: string|null }
 */
function getConditionRules(conditions = []) {
  const remove  = new Set();
  const addNote = new Map();
  const advisories = [];

  const has = (...vals) => vals.some(v => conditions.includes(v));

  if (has('preeclampsia', 'gestational-hypertension')) {
    remove.add('HIIT (beginner-friendly)');
    remove.add('HIIT (cleared by provider)');
    remove.add('Light Resistance Training');
    addNote.set('Walking', 'Keep pace easy; monitor blood pressure before and after');
    addNote.set('Swimming', 'Preferred low-BP-impact option — gentle laps only');
    advisories.push('Due to hypertension / preeclampsia, high-intensity exercise has been removed. Always consult your care provider before starting any exercise programme.');
  }

  if (has('placenta-previa')) {
    // Only walking is safe; remove almost everything
    for (const ex of [
      'Swimming', 'Cycling', 'Stationary Cycling', 'Prenatal Yoga',
      'Prenatal Yoga (Modified)', 'Prenatal Yoga (Gentle)', 'Postnatal Yoga',
      'Postnatal Yoga (Very Gentle)', 'Light Resistance Training',
      'Strength Training', 'Pilates', 'Prenatal Pilates', 'Pilates / Barre',
      'HIIT (beginner-friendly)', 'HIIT (cleared by provider)',
    ]) remove.add(ex);
    addNote.set('Walking', 'Short, flat walks only — avoid hills and strenuous effort');
    advisories.push('Placenta previa requires significant exercise restriction. Only very gentle walking is shown. Consult your obstetric team before any activity.');
  }

  if (has('hyperemesis-gravidarum')) {
    remove.add('HIIT (beginner-friendly)');
    remove.add('Swimming');
    remove.add('Cycling');
    remove.add('Stationary Cycling');
    for (const ex of ['Walking', 'Stretching', 'Seated Stretches', 'Prenatal Yoga']) {
      addNote.set(ex, 'Stay seated or reclined if needed; stop immediately if nausea worsens');
    }
    advisories.push('Hyperemesis gravidarum: only gentle, seated or supine exercises are shown. Rest is equally important — exercise only when you feel able.');
  }

  if (has('pcos', 'thyroid-disorder')) {
    addNote.set('Walking', 'Moderate-paced walks help manage weight and hormone balance');
    addNote.set('Swimming', 'Excellent metabolic support with low joint stress');
    if (!conditions.includes('preeclampsia') && !conditions.includes('gestational-hypertension')) {
      addNote.set('Light Resistance Training', 'Resistance training improves insulin sensitivity — great for PCOS');
    }
  }

  if (has('gestational-diabetes', 'diabetes-type-1', 'diabetes-type-2')) {
    addNote.set('Walking', 'A 15-min walk after meals is proven to lower post-meal blood glucose');
    addNote.set('Swimming', 'Consistent aerobic exercise improves insulin sensitivity');
    advisories.push('For diabetes management, post-meal walking (15 min) is highly recommended. Monitor blood glucose levels before and after exercise.');
  }

  if (has('multiples-pregnancy')) {
    remove.add('HIIT (beginner-friendly)');
    remove.add('Light Resistance Training');
    remove.add('Strength Training');
    remove.add('Cycling');
    addNote.set('Walking', 'Shorter, frequent walks (10–15 min) are safer than longer sessions');
    advisories.push('Multiple pregnancy (twins/more): reduced intensity. Short walks and gentle yoga/stretching are prioritised. Follow your specialist\'s guidance.');
  }

  if (has('asthma')) {
    addNote.set('Swimming', 'Humid pool air is often better tolerated for asthma — preferred cardio choice');
    addNote.set('Walking', 'Avoid cold or dry outdoor air; indoor walking is preferable');
  }

  return {
    remove,
    addNote,
    advisory: advisories.length ? advisories.join(' ') : null,
  };
}

// ── Fitness level filter ──────────────────────────────────────

const INTENSITY_LEVELS = { low: 1, moderate: 2, high: 3 };

/**
 * Map fitnessLevel to maximum allowed intensity level.
 */
function maxIntensityFor(fitnessLevel = 'moderate') {
  const map = {
    sedentary: 1,  // low only
    beginner:  1,  // low only
    moderate:  2,  // low + moderate
    active:    3,  // all
    athlete:   3,  // all
  };
  return map[fitnessLevel] ?? 2;
}

// ── Public API ────────────────────────────────────────────────

/**
 * Returns personalised exercise list for a given user context.
 * @param {string}   stage        - pregnancyStage
 * @param {string[]} conditions   - medical conditions array
 * @param {string}   fitnessLevel - sedentary | beginner | moderate | active | athlete
 * @returns {{ exercises: object[], conditionNotes: string|null }}
 */
function getExercises(stage = 'trimester-1', conditions = [], fitnessLevel = 'moderate') {
  const baseList = BASE_EXERCISES[stage] || BASE_EXERCISES['trimester-1'];
  const { remove, addNote, advisory } = getConditionRules(conditions);
  const maxLevel = maxIntensityFor(fitnessLevel);

  const exercises = baseList
    .filter(ex => {
      if (remove.has(ex.name)) return false;
      const level = INTENSITY_LEVELS[ex.intensity] ?? 2;
      return level <= maxLevel;
    })
    .map(ex => ({
      ...ex,
      ...(addNote.has(ex.name) ? { note: addNote.get(ex.name) } : {}),
    }));

  return {
    exercises,
    conditionNotes: advisory,
    fitnessLevel,
    stage,
  };
}

module.exports = { getExercises };
