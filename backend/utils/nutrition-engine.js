'use strict';

// ─────────────────────────────────────────────────────────────
// NUTRITION ENGINE
// Personalised calorie / macro / micronutrient / meal-plan
// generation for the Maternal Wellness platform.
// ─────────────────────────────────────────────────────────────

// ── 1. Base Calorie & Macro Calculator ───────────────────────

const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  beginner: 1.375,
  moderate: 1.55,
  active: 1.725,
  athlete: 1.9,
};

// Extra calories (kcal/day) and protein (g/kg/day) per stage
const STAGE_ADJUSTMENTS = {
  preconception:      { calories: 0,   protein: 0.8,  hydrationMl: 0 },
  'trimester-1':      { calories: 0,   protein: 1.1,  hydrationMl: 300 },
  'trimester-2':      { calories: 350, protein: 1.2,  hydrationMl: 500 },
  'trimester-3':      { calories: 450, protein: 1.3,  hydrationMl: 700 },
  'postpartum-0-6w':  { calories: 0,   protein: 1.2,  hydrationMl: 300 }, // breastfeeding adds more
  'postpartum-6w-6m': { calories: 0,   protein: 1.1,  hydrationMl: 300 },
  'postpartum-6m+':   { calories: 0,   protein: 1.0,  hydrationMl: 0 },
};

/**
 * Calculate base calorie/macro needs using Mifflin-St Jeor (female).
 * Falls back to sensible defaults when profile data is missing.
 */
function calculateBaseNutrition(userProfile = {}) {
  const {
    age = 28,
    heightCm = 163,
    prePregnancyWeightKg,
    currentWeightKg,
    fitnessLevel = 'moderate',
    activityLevel,
    pregnancyStage = 'trimester-1',
    breastfeeding = false,
  } = userProfile;

  const weight = currentWeightKg || prePregnancyWeightKg || 65;
  const bmr = Math.round((10 * weight) + (6.25 * heightCm) - (5 * age) - 161);

  const multiplierKey = activityLevel === 'high' ? 'active'
    : activityLevel === 'low' ? 'sedentary'
    : (fitnessLevel in ACTIVITY_MULTIPLIERS ? fitnessLevel : 'moderate');

  const tdee = Math.round(bmr * (ACTIVITY_MULTIPLIERS[multiplierKey] || 1.55));

  const adj = STAGE_ADJUSTMENTS[pregnancyStage] || STAGE_ADJUSTMENTS['trimester-1'];

  // Breastfeeding bonus
  let calorieBonus = adj.calories;
  let hydrationBonus = adj.hydrationMl;
  if (pregnancyStage === 'postpartum-0-6w' && breastfeeding) { calorieBonus = 500; hydrationBonus = 1000; }
  if (pregnancyStage === 'postpartum-6w-6m' && breastfeeding) { calorieBonus = 400; hydrationBonus = 800; }
  if (pregnancyStage === 'postpartum-6m+' && breastfeeding)   { calorieBonus = 300; hydrationBonus = 500; }
  // Non-BF postpartum: modest reduction to support gradual return to baseline
  if (['postpartum-6w-6m', 'postpartum-6m+'].includes(pregnancyStage) && !breastfeeding) {
    calorieBonus = pregnancyStage === 'postpartum-6w-6m' ? -200 : -300;
  }

  const dailyCalories = Math.max(1500, tdee + calorieBonus);
  const proteinGrams  = Math.round(weight * adj.protein);
  const fatGrams      = Math.round((dailyCalories * 0.30) / 9);
  const carbGrams     = Math.round((dailyCalories - (proteinGrams * 4) - (fatGrams * 9)) / 4);

  const proteinPct = Math.round((proteinGrams * 4 / dailyCalories) * 100);
  const fatPct     = Math.round((fatGrams * 9    / dailyCalories) * 100);
  const carbPct    = 100 - proteinPct - fatPct;

  return {
    dailyCalories,
    macros: {
      protein: `${proteinGrams}g`,
      carbs:   `${carbGrams}g`,
      fat:     `${fatGrams}g`,
      proteinPct,
      carbPct,
      fatPct,
    },
    hydrationMl: 2500 + hydrationBonus,
    bmr,
    tdee,
  };
}

// ── 2. Micronutrient Requirements ────────────────────────────

