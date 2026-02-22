'use strict';

jest.mock('../../config/firebase', () => require('../__mocks__/firebase'));

const request      = require('supertest');
const app          = require('../../server');
const firebaseMock = require('../__mocks__/firebase');

const AUTH_HEADER = { Authorization: 'Bearer valid-test-token' };

beforeEach(() => {
  jest.clearAllMocks();
  firebaseMock._mocks.verifyIdToken.mockResolvedValue({ uid: 'uid1', email: 'test@example.com' });
  firebaseMock._mocks.query.get.mockResolvedValue({ docs: [] });
  firebaseMock._mocks.add.mockResolvedValue({ id: 'contact-id-1' });
});

// ════════════════════════════════════════════════════════════════
// GET /api/safety/contacts
// ════════════════════════════════════════════════════════════════

describe('GET /api/safety/contacts', () => {
  test('returns 401 without auth', async () => {
    const res = await request(app).get('/api/safety/contacts');
    expect(res.status).toBe(401);
  });

  test('returns 200 with empty contacts array', async () => {
    const res = await request(app).get('/api/safety/contacts').set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.contacts)).toBe(true);
  });

  test('returns contacts list when docs exist', async () => {
    firebaseMock._mocks.query.get.mockResolvedValueOnce({
      docs: [
        { id: 'c1', data: () => ({ name: 'Mum', email: 'mum@example.com', phone: '+2348012345678', relationship: 'Mother', userEmail: 'test@example.com' }) },
      ],
    });
    const res = await request(app).get('/api/safety/contacts').set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(res.body.contacts.length).toBe(1);
    expect(res.body.contacts[0].name).toBe('Mum');
  });
});

// ════════════════════════════════════════════════════════════════
// POST /api/safety/emergency-contact
// ════════════════════════════════════════════════════════════════

describe('POST /api/safety/emergency-contact', () => {
  const validContact = {
    name: 'Emergency Contact',
    email: 'contact@example.com',
    phone: '+2348012345678',
    relationship: 'Spouse',
  };

  test('returns 401 without auth', async () => {
    const res = await request(app).post('/api/safety/emergency-contact').send(validContact);
    expect(res.status).toBe(401);
  });

  test('returns 201 with valid contact data', async () => {
    const res = await request(app)
      .post('/api/safety/emergency-contact')
      .set(AUTH_HEADER)
      .send(validContact);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.contact.name).toBe('Emergency Contact');
  });

  test('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/safety/emergency-contact')
      .set(AUTH_HEADER)
      .send({ email: 'c@example.com', phone: '+234801', relationship: 'Spouse' });
    expect(res.status).toBe(400);
  });

  test('returns 400 for invalid email', async () => {
    const res = await request(app)
      .post('/api/safety/emergency-contact')
      .set(AUTH_HEADER)
      .send({ ...validContact, email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  test('returns 400 when phone is too short', async () => {
    const res = await request(app)
      .post('/api/safety/emergency-contact')
      .set(AUTH_HEADER)
      .send({ ...validContact, phone: '123' });
    expect(res.status).toBe(400);
  });

  test('returns 400 when max contacts (2) already reached', async () => {
    // Simulate 2 existing contacts
    firebaseMock._mocks.query.get.mockResolvedValueOnce({
      docs: [
        { id: 'c1', data: () => ({ name: 'A', userEmail: 'test@example.com' }) },
        { id: 'c2', data: () => ({ name: 'B', userEmail: 'test@example.com' }) },
      ],
      size: 2,
    });
    const res = await request(app)
      .post('/api/safety/emergency-contact')
      .set(AUTH_HEADER)
      .send(validContact);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/maximum|max|limit/i);
  });
});

// ════════════════════════════════════════════════════════════════
// DELETE /api/safety/emergency-contact/:id
// ════════════════════════════════════════════════════════════════

describe('DELETE /api/safety/emergency-contact/:id', () => {
  test('returns 401 without auth', async () => {
    const res = await request(app).delete('/api/safety/emergency-contact/some-id');
    expect(res.status).toBe(401);
  });

  test('returns 200 when contact belongs to user', async () => {
    firebaseMock._mocks.docRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({ userEmail: 'test@example.com', name: 'Mum' }),
    });
    const res = await request(app).delete('/api/safety/emergency-contact/some-id').set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('returns 404 when contact does not exist', async () => {
    firebaseMock._mocks.docRef.get.mockResolvedValueOnce({ exists: false });
    const res = await request(app).delete('/api/safety/emergency-contact/bad-id').set(AUTH_HEADER);
    expect(res.status).toBe(404);
  });

  test('returns 403 when contact belongs to another user', async () => {
    firebaseMock._mocks.docRef.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({ userEmail: 'other@example.com', name: 'Other' }),
    });
    const res = await request(app).delete('/api/safety/emergency-contact/bad-id').set(AUTH_HEADER);
    expect(res.status).toBe(403);
  });
});

// ════════════════════════════════════════════════════════════════
// POST /api/safety/shake-alert
// ════════════════════════════════════════════════════════════════

describe('POST /api/safety/shake-alert', () => {
  beforeEach(() => {
    // Has 1 contact to notify
    firebaseMock._mocks.query.get.mockResolvedValueOnce({
      docs: [
        { id: 'c1', data: () => ({ name: 'Mum', email: 'mum@example.com', phone: '+234801', relationship: 'Mother', userEmail: 'test@example.com' }) },
      ],
    });
  });

  test('returns 401 without auth', async () => {
    const res = await request(app).post('/api/safety/shake-alert').send({ lat: 6.5, lon: 3.3 });
    expect(res.status).toBe(401);
  });

  test('returns 201 with valid location data', async () => {
    const res = await request(app)
      .post('/api/safety/shake-alert')
      .set(AUTH_HEADER)
      .send({ lat: 6.5244, lon: 3.3792, addressText: 'Lagos, Nigeria' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('contactsNotified');
  });

  test('returns 400 when lat/lon are invalid', async () => {
    const res = await request(app)
      .post('/api/safety/shake-alert')
      .set(AUTH_HEADER)
      .send({ lat: 'not-a-number', lon: 3.3 });
    expect(res.status).toBe(400);
  });

  test('logs alert to Firestore', async () => {
    await request(app)
      .post('/api/safety/shake-alert')
      .set(AUTH_HEADER)
      .send({ lat: 6.5, lon: 3.3 });
    expect(firebaseMock._mocks.add).toHaveBeenCalled();
  });
});

// ════════════════════════════════════════════════════════════════
// GET /api/safety/alert-history
// ════════════════════════════════════════════════════════════════

describe('GET /api/safety/alert-history', () => {
  test('returns 401 without auth', async () => {
    const res = await request(app).get('/api/safety/alert-history');
    expect(res.status).toBe(401);
  });

  test('returns 200 with alerts array', async () => {
    const res = await request(app).get('/api/safety/alert-history').set(AUTH_HEADER);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.alerts)).toBe(true);
  });
});
