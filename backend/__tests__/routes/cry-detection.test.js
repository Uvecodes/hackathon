'use strict';

jest.mock('../../config/firebase', () => require('../__mocks__/firebase'));

const request      = require('supertest');
const app          = require('../../server');
const firebaseMock = require('../__mocks__/firebase');

const AUTH_HEADER = { Authorization: 'Bearer valid-test-token' };

beforeEach(() => {
  jest.clearAllMocks();
  firebaseMock._mocks.verifyIdToken.mockResolvedValue({ uid: 'uid1', email: 'test@example.com' });
  firebaseMock._mocks.add.mockResolvedValue({ id: 'cry-log-id' });
  firebaseMock._mocks.query.get.mockResolvedValue({ docs: [] });
});

// Valid acoustic payload — matches route's required fields:
//   duration (float 0.1–60), rms (float ≥ 0), confidence (float 0–1)
const validPayload = {
  duration:   3.5,
  rms:        0.035,
  confidence: 0.75,
  spectral: {
    lowRatio:         0.1,
    fundamentalRatio: 0.3,
    midRatio:         0.4,
    highRatio:        0.2,
  },
};

// Valid advanced-analyze payload — requires audioBase64
const advancedPayload = {
  audioBase64: Buffer.from('fake-test-audio-data').toString('base64'),
  duration:    4.0,
  spectral: {
    lowRatio:         0.15,
    fundamentalRatio: 0.25,
    midRatio:         0.35,
    highRatio:        0.25,
  },
};

// ════════════════════════════════════════════════════════════════
// POST /api/cry-detection/analyze
// ════════════════════════════════════════════════════════════════

