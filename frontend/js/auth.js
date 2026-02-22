/**
 * THE MOTHER SUITE — Auth Module
 *
 * Provides:
 *   • window.AUTH  — session management + authenticated API calls (used by all pages)
 *   • initLoginForm()           — real Firebase signInWithEmailAndPassword
 *   • initForgotPasswordModal() — real Firebase sendPasswordResetEmail
 *   • Firebase initialisation from backend /api/config
 *
 * Script load order required in HTML:
 *   firebase-app-compat.js → firebase-auth-compat.js → firebase-config.js → auth.js
 */

window.firebaseInitialized = false;

let _firebaseResolve;
const _firebaseInitPromise = new Promise(r => { _firebaseResolve = r; });

// ── AUTH global — used by every page that makes API calls ───────────────────
const AUTH = {
  USER_KEY: 'ms_user',

  API_BASE_URL: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3000'
    : 'https://files-copy.onrender.com',

  _auth() {
    return (typeof firebase !== 'undefined' && window.firebaseInitialized)
      ? firebase.auth()
      : null;
  },

  /** Returns a fresh Firebase ID token, or null if not signed in. */
  async getToken() {
    const auth = await _firebaseInitPromise;
    if (!auth) return null;
    const user = auth.currentUser;
    if (!user) return null;
    try {
      return await user.getIdToken(false);
    } catch (err) {
      console.error('[AUTH] getToken error:', err);
      return null;
    }
  },

  /** Cache user profile in localStorage. */
  setUser(user) {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  },

  /** Read cached user profile from localStorage. */
  getUser() {
    const raw = localStorage.getItem(this.USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  /** True if Firebase has a signed-in current user. */
  isAuthenticated() {
    const auth = this._auth();
    return auth ? !!auth.currentUser : false;
  },

  /** Sign out, clear cache, redirect to home. */
  async logout() {
    const auth = this._auth();
    if (auth) {
      try { await auth.signOut(); } catch (err) { console.error('[AUTH] signOut error:', err); }
    }
    localStorage.removeItem(this.USER_KEY);
    window.location.href = 'index.html';
  },

  /** Redirect to login if not authenticated. Call at top of protected pages. */
  requireAuth() {
    if (!this.isAuthenticated()) {
      window.location.href = 'login.html';
    }
  },

  /**
   * Resolves when Firebase auth state has been fully restored from persistence.
   * Await this before making the first API call on a protected page.
   */
  whenReady() {
    return _firebaseInitPromise.then(auth => {
      if (!auth) return null;
      return new Promise((resolve) => {
        let timeoutId;
        const unsub = auth.onAuthStateChanged((user) => {
          if (user) {
            clearTimeout(timeoutId);
            unsub();
            resolve(user);
          } else {
            // Give Firebase up to 500 ms to restore a persisted session
            timeoutId = setTimeout(() => {
              unsub();
              resolve(auth.currentUser);
            }, 500);
          }
        });
      });
    });
  },

  // ── Authenticated API helpers ────────────────────────────────────────────
  async request(endpoint, options = {}) {
    const token = await this.getToken();
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const url = endpoint.startsWith('http')
      ? endpoint
      : `${this.API_BASE_URL}${endpoint}`;

    try {
      const response = await fetch(url, { ...options, headers, credentials: 'include' });

      if (response.status === 401) {
        if (token) this.logout(); // token was sent but rejected → session invalid
        throw new Error('Session expired. Please log in again.');
      }

      const data = await response.json();
      if (!response.ok) {
        const errMsg = data.errors?.length
          ? data.errors.map(e => e.message).join('. ')
          : data.message || `HTTP ${response.status}`;
        throw new Error(errMsg);
      }
      return data;
    } catch (err) {
      console.error(`[API Error] ${endpoint}:`, err);
      throw err;
    }
  },

  async get(endpoint)           { return this.request(endpoint, { method: 'GET' }); },
  async post(endpoint, body)    { return this.request(endpoint, { method: 'POST',   body: JSON.stringify(body) }); },
  async put(endpoint, body)     { return this.request(endpoint, { method: 'PUT',    body: JSON.stringify(body) }); },
  async delete(endpoint, body)  { return this.request(endpoint, { method: 'DELETE', ...(body && { body: JSON.stringify(body) }) }); },
};

window.AUTH = AUTH;


// ── Helpers ──────────────────────────────────────────────────────────────────
function _friendlyAuthError(err) {
  const map = {
    'auth/user-not-found':         'No account found with this email.',
    'auth/wrong-password':         'Incorrect password. Please try again.',
    'auth/invalid-credential':     'Incorrect email or password.',
    'auth/invalid-email':          'Invalid email address.',
    'auth/too-many-requests':      'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Please check your connection.',
    'auth/user-disabled':          'This account has been disabled.',
  };
  return map[err.code] || err.message || 'An error occurred. Please try again.';
}

function _showError(msg) {
  const el = document.getElementById('authError');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

function _showSuccess(msg) {
  const el = document.getElementById('authSuccess');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

function _clearMessages() {
  ['authError', 'authSuccess'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = ''; el.style.display = 'none'; }
  });
}

function _setLoading(btn, loading) {
  if (!btn) return;
  btn.disabled = loading;
  btn.dataset.original = btn.dataset.original || btn.textContent;
  btn.textContent = loading ? 'Please wait…' : btn.dataset.original;
}


// ── Login form ────────────────────────────────────────────────────────────────
function initLoginForm() {
  const loginForm     = document.getElementById('loginForm');
  if (!loginForm) return;

  const emailInput    = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const submitBtn     = document.getElementById('loginBtn');

  // Real-time button gating — disabled until valid email + non-empty password
  function isValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  function updateSubmitState() {
    const emailOk    = isValidEmail(emailInput?.value.trim() || '');
    const passwordOk = (passwordInput?.value || '').length > 0;
    if (submitBtn) submitBtn.disabled = !(emailOk && passwordOk);
  }

  emailInput?.addEventListener('input', updateSubmitState);
  passwordInput?.addEventListener('input', updateSubmitState);
  if (submitBtn) submitBtn.disabled = true;

  // Password visibility toggle
  document.querySelectorAll('.toggle-pw').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.target);
      if (!target) return;
      const isText = target.type === 'text';
      target.type     = isText ? 'password' : 'text';
      btn.textContent = isText ? '👁' : '🙈';
    });
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    _clearMessages();

    const email    = emailInput?.value.trim();
    const password = passwordInput?.value;

    if (!isValidEmail(email)) return _showError('Please enter a valid email address.');
    if (!password)            return _showError('Please enter your password.');

    _setLoading(submitBtn, true);

    try {
      if (typeof firebase === 'undefined' || !window.firebaseInitialized) {
        throw new Error('Service is starting up. Please wait a moment and try again.');
      }

      const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
      const user           = userCredential.user;
      const token          = await user.getIdToken();

      // Fetch and cache the full user profile from the backend
      try {
        const res = await fetch(`${AUTH.API_BASE_URL}/api/user/profile`, {
          headers:     { 'Authorization': `Bearer ${token}` },
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          if (data.user) AUTH.setUser(data.user);
        }
      } catch (_) {
        // Non-fatal — the dashboard will re-fetch the profile
      }

      _showSuccess('Welcome back! Redirecting…');
      setTimeout(() => { window.location.href = 'dashboard-files/dashboard.html'; }, 1500);

    } catch (err) {
      console.error('[Login]', err);
      _showError(_friendlyAuthError(err));
    } finally {
      _setLoading(submitBtn, false);
    }
  });
}


