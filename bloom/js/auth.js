/* ============================================
   THE MOTHER SUITE — AUTH JS
   Ready to connect to Firebase Authentication
   ============================================

   TO CONNECT FIREBASE:
   1. Add your Firebase config in index.html (or a firebase-config.js)
   2. Import Firebase SDK
   3. Replace the placeholder functions below with:
        - createUserWithEmailAndPassword(auth, email, password)  → signup
        - signInWithEmailAndPassword(auth, email, password)      → login
        - GoogleAuthProvider + signInWithPopup(auth, provider)   → Google SSO
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ── SIGNUP FORM ──
  const signupForm = document.getElementById('signupForm');
  if (signupForm) {

    const nameInput     = document.getElementById('fullName');
    const emailInput    = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmInput  = document.getElementById('confirmPassword');
    const submitBtn     = document.getElementById('signupBtn');
    const errorMsg      = document.getElementById('authError');
    const successMsg    = document.getElementById('authSuccess');

    // Password strength indicator
    if (passwordInput) {
      passwordInput.addEventListener('input', () => {
        const val = passwordInput.value;
        const bar = document.getElementById('strengthBar');
        const label = document.getElementById('strengthLabel');
        if (!bar || !label) return;

        let strength = 0;
        if (val.length >= 8)              strength++;
        if (/[A-Z]/.test(val))            strength++;
        if (/[0-9]/.test(val))            strength++;
        if (/[^A-Za-z0-9]/.test(val))     strength++;

        const levels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
        const colors = ['', '#e05c5c', '#e8a690', '#b8ccb5', '#8aaa86'];

        bar.style.width = (strength / 4 * 100) + '%';
        bar.style.background = colors[strength];
        label.textContent = levels[strength] || '';
        label.style.color = colors[strength];
      });
    }

    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearMessages();

      const name     = nameInput?.value.trim();
      const email    = emailInput?.value.trim();
      const password = passwordInput?.value;
      const confirm  = confirmInput?.value;

      // — Validation —
      if (!name)                          return showError('Please enter your full name.');
      if (!isValidEmail(email))           return showError('Please enter a valid email address.');
      if (password.length < 8)            return showError('Password must be at least 8 characters.');
      if (password !== confirm)           return showError('Passwords do not match.');

      setLoading(submitBtn, true);

      try {
        // ── FIREBASE HOOK ──
        // const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // await updateProfile(userCredential.user, { displayName: name });
        // window.location.href = 'tracker.html'; // redirect after signup

        // Placeholder until Firebase is connected:
        await simulateRequest(1200);
        showSuccess('Account created! Redirecting…');
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 1500);

      } catch (err) {
        // Firebase error codes you'll want to handle:
        // 'auth/email-already-in-use' → 'An account with this email already exists.'
        // 'auth/weak-password'        → 'Please choose a stronger password.'
        // 'auth/invalid-email'        → 'Invalid email address.'
        showError(friendlyError(err.code) || err.message);
      } finally {
        setLoading(submitBtn, false);
      }
    });
  }

  // ── LOGIN FORM ──
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {

    const emailInput    = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const submitBtn     = document.getElementById('loginBtn');
    const errorMsg      = document.getElementById('authError');
    const successMsg    = document.getElementById('authSuccess');

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearMessages();

      const email    = emailInput?.value.trim();
      const password = passwordInput?.value;

      if (!isValidEmail(email)) return showError('Please enter a valid email address.');
      if (!password)            return showError('Please enter your password.');

      setLoading(submitBtn, true);

      try {
        // ── FIREBASE HOOK ──
        // const userCredential = await signInWithEmailAndPassword(auth, email, password);
        // window.location.href = 'tracker.html'; // redirect after login

        // Placeholder until Firebase is connected:
        await simulateRequest(1000);
        showSuccess('Welcome back! Redirecting…');
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 1500);

      } catch (err) {
        // Firebase error codes:
        // 'auth/user-not-found'       → 'No account found with this email.'
        // 'auth/wrong-password'       → 'Incorrect password. Please try again.'
        // 'auth/too-many-requests'    → 'Too many attempts. Please try again later.'
        showError(friendlyError(err.code) || err.message);
      } finally {
        setLoading(submitBtn, false);
      }
    });
  }

  // ── GOOGLE SSO BUTTON ──
  // Both login and signup pages have this
  const googleBtn = document.getElementById('googleBtn');
  if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
      try {
        // ── FIREBASE HOOK ──
        // const provider = new GoogleAuthProvider();
        // await signInWithPopup(auth, provider);
        // window.location.href = 'tracker.html';

        // Placeholder:
        alert('Google Sign-In will be available once Firebase is connected.');
      } catch (err) {
        showError(friendlyError(err.code) || 'Google sign-in failed.');
      }
    });
  }

  // ── PASSWORD VISIBILITY TOGGLE ──
  document.querySelectorAll('.toggle-pw').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.target);
      if (!target) return;
      const isText = target.type === 'text';
      target.type = isText ? 'password' : 'text';
      btn.textContent = isText ? '👁' : '🙈';
    });
  });

  // ── HELPERS ──
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function showError(msg) {
    const el = document.getElementById('authError');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
  }

  function showSuccess(msg) {
    const el = document.getElementById('authSuccess');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
  }

  function clearMessages() {
    ['authError', 'authSuccess'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.textContent = ''; el.style.display = 'none'; }
    });
  }

  function setLoading(btn, loading) {
    if (!btn) return;
    btn.disabled = loading;
    btn.dataset.original = btn.dataset.original || btn.textContent;
    btn.textContent = loading ? 'Please wait…' : btn.dataset.original;
  }

  function friendlyError(code) {
    const map = {
      'auth/email-already-in-use': 'An account with this email already exists.',
      'auth/weak-password':        'Please choose a stronger password.',
      'auth/invalid-email':        'Invalid email address.',
      'auth/user-not-found':       'No account found with this email.',
      'auth/wrong-password':       'Incorrect password. Please try again.',
      'auth/too-many-requests':    'Too many attempts. Please try again later.',
      'auth/network-request-failed': 'Network error. Please check your connection.',
    };
    return map[code] || null;
  }

  // Remove before going to production — simulates async delay
  function simulateRequest(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

});


/* ── FORGOT PASSWORD MODAL ──
   Wire this to Firebase sendPasswordResetEmail(auth, email) when ready */
document.addEventListener('DOMContentLoaded', () => {
  const forgotLink  = document.querySelector('.forgot-link');
  const modal       = document.getElementById('forgotModal');
  const closeModal  = document.getElementById('forgotClose');
  const forgotForm  = document.getElementById('forgotForm');
  const forgotEmail = document.getElementById('forgotEmail');
  const forgotMsg   = document.getElementById('forgotMsg');

  if (!forgotLink || !modal) return;

  forgotLink.addEventListener('click', (e) => {
    e.preventDefault();
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  });

  closeModal?.addEventListener('click', () => {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }
  });

  forgotForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = forgotEmail?.value.trim();
    if (!email) return;

    // FIREBASE HOOK:
    // await sendPasswordResetEmail(auth, email);

    if (forgotMsg) {
      forgotMsg.textContent = 'If an account exists for that email, a reset link is on its way. Check your inbox.';
      forgotMsg.style.display = 'block';
    }
    setTimeout(() => {
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }, 3000);
  });
});
