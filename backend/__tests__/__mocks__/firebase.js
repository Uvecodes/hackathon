'use strict';

/**
 * Jest manual mock for backend/config/firebase.js
 * Place this file at __tests__/__mocks__/firebase.js
 * Use jest.mock('../../config/firebase', () => require('../__mocks__/firebase'))
 * in any test file that imports a route or middleware relying on Firebase.
 */

const mockVerifyIdToken = jest.fn();
const mockGet           = jest.fn();
const mockAdd           = jest.fn();
const mockSet           = jest.fn();
const mockUpdate        = jest.fn();
const mockDelete        = jest.fn();
const mockWhere         = jest.fn();
const mockDoc           = jest.fn();
const mockCollection    = jest.fn();

// Default: valid token resolves to a test user
mockVerifyIdToken.mockResolvedValue({
  uid: 'test-uid-123',
  email: 'test@example.com',
});

// Default: Firestore doc exists with sensible profile data
const defaultUserData = {
  email: 'test@example.com',
  name: 'Test User',
  pregnancyStage: 'trimester-2',
  dueDate: null,
  age: 28,
  heightCm: 163,
  currentWeightKg: 65,
  fitnessLevel: 'moderate',
  activityLevel: 'moderate',
  conditions: [],
  allergies: [],
  foodIntolerances: [],
  dietaryPreferences: [],
  breastfeeding: false,
};

// Build chainable Firestore mock
const mockDocRef = {
  get:    jest.fn().mockResolvedValue({ exists: true, data: () => defaultUserData, id: 'doc-id' }),
  set:    mockSet.mockResolvedValue({}),
  update: mockUpdate.mockResolvedValue({}),
  delete: mockDelete.mockResolvedValue({}),
  id:     'doc-id',
};

const mockQuerySnapshot = {
  docs: [],
  empty: true,
};

const mockQuery = {
  get:   jest.fn().mockResolvedValue(mockQuerySnapshot),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit:   jest.fn().mockReturnThis(),
};

mockCollection.mockReturnValue({
  doc:   jest.fn().mockReturnValue(mockDocRef),
  add:   mockAdd.mockResolvedValue({ id: 'new-doc-id' }),
  where: jest.fn().mockReturnValue(mockQuery),
});

const db = {
  collection: mockCollection,
};

const auth = {
  verifyIdToken: mockVerifyIdToken,
};

module.exports = {
  db,
  auth,
  admin: {},
  storage: {},
  // Expose mocks for test assertions
  _mocks: {
    verifyIdToken: mockVerifyIdToken,
    collection:    mockCollection,
    docRef:        mockDocRef,
    querySnapshot: mockQuerySnapshot,
    query:         mockQuery,
    add:           mockAdd,
    set:           mockSet,
    update:        mockUpdate,
    defaultUserData,
  },
};