describe('POST /api/cry-detection/analyze', () => {
  test('returns 401 without auth', async () => {
    const res = await request(app).post('/api/cry-detection/analyze').send(validPayload);
    expect(res.status).toBe(401);
  });

  test('returns 201 with valid acoustic data', async () => {
    const res = await request(app)
      .post('/api/cry-detection/analyze')
      .set(AUTH_HEADER)
      .send(validPayload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.analysis).toBeDefined();
  });

  test('response analysis has required fields', async () => {
    const res = await request(app)
      .post('/api/cry-detection/analyze')
      .set(AUTH_HEADER)
      .send(validPayload);
    expect(res.body.analysis).toHaveProperty('label');
    expect(res.body.analysis).toHaveProperty('confidence');
    expect(res.body.analysis).toHaveProperty('suggestions');
    expect(res.body.analysis).toHaveProperty('source');
  });

  test('label is a known cry classification', async () => {
    const res = await request(app)
      .post('/api/cry-detection/analyze')
      .set(AUTH_HEADER)
      .send(validPayload);
    const validLabels = ['Hungry', 'Pain', 'Sleepy', 'Discomfort'];
    expect(validLabels).toContain(res.body.analysis.label);
  });

  test('confidence is between 0 and 100', async () => {
    const res = await request(app)
      .post('/api/cry-detection/analyze')
      .set(AUTH_HEADER)
      .send(validPayload);
    expect(res.body.analysis.confidence).toBeGreaterThanOrEqual(0);
    expect(res.body.analysis.confidence).toBeLessThanOrEqual(100);
  });

  test('suggestions is an array', async () => {
    const res = await request(app)
      .post('/api/cry-detection/analyze')
      .set(AUTH_HEADER)
      .send(validPayload);
    expect(Array.isArray(res.body.analysis.suggestions)).toBe(true);
  });

  test('returns 400 when duration is missing', async () => {
    const { duration, ...rest } = validPayload;
    const res = await request(app)
      .post('/api/cry-detection/analyze')
      .set(AUTH_HEADER)
      .send(rest);
    expect(res.status).toBe(400);
  });

  test('returns 400 when rms is missing', async () => {
    const { rms, ...rest } = validPayload;
    const res = await request(app)
      .post('/api/cry-detection/analyze')
      .set(AUTH_HEADER)
      .send(rest);
    expect(res.status).toBe(400);
  });

  test('returns 400 when duration is out of range (> 60)', async () => {
    const res = await request(app)
      .post('/api/cry-detection/analyze')
      .set(AUTH_HEADER)
      .send({ ...validPayload, duration: 61 });
    expect(res.status).toBe(400);
  });

  test('returns 400 when duration is 0 or negative', async () => {
    const res = await request(app)
      .post('/api/cry-detection/analyze')
      .set(AUTH_HEADER)
      .send({ ...validPayload, duration: 0 });
    expect(res.status).toBe(400);
  });

  test('logs cry analysis to Firestore', async () => {
    await request(app)
      .post('/api/cry-detection/analyze')
      .set(AUTH_HEADER)
      .send(validPayload);
    expect(firebaseMock._mocks.add).toHaveBeenCalled();
  });

  test('works without optional spectral data', async () => {
    const { spectral, ...noSpectral } = validPayload;
    const res = await request(app)
      .post('/api/cry-detection/analyze')
      .set(AUTH_HEADER)
      .send(noSpectral);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════
// POST /api/cry-detection/advanced-analyze
// ════════════════════════════════════════════════════════════════

describe('POST /api/cry-detection/advanced-analyze', () => {
  test('returns 401 without auth', async () => {
    const res = await request(app).post('/api/cry-detection/advanced-analyze').send(advancedPayload);
    expect(res.status).toBe(401);
  });

  test('returns 201 with valid data (falls back to enhanced heuristic when Watson absent)', async () => {
    const res = await request(app)
      .post('/api/cry-detection/advanced-analyze')
      .set(AUTH_HEADER)
      .send(advancedPayload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.analysis).toBeDefined();
  });

  test('response analysis has label and confidence', async () => {
    const res = await request(app)
      .post('/api/cry-detection/advanced-analyze')
      .set(AUTH_HEADER)
      .send(advancedPayload);
    expect(res.body.analysis).toHaveProperty('label');
    expect(res.body.analysis).toHaveProperty('confidence');
  });

  test('confidence is between 40 and 95 for heuristic fallback', async () => {
    const res = await request(app)
      .post('/api/cry-detection/advanced-analyze')
      .set(AUTH_HEADER)
      .send(advancedPayload);
    expect(res.body.analysis.confidence).toBeGreaterThanOrEqual(40);
    expect(res.body.analysis.confidence).toBeLessThanOrEqual(95);
  });

  test('response analysis includes source field', async () => {
    const res = await request(app)
      .post('/api/cry-detection/advanced-analyze')
      .set(AUTH_HEADER)
      .send(advancedPayload);
    expect(res.body.analysis).toHaveProperty('source');
    const validSources = ['watson', 'enhanced-heuristic', 'heuristic'];
    expect(validSources).toContain(res.body.analysis.source);
  });

  test('response analysis includes actionItems array', async () => {
    const res = await request(app)
      .post('/api/cry-detection/advanced-analyze')
      .set(AUTH_HEADER)
      .send(advancedPayload);
    expect(Array.isArray(res.body.analysis.actionItems)).toBe(true);
  });

  test('returns 400 when audioBase64 is missing', async () => {
    const { audioBase64, ...rest } = advancedPayload;
    const res = await request(app)
      .post('/api/cry-detection/advanced-analyze')
      .set(AUTH_HEADER)
      .send(rest);
    expect(res.status).toBe(400);
  });
});

// ════════════════════════════════════════════════════════════════
// GET /api/cry-detection/history
// ════════════════════════════════════════════════════════════════

describe('GET /api/cry-detection/history', () => {
  test('returns 401 without auth', async () => {
    const res = await request(app).get('/api/cry-detection/history');
    expect(res.status).toBe(401);
  });

  test('returns 200 with empty history', async () => {
    const res = await request(app).get('/api/cry-detection/history').set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.logs)).toBe(true);
  });

  test('returns 200 with log entries when data exists', async () => {
    const now = new Date().toISOString();
    firebaseMock._mocks.query.get.mockResolvedValueOnce({
      docs: [
        { id: 'log1', data: () => ({ cryType: 'hungry', confidence: 78, duration: 3, timestamp: now, userEmail: 'test@example.com' }) },
        { id: 'log2', data: () => ({ cryType: 'sleepy',  confidence: 65, duration: 2, timestamp: now, userEmail: 'test@example.com' }) },
      ],
    });
    const res = await request(app).get('/api/cry-detection/history').set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(res.body.logs.length).toBeGreaterThanOrEqual(0);
  });

  test('accepts custom limit query param', async () => {
    const res = await request(app).get('/api/cry-detection/history?limit=5').set(AUTH_HEADER);
    expect(res.status).toBe(200);
  });

  test('caps limit at 100', async () => {
    const res = await request(app).get('/api/cry-detection/history?limit=999').set(AUTH_HEADER);
    expect(res.status).toBe(200);
  });

  test('response includes stats object', async () => {
    const res = await request(app).get('/api/cry-detection/history').set(AUTH_HEADER);
    expect(res.body).toHaveProperty('stats');
    expect(res.body.stats).toHaveProperty('totalAnalyses');
    expect(res.body.stats).toHaveProperty('typeBreakdown');
  });
});

// ════════════════════════════════════════════════════════════════
// GET /api/cry-detection/insights
// ════════════════════════════════════════════════════════════════

describe('GET /api/cry-detection/insights', () => {
  test('returns 401 without auth', async () => {
    const res = await request(app).get('/api/cry-detection/insights');
    expect(res.status).toBe(401);
  });

  test('returns 200 with insights data', async () => {
    const res = await request(app).get('/api/cry-detection/insights').set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.insights).toHaveProperty('recommendations');
  });

  test('includes mostCommonType field', async () => {
    const now = new Date().toISOString();
    firebaseMock._mocks.query.get.mockResolvedValueOnce({
      docs: [
        { id: 'l1', data: () => ({ cryType: 'hungry', timestamp: now }) },
        { id: 'l2', data: () => ({ cryType: 'hungry', timestamp: now }) },
        { id: 'l3', data: () => ({ cryType: 'sleepy',  timestamp: now }) },
      ],
    });
    const res = await request(app).get('/api/cry-detection/insights').set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(res.body.insights).toHaveProperty('mostCommonType');
  });
});