const BASE_MICRONUTRIENTS = {
  preconception: [
    { nutrient: 'Folate',         amount: '400–800', unit: 'mcg', priority: 'critical', reason: 'Prevents neural tube defects', sources: ['leafy greens', 'legumes', 'fortified grains', 'prenatal vitamins'], supplementRecommended: true },
    { nutrient: 'Iron',           amount: '18',      unit: 'mg',  priority: 'high',     reason: 'Builds iron stores for pregnancy', sources: ['red meat', 'spinach', 'lentils', 'fortified cereals'], supplementRecommended: false },
    { nutrient: 'Calcium',        amount: '1000',    unit: 'mg',  priority: 'high',     reason: 'Bone health preparation', sources: ['dairy', 'fortified plant milk', 'broccoli', 'almonds'], supplementRecommended: false },
    { nutrient: 'Vitamin D',      amount: '600',     unit: 'IU',  priority: 'medium',   reason: 'Calcium absorption and immune function', sources: ['sunlight', 'fatty fish', 'fortified foods'], supplementRecommended: true },
    { nutrient: 'Omega-3 DHA',    amount: '200–300', unit: 'mg',  priority: 'medium',   reason: 'Brain health and hormone regulation', sources: ['fatty fish', 'walnuts', 'chia seeds', 'algae oil'], supplementRecommended: false },
  ],
  'trimester-1': [
    { nutrient: 'Folate',         amount: '600–800', unit: 'mcg', priority: 'critical', reason: 'Critical for neural tube development (weeks 3–4)', sources: ['leafy greens', 'legumes', 'citrus', 'prenatal vitamins'], supplementRecommended: true },
    { nutrient: 'Vitamin B6',     amount: '1.9',     unit: 'mg',  priority: 'high',     reason: 'Reduces nausea and vomiting', sources: ['bananas', 'chicken', 'potatoes', 'chickpeas'], supplementRecommended: false },
    { nutrient: 'Iron',           amount: '27',      unit: 'mg',  priority: 'high',     reason: 'Supports 50% increase in blood volume', sources: ['lean red meat', 'spinach', 'lentils', 'iron-fortified cereals'], supplementRecommended: true },
    { nutrient: 'Iodine',         amount: '220',     unit: 'mcg', priority: 'medium',   reason: 'Thyroid function and brain development', sources: ['iodized salt', 'dairy', 'seafood', 'eggs'], supplementRecommended: true },
    { nutrient: 'Vitamin B12',    amount: '2.6',     unit: 'mcg', priority: 'medium',   reason: 'Nervous system development', sources: ['meat', 'fish', 'dairy', 'eggs', 'fortified foods'], supplementRecommended: false },
    { nutrient: 'Zinc',           amount: '11',      unit: 'mg',  priority: 'medium',   reason: 'Cell growth and immune function', sources: ['oysters', 'beef', 'pumpkin seeds', 'chickpeas'], supplementRecommended: false },
  ],
  'trimester-2': [
    { nutrient: 'Iron',           amount: '27',      unit: 'mg',  priority: 'critical', reason: 'Supports rapid fetal growth and placental development', sources: ['lean meats', 'beans', 'dark leafy greens', 'iron-fortified grains'], supplementRecommended: true },
    { nutrient: 'Calcium',        amount: '1000–1300', unit: 'mg', priority: 'critical', reason: 'Baby\'s skeletal development (peak bone growth)', sources: ['dairy', 'fortified plant milks', 'tofu', 'broccoli'], supplementRecommended: false },
    { nutrient: 'Vitamin D',      amount: '600–800', unit: 'IU',  priority: 'high',     reason: 'Calcium absorption and immune support', sources: ['sunlight', 'fatty fish', 'egg yolks', 'fortified foods'], supplementRecommended: true },
    { nutrient: 'Omega-3 DHA',    amount: '200–300', unit: 'mg',  priority: 'high',     reason: 'Baby\'s brain and eye development', sources: ['low-mercury fish', 'walnuts', 'flaxseeds', 'algae oil'], supplementRecommended: true },
    { nutrient: 'Protein',        amount: '71+',     unit: 'g',   priority: 'high',     reason: 'Tissue growth for baby, placenta, and maternal tissues', sources: ['lean meats', 'fish', 'eggs', 'legumes', 'dairy', 'nuts'], supplementRecommended: false },
    { nutrient: 'Magnesium',      amount: '350–360', unit: 'mg',  priority: 'medium',   reason: 'Muscle and nerve function, prevents cramps', sources: ['nuts', 'seeds', 'whole grains', 'dark chocolate', 'leafy greens'], supplementRecommended: false },
    { nutrient: 'Choline',        amount: '450',     unit: 'mg',  priority: 'medium',   reason: 'Brain development and neural tube closure', sources: ['eggs', 'lean meat', 'fish', 'cruciferous vegetables'], supplementRecommended: false },
    { nutrient: 'Fiber',          amount: '28',      unit: 'g',   priority: 'medium',   reason: 'Prevents constipation from iron supplements', sources: ['fruits', 'vegetables', 'whole grains', 'legumes'], supplementRecommended: false },
  ],
  'trimester-3': [
    { nutrient: 'Calcium',        amount: '1000–1300', unit: 'mg', priority: 'critical', reason: 'Final bone mineralization and tooth development', sources: ['dairy', 'fortified alternatives', 'sardines', 'tofu'], supplementRecommended: false },
    { nutrient: 'Iron',           amount: '27',      unit: 'mg',  priority: 'critical', reason: 'Prepares for blood loss during delivery', sources: ['red meat', 'spinach', 'lentils', 'iron-fortified cereals'], supplementRecommended: true },
    { nutrient: 'Magnesium',      amount: '350–360', unit: 'mg',  priority: 'high',     reason: 'Prevents leg cramps and supports muscle relaxation', sources: ['almonds', 'spinach', 'avocado', 'dark chocolate', 'bananas'], supplementRecommended: false },
    { nutrient: 'Vitamin K',      amount: '90',      unit: 'mcg', priority: 'high',     reason: 'Blood clotting preparation for delivery', sources: ['leafy greens', 'broccoli', 'brussels sprouts', 'fish'], supplementRecommended: false },
    { nutrient: 'Fiber',          amount: '28–30',   unit: 'g',   priority: 'high',     reason: 'Prevents constipation (common in third trimester)', sources: ['prunes', 'berries', 'whole grains', 'legumes', 'vegetables'], supplementRecommended: false },
    { nutrient: 'Omega-3 DHA',    amount: '300',     unit: 'mg',  priority: 'medium',   reason: 'Final brain development — may reduce preterm birth risk', sources: ['salmon', 'sardines', 'chia seeds', 'walnuts'], supplementRecommended: true },
    { nutrient: 'Potassium',      amount: '4700',    unit: 'mg',  priority: 'medium',   reason: 'Fluid balance and prevents swelling', sources: ['bananas', 'sweet potatoes', 'avocados', 'coconut water'], supplementRecommended: false },
  ],
  'postpartum-0-6w': [
    { nutrient: 'Protein',        amount: '71+',     unit: 'g',   priority: 'critical', reason: 'Tissue repair and healing from delivery', sources: ['lean meats', 'eggs', 'legumes', 'greek yogurt', 'cottage cheese'], supplementRecommended: false },
    { nutrient: 'Iron',           amount: '9–10',    unit: 'mg',  priority: 'critical', reason: 'Replenishes blood loss from delivery', sources: ['red meat', 'spinach', 'lentils', 'iron-fortified cereals'], supplementRecommended: true },
    { nutrient: 'Vitamin C',      amount: '120',     unit: 'mg',  priority: 'high',     reason: 'Wound healing and collagen production', sources: ['citrus', 'bell peppers', 'kiwi', 'strawberries', 'broccoli'], supplementRecommended: false },
    { nutrient: 'Zinc',           amount: '12',      unit: 'mg',  priority: 'high',     reason: 'Immune function and tissue repair', sources: ['oysters', 'beef', 'crab', 'pumpkin seeds', 'chickpeas'], supplementRecommended: false },
    { nutrient: 'Hydration',      amount: '3000+',   unit: 'ml',  priority: 'critical', reason: 'Wound healing and milk production', sources: ['water', 'herbal tea', 'broth', 'water-rich fruits'], supplementRecommended: false, note: 'Drink before you feel thirsty' },
    { nutrient: 'Probiotics',     amount: 'varied',  unit: 'CFU', priority: 'medium',   reason: 'Gut health (especially after C-section or antibiotics)', sources: ['yogurt', 'kefir', 'sauerkraut', 'kimchi'], supplementRecommended: false },
  ],
  'postpartum-6w-6m': [
    { nutrient: 'Calcium',        amount: '1000–1300', unit: 'mg', priority: 'critical', reason: 'Bone density maintenance while breastfeeding', sources: ['dairy', 'fortified plant milks', 'sardines', 'tofu', 'almonds'], supplementRecommended: false },
    { nutrient: 'Vitamin D',      amount: '600–800', unit: 'IU',  priority: 'critical', reason: 'Calcium absorption and mood regulation', sources: ['sunlight', 'fatty fish', 'egg yolks', 'fortified foods'], supplementRecommended: true },
    { nutrient: 'Omega-3 DHA',    amount: '300–500', unit: 'mg',  priority: 'high',     reason: 'Baby\'s brain development via breast milk', sources: ['low-mercury fish', 'walnuts', 'chia seeds', 'algae oil'], supplementRecommended: true },
    { nutrient: 'Iron',           amount: '9',       unit: 'mg',  priority: 'high',     reason: 'Continued recovery and energy', sources: ['lean red meat', 'spinach', 'lentils', 'fortified cereals'], supplementRecommended: true },
    { nutrient: 'B Vitamins',     amount: 'complex', unit: '',    priority: 'high',     reason: 'Energy production and combating fatigue', sources: ['whole grains', 'eggs', 'lean meats', 'legumes', 'leafy greens'], supplementRecommended: true },
    { nutrient: 'Magnesium',      amount: '310–320', unit: 'mg',  priority: 'medium',   reason: 'Muscle recovery, sleep quality, and stress reduction', sources: ['nuts', 'seeds', 'dark chocolate', 'leafy greens', 'avocado'], supplementRecommended: false },
  ],
  'postpartum-6m+': [
    { nutrient: 'Calcium',        amount: '1000',    unit: 'mg',  priority: 'high',     reason: 'Bone health maintenance', sources: ['dairy', 'fortified alternatives', 'leafy greens', 'tofu'], supplementRecommended: false },
    { nutrient: 'Iron',           amount: '9',       unit: 'mg',  priority: 'high',     reason: 'Energy and recovery completion', sources: ['lean meats', 'beans', 'dark leafy greens', 'fortified grains'], supplementRecommended: true },
    { nutrient: 'Fiber',          amount: '25–28',   unit: 'g',   priority: 'high',     reason: 'Digestive health and weight management', sources: ['fruits', 'vegetables', 'whole grains', 'legumes', 'nuts'], supplementRecommended: false },
    { nutrient: 'Protein',        amount: '67+',     unit: 'g',   priority: 'medium',   reason: 'Muscle maintenance and satiety', sources: ['lean meats', 'fish', 'eggs', 'legumes', 'dairy', 'nuts'], supplementRecommended: false },
    { nutrient: 'Omega-3 DHA',    amount: '200–300', unit: 'mg',  priority: 'medium',   reason: 'Hormone regulation and brain health', sources: ['avocado', 'nuts', 'seeds', 'olive oil', 'fatty fish'], supplementRecommended: false },
    { nutrient: 'Antioxidants',   amount: 'varied',  unit: 'A/C/E', priority: 'medium', reason: 'Cell repair and anti-inflammatory', sources: ['berries', 'citrus', 'leafy greens', 'nuts', 'seeds'], supplementRecommended: false },
  ],
};

