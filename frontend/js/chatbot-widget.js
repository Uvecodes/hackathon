/* ============================================
   THE MOTHER SUITE — Mama Assistant Widget
   Bloom-adapted from blue-frontend chatbot-widget.js
   Self-contained: injects its own CSS on load
   ============================================ */

(function injectChatbotStyles() {
  if (document.getElementById('chatbot-styles')) return;
  const style = document.createElement('style');
  style.id = 'chatbot-styles';
  style.textContent = `
    /* ── Widget shell ── */
    .chatbot-widget {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      z-index: 1200;
      font-family: 'Nunito', 'Nunito Sans', sans-serif;
      max-width: 400px;
      width: 100%;
    }

    /* ── Toggle button ── */
    .chatbot-toggle {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, #C47B5A 0%, #b85c38 100%);
      color: #fff;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 18px rgba(196,123,90,0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.25s, box-shadow 0.25s;
    }
    .chatbot-toggle:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 24px rgba(196,123,90,0.6);
    }
    .chatbot-toggle.active {
      transform: scale(0.88) rotate(45deg);
    }
    .chatbot-toggle svg { width: 22px; height: 22px; }

    .unread-badge {
      position: absolute;
      top: -3px;
      right: -3px;
      background: #e04444;
      color: #fff;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      animation: cb-pulse 2s infinite;
    }
    @keyframes cb-pulse {
      0%,100% { transform: scale(1); }
      50%      { transform: scale(1.15); }
    }

    /* ── Chat window ── */
    .chatbot-window {
      position: absolute;
      bottom: 72px;
      right: 0;
      width: 100%;
      background: #fff;
      border-radius: 18px;
      box-shadow: 0 12px 48px rgba(0,0,0,0.15);
      display: flex;
      flex-direction: column;
      height: 480px;
      animation: cb-slideUp 0.25s ease;
      overflow: hidden;
    }
    .chatbot-window.hidden { display: none; }

    @keyframes cb-slideUp {
      from { opacity: 0; transform: translateY(16px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ── Header ── */
    .chatbot-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.9rem 1.1rem;
      background: linear-gradient(135deg, #C47B5A 0%, #b85c38 100%);
      color: #fff;
      flex-shrink: 0;
    }
    .chatbot-title {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-weight: 700;
      font-size: 0.95rem;
      letter-spacing: 0.01em;
    }
    .chatbot-title svg { width: 18px; height: 18px; }
    .chatbot-close {
      background: none;
      border: none;
      color: rgba(255,255,255,0.85);
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      transition: background 0.2s;
    }
    .chatbot-close:hover { background: rgba(255,255,255,0.15); color: #fff; }
    .chatbot-close svg { width: 18px; height: 18px; }

    /* ── Messages area ── */
    .chatbot-messages {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.7rem;
      background: #fdf8f5;
      scrollbar-width: thin;
      scrollbar-color: #e8c8b8 transparent;
    }
    .chatbot-messages::-webkit-scrollbar { width: 5px; }
    .chatbot-messages::-webkit-scrollbar-track { background: transparent; }
    .chatbot-messages::-webkit-scrollbar-thumb { background: #e8c8b8; border-radius: 3px; }

    /* ── Welcome screen ── */
    .chatbot-welcome {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      text-align: center;
      padding: 1.25rem 0.75rem;
      color: #8a6b5a;
    }
    .chatbot-welcome svg { width: 40px; height: 40px; color: #C47B5A; opacity: 0.85; }
    .chatbot-welcome h3 {
      margin: 0;
      font-size: 1.05rem;
      color: #3c2616;
      font-weight: 700;
    }
    .chatbot-welcome p {
      margin: 0;
      font-size: 0.85rem;
      line-height: 1.55;
      color: #7a5c4a;
    }
    .quick-suggestions {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
      width: 100%;
      margin-top: 0.35rem;
    }
    .suggestion-btn {
      padding: 0.55rem 0.75rem;
      background: #fff;
      border: 1.5px solid #f0d5c8;
      border-radius: 10px;
      cursor: pointer;
      font-size: 0.82rem;
      color: #5a3a28;
      font-family: inherit;
      transition: all 0.2s;
      text-align: left;
    }
    .suggestion-btn:hover {
      border-color: #C47B5A;
      background: #fdf0eb;
      color: #C47B5A;
    }

    /* ── Messages ── */
    .chatbot-message {
      display: flex;
      gap: 0.4rem;
      align-items: flex-end;
      animation: cb-msgIn 0.25s ease;
    }
    @keyframes cb-msgIn {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .chatbot-message-user { flex-direction: row-reverse; }
    .chatbot-message-bot  { flex-direction: row; }

    .message-bubble {
      display: flex;
      align-items: flex-end;
      gap: 0.4rem;
      max-width: 78%;
    }
    .chatbot-message-user .message-bubble { flex-direction: row-reverse; }

    .message-content {
      padding: 0.65rem 0.9rem;
      border-radius: 14px;
      word-wrap: break-word;
      line-height: 1.45;
      font-size: 0.875rem;
    }
    .chatbot-message-user .message-content {
      background: #C47B5A;
      color: #fff;
      border-radius: 14px 14px 2px 14px;
    }
    .chatbot-message-bot .message-content {
      background: #fff;
      color: #3c2616;
      border: 1px solid #f0d5c8;
      border-radius: 14px 14px 14px 2px;
    }
    .chatbot-message.error .message-content {
      background: #fee2e2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }

    .message-time {
      font-size: 0.7rem;
      color: #c4a090;
      margin-bottom: 0.4rem;
      min-width: 36px;
      text-align: center;
    }

    /* Typing indicator */
    .chatbot-typing {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 0.65rem 0.9rem;
      background: #fff;
      border: 1px solid #f0d5c8;
      border-radius: 14px 14px 14px 2px;
      width: fit-content;
    }
    .chatbot-typing span {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #C47B5A;
      opacity: 0.5;
      animation: cb-dot 1.2s infinite;
    }
    .chatbot-typing span:nth-child(2) { animation-delay: 0.2s; }
    .chatbot-typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes cb-dot {
      0%,80%,100% { transform: scale(1); opacity: 0.5; }
      40%          { transform: scale(1.3); opacity: 1; }
    }

    /* ── Input area ── */
    .chatbot-input-area {
      padding: 0.85rem 1rem;
      background: #fff;
      border-top: 1px solid #f0d5c8;
      flex-shrink: 0;
    }
    .chatbot-form {
      display: flex;
      gap: 0.45rem;
      align-items: center;
    }
    .chatbot-input {
      flex: 1;
      padding: 0.65rem 0.9rem;
      border: 1.5px solid #f0d5c8;
      border-radius: 10px;
      font-size: 0.875rem;
      font-family: inherit;
      color: #3c2616;
      background: #fdf8f5;
      transition: border-color 0.2s, box-shadow 0.2s;
      min-height: 40px;
      outline: none;
    }
    .chatbot-input:focus {
      border-color: #C47B5A;
      box-shadow: 0 0 0 3px rgba(196,123,90,0.12);
    }
    .chatbot-input::placeholder { color: #c4a090; }
    .chatbot-send-btn {
      width: 40px;
      height: 40px;
      border: none;
      background: #C47B5A;
      color: #fff;
      border-radius: 10px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.2s, transform 0.15s;
      flex-shrink: 0;
    }
    .chatbot-send-btn:hover  { opacity: 0.88; transform: scale(1.06); }
    .chatbot-send-btn:active { transform: scale(0.94); }
    .chatbot-send-btn svg { width: 17px; height: 17px; }

    /* ── Responsive ── */
    @media (max-width: 480px) {
      .chatbot-widget { bottom: 1rem; right: 1rem; max-width: calc(100vw - 2rem); }
      .chatbot-window { height: 380px; border-radius: 14px; }
      .message-bubble { max-width: 87%; }
    }
  `;
  document.head.appendChild(style);
})();


