// Pitch Wheel & Choir Pitch Pipe Component
import { musicSynth } from '../audio/synth.js';
import { midiToNoteName } from '../theory/solfege.js';

export class PitchWheelComponent {
  constructor(container) {
    this.container = typeof container === 'string' ? document.getElementById(container) : container;
    this.selectedOctave = 4;
    this.currentNote = 'C';
    this.isPlaying = false;

    this.notes = [
      { name: 'C',  angle: 0 },
      { name: 'C#', angle: 30 },
      { name: 'D',  angle: 60 },
      { name: 'D#', angle: 90 },
      { name: 'E',  angle: 120 },
      { name: 'F',  angle: 150 },
      { name: 'F#', angle: 180 },
      { name: 'G',  angle: 210 },
      { name: 'G#', angle: 240 },
      { name: 'A',  angle: 270 },
      { name: 'A#', angle: 300 },
      { name: 'B',  angle: 330 }
    ];
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="pitch-pipe-card glass-panel">
        <div class="card-header">
          <div class="header-titles">
            <h2>Choir Pitch Pipe Wheel</h2>
            <p class="subtitle">Reference pitch generator with warm choir acoustics & starting chords</p>
          </div>
        </div>

        <div class="pitch-pipe-body">
          <div class="wheel-column">
            <div class="chromatic-wheel-container">
              <div class="wheel-center-display">
                <span class="active-note-name" id="current-note-display">C4</span>
                <span class="active-note-freq" id="current-freq-display">261.6 Hz</span>
                <div class="playing-indicator" id="playing-indicator">
                  <span class="pulse-dot"></span> Sounding
                </div>
              </div>
              <div class="chromatic-wheel" id="chromatic-wheel">
                ${this.renderWheelButtons()}
              </div>
            </div>
          </div>

          <div class="control-column">
            <div class="octave-picker">
              <label>Octave Range</label>
              <div class="octave-btn-group">
                <button class="oct-btn" data-oct="2">2 (Bass)</button>
                <button class="oct-btn" data-oct="3">3 (Tenor/Alto)</button>
                <button class="oct-btn active" data-oct="4">4 (Treble)</button>
                <button class="oct-btn" data-oct="5">5 (High)</button>
              </div>
            </div>

            <div class="sound-profile-picker">
              <label>Tone Quality</label>
              <select id="sound-profile-select" class="custom-select">
                <option value="choir" selected>🎶 Warm Choir Synth</option>
                <option value="organ">⛪ Cathedral Organ</option>
                <option value="sine">🔘 Pure Pitch Pipe</option>
                <option value="flute">💨 Woodwind Flute</option>
              </select>
            </div>

            <div class="chord-buttons">
              <label>Choir Starting Chords</label>
              <div class="chord-btn-grid">
                <button class="btn btn-secondary chord-btn" data-chord="major">Tonic Major (Do-Mi-Sol)</button>
                <button class="btn btn-secondary chord-btn" data-chord="minor">Tonic Minor</button>
                <button class="btn btn-secondary chord-btn" data-chord="cadence">Full Cadence</button>
                <button class="btn btn-secondary chord-btn" data-chord="dom7">Dominant 7th</button>
              </div>
            </div>

            <div class="pipe-actions">
              <button class="btn btn-primary btn-large" id="play-hold-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                Sound Note
              </button>
              <button class="btn btn-outline" id="stop-pipe-btn">Stop Audio</button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.attachEvents();
    this.updateDisplay('C', 4);
  }

  renderWheelButtons() {
    const radius = 125;
    return this.notes.map(n => {
      const rad = (n.angle - 90) * (Math.PI / 180);
      const x = Math.round(radius * Math.cos(rad));
      const y = Math.round(radius * Math.sin(rad));
      const isAccidental = n.name.includes('#');

      return `
        <button class="wheel-note-btn ${isAccidental ? 'accidental' : 'natural'}"
                data-note="${n.name}"
                style="transform: translate(${x}px, ${y}px);">
          ${n.name}
        </button>
      `;
    }).join('');
  }

  attachEvents() {
    const wheel = this.container.querySelector('#chromatic-wheel');
    const octBtns = this.container.querySelectorAll('.oct-btn');
    const profileSelect = this.container.querySelector('#sound-profile-select');
    const playBtn = this.container.querySelector('#play-hold-btn');
    const stopBtn = this.container.querySelector('#stop-pipe-btn');
    const chordBtns = this.container.querySelectorAll('.chord-btn');

    if (wheel) {
      wheel.addEventListener('click', (e) => {
        const btn = e.target.closest('.wheel-note-btn');
        if (!btn) return;

        wheel.querySelectorAll('.wheel-note-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        this.currentNote = btn.dataset.note;
        this.updateDisplay(this.currentNote, this.selectedOctave);
        this.playSound();
      });
    }

    octBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        octBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedOctave = parseInt(btn.dataset.oct, 10);
        this.updateDisplay(this.currentNote, this.selectedOctave);
        if (this.isPlaying) this.playSound();
      });
    });

    if (profileSelect) {
      profileSelect.addEventListener('change', (e) => {
        musicSynth.setSoundProfile(e.target.value);
        if (this.isPlaying) this.playSound();
      });
    }

    if (playBtn) {
      playBtn.addEventListener('click', () => this.playSound());
    }

    if (stopBtn) {
      stopBtn.addEventListener('click', () => this.stopSound());
    }

    chordBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const chordType = btn.dataset.chord;
        const midi = this.getMidiNote(this.currentNote, this.selectedOctave);
        musicSynth.playChord(midi, chordType);
      });
    });
  }

  getMidiNote(noteName, octave) {
    const noteOffsets = { 'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11 };
    return (octave + 1) * 12 + noteOffsets[noteName];
  }

  updateDisplay(noteName, octave) {
    const nameEl = this.container.querySelector('#current-note-display');
    const freqEl = this.container.querySelector('#current-freq-display');
    const midi = this.getMidiNote(noteName, octave);
    const freq = musicSynth.midiToFreq(midi);

    if (nameEl) nameEl.textContent = `${noteName}${octave}`;
    if (freqEl) freqEl.textContent = `${freq.toFixed(1)} Hz`;
  }

  playSound() {
    this.isPlaying = true;
    const midi = this.getMidiNote(this.currentNote, this.selectedOctave);
    musicSynth.startPitchPipeTone(midi);
    const indicator = this.container.querySelector('#playing-indicator');
    if (indicator) indicator.classList.add('active');
  }

  stopSound() {
    this.isPlaying = false;
    musicSynth.stopAllNotes();
    const indicator = this.container.querySelector('#playing-indicator');
    if (indicator) indicator.classList.remove('active');
  }
}