function getMicronutrientRequirements(stage = 'trimester-1', conditions = [], dietaryPreferences = []) {
  let nutrients = JSON.parse(JSON.stringify(
    BASE_MICRONUTRIENTS[stage] || BASE_MICRONUTRIENTS['trimester-1']
  ));

  const has = (arr, ...vals) => vals.some(v => arr.includes(v));

  // ─ Condition overrides ─────────────────────────────────────
  if (has(conditions, 'gestational-diabetes', 'diabetes-type-1', 'diabetes-type-2')) {
    nutrients = nutrients.map(n => {
      if (n.nutrient === 'Fiber')     return { ...n, amount: '30–35', note: 'Critical for blood sugar control' };
      if (n.nutrient === 'Magnesium') return { ...n, amount: '400', note: 'May improve insulin sensitivity' };
      return n;
    });
    if (!nutrients.find(n => n.nutrient === 'Chromium')) {
      nutrients.push({ nutrient: 'Chromium', amount: '30', unit: 'mcg', priority: 'high', reason: 'Blood sugar regulation', sources: ['broccoli', 'whole grains', 'nuts', 'meat'], supplementRecommended: false });
    }
  }

  if (has(conditions, 'hypertension', 'gestational-hypertension', 'preeclampsia')) {
    nutrients = nutrients.map(n => {
      if (n.nutrient === 'Calcium')  return { ...n, amount: '1500–2000', note: 'Higher dose for blood pressure control' };
      if (n.nutrient === 'Magnesium') return { ...n, amount: '400', note: 'Vasodilation and blood pressure support' };
      if (n.nutrient === 'Potassium') return { ...n, amount: '5000', note: 'Critical for blood pressure regulation' };
      return n;
    });
  }

  if (has(conditions, 'anemia')) {
    nutrients = nutrients.map(n => {
      if (n.nutrient === 'Iron')     return { ...n, amount: '30–32', note: 'Higher dose for anemia treatment', supplementRecommended: true };
      if (n.nutrient === 'Vitamin C') return { ...n, amount: '100–200', note: 'Enhances iron absorption — take with iron supplements' };
      return n;
    });
  }

  if (has(conditions, 'thyroid-disorder')) {
    if (!nutrients.find(n => n.nutrient === 'Iodine')) {
      nutrients.push({ nutrient: 'Iodine', amount: '220–250', unit: 'mcg', priority: 'high', reason: 'Essential for thyroid hormone production', sources: ['iodized salt', 'dairy', 'seafood', 'eggs'], supplementRecommended: true, note: 'Consult provider before supplementing' });
    }
    if (!nutrients.find(n => n.nutrient === 'Selenium')) {
      nutrients.push({ nutrient: 'Selenium', amount: '60', unit: 'mcg', priority: 'medium', reason: 'Supports thyroid enzyme function', sources: ['brazil nuts', 'seafood', 'eggs', 'whole grains'], supplementRecommended: false });
    }
  }

  // ─ Dietary preference overrides ────────────────────────────
  if (has(dietaryPreferences, 'vegan')) {
    // Ensure B12 is present and marked critical
    const b12idx = nutrients.findIndex(n => n.nutrient === 'Vitamin B12');
    const b12 = { nutrient: 'Vitamin B12', amount: '2.6–5', unit: 'mcg', priority: 'critical', reason: 'Essential for vegans — not found in plant foods', sources: ['fortified foods', 'nutritional yeast', 'supplements'], supplementRecommended: true };
    if (b12idx !== -1) nutrients[b12idx] = b12; else nutrients.unshift(b12);

    // Boost iron and zinc amounts for lower plant bioavailability
    nutrients = nutrients.map(n => {
      if (n.nutrient === 'Iron')     return { ...n, amount: '32–33', note: 'Plant-based iron (non-heme) is less absorbable — pair with Vitamin C' };
      if (n.nutrient === 'Zinc')     return { ...n, amount: '15–16', note: 'Plant sources less bioavailable — soak legumes to improve absorption' };
      if (n.nutrient === 'Calcium')  return { ...n, amount: '1200–1300', note: 'Ensure adequate intake without dairy', sources: ['fortified plant milks', 'tofu', 'kale', 'bok choy', 'almonds'] };
      return n;
    });

    if (!nutrients.find(n => n.nutrient === 'Omega-3 DHA')) {
      nutrients.push({ nutrient: 'Omega-3 DHA', amount: '200–300', unit: 'mg', priority: 'high', reason: 'Brain and eye development — algae oil is vegan-safe', sources: ['algae oil supplement', 'flaxseeds', 'chia seeds', 'walnuts'], supplementRecommended: true });
    }
  } else if (has(dietaryPreferences, 'vegetarian')) {
    const b12idx = nutrients.findIndex(n => n.nutrient === 'Vitamin B12');
    const b12 = { nutrient: 'Vitamin B12', amount: '2.6', unit: 'mcg', priority: 'high', reason: 'May need supplementation if not consuming enough eggs/dairy', sources: ['eggs', 'dairy', 'fortified foods', 'supplements'], supplementRecommended: true };
    if (b12idx !== -1) nutrients[b12idx] = b12; else nutrients.push(b12);

    nutrients = nutrients.map(n => {
      if (n.nutrient === 'Iron') return { ...n, amount: '27–30', note: 'Plant-based iron less absorbable — pair with Vitamin C' };
      return n;
    });
  }

  return nutrients;
}