// ── ChatbotWidget class ────────────────────────────────────────────────────────
class ChatbotWidget {
  constructor(options = {}) {
    this.isOpen = false;
    this.messages = [];
    this.containerSelector = options.containerSelector || 'body';
    this.apiBase = options.apiBase || '/api';
    this.maxMessages = options.maxMessages || 50;
    this._init();
  }

  _init() {
    this._createHTML();
    this._bindEvents();
    this._loadHistory();
  }

  _createHTML() {
    const container = document.querySelector(this.containerSelector);
    container.insertAdjacentHTML('beforeend', `
      <div id="chatbot-widget" class="chatbot-widget">
        <!-- Toggle -->
        <button id="chatbot-toggle" class="chatbot-toggle" title="Chat with Mama Assistant" aria-label="Open Mama Assistant">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span class="unread-badge" id="unread-badge" style="display:none;">1</span>
        </button>

        <!-- Window -->
        <div id="chatbot-window" class="chatbot-window hidden" role="dialog" aria-label="Mama Assistant">
          <div class="chatbot-header">
            <div class="chatbot-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="12" cy="12" r="10"/>
                <circle cx="12" cy="10" r="3"/>
                <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/>
              </svg>
              <span>Mama Assistant</span>
            </div>
            <button id="chatbot-close" class="chatbot-close" aria-label="Close chat">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div id="chatbot-messages" class="chatbot-messages">
            <div class="chatbot-welcome">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="12" cy="12" r="10"/>
                <circle cx="12" cy="10" r="3"/>
                <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/>
              </svg>
              <h3>Hi, I'm your Mama Assistant 🌸</h3>
              <p>Ask me anything about wellness, nutrition, exercises, or baby care.</p>
              <div class="quick-suggestions">
                <button class="suggestion-btn" data-message="What nutrition tips are recommended for my stage?">Nutrition Tips</button>
                <button class="suggestion-btn" data-message="What exercises are safe during pregnancy?">Safe Exercises</button>
                <button class="suggestion-btn" data-message="How can I improve my sleep quality?">Better Sleep</button>
              </div>
            </div>
          </div>

          <div class="chatbot-input-area">
            <form id="chatbot-form" class="chatbot-form">
              <input type="text" id="chatbot-input" class="chatbot-input"
                placeholder="Ask me something…" autocomplete="off" maxlength="500"/>
              <button type="submit" class="chatbot-send-btn" aria-label="Send message">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </form>
          </div>
        </div>
      </div>
    `);
  }

