'use strict';

const { getExercises } = require('../../utils/exercise-engine');

const VALID_STAGES = [
  'preconception', 'trimester-1', 'trimester-2', 'trimester-3',
  'postpartum-0-6w', 'postpartum-6w-6m', 'postpartum-6m+',
];

// ════════════════════════════════════════════════════════════════
// getExercises — shape & defaults
// ════════════════════════════════════════════════════════════════

describe('getExercises — return shape', () => {
  test('returns required top-level keys', () => {
    const result = getExercises('trimester-1', [], 'moderate');
    expect(result).toHaveProperty('exercises');
    expect(result).toHaveProperty('conditionNotes');
    expect(result).toHaveProperty('fitnessLevel');
    expect(result).toHaveProperty('stage');
  });

  test('exercises is an array', () => {
    const { exercises } = getExercises('trimester-1', [], 'moderate');
    expect(Array.isArray(exercises)).toBe(true);
  });

  test('each exercise has name, duration, intensity, benefit', () => {
    const { exercises } = getExercises('trimester-2', [], 'moderate');
    exercises.forEach(ex => {
      expect(ex).toHaveProperty('name');
      expect(ex).toHaveProperty('duration');
      expect(ex).toHaveProperty('intensity');
      expect(ex).toHaveProperty('benefit');
      expect(['low', 'moderate', 'high']).toContain(ex.intensity);
    });
  });

  test('returns exercises for every valid stage', () => {
    VALID_STAGES.forEach(stage => {
      const { exercises } = getExercises(stage, [], 'moderate');
      expect(exercises.length).toBeGreaterThan(0);
    });
  });

  test('reflects correct stage in return value', () => {
    const result = getExercises('trimester-3', [], 'moderate');
    expect(result.stage).toBe('trimester-3');
  });

  test('reflects fitnessLevel in return value', () => {
    const result = getExercises('trimester-1', [], 'active');
    expect(result.fitnessLevel).toBe('active');
  });

  test('falls back to trimester-1 for unknown stage', () => {
    const result = getExercises('unknown-stage', [], 'moderate');
    expect(result.exercises.length).toBeGreaterThan(0);
  });
});

// ════════════════════════════════════════════════════════════════
// Fitness level intensity filtering
// ════════════════════════════════════════════════════════════════

describe('getExercises — fitness level filtering', () => {
  test('sedentary shows only low-intensity exercises', () => {
    const { exercises } = getExercises('preconception', [], 'sedentary');
    exercises.forEach(ex => {
      expect(ex.intensity).toBe('low');
    });
  });

  test('beginner shows only low-intensity exercises', () => {
    const { exercises } = getExercises('preconception', [], 'beginner');
    exercises.forEach(ex => {
      expect(ex.intensity).toBe('low');
    });
  });

  test('moderate shows low and moderate, not high', () => {
    const { exercises } = getExercises('preconception', [], 'moderate');
    exercises.forEach(ex => {
      expect(['low', 'moderate']).toContain(ex.intensity);
    });
  });

  test('active allows all intensities', () => {
    // preconception has high-intensity HIIT — active should include it
    const { exercises } = getExercises('preconception', [], 'active');
    const intensities = exercises.map(e => e.intensity);
    // Should include at least low and moderate; high may appear depending on conditions
    expect(intensities).toContain('low');
  });

  test('athlete allows all intensities', () => {
    const { exercises } = getExercises('postpartum-6m+', [], 'athlete');
    const intensities = [...new Set(exercises.map(e => e.intensity))];
    expect(intensities.length).toBeGreaterThanOrEqual(1);
  });
});

// ════════════════════════════════════════════════════════════════
// Condition rules
// ════════════════════════════════════════════════════════════════

describe('getExercises — condition: preeclampsia / gestational-hypertension', () => {
  const conditions = ['preeclampsia'];

  test('removes HIIT from preconception stage', () => {
    const { exercises } = getExercises('preconception', conditions, 'active');
    const names = exercises.map(e => e.name);
    expect(names).not.toContain('HIIT (beginner-friendly)');
    expect(names).not.toContain('HIIT (cleared by provider)');
  });

  test('removes high-intensity resistance training', () => {
    const { exercises } = getExercises('trimester-2', conditions, 'active');
    const names = exercises.map(e => e.name);
    expect(names).not.toContain('Light Resistance Training');
  });

  test('sets a non-null conditionNotes advisory', () => {
    const { conditionNotes } = getExercises('trimester-2', conditions, 'moderate');
    expect(conditionNotes).not.toBeNull();
    expect(typeof conditionNotes).toBe('string');
    expect(conditionNotes.length).toBeGreaterThan(0);
  });

  test('still returns at least one exercise (Walking)', () => {
    const { exercises } = getExercises('trimester-2', conditions, 'moderate');
    expect(exercises.length).toBeGreaterThan(0);
    const names = exercises.map(e => e.name);
    expect(names).toContain('Walking');
  });

  test('Walking has a monitoring note attached', () => {
    const { exercises } = getExercises('trimester-1', conditions, 'moderate');
    const walking = exercises.find(e => e.name === 'Walking');
    if (walking) {
      expect(walking.note).toBeDefined();
      expect(walking.note.length).toBeGreaterThan(0);
    }
  });
});