// ── 3. Meal Plan Generator ────────────────────────────────────

// Stage → meal templates. Each meal has an `allergens` array and `dietaryTags` array.
const MEAL_TEMPLATES = {
  preconception: {
    breakfast: [
      { name: 'Power Oatmeal Bowl', calories: 350, protein: '12g', carbs: '55g', fat: '10g', ingredients: ['rolled oats', 'berries', 'almonds', 'chia seeds', 'honey'], prepTime: '5 min', dietaryTags: ['vegetarian', 'vegan'], allergens: ['nuts'] },
      { name: 'Greek Yogurt Parfait', calories: 300, protein: '20g', carbs: '35g', fat: '8g', ingredients: ['greek yogurt', 'granola', 'mixed berries', 'honey'], prepTime: '3 min', dietaryTags: ['vegetarian'], allergens: ['dairy', 'gluten', 'nuts'] },
      { name: 'Avocado Toast with Poached Egg', calories: 400, protein: '15g', carbs: '40g', fat: '20g', ingredients: ['whole grain bread', 'avocado', 'egg', 'red pepper flakes'], prepTime: '10 min', dietaryTags: ['vegetarian'], allergens: ['gluten', 'eggs'] },
    ],
    lunch: [
      { name: 'Quinoa Power Bowl', calories: 450, protein: '18g', carbs: '60g', fat: '15g', ingredients: ['quinoa', 'roasted vegetables', 'chickpeas', 'feta cheese', 'olive oil'], prepTime: '15 min', dietaryTags: ['vegetarian'], allergens: ['dairy'] },
      { name: 'Grilled Chicken Salad', calories: 400, protein: '35g', carbs: '20g', fat: '18g', ingredients: ['mixed greens', 'grilled chicken', 'avocado', 'cherry tomatoes', 'balsamic vinaigrette'], prepTime: '10 min', dietaryTags: ['gluten-free', 'dairy-free'], allergens: [] },
      { name: 'Lentil Soup with Whole Grain Bread', calories: 420, protein: '18g', carbs: '65g', fat: '10g', ingredients: ['lentils', 'carrots', 'celery', 'onion', 'whole grain bread'], prepTime: '30 min', dietaryTags: ['vegan', 'vegetarian'], allergens: ['gluten'] },
    ],
    dinner: [
      { name: 'Baked Salmon with Roasted Vegetables', calories: 500, protein: '35g', carbs: '30g', fat: '25g', ingredients: ['salmon fillet', 'broccoli', 'carrots', 'sweet potato', 'olive oil', 'lemon'], prepTime: '25 min', dietaryTags: ['gluten-free', 'dairy-free'], allergens: ['fish'] },
      { name: 'Stuffed Bell Peppers', calories: 450, protein: '20g', carbs: '55g', fat: '15g', ingredients: ['bell peppers', 'quinoa', 'black beans', 'corn', 'cheese'], prepTime: '35 min', dietaryTags: ['vegetarian', 'gluten-free'], allergens: ['dairy'] },
      { name: 'Turkey and Vegetable Stir Fry', calories: 480, protein: '30g', carbs: '45g', fat: '18g', ingredients: ['ground turkey', 'broccoli', 'bell peppers', 'snap peas', 'brown rice', 'tamari'], prepTime: '20 min', dietaryTags: ['dairy-free', 'gluten-free'], allergens: ['soy'] },
    ],
    snacks: [
      { name: 'Apple with Almond Butter', calories: 200, protein: '6g', carbs: '25g', fat: '10g', ingredients: ['apple', 'almond butter'], prepTime: '2 min', dietaryTags: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], allergens: ['nuts'] },
      { name: 'Greek Yogurt with Berries', calories: 150, protein: '15g', carbs: '15g', fat: '5g', ingredients: ['greek yogurt', 'mixed berries'], prepTime: '2 min', dietaryTags: ['vegetarian', 'gluten-free'], allergens: ['dairy'] },
      { name: 'Hummus with Veggie Sticks', calories: 180, protein: '7g', carbs: '20g', fat: '8g', ingredients: ['hummus', 'carrot sticks', 'cucumber', 'bell pepper'], prepTime: '5 min', dietaryTags: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], allergens: ['sesame'] },
    ],
  },
  'trimester-1': {
    breakfast: [
      { name: 'Dry Toast with Banana', calories: 250, protein: '6g', carbs: '45g', fat: '5g', ingredients: ['whole grain toast', 'banana'], prepTime: '3 min', dietaryTags: ['vegetarian', 'vegan', 'dairy-free'], allergens: ['gluten'], antiNausea: true },
      { name: 'Ginger Oat Smoothie', calories: 300, protein: '12g', carbs: '45g', fat: '8g', ingredients: ['banana', 'oats', 'almond milk', 'ginger (fresh)', 'honey'], prepTime: '5 min', dietaryTags: ['vegetarian', 'vegan', 'dairy-free'], allergens: ['nuts'], antiNausea: true },
      { name: 'Mild Scrambled Eggs', calories: 280, protein: '18g', carbs: '8g', fat: '18g', ingredients: ['eggs', 'salt', 'whole grain toast'], prepTime: '8 min', dietaryTags: ['vegetarian', 'gluten-free'], allergens: ['eggs', 'gluten'], antiNausea: true },
    ],
    lunch: [
      { name: 'Cold Quinoa Salad', calories: 380, protein: '12g', carbs: '55g', fat: '12g', ingredients: ['quinoa', 'cucumber', 'cherry tomatoes', 'olive oil', 'lemon juice'], prepTime: '15 min', dietaryTags: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], allergens: [], antiNausea: true },
      { name: 'Rice and Avocado Bowl', calories: 420, protein: '10g', carbs: '65g', fat: '14g', ingredients: ['brown rice', 'avocado', 'black beans', 'lime juice'], prepTime: '10 min', dietaryTags: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], allergens: [], antiNausea: true },
      { name: 'Plain Chicken Soup', calories: 300, protein: '24g', carbs: '25g', fat: '10g', ingredients: ['chicken broth', 'chicken breast', 'carrots', 'celery', 'egg noodles'], prepTime: '25 min', dietaryTags: [], allergens: ['gluten'], antiNausea: true },
    ],
    dinner: [
      { name: 'Pasta with Olive Oil & Garlic', calories: 450, protein: '10g', carbs: '75g', fat: '15g', ingredients: ['whole wheat pasta', 'olive oil', 'garlic', 'parsley'], prepTime: '15 min', dietaryTags: ['vegetarian', 'vegan', 'dairy-free'], allergens: ['gluten'], antiNausea: true },
      { name: 'Baked Potato with Toppings', calories: 380, protein: '8g', carbs: '65g', fat: '10g', ingredients: ['baked potato', 'olive oil', 'chives', 'sour cream (optional)'], prepTime: '45 min', dietaryTags: ['vegetarian', 'gluten-free'], allergens: ['dairy'], antiNausea: true },
      { name: 'Mild Chicken & Broccoli Rice', calories: 420, protein: '28g', carbs: '45g', fat: '12g', ingredients: ['chicken breast', 'broccoli', 'brown rice', 'light soy sauce'], prepTime: '25 min', dietaryTags: ['dairy-free', 'gluten-free'], allergens: ['soy'], antiNausea: true },
    ],
    snacks: [
      { name: 'Saltine Crackers', calories: 100, protein: '2g', carbs: '20g', fat: '2g', ingredients: ['saltine crackers'], prepTime: '0 min', dietaryTags: ['vegetarian', 'vegan'], allergens: ['gluten'], antiNausea: true },
      { name: 'Cold Melon & Grapes', calories: 120, protein: '1g', carbs: '30g', fat: '0g', ingredients: ['melon', 'grapes'], prepTime: '5 min', dietaryTags: ['vegetarian', 'vegan', 'gluten-free', 'dairy-free'], allergens: [], antiNausea: true },
      { name: 'Ginger Chews', calories: 80, protein: '0g', carbs: '20g', fat: '0g', ingredients: ['ginger', 'sugar'], prepTime: '0 min', dietaryTags: ['vegan', 'gluten-free', 'dairy-free'], allergens: [], antiNausea: true },
    ],
  },
  'trimester-2': {
    breakfast: [
      { name: 'Spinach & Feta Omelet', calories: 380, protein: '25g', carbs: '10g', fat: '25g', ingredients: ['eggs', 'spinach', 'feta cheese', 'whole grain toast'], prepTime: '15 min', dietaryTags: ['vegetarian', 'gluten-free'], allergens: ['eggs', 'dairy', 'gluten'] },
      { name: 'Iron-Fortified Cereal with Berries', calories: 320, protein: '12g', carbs: '60g', fat: '6g', ingredients: ['iron-fortified cereal', 'milk', 'mixed berries', 'flax seeds'], prepTime: '3 min', dietaryTags: ['vegetarian'], allergens: ['dairy', 'gluten'] },
      { name: 'Protein Smoothie', calories: 350, protein: '30g', carbs: '35g', fat: '10g', ingredients: ['protein powder', 'banana', 'spinach', 'almond milk', 'peanut butter'], prepTime: '5 min', dietaryTags: ['vegetarian', 'gluten-free', 'dairy-free'], allergens: ['nuts'] },
    ],
    lunch: [
      { name: 'Lentil & Spinach Soup', calories: 400, protein: '20g', carbs: '55g', fat: '12g', ingredients: ['lentils', 'spinach', 'carrots', 'onion', 'vegetable broth'], prepTime: '30 min', dietaryTags: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], allergens: [] },
      { name: 'Grilled Chicken with Sweet Potato', calories: 480, protein: '35g', carbs: '45g', fat: '18g', ingredients: ['chicken breast', 'sweet potato', 'broccoli', 'olive oil'], prepTime: '25 min', dietaryTags: ['gluten-free', 'dairy-free'], allergens: [] },
      { name: 'Quinoa Bowl with Chickpeas', calories: 450, protein: '18g', carbs: '65g', fat: '15g', ingredients: ['quinoa', 'chickpeas', 'spinach', 'avocado', 'tahini dressing'], prepTime: '15 min', dietaryTags: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], allergens: ['sesame'] },
    ],
    dinner: [
      { name: 'Beef & Broccoli Stir Fry', calories: 520, protein: '35g', carbs: '45g', fat: '22g', ingredients: ['lean beef', 'broccoli', 'bell peppers', 'brown rice', 'tamari'], prepTime: '20 min', dietaryTags: ['dairy-free', 'gluten-free'], allergens: ['soy'] },
      { name: 'Salmon with Quinoa & Asparagus', calories: 500, protein: '32g', carbs: '40g', fat: '24g', ingredients: ['salmon fillet', 'quinoa', 'asparagus', 'lemon', 'olive oil'], prepTime: '25 min', dietaryTags: ['gluten-free', 'dairy-free'], allergens: ['fish'] },
      { name: 'Black Bean Burgers', calories: 450, protein: '20g', carbs: '60g', fat: '16g', ingredients: ['black beans', 'quinoa', 'onion', 'spices', 'whole grain bun'], prepTime: '25 min', dietaryTags: ['vegan', 'vegetarian'], allergens: ['gluten'] },
    ],
    snacks: [
      { name: 'Trail Mix with Pumpkin Seeds', calories: 200, protein: '8g', carbs: '15g', fat: '14g', ingredients: ['pumpkin seeds', 'almonds', 'dried cranberries'], prepTime: '0 min', dietaryTags: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], allergens: ['nuts'] },
      { name: 'Hard-Boiled Egg with Carrot Sticks', calories: 180, protein: '14g', carbs: '10g', fat: '10g', ingredients: ['eggs', 'carrot sticks', 'hummus'], prepTime: '10 min', dietaryTags: ['vegetarian', 'gluten-free', 'dairy-free'], allergens: ['eggs', 'sesame'] },
      { name: 'Greek Yogurt with Walnuts', calories: 220, protein: '18g', carbs: '12g', fat: '12g', ingredients: ['greek yogurt', 'walnuts', 'honey'], prepTime: '2 min', dietaryTags: ['vegetarian', 'gluten-free'], allergens: ['dairy', 'nuts'] },
    ],
  },
  'trimester-3': {
    breakfast: [
      { name: 'Overnight Oats with Chia', calories: 380, protein: '14g', carbs: '55g', fat: '12g', ingredients: ['rolled oats', 'chia seeds', 'almond milk', 'berries', 'honey'], prepTime: '5 min (night before)', dietaryTags: ['vegetarian', 'vegan', 'dairy-free'], allergens: ['nuts'] },
      { name: 'Scrambled Eggs with Spinach Toast', calories: 350, protein: '22g', carbs: '25g', fat: '18g', ingredients: ['eggs', 'spinach', 'whole grain toast', 'olive oil'], prepTime: '10 min', dietaryTags: ['vegetarian'], allergens: ['eggs', 'gluten'] },
      { name: 'Avocado Smoothie Bowl', calories: 400, protein: '15g', carbs: '45g', fat: '18g', ingredients: ['banana', 'avocado', 'spinach', 'protein powder', 'almond milk'], prepTime: '5 min', dietaryTags: ['vegetarian', 'gluten-free', 'dairy-free'], allergens: ['nuts'] },
    ],
    lunch: [
      { name: 'Kale Caesar with Grilled Chicken', calories: 450, protein: '30g', carbs: '25g', fat: '22g', ingredients: ['kale', 'grilled chicken', 'parmesan', 'whole grain croutons', 'caesar dressing'], prepTime: '10 min', dietaryTags: [], allergens: ['dairy', 'gluten'] },
      { name: 'Lentil & Kale Soup', calories: 400, protein: '18g', carbs: '60g', fat: '10g', ingredients: ['lentils', 'kale', 'carrots', 'celery', 'vegetable broth'], prepTime: '30 min', dietaryTags: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], allergens: [] },
      { name: 'Quinoa Bowl with Roasted Vegetables', calories: 480, protein: '16g', carbs: '70g', fat: '16g', ingredients: ['quinoa', 'roasted sweet potato', 'broccoli', 'chickpeas', 'tahini dressing'], prepTime: '25 min', dietaryTags: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], allergens: ['sesame'] },
    ],
    dinner: [
      { name: 'Baked Salmon with Broccoli', calories: 520, protein: '35g', carbs: '30g', fat: '28g', ingredients: ['salmon fillet', 'broccoli', 'quinoa', 'lemon', 'olive oil'], prepTime: '25 min', dietaryTags: ['gluten-free', 'dairy-free'], allergens: ['fish'] },
      { name: 'Stuffed Sweet Potatoes', calories: 480, protein: '18g', carbs: '75g', fat: '14g', ingredients: ['sweet potatoes', 'black beans', 'cheese', 'avocado', 'salsa'], prepTime: '45 min', dietaryTags: ['vegetarian', 'gluten-free'], allergens: ['dairy'] },
      { name: 'Turkey Meatballs with Whole Wheat Pasta', calories: 550, protein: '32g', carbs: '65g', fat: '18g', ingredients: ['ground turkey', 'whole wheat pasta', 'tomato sauce', 'parmesan cheese'], prepTime: '30 min', dietaryTags: [], allergens: ['gluten', 'dairy'] },
    ],
    snacks: [
      { name: 'Yogurt with Almonds & Honey', calories: 220, protein: '15g', carbs: '20g', fat: '10g', ingredients: ['greek yogurt', 'almonds', 'honey'], prepTime: '2 min', dietaryTags: ['vegetarian', 'gluten-free'], allergens: ['dairy', 'nuts'] },
      { name: 'Banana with Peanut Butter', calories: 250, protein: '8g', carbs: '30g', fat: '12g', ingredients: ['banana', 'peanut butter'], prepTime: '2 min', dietaryTags: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], allergens: ['nuts'] },
      { name: 'Dark Chocolate & Almonds', calories: 200, protein: '6g', carbs: '15g', fat: '14g', ingredients: ['dark chocolate', 'almonds'], prepTime: '0 min', dietaryTags: ['vegan', 'gluten-free'], allergens: ['nuts', 'dairy'] },
    ],
  },
  'postpartum-0-6w': {
    breakfast: [
      { name: 'Overnight Protein Oats', calories: 400, protein: '25g', carbs: '50g', fat: '12g', ingredients: ['rolled oats', 'protein powder', 'almond milk', 'berries', 'chia seeds'], prepTime: '5 min (night before)', dietaryTags: ['vegetarian', 'dairy-free'], allergens: ['nuts'], easyPrep: true },
      { name: 'Scrambled Eggs with Avocado Toast', calories: 420, protein: '20g', carbs: '35g', fat: '22g', ingredients: ['eggs', 'whole grain bread', 'avocado', 'tomato'], prepTime: '10 min', dietaryTags: ['vegetarian'], allergens: ['eggs', 'gluten'], easyPrep: true },
      { name: 'Healing Green Smoothie', calories: 350, protein: '20g', carbs: '40g', fat: '10g', ingredients: ['spinach', 'banana', 'protein powder', 'almond milk', 'flax seeds'], prepTime: '5 min', dietaryTags: ['vegetarian', 'vegan', 'gluten-free', 'dairy-free'], allergens: ['nuts'], easyPrep: true },
    ],
    lunch: [
      { name: 'Batch Freezer Soup', calories: 380, protein: '18g', carbs: '45g', fat: '14g', ingredients: ['pre-made soup (from freezer)'], prepTime: '5 min', dietaryTags: ['varies'], allergens: [], easyPrep: true, note: 'Prepare a batch before your due date and freeze' },
      { name: 'Pre-Made Salad with Grilled Chicken', calories: 420, protein: '30g', carbs: '25g', fat: '20g', ingredients: ['pre-washed greens', 'grilled chicken strips', 'avocado', 'dressing'], prepTime: '3 min', dietaryTags: ['gluten-free', 'dairy-free'], allergens: [], easyPrep: true },
      { name: 'Hummus Veggie Wrap', calories: 400, protein: '15g', carbs: '50g', fat: '16g', ingredients: ['whole grain wrap', 'hummus', 'cucumber', 'bell peppers', 'spinach'], prepTime: '5 min', dietaryTags: ['vegetarian', 'vegan'], allergens: ['gluten', 'sesame'], easyPrep: true },
    ],
    dinner: [
      { name: 'Slow Cooker Chili', calories: 480, protein: '25g', carbs: '55g', fat: '16g', ingredients: ['lean ground beef', 'beans', 'tomatoes', 'onion', 'spices'], prepTime: '15 min (morning)', dietaryTags: ['dairy-free', 'gluten-free'], allergens: [], easyPrep: true },
      { name: 'Sheet Pan Salmon & Vegetables', calories: 500, protein: '35g', carbs: '30g', fat: '26g', ingredients: ['salmon fillets', 'broccoli', 'carrots', 'olive oil', 'lemon'], prepTime: '10 min prep + 20 min cook', dietaryTags: ['gluten-free', 'dairy-free'], allergens: ['fish'], easyPrep: true },
      { name: 'One-Pot Turkey Pasta', calories: 520, protein: '30g', carbs: '65g', fat: '16g', ingredients: ['whole wheat pasta', 'ground turkey', 'tomato sauce', 'spinach'], prepTime: '25 min', dietaryTags: ['dairy-free'], allergens: ['gluten'], easyPrep: true },
    ],
    snacks: [
      { name: 'Energy Balls (Batch-Prep)', calories: 180, protein: '6g', carbs: '25g', fat: '8g', ingredients: ['dates', 'oats', 'peanut butter', 'flax seeds', 'honey'], prepTime: '15 min (batch)', dietaryTags: ['vegetarian', 'vegan'], allergens: ['nuts', 'gluten'], easyPrep: true },
      { name: 'Greek Yogurt with Berries', calories: 150, protein: '15g', carbs: '12g', fat: '5g', ingredients: ['greek yogurt', 'berries'], prepTime: '1 min', dietaryTags: ['vegetarian', 'gluten-free'], allergens: ['dairy'], easyPrep: true },
      { name: 'Pre-Cut Veggies with Hummus', calories: 160, protein: '6g', carbs: '20g', fat: '7g', ingredients: ['carrot sticks', 'cucumber', 'bell pepper', 'hummus'], prepTime: '5 min', dietaryTags: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], allergens: ['sesame'], easyPrep: true },
    ],
  },
  'postpartum-6w-6m': {
    breakfast: [
      { name: 'Oatmeal with Flax & Berries', calories: 400, protein: '14g', carbs: '60g', fat: '12g', ingredients: ['rolled oats', 'ground flax', 'berries', 'almond milk', 'honey'], prepTime: '5 min', dietaryTags: ['vegan', 'vegetarian', 'dairy-free'], allergens: ['nuts'], lactationSupport: true },
      { name: 'Protein Pancakes', calories: 450, protein: '30g', carbs: '50g', fat: '14g', ingredients: ['protein pancake mix', 'banana', 'berries', 'greek yogurt'], prepTime: '15 min', dietaryTags: ['vegetarian'], allergens: ['dairy', 'gluten', 'eggs'], lactationSupport: true },
      { name: 'Breakfast Burrito Bowl', calories: 480, protein: '25g', carbs: '55g', fat: '18g', ingredients: ['scrambled eggs', 'black beans', 'avocado', 'salsa', 'brown rice'], prepTime: '15 min', dietaryTags: ['gluten-free', 'dairy-free'], allergens: ['eggs'], lactationSupport: true },
    ],
    lunch: [
      { name: 'Lactation Smoothie Bowl', calories: 420, protein: '25g', carbs: '50g', fat: '14g', ingredients: ['oats', 'flax seeds', 'banana', 'protein powder', 'almond milk'], prepTime: '5 min', dietaryTags: ['vegetarian', 'vegan', 'gluten-free', 'dairy-free'], allergens: ['nuts'], lactationSupport: true },
      { name: 'Quinoa Power Bowl', calories: 500, protein: '20g', carbs: '65g', fat: '18g', ingredients: ['quinoa', 'roasted chickpeas', 'avocado', 'kale', 'tahini dressing'], prepTime: '15 min', dietaryTags: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], allergens: ['sesame'], lactationSupport: true },
      { name: 'Grilled Chicken Wrap', calories: 480, protein: '35g', carbs: '45g', fat: '18g', ingredients: ['grilled chicken', 'whole grain wrap', 'avocado', 'spinach', 'hummus'], prepTime: '10 min', dietaryTags: [], allergens: ['gluten', 'sesame'], lactationSupport: true },
    ],
    dinner: [
      { name: 'Salmon with Sweet Potato', calories: 550, protein: '35g', carbs: '50g', fat: '26g', ingredients: ['salmon fillet', 'sweet potato', 'broccoli', 'olive oil', 'lemon'], prepTime: '25 min', dietaryTags: ['gluten-free', 'dairy-free'], allergens: ['fish'], lactationSupport: true },
      { name: 'Lentil Curry with Brown Rice', calories: 520, protein: '22g', carbs: '75g', fat: '16g', ingredients: ['lentils', 'coconut milk', 'curry spices', 'brown rice', 'spinach'], prepTime: '30 min', dietaryTags: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], allergens: [], lactationSupport: true },
      { name: 'Turkey Meatloaf with Roasted Vegetables', calories: 540, protein: '38g', carbs: '40g', fat: '24g', ingredients: ['ground turkey', 'oats', 'onion', 'carrots', 'broccoli'], prepTime: '45 min', dietaryTags: ['dairy-free'], allergens: ['gluten'], lactationSupport: true },
    ],
    snacks: [
      { name: 'Lactation Cookies', calories: 200, protein: '5g', carbs: '30g', fat: '8g', ingredients: ['oats', 'flax seeds', 'brewer\'s yeast', 'almond butter', 'chocolate chips'], prepTime: '20 min (batch)', dietaryTags: ['vegetarian'], allergens: ['nuts', 'gluten', 'dairy'], lactationSupport: true },
      { name: 'Apple with Peanut Butter', calories: 220, protein: '8g', carbs: '25g', fat: '12g', ingredients: ['apple', 'peanut butter'], prepTime: '2 min', dietaryTags: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], allergens: ['nuts'], lactationSupport: true },
      { name: 'Trail Mix with Dried Fruit', calories: 200, protein: '6g', carbs: '25g', fat: '10g', ingredients: ['almonds', 'walnuts', 'dried apricots', 'dark chocolate chips'], prepTime: '0 min', dietaryTags: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], allergens: ['nuts'], lactationSupport: true },
    ],
  },
  'postpartum-6m+': {
    breakfast: [
      { name: 'Avocado Toast with Poached Egg', calories: 380, protein: '16g', carbs: '35g', fat: '20g', ingredients: ['whole grain bread', 'avocado', 'egg', 'red pepper flakes'], prepTime: '10 min', dietaryTags: ['vegetarian'], allergens: ['gluten', 'eggs'] },
      { name: 'Greek Yogurt Parfait', calories: 320, protein: '22g', carbs: '35g', fat: '10g', ingredients: ['greek yogurt', 'granola', 'berries', 'honey'], prepTime: '3 min', dietaryTags: ['vegetarian'], allergens: ['dairy', 'gluten', 'nuts'] },
      { name: 'Vegetable Frittata', calories: 400, protein: '24g', carbs: '15g', fat: '26g', ingredients: ['eggs', 'spinach', 'bell peppers', 'onion', 'cheese'], prepTime: '20 min', dietaryTags: ['vegetarian', 'gluten-free'], allergens: ['eggs', 'dairy'] },
    ],
    lunch: [
      { name: 'Mediterranean Bowl', calories: 480, protein: '25g', carbs: '50g', fat: '20g', ingredients: ['quinoa', 'grilled chicken', 'cucumber', 'tomato', 'feta', 'olive oil'], prepTime: '15 min', dietaryTags: ['gluten-free'], allergens: ['dairy'] },
      { name: 'Lentil Soup with Side Salad', calories: 420, protein: '20g', carbs: '60g', fat: '12g', ingredients: ['lentil soup', 'mixed greens', 'balsamic vinaigrette'], prepTime: '10 min', dietaryTags: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], allergens: [] },
      { name: 'Tuna Salad Wrap', calories: 450, protein: '30g', carbs: '45g', fat: '18g', ingredients: ['canned tuna', 'greek yogurt', 'celery', 'whole grain wrap', 'lettuce'], prepTime: '10 min', dietaryTags: [], allergens: ['fish', 'gluten', 'dairy'] },
    ],
    dinner: [
      { name: 'Grilled Chicken with Roasted Vegetables', calories: 520, protein: '40g', carbs: '35g', fat: '22g', ingredients: ['chicken breast', 'broccoli', 'carrots', 'sweet potato', 'olive oil'], prepTime: '30 min', dietaryTags: ['gluten-free', 'dairy-free'], allergens: [] },
      { name: 'Shrimp Stir Fry with Brown Rice', calories: 500, protein: '32g', carbs: '55g', fat: '16g', ingredients: ['shrimp', 'broccoli', 'bell peppers', 'snap peas', 'brown rice', 'tamari'], prepTime: '20 min', dietaryTags: ['gluten-free', 'dairy-free'], allergens: ['shellfish', 'soy'] },
      { name: 'Stuffed Bell Peppers', calories: 480, protein: '22g', carbs: '55g', fat: '18g', ingredients: ['bell peppers', 'lean ground beef', 'quinoa', 'tomato sauce', 'cheese'], prepTime: '35 min', dietaryTags: ['gluten-free'], allergens: ['dairy'] },
    ],
    snacks: [
      { name: 'Hummus with Veggie Sticks', calories: 180, protein: '7g', carbs: '20g', fat: '8g', ingredients: ['hummus', 'carrot sticks', 'cucumber', 'bell pepper'], prepTime: '5 min', dietaryTags: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], allergens: ['sesame'] },
      { name: 'Cottage Cheese with Pineapple', calories: 160, protein: '14g', carbs: '15g', fat: '5g', ingredients: ['cottage cheese', 'pineapple chunks'], prepTime: '2 min', dietaryTags: ['vegetarian', 'gluten-free'], allergens: ['dairy'] },
      { name: 'Mixed Nuts', calories: 200, protein: '8g', carbs: '10g', fat: '16g', ingredients: ['almonds', 'walnuts', 'cashews'], prepTime: '0 min', dietaryTags: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], allergens: ['nuts'] },
    ],
  },
};

