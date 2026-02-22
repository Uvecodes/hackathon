// Capture the install prompt at the earliest possible moment —
// before DOMContentLoaded, in case the browser fires it during initial parse.
let _earlyPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  // Don't capture if the app is already installed
  if (_isInstalled()) return;
  _earlyPrompt = e;
  if (window.PWA) {
    window.PWA._installPrompt = e;
    window.PWA._showInstallBtn();
  }
});

function _isInstalled() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    localStorage.getItem('pwa-installed') === '1'
  );
}

const PWA = {
  _installPrompt: null,
  _installBtn: null,
  _updateBanner: null,
  _swRegistration: null,

  init() {
    this._installBtn = document.getElementById('pwa-install-btn');
    this._updateBanner = document.getElementById('pwa-update-banner');

    // Already installed — keep button hidden and don't wire up any install logic
    if (_isInstalled()) {
      this._hideInstallBtn();
      this._registerSW();
      return;
    }

    // Pick up any prompt captured before init() ran
    if (_earlyPrompt) {
      this._installPrompt = _earlyPrompt;
      this._showInstallBtn();
    }

    // Keep listening for future events (e.g. user uninstalls then revisits)
    window.addEventListener('beforeinstallprompt', e => {
      if (_isInstalled()) return;
      e.preventDefault();
      this._installPrompt = e;
      _earlyPrompt = e;
      this._showInstallBtn();
    });

    window.addEventListener('appinstalled', () => {
      localStorage.setItem('pwa-installed', '1');
      this._installPrompt = null;
      _earlyPrompt = null;
      this._hideInstallBtn();
    });

    this._registerSW();
  },

  _showInstallBtn() {
    if (this._installBtn) this._installBtn.hidden = false;
  },

  _hideInstallBtn() {
    if (this._installBtn) this._installBtn.hidden = true;
  },

  async promptInstall() {
    if (!this._installPrompt) {
      console.warn('[PWA] No install prompt available.');
      return;
    }
    this._installPrompt.prompt();
    const { outcome } = await this._installPrompt.userChoice;
    if (outcome === 'accepted') {
      localStorage.setItem('pwa-installed', '1');
      this._installPrompt = null;
      _earlyPrompt = null;
      this._hideInstallBtn();
    }
  },

  async _registerSW() {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
      this._swRegistration = registration;

      registration.addEventListener('updatefound', () => {
        const incoming = registration.installing;
        incoming.addEventListener('statechange', () => {
          if (incoming.state === 'installed' && navigator.serviceWorker.controller) {
            this._showUpdateBanner();
          }
        });
      });
    } catch (err) {
      console.error('[PWA] SW registration failed:', err);
    }
  },

  _showUpdateBanner() {
    if (this._updateBanner) this._updateBanner.hidden = false;
  },

  applyUpdate() {
    if (this._swRegistration && this._swRegistration.waiting) {
      this._swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
  },
};

window.PWA = PWA;

document.addEventListener('DOMContentLoaded', () => {
  PWA.init();

  const installBtn = document.getElementById('pwa-install-btn');
  if (installBtn) installBtn.addEventListener('click', () => PWA.promptInstall());

  const updateBtn = document.getElementById('pwa-update-btn');
  if (updateBtn) updateBtn.addEventListener('click', () => PWA.applyUpdate());

  const dismissBtn = document.getElementById('pwa-dismiss-btn');
  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => {
      const banner = document.getElementById('pwa-update-banner');
      if (banner) banner.hidden = true;
    });
  }
});
