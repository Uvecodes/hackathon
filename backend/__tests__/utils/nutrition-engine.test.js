'use strict';

const {
  calculateBaseNutrition,
  getMicronutrientRequirements,
  generateMealPlan,
} = require('../../utils/nutrition-engine');

// ════════════════════════════════════════════════════════════════
// calculateBaseNutrition
// ════════════════════════════════════════════════════════════════

describe('calculateBaseNutrition', () => {
  const baseProfile = {
    age: 28,
    heightCm: 163,
    currentWeightKg: 65,
    fitnessLevel: 'moderate',
    pregnancyStage: 'trimester-1',
    breastfeeding: false,
  };

  test('returns required keys', () => {
    const result = calculateBaseNutrition(baseProfile);
    expect(result).toHaveProperty('dailyCalories');
    expect(result).toHaveProperty('macros');
    expect(result).toHaveProperty('hydrationMl');
    expect(result).toHaveProperty('bmr');
    expect(result).toHaveProperty('tdee');
    expect(result.macros).toHaveProperty('protein');
    expect(result.macros).toHaveProperty('carbs');
    expect(result.macros).toHaveProperty('fat');
    expect(result.macros).toHaveProperty('proteinPct');
    expect(result.macros).toHaveProperty('carbPct');
    expect(result.macros).toHaveProperty('fatPct');
  });

  test('calculates correct BMR for known values (Mifflin-St Jeor female)', () => {
    // BMR = (10×65) + (6.25×163) − (5×28) − 161 = 650 + 1018.75 − 140 − 161 = 1367.75 ≈ 1368
    const result = calculateBaseNutrition(baseProfile);
    expect(result.bmr).toBe(1368);
  });

  test('TDEE applies moderate fitness multiplier (1.55)', () => {
    const result = calculateBaseNutrition(baseProfile);
    expect(result.tdee).toBe(Math.round(result.bmr * 1.55));
  });

  test('trimester-2 adds 350 kcal to TDEE', () => {
    const t1 = calculateBaseNutrition({ ...baseProfile, pregnancyStage: 'trimester-1' });
    const t2 = calculateBaseNutrition({ ...baseProfile, pregnancyStage: 'trimester-2' });
    expect(t2.dailyCalories).toBe(t1.dailyCalories + 350);
  });

  test('trimester-3 adds 450 kcal to TDEE', () => {
    const t1 = calculateBaseNutrition({ ...baseProfile, pregnancyStage: 'trimester-1' });
    const t3 = calculateBaseNutrition({ ...baseProfile, pregnancyStage: 'trimester-3' });
    expect(t3.dailyCalories).toBe(t1.dailyCalories + 450);
  });

  test('postpartum-0-6w + breastfeeding adds 500 kcal', () => {
    const base   = calculateBaseNutrition({ ...baseProfile, pregnancyStage: 'postpartum-0-6w', breastfeeding: false });
    const bfUser = calculateBaseNutrition({ ...baseProfile, pregnancyStage: 'postpartum-0-6w', breastfeeding: true });
    expect(bfUser.dailyCalories).toBe(base.tdee + 500);
  });

  test('postpartum-6w-6m without breastfeeding subtracts 200 kcal', () => {
    const result = calculateBaseNutrition({ ...baseProfile, pregnancyStage: 'postpartum-6w-6m', breastfeeding: false });
    expect(result.dailyCalories).toBe(result.tdee - 200);
  });

  test('dailyCalories never drops below 1500', () => {
    // Extremely low weight/height to stress-test the floor
    const result = calculateBaseNutrition({
      age: 50, heightCm: 100, currentWeightKg: 30,
      fitnessLevel: 'sedentary', pregnancyStage: 'postpartum-6m+', breastfeeding: false,
    });
    expect(result.dailyCalories).toBeGreaterThanOrEqual(1500);
  });

  test('macro percentages sum to 100', () => {
    const result = calculateBaseNutrition(baseProfile);
    const sum = result.macros.proteinPct + result.macros.carbPct + result.macros.fatPct;
    expect(sum).toBe(100);
  });

  test('falls back to default values when profile is empty', () => {
    const result = calculateBaseNutrition({});
    expect(result.dailyCalories).toBeGreaterThan(0);
    expect(result.bmr).toBeGreaterThan(0);
  });

  test('uses prePregnancyWeightKg when currentWeightKg is absent', () => {
    const withCurrent  = calculateBaseNutrition({ ...baseProfile, currentWeightKg: 65 });
    const withPre      = calculateBaseNutrition({ ...baseProfile, currentWeightKg: undefined, prePregnancyWeightKg: 65 });
    expect(withCurrent.bmr).toBe(withPre.bmr);
  });

  test('activityLevel "high" maps to active multiplier (1.725)', () => {
    const result = calculateBaseNutrition({ ...baseProfile, activityLevel: 'high' });
    expect(result.tdee).toBe(Math.round(result.bmr * 1.725));
  });

  test('activityLevel "low" maps to sedentary multiplier (1.2)', () => {
    const result = calculateBaseNutrition({ ...baseProfile, activityLevel: 'low' });
    expect(result.tdee).toBe(Math.round(result.bmr * 1.2));
  });

  test('hydration is higher for breastfeeding', () => {
    const bf    = calculateBaseNutrition({ ...baseProfile, pregnancyStage: 'postpartum-0-6w', breastfeeding: true });
    const nonBf = calculateBaseNutrition({ ...baseProfile, pregnancyStage: 'postpartum-0-6w', breastfeeding: false });
    expect(bf.hydrationMl).toBeGreaterThan(nonBf.hydrationMl);
  });

  test('hydrationMl base is at least 2500ml', () => {
    const result = calculateBaseNutrition({ ...baseProfile, pregnancyStage: 'preconception' });
    expect(result.hydrationMl).toBeGreaterThanOrEqual(2500);
  });
});