  _bindEvents() {
    document.getElementById('chatbot-toggle').addEventListener('click', () => this._toggle());
    document.getElementById('chatbot-close').addEventListener('click', () => this._close());

    document.getElementById('chatbot-form').addEventListener('submit', e => {
      e.preventDefault();
      const input = document.getElementById('chatbot-input');
      const msg = input.value.trim();
      if (!msg) return;
      input.value = '';
      this._sendMessage(msg);
    });

    document.querySelectorAll('.suggestion-btn').forEach(btn => {
      btn.addEventListener('click', () => this._sendMessage(btn.dataset.message));
    });

    // Close on outside click
    document.addEventListener('click', e => {
      const widget = document.getElementById('chatbot-widget');
      if (widget && !widget.contains(e.target) && this.isOpen) this._close();
    });
  }

  _toggle() { this.isOpen ? this._close() : this._open(); }

  _open() {
    this.isOpen = true;
    document.getElementById('chatbot-window').classList.remove('hidden');
    document.getElementById('chatbot-toggle').classList.add('active');
    document.getElementById('chatbot-input').focus();
    document.getElementById('unread-badge').style.display = 'none';
  }

  _close() {
    this.isOpen = false;
    document.getElementById('chatbot-window').classList.add('hidden');
    document.getElementById('chatbot-toggle').classList.remove('active');
  }

  async _sendMessage(message) {
    // Remove welcome screen
    const welcome = document.querySelector('.chatbot-welcome');
    if (welcome) welcome.remove();

    this._addMsg(message, 'user');
    const typing = this._showTyping();

    try {
      const data = await AUTH.post(`${this.apiBase}/chatbot/message`, { message });
      typing.remove();
      this._addMsg(data.response || 'I couldn't get a response. Please try again.', 'bot');
    } catch (err) {
      typing.remove();
      this._addMsg('Sorry, something went wrong. Please try again.', 'bot', true);
    }

    this._scrollBottom();
  }

  _addMsg(content, sender, isError = false) {
    const container = document.getElementById('chatbot-messages');
    const el = document.createElement('div');
    el.className = `chatbot-message chatbot-message-${sender}${isError ? ' error' : ''}`;
    el.innerHTML = `
      <div class="message-bubble">
        <div class="message-content">${this._escape(content)}</div>
      </div>
      <span class="message-time">${this._time()}</span>
    `;
    container.appendChild(el);

    // Trim old messages
    const all = container.querySelectorAll('.chatbot-message');
    if (all.length > this.maxMessages) all[0].remove();
  }

  _showTyping() {
    const container = document.getElementById('chatbot-messages');
    const el = document.createElement('div');
    el.className = 'chatbot-message chatbot-message-bot';
    el.innerHTML = `
      <div class="message-bubble">
        <div class="chatbot-typing">
          <span></span><span></span><span></span>
        </div>
      </div>`;
    container.appendChild(el);
    this._scrollBottom();
    return el;
  }

  async _loadHistory() {
    if (!AUTH.isAuthenticated()) return;
    try {
      const data = await AUTH.get(`${this.apiBase}/chatbot/history`);
      const history = (data.history || []).slice(-5);
      history.forEach(msg => {
        this._addMsg(msg.userMessage, 'user');
        this._addMsg(msg.botResponse, 'bot');
      });
      if (history.length > 0) {
        const welcome = document.querySelector('.chatbot-welcome');
        if (welcome) welcome.remove();
        this._scrollBottom();
      }
    } catch { /* non-fatal */ }
  }

  _scrollBottom() {
    const c = document.getElementById('chatbot-messages');
    if (c) setTimeout(() => { c.scrollTop = c.scrollHeight; }, 80);
  }

  _time() {
    return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  _escape(text) {
    const el = document.createElement('div');
    el.textContent = text;
    return el.innerHTML;
  }

  showUnread() {
    if (!this.isOpen) document.getElementById('unread-badge').style.display = 'flex';
  }
}

// ── Auto-init after auth is ready ─────────────────────────────────────────────
(async function initChatbot() {
  if (typeof AUTH === 'undefined') {
    // AUTH not yet defined — wait for DOMContentLoaded then retry
    document.addEventListener('DOMContentLoaded', initChatbot);
    return;
  }

  try {
    const user = await AUTH.whenReady();
    if (user) {
      window.chatbotWidget = new ChatbotWidget();
    }
  } catch { /* non-fatal */ }
})();
