'use strict';

jest.mock('../../config/firebase', () => require('../__mocks__/firebase'));

const request      = require('supertest');
const app          = require('../../server');
const firebaseMock = require('../__mocks__/firebase');

const AUTH_HEADER = { Authorization: 'Bearer valid-test-token' };

// ════════════════════════════════════════════════════════════════
// GET /api/wellness/dashboard
// ════════════════════════════════════════════════════════════════

describe('GET /api/wellness/dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    firebaseMock._mocks.verifyIdToken.mockResolvedValue({ uid: 'uid1', email: 'test@example.com' });

    // User doc exists
    firebaseMock._mocks.docRef.get.mockResolvedValue({
      exists: true,
      data: () => ({
        ...firebaseMock._mocks.defaultUserData,
        dueDate: new Date(Date.now() + 70 * 24 * 60 * 60 * 1000).toISOString(), // ~10 weeks away
      }),
    });

    // No check-ins
    firebaseMock._mocks.query.get.mockResolvedValue({ docs: [] });
  });

  test('returns 401 without auth header', async () => {
    const res = await request(app).get('/api/wellness/dashboard');
    expect(res.status).toBe(401);
  });

  test('returns 200 with dashboard data', async () => {
    const res = await request(app).get('/api/wellness/dashboard').set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.dashboardData).toHaveProperty('pregnancyWeek');
    expect(res.body.dashboardData).toHaveProperty('wellnessScore');
    expect(res.body.dashboardData).toHaveProperty('totalCheckins');
    expect(res.body.dashboardData).toHaveProperty('recentCheckins');
  });

  test('wellnessScore is null when no check-ins', async () => {
    const res = await request(app).get('/api/wellness/dashboard').set(AUTH_HEADER);
    expect(res.body.dashboardData.wellnessScore).toBeNull();
  });

  test('returns 404 when user doc does not exist', async () => {
    firebaseMock._mocks.docRef.get.mockResolvedValueOnce({ exists: false });
    const res = await request(app).get('/api/wellness/dashboard').set(AUTH_HEADER);
    expect(res.status).toBe(404);
  });

  test('wellnessScore is a number (0–100) when check-ins exist', async () => {
    const now = new Date().toISOString();
    firebaseMock._mocks.query.get.mockResolvedValueOnce({
      docs: [
        { id: 'c1', data: () => ({ email: 'test@example.com', mood: 'good', sleep: 7, nutrition: 'good', symptoms: ['none'], timestamp: now }) },
        { id: 'c2', data: () => ({ email: 'test@example.com', mood: 'great', sleep: 8, nutrition: 'excellent', symptoms: [], timestamp: now }) },
      ],
    });
    const res = await request(app).get('/api/wellness/dashboard').set(AUTH_HEADER);
    expect(res.status).toBe(200);
    const score = res.body.dashboardData.wellnessScore;
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

// ════════════════════════════════════════════════════════════════
// POST /api/wellness/checkin
// ════════════════════════════════════════════════════════════════

describe('POST /api/wellness/checkin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    firebaseMock._mocks.verifyIdToken.mockResolvedValue({ uid: 'uid1', email: 'test@example.com' });
    firebaseMock._mocks.add.mockResolvedValue({ id: 'new-checkin-id' });
  });

  const validBody = {
    mood: 'good',
    symptoms: ['fatigue'],
    sleep: 7.5,
    nutrition: 'good',
    notes: 'Feeling okay today',
  };

  test('returns 401 without auth', async () => {
    const res = await request(app).post('/api/wellness/checkin').send(validBody);
    expect(res.status).toBe(401);
  });

  test('returns 201 with valid body', async () => {
    const res = await request(app).post('/api/wellness/checkin').set(AUTH_HEADER).send(validBody);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('checkinId');
    expect(res.body.checkin.mood).toBe('good');
  });

  test('returns 400 when mood is missing', async () => {
    const res = await request(app).post('/api/wellness/checkin').set(AUTH_HEADER).send({ sleep: 7 });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('returns 400 for invalid mood value', async () => {
    const res = await request(app).post('/api/wellness/checkin').set(AUTH_HEADER).send({ mood: 'amazing' });
    expect(res.status).toBe(400);
  });

  test('returns 400 when sleep is out of range', async () => {
    const res = await request(app).post('/api/wellness/checkin').set(AUTH_HEADER)
      .send({ ...validBody, sleep: 30 });
    expect(res.status).toBe(400);
  });

  test('returns 400 when notes exceed 1000 characters', async () => {
    const res = await request(app).post('/api/wellness/checkin').set(AUTH_HEADER)
      .send({ ...validBody, notes: 'x'.repeat(1001) });
    expect(res.status).toBe(400);
  });

  test('accepts checkin without optional fields', async () => {
    const res = await request(app).post('/api/wellness/checkin').set(AUTH_HEADER).send({ mood: 'okay' });
    expect(res.status).toBe(201);
  });

  test('checkin response includes timestamp', async () => {
    const res = await request(app).post('/api/wellness/checkin').set(AUTH_HEADER).send(validBody);
    expect(res.body.checkin.timestamp).toBeDefined();
  });

  test('all valid mood values are accepted', async () => {
    const moods = ['great', 'good', 'okay', 'bad', 'terrible'];
    for (const mood of moods) {
      const res = await request(app).post('/api/wellness/checkin').set(AUTH_HEADER).send({ mood });
      expect(res.status).toBe(201);
    }
  });
});

// ════════════════════════════════════════════════════════════════
// GET /api/wellness/exercises
// ════════════════════════════════════════════════════════════════

describe('GET /api/wellness/exercises', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    firebaseMock._mocks.verifyIdToken.mockResolvedValue({ uid: 'uid1', email: 'test@example.com' });
    firebaseMock._mocks.docRef.get.mockResolvedValue({
      exists: true,
      data: () => firebaseMock._mocks.defaultUserData,
    });
  });

  test('returns 401 without auth', async () => {
    const res = await request(app).get('/api/wellness/exercises');
    expect(res.status).toBe(401);
  });

  test('returns 200 with exercises array', async () => {
    const res = await request(app).get('/api/wellness/exercises').set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.exercises)).toBe(true);
    expect(res.body.exercises.length).toBeGreaterThan(0);
  });

  test('response includes stage and fitnessLevel', async () => {
    const res = await request(app).get('/api/wellness/exercises').set(AUTH_HEADER);
    expect(res.body).toHaveProperty('stage');
    expect(res.body).toHaveProperty('fitnessLevel');
  });

  test('conditionNotes is null for user with no conditions', async () => {
    const res = await request(app).get('/api/wellness/exercises').set(AUTH_HEADER);
    expect(res.body.conditionNotes).toBeNull();
  });

  test('conditionNotes is set for user with preeclampsia', async () => {
    firebaseMock._mocks.docRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({ ...firebaseMock._mocks.defaultUserData, conditions: ['preeclampsia'] }),
    });
    const res = await request(app).get('/api/wellness/exercises').set(AUTH_HEADER);
    expect(res.body.conditionNotes).not.toBeNull();
    expect(typeof res.body.conditionNotes).toBe('string');
  });

  test('works even when user doc does not exist (uses defaults)', async () => {
    firebaseMock._mocks.docRef.get.mockResolvedValueOnce({ exists: false });
    const res = await request(app).get('/api/wellness/exercises').set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(res.body.exercises.length).toBeGreaterThan(0);
  });
});