// ── Forgot password modal ────────────────────────────────────────────────────
function initForgotPasswordModal() {
  const forgotLink  = document.querySelector('.forgot-link');
  const modal       = document.getElementById('forgotModal');
  const closeBtn    = document.getElementById('forgotClose');
  const forgotForm  = document.getElementById('forgotForm');
  const forgotEmail = document.getElementById('forgotEmail');
  const forgotMsg   = document.getElementById('forgotMsg');

  if (!forgotLink || !modal) return;

  const openModal  = () => {
    modal.style.display      = 'flex';
    document.body.style.overflow = 'hidden';
    forgotEmail?.focus();
  };
  const closeModal = () => {
    modal.style.display      = 'none';
    document.body.style.overflow = '';
  };

  forgotLink.addEventListener('click', (e) => { e.preventDefault(); openModal(); });
  closeBtn?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.style.display === 'flex') closeModal();
  });

  forgotForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = forgotEmail?.value.trim();
    if (!email) return;

    try {
      if (typeof firebase !== 'undefined' && window.firebaseInitialized) {
        await firebase.auth().sendPasswordResetEmail(email);
      }
    } catch (err) {
      console.error('[ForgotPassword]', err);
      // Intentionally swallow — never reveal whether an email exists
    }

    if (forgotMsg) {
      forgotMsg.textContent    = 'If an account exists for that email, a reset link is on its way. Check your inbox.';
      forgotMsg.style.display  = 'block';
    }
    setTimeout(closeModal, 3000);
  });
}


// ── Firebase init + DOMContentLoaded ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {

  // Initialise Firebase with config fetched from the backend
  try {
    const configPromise = window.FIREBASE_CONFIG_READY;
    if (configPromise && typeof firebase !== 'undefined') {
      const config = await configPromise;
      if (config && config.apiKey) {
        if (!firebase.apps.length) firebase.initializeApp(config);
        window.firebaseInitialized = true;
        _firebaseResolve(firebase.auth());
      } else {
        console.warn('[AUTH] Firebase config missing or incomplete.');
        _firebaseResolve(null);
      }
    } else {
      _firebaseResolve(null);
    }
  } catch (err) {
    console.error('[AUTH] Firebase init failed:', err);
    _firebaseResolve(null);
  }

  // Wire up any logout buttons (any element with data-logout attribute)
  document.querySelectorAll('[data-logout]').forEach(btn => {
    btn.addEventListener('click', (e) => { e.preventDefault(); AUTH.logout(); });
  });

  // Auth-required pages: add data-require-auth attribute to <html> element
  if (document.documentElement.getAttribute('data-require-auth')) {
    if (window.firebaseInitialized && typeof firebase !== 'undefined') {
      firebase.auth().onAuthStateChanged((user) => {
        if (!user) {
          setTimeout(() => {
            if (!firebase.auth().currentUser) {
              window.location.href = 'login.html';
            }
          }, 500);
        }
      });
    } else {
      window.location.href = 'login.html';
    }
  }

  initLoginForm();
  initForgotPasswordModal();
});