// Allergen → ingredient keywords (for matching)
const ALLERGEN_KEYWORDS = {
  peanuts:    ['peanut', 'peanut butter'],
  'tree-nuts': ['almond', 'walnut', 'cashew', 'pecan', 'pistachio', 'hazelnut', 'macadamia', 'brazil nut', 'almond butter'],
  nuts:       ['almond', 'walnut', 'cashew', 'pecan', 'peanut', 'pistachio', 'hazelnut', 'macadamia', 'nut', 'almond butter', 'peanut butter'],
  dairy:      ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'dairy', 'feta', 'parmesan', 'cottage cheese', 'greek yogurt', 'sour cream'],
  eggs:       ['egg', 'eggs'],
  soy:        ['soy', 'tamari', 'tofu', 'edamame', 'soybeans', 'miso'],
  wheat:      ['wheat', 'bread', 'pasta', 'flour', 'gluten', 'crackers', 'croutons', 'wrap', 'noodles', 'bun', 'oats'],
  gluten:     ['wheat', 'bread', 'pasta', 'flour', 'crackers', 'croutons', 'wrap', 'noodles', 'bun', 'oats', 'barley', 'rye'],
  shellfish:  ['shrimp', 'crab', 'lobster', 'scallop', 'clam', 'oyster', 'mussel', 'shellfish'],
  fish:       ['fish', 'salmon', 'tuna', 'sardine', 'cod', 'tilapia', 'anchovy', 'trout'],
  sesame:     ['sesame', 'tahini', 'hummus'],
};