// ════════════════════════════════════════════════════════════════
// GET /api/wellness/nutrition
// ════════════════════════════════════════════════════════════════

describe('GET /api/wellness/nutrition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    firebaseMock._mocks.verifyIdToken.mockResolvedValue({ uid: 'uid1', email: 'test@example.com' });
    firebaseMock._mocks.docRef.get.mockResolvedValue({
      exists: true,
      data: () => firebaseMock._mocks.defaultUserData,
    });
  });

  test('returns 401 without auth', async () => {
    const res = await request(app).get('/api/wellness/nutrition');
    expect(res.status).toBe(401);
  });

  test('returns 200 with calorie target', async () => {
    const res = await request(app).get('/api/wellness/nutrition').set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('calorieTarget');
    expect(res.body.calorieTarget).toBeGreaterThan(0);
  });

  test('response includes macros with protein, carbs, fat', async () => {
    const res = await request(app).get('/api/wellness/nutrition').set(AUTH_HEADER);
    expect(res.body.macros).toHaveProperty('protein');
    expect(res.body.macros).toHaveProperty('carbs');
    expect(res.body.macros).toHaveProperty('fat');
  });

  test('response includes micronutrients array', async () => {
    const res = await request(app).get('/api/wellness/nutrition').set(AUTH_HEADER);
    expect(Array.isArray(res.body.micronutrients)).toBe(true);
    expect(res.body.micronutrients.length).toBeGreaterThan(0);
  });

  test('response includes mealPlan with breakfast, lunch, dinner, snacks', async () => {
    const res = await request(app).get('/api/wellness/nutrition').set(AUTH_HEADER);
    expect(res.body.mealPlan).toHaveProperty('breakfast');
    expect(res.body.mealPlan).toHaveProperty('lunch');
    expect(res.body.mealPlan).toHaveProperty('dinner');
    expect(res.body.mealPlan).toHaveProperty('snacks');
  });

  test('response includes hydrationMl', async () => {
    const res = await request(app).get('/api/wellness/nutrition').set(AUTH_HEADER);
    expect(res.body.hydrationMl).toBeGreaterThanOrEqual(2500);
  });

  test('response includes bmr and tdee', async () => {
    const res = await request(app).get('/api/wellness/nutrition').set(AUTH_HEADER);
    expect(res.body).toHaveProperty('bmr');
    expect(res.body).toHaveProperty('tdee');
  });

  test('works with default user (no profile data)', async () => {
    firebaseMock._mocks.docRef.get.mockResolvedValueOnce({ exists: false });
    const res = await request(app).get('/api/wellness/nutrition').set(AUTH_HEADER);
    expect(res.status).toBe(200);
  });
});
