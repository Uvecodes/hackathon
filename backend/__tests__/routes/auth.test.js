'use strict';

jest.mock('../../config/firebase', () => require('../__mocks__/firebase'));

const request      = require('supertest');
const app          = require('../../server');
const firebaseMock = require('../__mocks__/firebase');

const AUTH_HEADER = { Authorization: 'Bearer valid-test-token' };

const validProfile = {
  name: 'Jane Doe',
  pregnancyStage: 'trimester-2',
  dueDate: '2025-09-15',
  age: 28,
  heightCm: 163,
  prePregnancyWeightKg: 62,
  currentWeightKg: 68,
  fitnessLevel: 'moderate',
  activityLevel: 'moderate',
  conditions: ['anemia'],
  allergies: ['dairy'],
  foodIntolerances: ['lactose'],
  dietaryPreferences: ['vegetarian'],
};

// ════════════════════════════════════════════════════════════════
// POST /api/auth/complete-profile
// ════════════════════════════════════════════════════════════════

describe('POST /api/auth/complete-profile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    firebaseMock._mocks.verifyIdToken.mockResolvedValue({
      uid: 'uid1',
      email: 'test@example.com',
    });
    // Default: user does not exist yet → will call .set()
    firebaseMock._mocks.docRef.get.mockResolvedValue({ exists: false });
    firebaseMock._mocks.set.mockResolvedValue({});
    firebaseMock._mocks.update.mockResolvedValue({});
  });

  // ── Auth guard ────────────────────────────────────────────────

  test('returns 401 without Authorization header', async () => {
    const res = await request(app).post('/api/auth/complete-profile').send(validProfile);
    expect(res.status).toBe(401);
  });

  // ── Happy path ────────────────────────────────────────────────

  test('returns 201 with valid profile body (new user)', async () => {
    const res = await request(app)
      .post('/api/auth/complete-profile')
      .set(AUTH_HEADER)
      .send(validProfile);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe('test@example.com');
    expect(res.body.user.name).toBe('Jane Doe');
    expect(res.body.user.pregnancyStage).toBe('trimester-2');
  });

  test('updates (not overwrites) when user document already exists', async () => {
    firebaseMock._mocks.docRef.get.mockResolvedValueOnce({ exists: true });
    const res = await request(app)
      .post('/api/auth/complete-profile')
      .set(AUTH_HEADER)
      .send(validProfile);
    expect(res.status).toBe(201);
    expect(firebaseMock._mocks.update).toHaveBeenCalledTimes(1);
    expect(firebaseMock._mocks.set).not.toHaveBeenCalled();
  });

  // ── Validation: pregnancyStage enum ──────────────────────────

  test.each([
    'preconception', 'trimester-1', 'trimester-2', 'trimester-3',
    'postpartum-0-6w', 'postpartum-6w-6m', 'postpartum-6m+',
  ])('accepts valid pregnancyStage: %s', async (stage) => {
    const res = await request(app)
      .post('/api/auth/complete-profile')
      .set(AUTH_HEADER)
      .send({ ...validProfile, pregnancyStage: stage });
    expect(res.status).toBe(201);
  });

  test('rejects invalid pregnancyStage', async () => {
    const res = await request(app)
      .post('/api/auth/complete-profile')
      .set(AUTH_HEADER)
      .send({ ...validProfile, pregnancyStage: 'pre-conception' }); // old value
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // ── Validation: name ──────────────────────────────────────────

  test('rejects name shorter than 2 characters', async () => {
    const res = await request(app)
      .post('/api/auth/complete-profile')
      .set(AUTH_HEADER)
      .send({ ...validProfile, name: 'J' });
    expect(res.status).toBe(400);
  });

  test('rejects name longer than 100 characters', async () => {
    const res = await request(app)
      .post('/api/auth/complete-profile')
      .set(AUTH_HEADER)
      .send({ ...validProfile, name: 'J'.repeat(101) });
    expect(res.status).toBe(400);
  });

  // ── Validation: age ───────────────────────────────────────────

  test('rejects age below 15', async () => {
    const res = await request(app)
      .post('/api/auth/complete-profile')
      .set(AUTH_HEADER)
      .send({ ...validProfile, age: 14 });
    expect(res.status).toBe(400);
  });

  test('rejects age above 60', async () => {
    const res = await request(app)
      .post('/api/auth/complete-profile')
      .set(AUTH_HEADER)
      .send({ ...validProfile, age: 61 });
    expect(res.status).toBe(400);
  });

  test('accepts null age (optional field)', async () => {
    const res = await request(app)
      .post('/api/auth/complete-profile')
      .set(AUTH_HEADER)
      .send({ ...validProfile, age: null });
    expect(res.status).toBe(201);
  });

  // ── Validation: conditions / allergies arrays ─────────────────

  test('rejects invalid condition value', async () => {
    const res = await request(app)
      .post('/api/auth/complete-profile')
      .set(AUTH_HEADER)
      .send({ ...validProfile, conditions: ['fake-condition'] });
    expect(res.status).toBe(400);
  });

  test('rejects invalid allergy value', async () => {
    const res = await request(app)
      .post('/api/auth/complete-profile')
      .set(AUTH_HEADER)
      .send({ ...validProfile, allergies: ['cat-hair'] });
    expect(res.status).toBe(400);
  });

  test('accepts empty conditions array', async () => {
    const res = await request(app)
      .post('/api/auth/complete-profile')
      .set(AUTH_HEADER)
      .send({ ...validProfile, conditions: [] });
    expect(res.status).toBe(201);
  });

  // ── Postpartum-specific fields ────────────────────────────────

  test('accepts postpartum profile with delivery date and recoveryType', async () => {
    const postpartumProfile = {
      name: 'Jane Doe',
      pregnancyStage: 'postpartum-0-6w',
      deliveryDate: '2025-01-10',
      recoveryType: 'c-section',
      breastfeeding: true,
      pumping: false,
    };
    const res = await request(app)
      .post('/api/auth/complete-profile')
      .set(AUTH_HEADER)
      .send(postpartumProfile);
    expect(res.status).toBe(201);
  });

  test('rejects invalid recoveryType', async () => {
    const res = await request(app)
      .post('/api/auth/complete-profile')
      .set(AUTH_HEADER)
      .send({ ...validProfile, pregnancyStage: 'postpartum-0-6w', recoveryType: 'natural' });
    expect(res.status).toBe(400);
  });

  // ── Validation: date formats ──────────────────────────────────

  test('rejects non-ISO8601 dueDate', async () => {
    const res = await request(app)
      .post('/api/auth/complete-profile')
      .set(AUTH_HEADER)
      .send({ ...validProfile, dueDate: '15/09/2025' });
    expect(res.status).toBe(400);
  });
});
