/**
 * THE MOTHER SUITE — Firebase Client Configuration
 * Fetches Firebase config from the backend /api/config endpoint
 * (values are stored in the backend .env, never exposed in source).
 */
const _API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3000'
  : 'https://files-copy.onrender.com';

window.FIREBASE_CONFIG_READY = fetch(`${_API_BASE}/api/config`)
  .then((res) => {
    if (!res.ok) throw new Error(`Config fetch failed: ${res.status}`);
    return res.json();
  })
  .then((data) => data.firebase)
  .catch((err) => {
    console.error('[Firebase Config] Failed to load config:', err);
    return null;
  });
