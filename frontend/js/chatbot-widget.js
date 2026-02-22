/* ============================================
   THE MOTHER SUITE — Tasha AI Assistant Widget
   Gemini-powered maternal health chatbot
   Supports text + Web Speech API voice I/O
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
      bottom: 1.5rem;
      right: 1.5rem;
      z-index: 1200;
      font-family: 'Nunito', 'Nunito Sans', sans-serif;
      max-width: 340px;
      width: 100%;
    }

    /* ── Toggle button ── */
    .chatbot-toggle {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: linear-gradient(135deg, #C47B5A 0%, #b85c38 100%);
      color: #fff;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(196,123,90,0.50);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.25s, box-shadow 0.25s;
      animation: tasha-btn-breathe 3.5s ease-in-out infinite;
    }
    @keyframes tasha-btn-breathe {
      0%,100% { box-shadow: 0 4px 20px rgba(196,123,90,0.50); }
      50%      { box-shadow: 0 6px 30px rgba(196,123,90,0.70); }
    }
    .chatbot-toggle:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 26px rgba(196,123,90,0.65);
    }
    .chatbot-toggle.active {
      transform: scale(0.88) rotate(45deg);
      animation: none;
    }
    .chatbot-toggle svg { width: 19px; height: 19px; }

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
      bottom: 62px;
      right: 0;
      width: 100%;
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.14);
      display: flex;
      flex-direction: column;
      height: 430px;
      animation: cb-slideUp 0.25s ease;
      overflow: hidden;
    }
    .chatbot-window.hidden { display: none; }

    @keyframes cb-slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ── Header ── */
    .chatbot-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.65rem 0.9rem;
      background: linear-gradient(135deg, #C47B5A 0%, #b85c38 100%);
      color: #fff;
      flex-shrink: 0;
    }
    .chatbot-title {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }
    .tasha-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: rgba(255,255,255,0.22);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      flex-shrink: 0;
    }
    .tasha-name-block {
      display: flex;
      flex-direction: column;
      line-height: 1.2;
    }
    .tasha-name-block strong {
      font-size: 0.88rem;
      font-weight: 700;
      letter-spacing: 0.01em;
    }
    .tasha-name-block span {
      font-size: 0.68rem;
      opacity: 0.82;
      font-weight: 400;
    }
    .chatbot-header-actions {
      display: flex;
      align-items: center;
      gap: 0.2rem;
    }
    .chatbot-hdr-btn {
      background: none;
      border: none;
      color: rgba(255,255,255,0.85);
      cursor: pointer;
      padding: 5px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 7px;
      transition: background 0.18s, color 0.18s;
    }
    .chatbot-hdr-btn:hover { background: rgba(255,255,255,0.18); color: #fff; }
    .chatbot-hdr-btn.active { background: rgba(255,255,255,0.25); color: #fff; }
    .chatbot-hdr-btn svg { width: 15px; height: 15px; }

    /* ── Messages area ── */
    .chatbot-messages {
      flex: 1;
      overflow-y: auto;
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
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
      gap: 0.5rem;
      text-align: center;
      padding: 0.75rem 0.6rem;
      color: #8a6b5a;
    }
    .tasha-welcome-avatar {
      width: 46px;
      height: 46px;
      border-radius: 50%;
      background: linear-gradient(135deg, #f5ddd0, #e8bba3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      box-shadow: 0 3px 12px rgba(196,123,90,0.20);
    }
    .chatbot-welcome h3 {
      margin: 0;
      font-size: 0.95rem;
      color: #3c2616;
      font-weight: 700;
    }
    .chatbot-welcome p {
      margin: 0;
      font-size: 0.78rem;
      line-height: 1.5;
      color: #7a5c4a;
    }
    .quick-suggestions {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      width: 100%;
      margin-top: 0.2rem;
    }
    .suggestion-btn {
      padding: 0.42rem 0.7rem;
      background: #fff;
      border: 1.5px solid #f0d5c8;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.77rem;
      color: #5a3a28;
      font-family: inherit;
      transition: all 0.2s;
      text-align: left;
    }
    .suggestion-btn:hover {
      border-color: #C47B5A;
      background: #fdf0eb;
      color: #C47B5A;
      transform: translateX(3px);
    }

    /* ── Messages ── */
    .chatbot-message {
      display: flex;
      gap: 0.4rem;
      align-items: flex-end;
      animation: cb-msgIn 0.22s ease;
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
      max-width: 80%;
    }
    .chatbot-message-user .message-bubble { flex-direction: row-reverse; }

    .message-content {
      padding: 0.55rem 0.8rem;
      border-radius: 12px;
      word-wrap: break-word;
      line-height: 1.45;
      font-size: 0.835rem;
      white-space: pre-wrap;
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
      font-size: 0.69rem;
      color: #c4a090;
      margin-bottom: 0.4rem;
      min-width: 36px;
      text-align: center;
    }

    /* speak button on bot messages */
    .msg-speak-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 3px 4px;
      border-radius: 6px;
      color: #c4a090;
      display: flex;
      align-items: center;
      transition: color 0.18s, background 0.18s;
      margin-bottom: 0.35rem;
      flex-shrink: 0;
    }
    .msg-speak-btn:hover { color: #C47B5A; background: #fdf0eb; }
    .msg-speak-btn svg { width: 13px; height: 13px; }

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
      padding: 0.6rem 0.75rem;
      background: #fff;
      border-top: 1px solid #f0d5c8;
      flex-shrink: 0;
    }
    .chatbot-form {
      display: flex;
      gap: 0.35rem;
      align-items: center;
    }
    .chatbot-input {
      flex: 1;
      padding: 0.55rem 0.8rem;
      border: 1.5px solid #f0d5c8;
      border-radius: 9px;
      font-size: 0.835rem;
      font-family: inherit;
      color: #3c2616;
      background: #fdf8f5;
      transition: border-color 0.2s, box-shadow 0.2s;
      min-height: 36px;
      outline: none;
    }
    .chatbot-input:focus {
      border-color: #C47B5A;
      box-shadow: 0 0 0 3px rgba(196,123,90,0.12);
    }
    .chatbot-input::placeholder { color: #c4a090; }
    .chatbot-input.recording {
      border-color: #e04444;
      box-shadow: 0 0 0 3px rgba(224,68,68,0.12);
      animation: recording-pulse 1.2s ease-in-out infinite;
    }
    @keyframes recording-pulse {
      0%,100% { box-shadow: 0 0 0 3px rgba(224,68,68,0.12); }
      50%      { box-shadow: 0 0 0 5px rgba(224,68,68,0.22); }
    }

    .chatbot-icon-btn {
      width: 36px;
      height: 36px;
      border: 1.5px solid #f0d5c8;
      background: #fdf8f5;
      color: #b08070;
      border-radius: 10px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.18s;
      flex-shrink: 0;
    }
    .chatbot-icon-btn:hover { border-color: #C47B5A; color: #C47B5A; background: #fdf0eb; }
    .chatbot-icon-btn.recording {
      border-color: #e04444;
      background: #fee2e2;
      color: #e04444;
      animation: cb-pulse 1.2s infinite;
    }
    .chatbot-icon-btn svg { width: 15px; height: 15px; }

    .chatbot-send-btn {
      width: 36px;
      height: 36px;
      border: none;
      background: linear-gradient(135deg, #C47B5A 0%, #b85c38 100%);
      color: #fff;
      border-radius: 10px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.2s, transform 0.15s;
      flex-shrink: 0;
      box-shadow: 0 2px 10px rgba(196,123,90,0.30);
    }
    .chatbot-send-btn:hover  { opacity: 0.88; transform: scale(1.06); }
    .chatbot-send-btn:active { transform: scale(0.94); }
    .chatbot-send-btn svg { width: 15px; height: 15px; }

    /* voice permission hint */
    .voice-hint {
      font-size: 0.72rem;
      color: #b08070;
      text-align: center;
      margin-top: 0.35rem;
      line-height: 1.4;
      min-height: 1em;
    }

    /* ── Responsive ── */
    @media (max-width: 480px) {
      .chatbot-widget { bottom: 0.75rem; right: 0.75rem; max-width: calc(100vw - 1.5rem); }
      .chatbot-window { height: 360px; border-radius: 14px; }
      .message-bubble { max-width: 88%; }
    }
  `;
  document.head.appendChild(style);
})();


// ── TashaWidget class ─────────────────────────────────────────────────────────
class TashaWidget {
  constructor(options = {}) {
    this.isOpen        = false;
    this.apiBase       = options.apiBase || '/api';
    this.maxMessages   = options.maxMessages || 60;
    this.ttsEnabled    = true;   // text-to-speech on by default
    this.isRecording   = false;
    this._recognition  = null;
    this._utterance    = null;
    this._convHistory  = [];     // [{role:'user'|'model', parts:[{text}]}] sent to backend

    this._initSpeech();
    this._createHTML();
    this._bindEvents();
    this._loadHistory();
  }

  // ── Speech setup ────────────────────────────────────────────────────────────

  _initSpeech() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      this._recognition = new SR();
      this._recognition.lang        = 'en-US';
      this._recognition.interimResults = false;
      this._recognition.maxAlternatives = 1;

      this._recognition.onresult = e => {
        const transcript = e.results[0][0].transcript.trim();
        if (transcript) {
          document.getElementById('tasha-input').value = transcript;
          this._stopRecording();
          this._sendMessage(transcript);
        }
      };
      this._recognition.onerror = () => this._stopRecording();
      this._recognition.onend   = () => this._stopRecording();
    }
  }

  _startRecording() {
    if (!this._recognition) {
      this._setVoiceHint('Voice input is not supported in this browser.');
      return;
    }
    this.isRecording = true;
    document.getElementById('tasha-mic-btn').classList.add('recording');
    document.getElementById('tasha-input').classList.add('recording');
    document.getElementById('tasha-input').placeholder = 'Listening…';
    this._setVoiceHint('Listening — speak now');
    try { this._recognition.start(); } catch { this._stopRecording(); }
  }

  _stopRecording() {
    if (!this.isRecording) return;
    this.isRecording = false;
    const micBtn = document.getElementById('tasha-mic-btn');
    const input  = document.getElementById('tasha-input');
    if (micBtn) micBtn.classList.remove('recording');
    if (input)  {
      input.classList.remove('recording');
      input.placeholder = 'Ask Tasha something…';
    }
    this._setVoiceHint('');
    try { this._recognition.stop(); } catch { /* ignore */ }
  }

  _speak(text) {
    if (!this.ttsEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    // Strip markdown-style bold markers for cleaner speech
    const clean = text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1');
    const utt = new SpeechSynthesisUtterance(clean);
    utt.lang = 'en-US';
    utt.rate = 0.97;
    utt.pitch = 1.05;
    // Prefer a female voice if available
    const voices = window.speechSynthesis.getVoices();
    const female = voices.find(v => /female|woman|zira|samantha|karen|moira|tessa|fiona/i.test(v.name));
    if (female) utt.voice = female;
    this._utterance = utt;
    window.speechSynthesis.speak(utt);
  }

  _setVoiceHint(msg) {
    const el = document.getElementById('tasha-voice-hint');
    if (el) el.textContent = msg;
  }

  // ── HTML ─────────────────────────────────────────────────────────────────────

  _createHTML() {
    const micSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    const ttsSupported = !!window.speechSynthesis;

    document.body.insertAdjacentHTML('beforeend', `
      <div id="tasha-widget" class="chatbot-widget">

        <!-- Toggle button -->
        <button id="tasha-toggle" class="chatbot-toggle" title="Chat with Tasha" aria-label="Open Tasha">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2a7 7 0 0 1 7 7c0 3.5-2.5 6.4-6 7.6V19a1 1 0 0 1-1 1h-0a1 1 0 0 1-1-1v-2.4C7.5 15.4 5 12.5 5 9a7 7 0 0 1 7-7z"/>
            <circle cx="12" cy="22" r="0.5" fill="currentColor"/>
          </svg>
          <span class="unread-badge" id="tasha-unread" style="display:none;">1</span>
        </button>

        <!-- Chat window -->
        <div id="tasha-window" class="chatbot-window hidden" role="dialog" aria-label="Tasha — Maternal Health Assistant">

          <!-- Header -->
          <div class="chatbot-header">
            <div class="chatbot-title">
              <div class="tasha-avatar">🌸</div>
              <div class="tasha-name-block">
                <strong>Tasha</strong>
                <span>Maternal Health Assistant</span>
              </div>
            </div>
            <div class="chatbot-header-actions">
              ${ttsSupported ? `
              <button id="tasha-tts-toggle" class="chatbot-hdr-btn active" title="Toggle voice responses" aria-label="Toggle text-to-speech">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                </svg>
              </button>` : ''}
              <button id="tasha-close" class="chatbot-hdr-btn" aria-label="Close chat">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Messages -->
          <div id="tasha-messages" class="chatbot-messages">
            <div class="chatbot-welcome">
              <div class="tasha-welcome-avatar">🌸</div>
              <h3>Hi, I'm Tasha!</h3>
              <p>Your personal maternal health companion. Ask me anything about prenatal care, postpartum recovery, baby care, nutrition, or exercise.</p>
              <div class="quick-suggestions">
                <button class="suggestion-btn" data-message="What should I eat during my first trimester?">🥗 First trimester nutrition</button>
                <button class="suggestion-btn" data-message="What exercises are safe during pregnancy?">🤸 Safe pregnancy exercises</button>
                <button class="suggestion-btn" data-message="How can I manage postpartum anxiety?">💛 Postpartum wellbeing</button>
                <button class="suggestion-btn" data-message="My baby won't stop crying. What could it mean?">👶 Baby care help</button>
              </div>
            </div>
          </div>

          <!-- Input area -->
          <div class="chatbot-input-area">
            <form id="tasha-form" class="chatbot-form">
              <input type="text" id="tasha-input" class="chatbot-input"
                placeholder="Ask Tasha something…" autocomplete="off" maxlength="800"/>
              ${micSupported ? `
              <button type="button" id="tasha-mic-btn" class="chatbot-icon-btn" title="Voice input" aria-label="Start voice input">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="2" width="6" height="11" rx="3"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/>
                  <line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              </button>` : ''}
              <button type="submit" class="chatbot-send-btn" aria-label="Send message">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </form>
            <div id="tasha-voice-hint" class="voice-hint"></div>
          </div>
        </div>
      </div>
    `);
  }

  // ── Events ───────────────────────────────────────────────────────────────────

  _bindEvents() {
    document.getElementById('tasha-toggle').addEventListener('click', () => this._toggle());
    document.getElementById('tasha-close').addEventListener('click', () => this._close());

    document.getElementById('tasha-form').addEventListener('submit', e => {
      e.preventDefault();
      const input = document.getElementById('tasha-input');
      const msg = input.value.trim();
      if (!msg) return;
      input.value = '';
      this._sendMessage(msg);
    });

    document.querySelectorAll('.suggestion-btn').forEach(btn => {
      btn.addEventListener('click', () => this._sendMessage(btn.dataset.message));
    });

    const ttsBtn = document.getElementById('tasha-tts-toggle');
    if (ttsBtn) {
      ttsBtn.addEventListener('click', () => {
        this.ttsEnabled = !this.ttsEnabled;
        ttsBtn.classList.toggle('active', this.ttsEnabled);
        ttsBtn.title = this.ttsEnabled ? 'Voice responses ON' : 'Voice responses OFF';
        ttsBtn.innerHTML = this.ttsEnabled
          ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
               <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
               <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
               <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
             </svg>`
          : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
               <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
               <line x1="23" y1="9" x2="17" y2="15"/>
               <line x1="17" y1="9" x2="23" y2="15"/>
             </svg>`;
        if (!this.ttsEnabled && window.speechSynthesis) window.speechSynthesis.cancel();
      });
    }

    const micBtn = document.getElementById('tasha-mic-btn');
    if (micBtn) {
      micBtn.addEventListener('click', () => {
        if (this.isRecording) this._stopRecording();
        else this._startRecording();
      });
    }

    // Close on outside click
    document.addEventListener('click', e => {
      const widget = document.getElementById('tasha-widget');
      if (widget && !widget.contains(e.target) && this.isOpen) this._close();
    });

    // Cancel TTS when widget closes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && window.speechSynthesis) window.speechSynthesis.cancel();
    });
  }

  // ── Open / Close ─────────────────────────────────────────────────────────────

  _toggle() { this.isOpen ? this._close() : this._open(); }

  _open() {
    this.isOpen = true;
    document.getElementById('tasha-window').classList.remove('hidden');
    document.getElementById('tasha-toggle').classList.add('active');
    document.getElementById('tasha-input').focus();
    document.getElementById('tasha-unread').style.display = 'none';
  }

  _close() {
    this.isOpen = false;
    document.getElementById('tasha-window').classList.add('hidden');
    document.getElementById('tasha-toggle').classList.remove('active');
    this._stopRecording();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  }

  // ── Send message ─────────────────────────────────────────────────────────────

  async _sendMessage(message) {
    const welcome = document.querySelector('.chatbot-welcome');
    if (welcome) welcome.remove();

    this._addMsg(message, 'user');
    const typing = this._showTyping();

    // Build last-N history for context (Gemini format)
    const historyForApi = this._convHistory.slice(-10);

    try {
      const data = await AUTH.post(`${this.apiBase}/chatbot/message`, {
        message,
        history: historyForApi,
      });
      typing.remove();

      const reply = data.response || "I'm sorry, I couldn't get a response. Please try again.";
      this._addMsg(reply, 'bot');
      this._speak(reply);

      // Append to local conversation history
      this._convHistory.push({ role: 'user',  parts: [{ text: message }] });
      this._convHistory.push({ role: 'model', parts: [{ text: reply }] });
      // Keep history bounded
      if (this._convHistory.length > 30) this._convHistory = this._convHistory.slice(-30);

    } catch (err) {
      typing.remove();
      this._addMsg('Sorry, something went wrong. Please try again.', 'bot', true);
    }

    this._scrollBottom();
  }

  // ── Render messages ──────────────────────────────────────────────────────────

  _addMsg(content, sender, isError = false) {
    const container = document.getElementById('tasha-messages');
    const el = document.createElement('div');
    el.className = `chatbot-message chatbot-message-${sender}${isError ? ' error' : ''}`;

    const speakBtn = (sender === 'bot' && !isError && window.speechSynthesis)
      ? `<button class="msg-speak-btn" title="Read aloud" aria-label="Read aloud">
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
             <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
             <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
           </svg>
         </button>`
      : '';

    el.innerHTML = `
      <div class="message-bubble">
        <div class="message-content">${this._escape(content)}</div>
        ${speakBtn}
      </div>
      <span class="message-time">${this._time()}</span>
    `;

    // Bind per-message speak button
    const btn = el.querySelector('.msg-speak-btn');
    if (btn) btn.addEventListener('click', () => this._speak(content));

    container.appendChild(el);

    // Trim old messages
    const all = container.querySelectorAll('.chatbot-message');
    if (all.length > this.maxMessages) all[0].remove();
  }

  _showTyping() {
    const container = document.getElementById('tasha-messages');
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

  // ── History ──────────────────────────────────────────────────────────────────

  async _loadHistory() {
    if (!AUTH.isAuthenticated()) return;
    try {
      const data = await AUTH.get(`${this.apiBase}/chatbot/history?limit=6`);
      const history = (data.history || []).slice(-6);
      history.forEach(msg => {
        this._addMsg(msg.userMessage, 'user');
        this._addMsg(msg.botResponse, 'bot');
        this._convHistory.push({ role: 'user',  parts: [{ text: msg.userMessage }] });
        this._convHistory.push({ role: 'model', parts: [{ text: msg.botResponse }] });
      });
      if (history.length > 0) {
        const welcome = document.querySelector('.chatbot-welcome');
        if (welcome) welcome.remove();
        this._scrollBottom();
      }
    } catch { /* non-fatal */ }
  }

  // ── Utilities ────────────────────────────────────────────────────────────────

  _scrollBottom() {
    const c = document.getElementById('tasha-messages');
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
    if (!this.isOpen) document.getElementById('tasha-unread').style.display = 'flex';
  }
}

// ── Auto-init after auth is ready ─────────────────────────────────────────────
(async function initTasha() {
  if (typeof AUTH === 'undefined') {
    document.addEventListener('DOMContentLoaded', initTasha);
    return;
  }

  try {
    const user = await AUTH.whenReady();
    if (user) {
      window.tashaWidget = new TashaWidget();
      // Expose legacy alias so any existing code using chatbotWidget still works
      window.chatbotWidget = window.tashaWidget;
    }
  } catch { /* non-fatal */ }
})();
