// Choir Vocal Warm-Up Exercise Component
import { pitchPipe } from '../audio/pitchPipe.js';

export class WarmupsComponent {
  constructor(container) {
    this.container = container;
    this.isPlaying = false;
    this.timerId = null;
    this.currentStep = 0;
    this.rootMidi = 60; // Default C4
    this.bpm = 100;
    this.autoStepUp = true; // Step up semitone automatically after pattern completes
    this.maxKeyTranspositions = 6;
    this.transpositionCount = 0;
    this.syllable = 'Mee-May-Mah';

    this.patterns = [
      {
        id: '5note',
        name: '5-Note Scale Up & Down',
        syllables: ['Mee', 'May', 'Mah', 'Moh', 'Moo', 'Moh', 'Mah', 'May', 'Mee'],
        offsets: [0, 2, 4, 5, 7, 5, 4, 2, 0],
        durations: [1, 1, 1, 1, 1, 1, 1, 1, 2] // relative duration
      },
      {
        id: 'arpeggio',
        name: 'Major Arpeggio',
        syllables: ['Do', 'Mi', 'Sol', 'Do', 'Sol', 'Mi', 'Do'],
        offsets: [0, 4, 7, 12, 7, 4, 0],
        durations: [1, 1, 1, 2, 1, 1, 2]
      },
      {
        id: 'siren',
        name: 'Octave Vocal Slide / Siren',
        syllables: ['Voo', '--->', 'Ahhh', '--->', 'Voo'],
        offsets: [0, 4, 7, 12, 7, 4, 0],
        durations: [1, 1.5, 2, 2, 1.5, 1, 2]
      },
      {
        id: 'staccato',
        name: 'Harmonic Staccato Bounce',
        syllables: ['Ha!', 'Ha!', 'Ha!', 'Ha!', 'Haaa'],
        offsets: [0, 4, 7, 4, 0],
        durations: [0.5, 0.5, 0.5, 0.5, 2]
      }
    ];

    this.selectedPatternId = '5note';
  }

  render() {
    this.container.innerHTML = `
      <div class="warmup-card glass-panel">
        <div class="card-header">
          <div class="header-titles">
            <h2>Choir Vocal Warm-Ups</h2>
            <p class="subtitle">Automated pitch sequences with auto-transposition for choir rehearsal</p>
          </div>
        </div>

        <div class="warmup-body">
          <!-- Left Column: Settings -->
          <div class="warmup-settings">
            <div class="setting-group">
              <label>Warm-up Exercise Pattern</label>
              <div class="pattern-selector">
                ${this.patterns.map(p => `
                  <button class="pattern-btn ${p.id === this.selectedPatternId ? 'active' : ''}" data-pattern="${p.id}">
                    <span class="pattern-title">${p.name}</span>
                    <span class="pattern-preview">${p.syllables.join(' • ')}</span>
                  </button>
                `).join('')}
              </div>
            </div>

            <div class="setting-grid">
              <div class="setting-item">
                <label>Starting Root Key</label>
                <select id="warmup-root-key" class="custom-select">
                  <option value="48">C3 (Low Male)</option>
                  <option value="53">F3 (Tenor / Low Alto)</option>
                  <option value="55">G3</option>
                  <option value="60" selected>C4 (Middle C / Soprano / Alto)</option>
                  <option value="65">F4 (High Soprano)</option>
                </select>
              </div>

              <div class="setting-item">
                <label>Tempo (BPM): <span id="bpm-val">100</span></label>
                <input type="range" id="warmup-bpm" min="60" max="160" value="100" class="custom-range">
              </div>
            </div>

            <div class="setting-item checkbox-item">
              <label class="toggle-label">
                <input type="checkbox" id="auto-step-check" checked>
                <span>Auto-Step Up 1 Semitone After Each Round</span>
              </label>
            </div>

            <!-- Controls -->
            <div class="warmup-action-btns">
              <button class="btn btn-primary btn-large" id="start-warmup-btn">
                ▶ Start Warm-Up
              </button>
              <button class="btn btn-outline btn-large" id="stop-warmup-btn">
                ⏹ Stop
              </button>
            </div>
          </div>

          <!-- Right Column: Visualizer & Active Note Display -->
          <div class="warmup-visualizer glass-panel-inner">
            <div class="warmup-display-header">
              <span class="current-key-badge" id="current-key-badge">Key: C Major</span>
              <span class="step-counter" id="step-counter">Step 1 / 9</span>
            </div>

            <div class="note-balloon-container" id="note-balloon-container">
              <!-- Syllable balloons animated -->
            </div>

            <div class="warmup-progress-bar">
              <div class="progress-fill" id="warmup-progress-fill"></div>
            </div>

            <div class="lyric-prompt" id="lyric-prompt">
              Get ready... Press Start Warm-Up!
            </div>
          </div>
        </div>
      </div>
    `;

    this.attachEvents();
    this.renderPatternBalloons();
  }

