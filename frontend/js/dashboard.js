/* ============================================
   THE MOTHER SUITE — DASHBOARD JS
   ============================================ */

document.addEventListener('DOMContentLoaded', async () => {

  // ── DATE ──────────────────────────────────────────────────────────────────
  const dateEl = document.getElementById('dashDate');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });
  }

  // ── LOGOUT ────────────────────────────────────────────────────────────────
  document.getElementById('logoutBtn')?.addEventListener('click', () => AUTH.logout());
  document.getElementById('navLogoutBtn')?.addEventListener('click', () => AUTH.logout());

  // ── SIDEBAR ACTIVE LINK ───────────────────────────────────────────────────
  const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
  document.querySelectorAll('.sidebar-link').forEach(link => {
    if (link.getAttribute('href') === currentPage) link.classList.add('active');
  });

  // ── USER GREETING (from cached profile) ───────────────────────────────────
  const user = AUTH.getUser();
  const firstName = (user?.name || user?.fullName || '').split(' ')[0] || '';

  if (firstName) {
    const greeting = document.getElementById('navGreeting');
    if (greeting) {
      greeting.innerHTML = `Hi, <strong style="color:var(--text-dark);">${firstName}</strong> 👋`;
    }
    const greetName = document.querySelector('.greet-name');
    if (greetName) greetName.textContent = firstName;

    const h1 = document.querySelector('.dash-topbar h1');
    if (h1) h1.innerHTML = `Good morning, <em>${firstName}.</em>`;

    const sidebarUserName = document.getElementById('sidebarUserName');
    if (sidebarUserName) sidebarUserName.textContent = user.name || user.fullName || '';

    const sidebarEmail = document.getElementById('sidebarEmail');
    if (sidebarEmail) sidebarEmail.textContent = user.email || '';

    const sidebarAvatar = document.getElementById('sidebarAvatar');
    if (sidebarAvatar) sidebarAvatar.textContent = (firstName[0] || 'U').toUpperCase();
  }

  // ── WELLNESS SCORE ────────────────────────────────────────────────────────
  try {
    const data = await AUTH.get('/api/wellness/dashboard');
    const dashData = data.dashboardData || data;
    const { wellnessScore, totalCheckins, recentCheckins = [] } = dashData;

    // Animate score ring
    if (wellnessScore !== null && wellnessScore !== undefined) {
      const scoreEl = document.getElementById('wsScoreNum');
      if (scoreEl) scoreEl.textContent = wellnessScore;

      const ring = document.getElementById('wsRingFg');
      if (ring) {
        const circumference = 251.33; // 2π × r40
        ring.style.strokeDashoffset = circumference * (1 - wellnessScore / 100);
      }
    }

    // Quick stats
    const checkinEl = document.getElementById('wsTotalCheckins');
    if (checkinEl && totalCheckins !== undefined) {
      checkinEl.textContent = totalCheckins;
    }
    if (recentCheckins.length) {
      const uniqueDays = new Set(recentCheckins.map(c => new Date(c.timestamp).toDateString())).size;
      const daysEl = document.getElementById('wsDaysTracked');
      if (daysEl) daysEl.textContent = uniqueDays;
    }

    // Recent check-ins list
    renderCheckins(recentCheckins);

  } catch (err) {
    // Non-fatal — rest of dashboard still works
    console.warn('[Dashboard] Wellness data unavailable:', err.message);
    const checkinContainer = document.getElementById('recentCheckins');
    if (checkinContainer) {
      checkinContainer.innerHTML = `
        <div class="placeholder-row" style="justify-content:center;color:var(--text-soft);font-size:0.82rem;font-family:var(--font-sub);">
          No check-ins yet. <a href="wellness.html" style="color:var(--blush-deep);margin-left:0.3rem;">Start one →</a>
        </div>
      `;
    }
  }

});

// ── Render recent check-ins ───────────────────────────────────────────────────
function renderCheckins(checkins) {
  const container = document.getElementById('recentCheckins');
  if (!container) return;

  if (!checkins || checkins.length === 0) {
    container.innerHTML = `
      <div class="placeholder-row" style="justify-content:center;color:var(--text-soft);font-size:0.82rem;font-family:var(--font-sub);">
        No check-ins yet. <a href="wellness.html" style="color:var(--blush-deep);margin-left:0.3rem;">Start one →</a>
      </div>
    `;
    return;
  }

  const moodEmoji = { great: '😄', good: '🙂', okay: '😐', bad: '😔', terrible: '😞' };
  const moodLabel = { great: 'Great', good: 'Good', okay: 'Okay', bad: 'Bad', terrible: 'Terrible' };

  container.innerHTML = checkins.slice(0, 4).map(c => {
    const d       = new Date(c.timestamp);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const meta    = [
      c.sleep ? `😴 ${c.sleep}h sleep` : null,
      c.notes ? `"${c.notes.substring(0, 45)}${c.notes.length > 45 ? '…' : ''}"` : null,
    ].filter(Boolean).join(' · ');

    return `
      <div class="checkin-row">
        <span class="checkin-mood-emoji">${moodEmoji[c.mood] || '😐'}</span>
        <div class="checkin-info">
          <div class="checkin-mood-label">${moodLabel[c.mood] || c.mood}</div>
          <div class="checkin-meta">${meta || 'No notes'}</div>
        </div>
        <div class="checkin-date">${dateStr}</div>
      </div>
    `;
  }).join('');
}