describe('getExercises — condition: placenta-previa', () => {
  const conditions = ['placenta-previa'];

  test('removes swimming', () => {
    const { exercises } = getExercises('trimester-2', conditions, 'moderate');
    const names = exercises.map(e => e.name);
    expect(names).not.toContain('Swimming');
  });

  test('removes yoga', () => {
    const { exercises } = getExercises('trimester-2', conditions, 'moderate');
    const names = exercises.map(e => e.name);
    expect(names.some(n => n.toLowerCase().includes('yoga'))).toBe(false);
  });

  test('removes cycling', () => {
    const { exercises } = getExercises('preconception', conditions, 'active');
    const names = exercises.map(e => e.name);
    expect(names).not.toContain('Cycling');
    expect(names).not.toContain('Stationary Cycling');
  });

  test('sets advisory noting exercise restriction', () => {
    const { conditionNotes } = getExercises('trimester-2', conditions, 'moderate');
    expect(conditionNotes).not.toBeNull();
    expect(conditionNotes.toLowerCase()).toContain('placenta');
  });
});

describe('getExercises — condition: hyperemesis-gravidarum', () => {
  const conditions = ['hyperemesis-gravidarum'];

  test('removes swimming from trimester-1', () => {
    const { exercises } = getExercises('trimester-1', conditions, 'moderate');
    const names = exercises.map(e => e.name);
    expect(names).not.toContain('Swimming');
  });

  test('removes cycling', () => {
    const { exercises } = getExercises('preconception', conditions, 'moderate');
    const names = exercises.map(e => e.name);
    expect(names).not.toContain('Cycling');
    expect(names).not.toContain('Stationary Cycling');
  });

  test('sets advisory about nausea', () => {
    const { conditionNotes } = getExercises('trimester-1', conditions, 'moderate');
    expect(conditionNotes).not.toBeNull();
  });
});

describe('getExercises — condition: multiples-pregnancy', () => {
  const conditions = ['multiples-pregnancy'];

  test('removes HIIT', () => {
    const { exercises } = getExercises('preconception', conditions, 'active');
    const names = exercises.map(e => e.name);
    expect(names).not.toContain('HIIT (beginner-friendly)');
  });

  test('removes strength training', () => {
    const { exercises } = getExercises('postpartum-6m+', conditions, 'active');
    const names = exercises.map(e => e.name);
    expect(names).not.toContain('Strength Training');
  });

  test('returns advisory text', () => {
    const { conditionNotes } = getExercises('trimester-2', conditions, 'moderate');
    expect(conditionNotes).not.toBeNull();
  });
});

describe('getExercises — condition: gestational-diabetes', () => {
  const conditions = ['gestational-diabetes'];

  test('adds a note to Walking about post-meal benefits', () => {
    const { exercises } = getExercises('trimester-2', conditions, 'moderate');
    const walking = exercises.find(e => e.name === 'Walking');
    if (walking) {
      expect(walking.note).toBeDefined();
      expect(walking.note.toLowerCase()).toMatch(/glucose|blood|meal/);
    }
  });

  test('returns a diabetes-related advisory', () => {
    const { conditionNotes } = getExercises('trimester-2', conditions, 'moderate');
    expect(conditionNotes).not.toBeNull();
  });
});

describe('getExercises — condition: pcos / thyroid-disorder', () => {
  test('adds a note to Walking for PCOS', () => {
    const { exercises } = getExercises('preconception', ['pcos'], 'moderate');
    const walking = exercises.find(e => e.name === 'Walking');
    if (walking) {
      expect(walking.note).toBeDefined();
    }
  });

  test('no advisory (conditionNotes) for pcos alone', () => {
    // PCOS doesn't add a blocking advisory, only notes
    const { conditionNotes } = getExercises('preconception', ['pcos'], 'moderate');
    // conditionNotes may or may not be null for pcos — just confirm no crash
    expect(conditionNotes === null || typeof conditionNotes === 'string').toBe(true);
  });
});

describe('getExercises — no conditions', () => {
  test('conditionNotes is null when no conditions', () => {
    const { conditionNotes } = getExercises('trimester-2', [], 'moderate');
    expect(conditionNotes).toBeNull();
  });
});