  attachEvents() {
    const patternBtns = this.container.querySelectorAll('.pattern-btn');
    patternBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        patternBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedPatternId = btn.dataset.pattern;
        this.stop();
        this.renderPatternBalloons();
      });
    });

    const rootSelect = this.container.querySelector('#warmup-root-key');
    rootSelect.addEventListener('change', (e) => {
      this.rootMidi = parseInt(e.target.value, 10);
      this.updateKeyBadge();
    });

    const bpmInput = this.container.querySelector('#warmup-bpm');
    const bpmVal = this.container.querySelector('#bpm-val');
    bpmInput.addEventListener('input', (e) => {
      this.bpm = parseInt(e.target.value, 10);
      if (bpmVal) bpmVal.textContent = this.bpm;
    });

    const autoStepCheck = this.container.querySelector('#auto-step-check');
    autoStepCheck.addEventListener('change', (e) => {
      this.autoStepUp = e.target.checked;
    });

    const startBtn = this.container.querySelector('#start-warmup-btn');
    const stopBtn = this.container.querySelector('#stop-warmup-btn');

    startBtn.addEventListener('click', () => {
      if (this.isPlaying) {
        this.stop();
      } else {
        this.start();
      }
    });

    stopBtn.addEventListener('click', () => {
      this.stop();
    });
  }

  getPattern() {
    return this.patterns.find(p => p.id === this.selectedPatternId) || this.patterns[0];
  }

  renderPatternBalloons() {
    const container = this.container.querySelector('#note-balloon-container');
    if (!container) return;
    const pattern = this.getPattern();

    container.innerHTML = pattern.offsets.map((offset, idx) => `
      <div class="note-balloon" data-idx="${idx}">
        <span class="balloon-syllable">${pattern.syllables[idx] || ''}</span>
        <span class="balloon-pitch">+${offset}</span>
      </div>
    `).join('');
  }

  updateKeyBadge() {
    const keyBadge = this.container.querySelector('#current-key-badge');
    if (keyBadge) {
      const noteName = pitchPipe.midiToNoteName(this.rootMidi);
      keyBadge.textContent = `Current Key: ${noteName}`;
    }
  }

  start() {
    this.isPlaying = true;
    this.currentStep = 0;
    this.transpositionCount = 0;

    const startBtn = this.container.querySelector('#start-warmup-btn');
    if (startBtn) {
      startBtn.textContent = '⏸ Pause Warm-Up';
      startBtn.className = 'btn btn-secondary btn-large';
    }

    this.playNextStep();
  }

  stop() {
    this.isPlaying = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    pitchPipe.stopAll();

    const startBtn = this.container.querySelector('#start-warmup-btn');
    if (startBtn) {
      startBtn.textContent = '▶ Start Warm-Up';
      startBtn.className = 'btn btn-primary btn-large';
    }

    const balloons = this.container.querySelectorAll('.note-balloon');
    balloons.forEach(b => b.classList.remove('active', 'played'));

    const lyric = this.container.querySelector('#lyric-prompt');
    if (lyric) lyric.textContent = 'Stopped';
  }

  playNextStep() {
    if (!this.isPlaying) return;

    const pattern = this.getPattern();
    if (this.currentStep >= pattern.offsets.length) {
      // Pattern finished 1 round!
      if (this.autoStepUp && this.transpositionCount < this.maxKeyTranspositions) {
        this.transpositionCount++;
        this.rootMidi += 1; // Transpose up 1 semitone
        this.updateKeyBadge();
        this.currentStep = 0;

        const lyric = this.container.querySelector('#lyric-prompt');
        if (lyric) lyric.textContent = `⬆ Transposing Up to ${pitchPipe.midiToNoteName(this.rootMidi)}...`;

        this.timerId = setTimeout(() => {
          this.playNextStep();
        }, 1200);
        return;
      } else {
        this.stop();
        return;
      }
    }

    const offset = pattern.offsets[this.currentStep];
    const durationMultiplier = pattern.durations[this.currentStep] || 1;
    const noteMidi = this.rootMidi + offset;
    const noteName = pitchPipe.midiToNoteName(noteMidi);
    const syllableText = pattern.syllables[this.currentStep] || noteName;

    // Play synthesized choir tone
    pitchPipe.playNote(noteName);

    // Update UI balloons & step counters
    const balloons = this.container.querySelectorAll('.note-balloon');
    balloons.forEach((b, idx) => {
      if (idx === this.currentStep) {
        b.classList.add('active');
        b.classList.remove('played');
      } else if (idx < this.currentStep) {
        b.classList.remove('active');
        b.classList.add('played');
      } else {
        b.classList.remove('active', 'played');
      }
    });

    const stepCounter = this.container.querySelector('#step-counter');
    if (stepCounter) stepCounter.textContent = `Note ${this.currentStep + 1} / ${pattern.offsets.length}`;

    const lyric = this.container.querySelector('#lyric-prompt');
    if (lyric) lyric.innerHTML = `Sing: <strong class="active-lyric">${syllableText}</strong> (${noteName})`;

    const progressFill = this.container.querySelector('#warmup-progress-fill');
    if (progressFill) {
      const pct = Math.round(((this.currentStep + 1) / pattern.offsets.length) * 100);
      progressFill.style.width = `${pct}%`;
    }

    // Step duration based on BPM (60,000 / BPM * durationMultiplier)
    const stepDurationMs = (60000 / this.bpm) * durationMultiplier;

    this.currentStep++;
    this.timerId = setTimeout(() => {
      this.playNextStep();
    }, stepDurationMs);
  }
}