const DIET_TAG_MAP = {
  vegetarian:  ['vegetarian', 'vegan'],
  vegan:       ['vegan'],
  pescatarian: ['pescatarian', 'vegan', 'vegetarian', 'gluten-free', 'dairy-free'],
  'gluten-free': ['gluten-free'],
  'dairy-free':  ['dairy-free'],
};

function mealMatchesDiet(meal, dietaryPreferences = []) {
  if (!dietaryPreferences.length) return true;
  const strictDiets = dietaryPreferences.filter(d => DIET_TAG_MAP[d]);
  if (!strictDiets.length) return true;
  // A meal is acceptable if it matches ANY of the user's dietary tags
  return strictDiets.some(diet => {
    const requiredTags = DIET_TAG_MAP[diet] || [];
    return requiredTags.some(tag => meal.dietaryTags.includes(tag));
  });
}

function mealContainsAllergen(meal, userAllergens = []) {
  if (!userAllergens.length) return false;
  const ingredientStr = meal.ingredients.join(' ').toLowerCase();
  return userAllergens.some(allergen => {
    const keywords = ALLERGEN_KEYWORDS[allergen] || [allergen];
    return keywords.some(kw => ingredientStr.includes(kw.toLowerCase()))
      || (meal.allergens || []).includes(allergen);
  });
}

