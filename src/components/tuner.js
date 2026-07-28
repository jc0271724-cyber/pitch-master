// Microphone Pitch Tuner Component for Pitch Master
import { pitchDetector } from '../audio/pitchDetector.js';
import { pitchPipe } from '../audio/pitchPipe.js';

export class TunerComponent {
  constructor(container) {
    this.container = container;
    this.isListening = false;
    this.targetNote = null; // Optional target note to match against
    this.pitchHistory = [];
  }

  render() {
    this.container.innerHTML = `
      <div class="tuner-card glass-panel">
        <div class="card-header">
          <div class="header-titles">
            <h2>Microphone Vocal Tuner</h2>
            <p class="subtitle">Sing into your mic to check pitch accuracy, cents, and vocal stability</p>
          </div>

          <div class="tuner-status-badge" id="mic-status-badge">
            <span class="status-dot"></span> Mic Off
          </div>
        </div>

        <div class="tuner-body">
          <!-- Central Tuner Needle Dial -->
          <div class="tuner-dial-section">
            <div class="dial-arc-container">
              <svg class="dial-svg" viewBox="0 0 300 160">
                <!-- Arc ticks from -50 to +50 cents -->
                <path d="M 30 140 A 120 120 0 0 1 270 140" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="8" stroke-linecap="round"/>

                <!-- In-tune center green zone -->
                <path d="M 135 25 A 120 120 0 0 1 165 25" fill="none" stroke="var(--color-success)" stroke-width="10" stroke-linecap="round"/>

                <!-- Center mark 0 cents -->
                <line x1="150" y1="15" x2="150" y2="35" stroke="var(--color-success)" stroke-width="3"/>
                <text x="150" y="12" fill="var(--color-success)" font-size="10" text-anchor="middle" font-weight="bold">IN TUNE</text>

                <!-- Ticks -->
                <text x="35" y="152" fill="rgba(255,255,255,0.5)" font-size="10" text-anchor="middle">-50♭</text>
                <text x="88" y="70" fill="rgba(255,255,255,0.5)" font-size="10" text-anchor="middle">-25</text>
                <text x="212" y="70" fill="rgba(255,255,255,0.5)" font-size="10" text-anchor="middle">+25</text>
                <text x="265" y="152" fill="rgba(255,255,255,0.5)" font-size="10" text-anchor="middle">+50♯</text>

                <!-- Needle -->
                <line id="tuner-needle" x1="150" y1="140" x2="150" y2="30" stroke="var(--color-accent-pink)" stroke-width="4" stroke-linecap="round"/>
                <circle cx="150" cy="140" r="8" fill="var(--color-text)"/>
              </svg>
            </div>

            <!-- Big Note & Cents Output -->
            <div class="tuner-note-output">
              <div class="note-box" id="tuner-note-display">--</div>
              <div class="cents-box" id="tuner-cents-display">Cents: 0</div>
              <div class="freq-box" id="tuner-freq-display">0.0 Hz</div>
            </div>
          </div>

          <!-- Target Match Panel & Mic Volume Indicator -->
          <div class="tuner-sidebar">
            <div class="target-card glass-panel-inner">
              <label>Target Pitch Reference</label>
              <div class="target-controls">
                <select id="target-note-select" class="custom-select">
                  <option value="">🎤 Free Sing (Detect Any Note)</option>
                  <option value="C4">C4 (Middle C)</option>
                  <option value="D4">D4</option>
                  <option value="E4">E4</option>
                  <option value="F4">F4</option>
                  <option value="G4">G4 (Dominant)</option>
                  <option value="A4">A4 (Concert Pitch 440Hz)</option>
                  <option value="B4">B4</option>
                  <option value="C5">C5 (High C)</option>
                </select>
                <button class="btn btn-secondary btn-sm" id="sound-target-btn">🔊 Hear Target</button>
              </div>

              <div class="target-feedback" id="target-feedback-msg">
                Sing into mic to start tuning...
              </div>
            </div>

            <!-- Mic Audio Level Bar -->
            <div class="mic-level-container">
              <label>Microphone Input Volume</label>
              <div class="level-bar-bg">
                <div class="level-bar-fill" id="mic-level-fill"></div>
              </div>
            </div>

            <!-- Mic Start/Stop Button -->
            <div class="tuner-action">
              <button class="btn btn-primary btn-large btn-block" id="toggle-mic-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
                Start Microphone Tuner
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  attachEvents() {
    const toggleBtn = this.container.querySelector('#toggle-mic-btn');
    const targetSelect = this.container.querySelector('#target-note-select');
    const soundTargetBtn = this.container.querySelector('#sound-target-btn');

    toggleBtn.addEventListener('click', async () => {
      if (this.isListening) {
        pitchDetector.stop();
        this.isListening = false;
        this.updateMicStatus(false);
      } else {
        const ok = await pitchDetector.start((data) => this.handlePitchUpdate(data));
        if (ok) {
          this.isListening = true;
          this.updateMicStatus(true);
        } else {
          alert('Could not access microphone. Please check microphone permissions in your browser.');
        }
      }
    });

    targetSelect.addEventListener('change', (e) => {
      this.targetNote = e.target.value || null;
    });

    soundTargetBtn.addEventListener('click', () => {
      const note = targetSelect.value || 'A4';
      pitchPipe.playNote(note, 2.5);
    });
  }

  updateMicStatus(isLive) {
    const badge = this.container.querySelector('#mic-status-badge');
    const toggleBtn = this.container.querySelector('#toggle-mic-btn');
    if (badge) {
      badge.className = `tuner-status-badge ${isLive ? 'live' : ''}`;
      badge.innerHTML = `<span class="status-dot"></span> ${isLive ? 'Listening...' : 'Mic Off'}`;
    }
    if (toggleBtn) {
      toggleBtn.className = `btn ${isLive ? 'btn-danger' : 'btn-primary'} btn-large btn-block`;
      toggleBtn.textContent = isLive ? 'Stop Microphone' : 'Start Microphone Tuner';
    }
  }

  handlePitchUpdate(data) {
    const noteEl = this.container.querySelector('#tuner-note-display');
    const centsEl = this.container.querySelector('#tuner-cents-display');
    const freqEl = this.container.querySelector('#tuner-freq-display');
    const needle = this.container.querySelector('#tuner-needle');
    const levelFill = this.container.querySelector('#mic-level-fill');
    const feedbackMsg = this.container.querySelector('#target-feedback-msg');

    if (levelFill) {
      const levelPercent = Math.min(100, Math.round(data.rms * 500));
      levelFill.style.width = `${levelPercent}%`;
    }

    if (data.isSilent) {
      if (noteEl) noteEl.textContent = '--';
      if (centsEl) {
        centsEl.textContent = 'Sing a note...';
        centsEl.className = 'cents-box';
      }
      if (freqEl) freqEl.textContent = '0.0 Hz';
      if (needle) needle.setAttribute('transform', `rotate(0 150 140)`);
      if (feedbackMsg) feedbackMsg.textContent = 'Listening for vocal input...';
      return;
    }

    // Angle mapping: -50 cents = -60deg, +50 cents = +60deg
    const clampedCents = Math.max(-50, Math.min(50, data.cents));
    const angle = (clampedCents / 50) * 60;

    if (needle) {
      needle.setAttribute('transform', `rotate(${angle} 150 140)`);
    }

    if (noteEl) noteEl.textContent = data.fullNote;
    if (freqEl) freqEl.textContent = `${data.frequency.toFixed(1)} Hz (Target ${data.targetFreq.toFixed(1)} Hz)`;

    // Color tuning feedback
    const absCents = Math.abs(data.cents);
    let tuneStateClass = 'cents-out';
    let msg = '';

    if (absCents <= 5) {
      tuneStateClass = 'cents-perfect';
      msg = `🎯 Perfect Pitch! (${data.cents > 0 ? '+' : ''}${data.cents} cents)`;
    } else if (absCents <= 15) {
      tuneStateClass = 'cents-close';
      msg = `Almost there! (${data.cents > 0 ? 'Slightly Sharp' : 'Slightly Flat'} by ${absCents} cents)`;
    } else {
      tuneStateClass = 'cents-out';
      msg = data.cents > 0 ? `Too Sharp! Pitch down (${data.cents} cents)` : `Too Flat! Pitch up (${absCents} cents)`;
    }

    if (centsEl) {
      centsEl.className = `cents-box ${tuneStateClass}`;
      centsEl.textContent = `${data.cents > 0 ? '+' : ''}${data.cents} cents`;
    }

    if (this.targetNote && feedbackMsg) {
      if (data.fullNote === this.targetNote) {
        if (absCents <= 8) {
          feedbackMsg.innerHTML = `<span style="color:var(--color-success)">🎉 Perfect match on target note ${this.targetNote}!</span>`;
        } else {
          feedbackMsg.innerHTML = `Matching target note ${this.targetNote}, fine tune your voice!`;
        }
      } else {
        feedbackMsg.innerHTML = `Target is <b>${this.targetNote}</b>. You are singing <b>${data.fullNote}</b>`;
      }
    } else if (feedbackMsg) {
      feedbackMsg.textContent = msg;
    }
  }
}
