/**
 * THE MOTHER SUITE — Signup JS (4-step wizard)
 *
 * Handles the multi-step signup wizard and creates the Firebase account.
 * Requires auth.js (loaded first) for: window.AUTH, window.firebaseInitialized
 *
 * Script load order in signup.html:
 *   firebase-app-compat.js → firebase-auth-compat.js → firebase-config.js
 *   → shared.js → pwa.js → auth.js → signup.js
 */

document.addEventListener('DOMContentLoaded', () => {

  const form = document.getElementById('signupForm');
  if (!form) return;

  // ── Step 1 fields ────────────────────────────────────────────────────────
  const emailEl      = document.getElementById('email');
  const nameEl       = document.getElementById('fullName');
  const stageEl      = document.getElementById('pregnancyStage');
  const passwordEl   = document.getElementById('password');
  const confirmEl    = document.getElementById('confirmPassword');
  const termsEl      = document.getElementById('terms');
  const duedateGroup = document.getElementById('duedate-group');

  // ── Step nav buttons ─────────────────────────────────────────────────────
  const next1Btn   = document.getElementById('next-1');
  const back2Btn   = document.getElementById('back-2');
  const next2Btn   = document.getElementById('next-2');
  const back3Btn   = document.getElementById('back-3');
  const next3Btn   = document.getElementById('next-3');   // postpartum → step 4
  const submit3Btn = document.getElementById('submit-3'); // non-postpartum submit
  const back4Btn   = document.getElementById('back-4');
  const submit4Btn = document.getElementById('submit-4'); // postpartum submit

  // ── Step indicator elements ──────────────────────────────────────────────
  const dots       = [1,2,3,4].map(n => document.getElementById(`dot-${n}`));
  const conns      = [1,2,3].map(n   => document.getElementById(`conn-${n}`));
  const panels     = [1,2,3,4].map(n => document.getElementById(`step-${n}`));
  const stepSubtitle = document.getElementById('step-subtitle');

  const STEP_LABELS = ['Basic Info', 'Body Metrics', 'Health Profile', 'Postpartum'];
  const POSTPARTUM_STAGES = ['postpartum-0-6w', 'postpartum-6w-6m', 'postpartum-6m+'];

  let currentStep = 1;

  // ── Update step progress bar ─────────────────────────────────────────────
  function updateStepBar(step) {
    dots.forEach((dot, i) => {
      if (!dot) return;
      const n = i + 1;
      dot.classList.toggle('active', n === step);
      dot.classList.toggle('done',   n < step);
    });
    conns.forEach((conn, i) => {
      if (conn) conn.classList.toggle('done', i + 1 < step);
    });
    if (stepSubtitle) {
      stepSubtitle.textContent = `Step ${step} of 4 — ${STEP_LABELS[step - 1]}`;
    }
  }

  // ── Show a step panel ────────────────────────────────────────────────────
  function showStep(n) {
    panels.forEach((p, i) => { if (p) p.classList.toggle('active', i + 1 === n); });
    currentStep = n;
    updateStepBar(n);
    clearMessages();
    // scroll the form panel back to top when switching steps
    const formPanel = document.querySelector('.auth-form-panel');
    if (formPanel) formPanel.scrollTop = 0;
  }

  // ── Step 1: email validation helper ─────────────────────────────────────
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // ── Step 1: real-time button gating ─────────────────────────────────────
  // Continue is enabled only when:
  //   • valid email format
  //   • name is non-empty
  //   • stage is selected
  //   • password is ≥ 8 chars
  //   • terms accepted
  function checkStep1() {
    const ok =
      isValidEmail(emailEl?.value.trim() || '') &&
      (nameEl?.value.trim()   || '').length > 0 &&
      (stageEl?.value         || '') !== ''      &&
      (passwordEl?.value      || '').length >= 8 &&
      (termsEl?.checked       ?? false);
    if (next1Btn) next1Btn.disabled = !ok;
  }

  [emailEl, nameEl, stageEl, passwordEl, confirmEl].forEach(el =>
    el?.addEventListener('input', checkStep1)
  );
  [stageEl].forEach(el => el?.addEventListener('change', checkStep1));
  termsEl?.addEventListener('change', checkStep1);

  if (next1Btn) next1Btn.disabled = true; // start disabled

  // ── Pregnancy stage: show/hide due date + update step 3 buttons ──────────
  stageEl?.addEventListener('change', () => {
    const stage = stageEl.value;
    const showDueDate = ['trimester-1','trimester-2','trimester-3'].includes(stage);
    if (duedateGroup) {
      duedateGroup.style.display = showDueDate ? 'flex' : 'none';
    }
    updateStep3Buttons();
  });

  function updateStep3Buttons() {
    const isPostpartum = POSTPARTUM_STAGES.includes(stageEl?.value || '');
    // Non-postpartum: submit directly after step 3
    // Postpartum: proceed to step 4
    if (next3Btn)   next3Btn.style.display   = isPostpartum ? ''     : 'none';
    if (submit3Btn) submit3Btn.style.display = isPostpartum ? 'none' : '';
  }
  updateStep3Buttons(); // initialise on load

  // ── Password strength indicator ──────────────────────────────────────────
  passwordEl?.addEventListener('input', () => {
    const val   = passwordEl.value;
    const bar   = document.getElementById('strengthBar');
    const label = document.getElementById('strengthLabel');
    if (!bar || !label) return;

    let strength = 0;
    if (val.length >= 8)          strength++;
    if (/[A-Z]/.test(val))        strength++;
    if (/[0-9]/.test(val))        strength++;
    if (/[^A-Za-z0-9]/.test(val)) strength++;

    const levels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['', '#e05c5c', '#e8a690', '#b8ccb5', '#8aaa86'];

    bar.style.width      = (strength / 4 * 100) + '%';
    bar.style.background = colors[strength];
    label.textContent    = levels[strength] || '';
    label.style.color    = colors[strength];

    checkStep1(); // password length affects button gating
  });

  // ── Password visibility toggle ───────────────────────────────────────────
  document.querySelectorAll('.toggle-pw').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.target);
      if (!target) return;
      const isText = target.type === 'text';
      target.type      = isText ? 'password' : 'text';
      btn.textContent  = isText ? '👁' : '🙈';
    });
  });

  // ── Step navigation ──────────────────────────────────────────────────────
  next1Btn?.addEventListener('click', () => {
    clearMessages();
    const email    = emailEl?.value.trim()  || '';
    const name     = nameEl?.value.trim()   || '';
    const stage    = stageEl?.value         || '';
    const password = passwordEl?.value      || '';
    const confirm  = confirmEl?.value       || '';

    if (!isValidEmail(email))        return showError('Please enter a valid email address.');
    if (!name)                       return showError('Please enter your full name.');
    if (!stage)                      return showError('Please select your stage.');
    if (password.length < 8)         return showError('Password must be at least 8 characters.');
    if (confirm && password !== confirm) return showError('Passwords do not match.');
    if (!termsEl?.checked)           return showError('Please accept the Terms of Service.');

    showStep(2);
  });

  back2Btn?.addEventListener('click', () => showStep(1));
  next2Btn?.addEventListener('click', () => showStep(3));
  back3Btn?.addEventListener('click', () => showStep(2));
  next3Btn?.addEventListener('click', () => showStep(4));
  back4Btn?.addEventListener('click', () => showStep(3));

  // ── Form submission ──────────────────────────────────────────────────────
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessages();

    const submitBtn = currentStep === 4 ? submit4Btn : submit3Btn;
    setLoading(submitBtn, true);

    try {
      if (typeof firebase === 'undefined' || !window.firebaseInitialized) {
        throw new Error('Service is starting up. Please wait a moment and try again.');
      }

      const email    = emailEl?.value.trim();
      const password = passwordEl?.value;
      const profile  = gatherProfile();

      // 1. Create Firebase account
      const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
      const user           = userCredential.user;

      // 2. Set display name on the Firebase user
      await user.updateProfile({ displayName: profile.fullName });

      // 3. Get ID token to authenticate the profile-save request
      const idToken = await user.getIdToken();

      // 4. Save the full extended profile to the backend (Firestore)
      const res = await fetch(`${window.AUTH.API_BASE_URL}/api/auth/complete-profile`, {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body:        JSON.stringify(profile),
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok) {
        // Profile save failed — roll back Firebase account to avoid orphaned users
        try { await user.delete(); } catch (_) { /* best-effort rollback */ }
        throw new Error(data.message || 'Failed to save profile. Please try again.');
      }

      // 5. Cache the returned profile in localStorage for dashboard use
      if (data.user) window.AUTH.setUser(data.user);

      showSuccess('Account created! Setting things up\u2026');
      setTimeout(() => { window.location.href = 'dashboard-files/dashboard.html'; }, 1500);

    } catch (err) {
      console.error('[Signup]', err);
      showError(friendlyError(err.code) || err.message || 'Sign up failed. Please try again.');
    } finally {
      setLoading(submitBtn, false);
    }
  });

  // ── Collect all form data across steps ───────────────────────────────────
  function gatherProfile() {
    const checked = (name) =>
      [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(el => el.value);
    return {
      email:                emailEl?.value.trim() || '',
      name:                 nameEl?.value.trim()  || '',
      pregnancyStage:       stageEl?.value        || '',
      dueDate:              document.getElementById('dueDate')?.value              || null,
      age:                  document.getElementById('age')?.value                  || null,
      heightCm:             document.getElementById('heightCm')?.value             || null,
      prePregnancyWeightKg: document.getElementById('prePregnancyWeightKg')?.value || null,
      currentWeightKg:      document.getElementById('currentWeightKg')?.value      || null,
      fitnessLevel:         document.getElementById('fitnessLevel')?.value         || null,
      activityLevel:        document.getElementById('activityLevel')?.value        || null,
      conditions:           checked('conditions'),
      allergies:            checked('allergies'),
      foodIntolerances:     checked('foodIntolerances'),
      dietaryPreferences:   checked('dietaryPreferences'),
      deliveryDate:         document.getElementById('deliveryDate')?.value         || null,
      recoveryType:         document.getElementById('recoveryType')?.value         || null,
      breastfeeding:        document.getElementById('breastfeeding')?.checked      ?? false,
      pumping:              document.getElementById('pumping')?.checked            ?? false,
    };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
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
      'auth/email-already-in-use':   'An account with this email already exists.',
      'auth/weak-password':          'Please choose a stronger password.',
      'auth/invalid-email':          'Invalid email address.',
      'auth/network-request-failed': 'Network error. Please check your connection.',
    };
    return map[code] || null;
  }

  // ── Initialise ───────────────────────────────────────────────────────────
  showStep(1);

});
