// Pitch Match Training Component
import { musicSynth } from '../audio/synth.js';
import { midiToNoteName, midiToSolfege } from '../theory/solfege.js';

export class PracticeComponent {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.getElementById(container) : container;
    this.onTargetChange = options.onTargetChange || null;
    this.score = 0;
    this.targetMidi = 60; // Middle C
    this.currentKeySignature = 'C_maj';
    this.currentSolfegeSystem = 'major';
  }

  setKeySignature(keyKey) {
    this.currentKeySignature = keyKey;
    this.updateTargetDisplay();
  }

  setSolfegeSystem(system) {
    this.currentSolfegeSystem = system;
    this.updateTargetDisplay();
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="glass-card stat-card target-card">
        <div class="target-card-header" style="display:flex; justify-content:space-between; align-items:center;">
          <h3>🎯 Pitch Match Training</h3>
          <span class="score-badge" style="background:rgba(255,255,255,0.1); padding:4px 12px; border-radius:12px;">Score: <strong id="lbl-score">0</strong></span>
        </div>
        <div class="target-display" id="target-card" style="display:flex; align-items:center; gap:20px; margin:16px 0;">
          <div class="target-info">
            <span id="lbl-target-note" class="target-note-val" style="font-size:36px; font-weight:800; color:#818cf8;">C4</span>
            <span id="lbl-target-solfege" class="target-solfege-val" style="font-size:24px; color:#c084fc; margin-left:12px;">Do</span>
          </div>
        </div>
        <div class="target-actions" style="display:flex; gap:12px;">
          <button id="btn-play-target" class="btn btn-secondary">🔊 Hear Target Note</button>
          <button id="btn-next-target" class="btn btn-primary">🎲 New Target</button>
        </div>
      </div>
    `;

    this.attachEvents();
    this.nextTarget();
  }

  attachEvents() {
    const hearBtn = this.container.querySelector('#btn-play-target');
    const nextBtn = this.container.querySelector('#btn-next-target');

    if (hearBtn) {
      hearBtn.addEventListener('click', () => {
        musicSynth.playNote(this.targetMidi);
        setTimeout(() => musicSynth.stopNote(this.targetMidi), 1000);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        this.nextTarget();
      });
    }
  }

  nextTarget() {
    const targets = [60, 62, 64, 65, 67, 69, 71, 72, 57, 55, 53, 50, 48];
    this.targetMidi = targets[Math.floor(Math.random() * targets.length)];
    this.updateTargetDisplay();

    if (this.onTargetChange) {
      const noteName = midiToNoteName(this.targetMidi, this.currentKeySignature);
      const solfege = midiToSolfege(this.targetMidi, this.currentKeySignature, this.currentSolfegeSystem);
      this.onTargetChange(this.targetMidi, noteName, solfege);
    }
  }

  updateTargetDisplay() {
    const noteLbl = this.container.querySelector('#lbl-target-note');
    const solfegeLbl = this.container.querySelector('#lbl-target-solfege');

    const noteName = midiToNoteName(this.targetMidi, this.currentKeySignature);
    const solfege = midiToSolfege(this.targetMidi, this.currentKeySignature, this.currentSolfegeSystem);

    if (noteLbl) noteLbl.textContent = noteName;
    if (solfegeLbl) solfegeLbl.textContent = solfege;
  }

  addPoint() {
    this.score += 100;
    const scoreLbl = this.container.querySelector('#lbl-score');
    if (scoreLbl) scoreLbl.textContent = this.score;
  }
}