// ════════════════════════════════════════════════════════════════
// getMicronutrientRequirements
// ════════════════════════════════════════════════════════════════

describe('getMicronutrientRequirements', () => {
  test('returns an array for every valid stage', () => {
    const stages = [
      'preconception', 'trimester-1', 'trimester-2', 'trimester-3',
      'postpartum-0-6w', 'postpartum-6w-6m', 'postpartum-6m+',
    ];
    stages.forEach(stage => {
      const result = getMicronutrientRequirements(stage, [], []);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  test('each nutrient has required fields', () => {
    const result = getMicronutrientRequirements('trimester-1', [], []);
    result.forEach(item => {
      expect(item).toHaveProperty('nutrient');
      expect(item).toHaveProperty('amount');
      expect(item).toHaveProperty('unit');
      expect(item).toHaveProperty('priority');
      expect(item).toHaveProperty('reason');
      expect(item).toHaveProperty('sources');
      expect(item).toHaveProperty('supplementRecommended');
      expect(['critical', 'high', 'medium']).toContain(item.priority);
    });
  });

  test('Folate is critical in trimester-1', () => {
    const result = getMicronutrientRequirements('trimester-1', [], []);
    const folate = result.find(n => n.nutrient === 'Folate');
    expect(folate).toBeDefined();
    expect(folate.priority).toBe('critical');
  });

  test('anemia condition boosts iron priority to critical', () => {
    const without = getMicronutrientRequirements('trimester-2', [], []);
    const with_   = getMicronutrientRequirements('trimester-2', ['anemia'], []);
    const ironWithout = without.find(n => n.nutrient === 'Iron');
    const ironWith    = with_.find(n => n.nutrient === 'Iron');
    expect(ironWith).toBeDefined();
    expect(ironWith.priority).toBe('critical');
    // Priority should be elevated vs without-anemia baseline
    if (ironWithout) {
      const priorityOrder = { critical: 3, high: 2, medium: 1 };
      expect(priorityOrder[ironWith.priority]).toBeGreaterThanOrEqual(priorityOrder[ironWithout.priority]);
    }
  });

  test('vegan diet adds critical B12 with supplementRecommended: true', () => {
    const result = getMicronutrientRequirements('trimester-2', [], ['vegan']);
    const b12 = result.find(n => n.nutrient === 'Vitamin B12');
    expect(b12).toBeDefined();
    expect(b12.priority).toBe('critical');
    expect(b12.supplementRecommended).toBe(true);
  });

  test('gestational-diabetes condition appears in result', () => {
    const result = getMicronutrientRequirements('trimester-2', ['gestational-diabetes'], []);
    // Should not throw; result should contain nutrients
    expect(result.length).toBeGreaterThan(0);
  });

  test('preeclampsia / hypertension condition appears in result', () => {
    const result = getMicronutrientRequirements('trimester-3', ['preeclampsia'], []);
    expect(result.length).toBeGreaterThan(0);
  });

  test('falls back gracefully for unknown stage', () => {
    const result = getMicronutrientRequirements('unknown-stage', [], []);
    expect(Array.isArray(result)).toBe(true);
  });

  test('postpartum stage includes relevant nutrients', () => {
    const result = getMicronutrientRequirements('postpartum-0-6w', [], []);
    expect(result.length).toBeGreaterThan(0);
  });
});

// ════════════════════════════════════════════════════════════════
// generateMealPlan
// ════════════════════════════════════════════════════════════════

describe('generateMealPlan', () => {
  const baseProfile = {
    pregnancyStage: 'trimester-2',
    allergies: [],
    foodIntolerances: [],
    dietaryPreferences: [],
  };

  test('returns all four meal type keys', () => {
    const plan = generateMealPlan(baseProfile);
    expect(plan).toHaveProperty('breakfast');
    expect(plan).toHaveProperty('lunch');
    expect(plan).toHaveProperty('dinner');
    expect(plan).toHaveProperty('snacks');
  });

  test('each meal type returns an array with at least one option', () => {
    const plan = generateMealPlan(baseProfile);
    ['breakfast', 'lunch', 'dinner', 'snacks'].forEach(type => {
      expect(Array.isArray(plan[type])).toBe(true);
      expect(plan[type].length).toBeGreaterThan(0);
    });
  });

  test('each meal option has required fields', () => {
    const plan = generateMealPlan(baseProfile);
    plan.breakfast.forEach(meal => {
      expect(meal).toHaveProperty('name');
      expect(meal).toHaveProperty('calories');
      expect(meal).toHaveProperty('protein');
      expect(meal).toHaveProperty('carbs');
      expect(meal).toHaveProperty('fat');
      expect(meal).toHaveProperty('ingredients');
      expect(Array.isArray(meal.ingredients)).toBe(true);
    });
  });

  test('dairy allergy removes dairy meals or sets allergenWarning', () => {
    const plan = generateMealPlan({ ...baseProfile, allergies: ['dairy'] });
    ['breakfast', 'lunch', 'dinner', 'snacks'].forEach(type => {
      plan[type].forEach(meal => {
        const allergens = meal.allergens || [];
        // If dairy allergen is present, the warning flag must be set
        if (allergens.includes('dairy')) {
          expect(meal.allergenWarning).toBe(true);
        }
      });
    });
  });

  test('empty profile does not throw', () => {
    expect(() => generateMealPlan({})).not.toThrow();
  });

  test('each stage returns a meal plan', () => {
    const stages = [
      'preconception', 'trimester-1', 'trimester-2', 'trimester-3',
      'postpartum-0-6w', 'postpartum-6w-6m', 'postpartum-6m+',
    ];
    stages.forEach(stage => {
      const plan = generateMealPlan({ ...baseProfile, pregnancyStage: stage });
      expect(plan).toHaveProperty('breakfast');
      expect(plan.breakfast.length).toBeGreaterThan(0);
    });
  });

  test('returns max 3 options per meal type', () => {
    const plan = generateMealPlan(baseProfile);
    ['breakfast', 'lunch', 'dinner', 'snacks'].forEach(type => {
      expect(plan[type].length).toBeLessThanOrEqual(3);
    });
  });

  test('multiple allergies still returns at least fallback meals', () => {
    // Even with many allergies, fallback should prevent empty arrays
    const plan = generateMealPlan({
      ...baseProfile,
      allergies: ['dairy', 'eggs', 'peanuts', 'wheat'],
    });
    ['breakfast', 'lunch', 'dinner', 'snacks'].forEach(type => {
      expect(plan[type].length).toBeGreaterThan(0);
    });
  });
});
