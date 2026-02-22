'use strict';

jest.mock('../../config/firebase', () => require('../__mocks__/firebase'));

const authMiddleware = require('../../middleware/auth');
const firebaseMock   = require('../__mocks__/firebase');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
}

describe('Auth Middleware', () => {
  let next;

  beforeEach(() => {
    next = jest.fn();
    jest.clearAllMocks();
    // Reset to valid token by default
    firebaseMock._mocks.verifyIdToken.mockResolvedValue({
      uid:   'test-uid-123',
      email: 'test@example.com',
    });
  });

  // ── Missing / malformed header ────────────────────────────────

  test('returns 401 when Authorization header is absent', async () => {
    const req = { headers: {} };
    const res = mockRes();
    await authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 when header is not Bearer format', async () => {
    const req = { headers: { authorization: 'Basic abc123' } };
    const res = mockRes();
    await authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 for empty Bearer token', async () => {
    const req = { headers: { authorization: 'Bearer ' } };
    const res = mockRes();
    firebaseMock._mocks.verifyIdToken.mockRejectedValueOnce({ code: 'auth/argument-error' });
    await authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  // ── Valid token ───────────────────────────────────────────────

  test('calls next() and attaches user to req on valid token', async () => {
    const req = { headers: { authorization: 'Bearer valid-token' } };
    const res = mockRes();
    await authMiddleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toEqual({ uid: 'test-uid-123', email: 'test@example.com' });
  });

  test('verifyIdToken is called with the extracted token', async () => {
    const req = { headers: { authorization: 'Bearer my-token-value' } };
    const res = mockRes();
    await authMiddleware(req, res, next);
    expect(firebaseMock._mocks.verifyIdToken).toHaveBeenCalledWith('my-token-value');
  });

  // ── Token errors ──────────────────────────────────────────────

  test('returns 401 with expiry message for auth/id-token-expired', async () => {
    firebaseMock._mocks.verifyIdToken.mockRejectedValueOnce({ code: 'auth/id-token-expired' });
    const req = { headers: { authorization: 'Bearer expired-token' } };
    const res = mockRes();
    await authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringMatching(/expired/i),
    }));
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 for auth/argument-error', async () => {
    firebaseMock._mocks.verifyIdToken.mockRejectedValueOnce({ code: 'auth/argument-error' });
    const req = { headers: { authorization: 'Bearer bad-token' } };
    const res = mockRes();
    await authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 for auth/id-token-revoked', async () => {
    firebaseMock._mocks.verifyIdToken.mockRejectedValueOnce({ code: 'auth/id-token-revoked' });
    const req = { headers: { authorization: 'Bearer revoked-token' } };
    const res = mockRes();
    await authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 500 for unexpected internal errors', async () => {
    firebaseMock._mocks.verifyIdToken.mockRejectedValueOnce(new Error('Unexpected network error'));
    const req = { headers: { authorization: 'Bearer some-token' } };
    const res = mockRes();
    await authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(next).not.toHaveBeenCalled();
  });

  // ── Edge: token without email (uid fallback) ──────────────────

  test('falls back to uid when decoded token has no email', async () => {
    firebaseMock._mocks.verifyIdToken.mockResolvedValueOnce({ uid: 'uid-only' });
    const req = { headers: { authorization: 'Bearer no-email-token' } };
    const res = mockRes();
    await authMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user.email).toBe('uid-only');
  });
});
