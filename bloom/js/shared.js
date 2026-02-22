/* ============================================
   THE MOTHER SUITE — SHARED JS
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ── CUSTOM CURSOR (desktop / fine pointer only) ──
  const cursor = document.getElementById('cursor');
  const ring   = document.getElementById('cursor-ring');

  if (cursor && ring && window.matchMedia('(pointer: fine)').matches) {
    document.addEventListener('mousemove', e => {
      cursor.style.left = ring.style.left = e.clientX + 'px';
      cursor.style.top  = ring.style.top  = e.clientY + 'px';
    });
    document.querySelectorAll('a, button, input, textarea, label').forEach(el => {
      el.addEventListener('mouseenter', () => {
        cursor.style.width  = '20px';
        cursor.style.height = '20px';
        ring.style.width    = '50px';
        ring.style.height   = '50px';
      });
      el.addEventListener('mouseleave', () => {
        cursor.style.width  = '12px';
        cursor.style.height = '12px';
        ring.style.width    = '34px';
        ring.style.height   = '34px';
      });
    });
  }

  // ── NAV SCROLL SHADOW ──
  const nav = document.querySelector('nav');
  if (nav) {
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 20);
    });
  }

  // ── MOBILE NAV TOGGLE ──
  const toggle     = document.getElementById('navToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  const nav        = document.querySelector('nav');

  if (toggle && mobileMenu) {
    toggle.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.toggle('open');
      toggle.classList.toggle('open', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    // Close on link tap
    mobileMenu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        toggle.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // ── LOGGED-IN NAV COLLAPSE (for community page, etc) ──
  if (toggle && nav && nav.classList.contains('nav-logged-in')) {
    toggle.addEventListener('click', () => {
      nav.classList.toggle('nav-collapsed');
      toggle.classList.toggle('open');
    });
  }

  // ── SCROLL REVEAL ──
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length) {
    const revealObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const siblings = [...entry.target.parentElement.querySelectorAll('.reveal')];
          const idx = siblings.indexOf(entry.target);
          entry.target.style.transitionDelay = (idx * 0.08) + 's';
          entry.target.classList.add('visible');
          revealObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach(el => revealObs.observe(el));
  }

  // ── ACTIVE NAV LINK ──
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .mobile-menu a').forEach(a => {
    if (a.getAttribute('href') === page) {
      a.classList.add('active');
    }
  });

});
