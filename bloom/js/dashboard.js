/* ============================================
   THE MOTHER SUITE — DASHBOARD JS
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ── LIVE DATE ──
  const dateEl = document.getElementById('dashDate');
  if (dateEl) {
    const now = new Date();
    dateEl.textContent = now.toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });
  }

  // ── LOGOUT BUTTON ──
  // Replace with Firebase signOut(auth) when connected
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      // FIREBASE HOOK:
      // import { signOut } from 'firebase/auth';
      // signOut(auth).then(() => window.location.href = 'index.html');

      // Placeholder:
      window.location.href = 'index.html';
    });
  }

  // ── SIDEBAR MOBILE TOGGLE ──
  // On mobile the sidebar becomes a horizontal strip — already handled via CSS
  // This just highlights the active link
  const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
  document.querySelectorAll('.sidebar-link').forEach(link => {
    if (link.getAttribute('href') === currentPage) {
      link.classList.add('active');
    }
  });

});