/**
 * Generate a filtered, stage-appropriate meal plan.
 * Returns up to 3 safe options per meal type.
 */
function generateMealPlan(userProfile = {}) {
  const {
    pregnancyStage = 'trimester-1',
    allergies = [],
    foodIntolerances = [],
    dietaryPreferences = [],
  } = userProfile;

  // Combine allergies + intolerances for filtering
  const allRestrictions = [...new Set([
    ...allergies,
    ...foodIntolerances.map(i => i === 'gluten' ? 'wheat' : i === 'lactose' ? 'dairy' : i),
  ])];

  const templates = MEAL_TEMPLATES[pregnancyStage] || MEAL_TEMPLATES['trimester-1'];
  const result = {};

  for (const mealType of ['breakfast', 'lunch', 'dinner', 'snacks']) {
    const options = (templates[mealType] || []).filter(meal =>
      !mealContainsAllergen(meal, allRestrictions) &&
      mealMatchesDiet(meal, dietaryPreferences)
    );

    // Fall back to unrestricted options if filters leave nothing
    result[mealType] = options.length > 0
      ? options.slice(0, 3)
      : (templates[mealType] || []).slice(0, 3).map(m => ({ ...m, allergenWarning: true }));
  }

  return result;
}

module.exports = { calculateBaseNutrition, getMicronutrientRequirements, generateMealPlan };
