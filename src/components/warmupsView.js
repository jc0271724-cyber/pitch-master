// Choir Warm-up Routines Component
import { WARMUP_ROUTINES, choirTeacher } from '../theory/teacher.js';
import { musicSynth } from '../audio/synth.js';

export class WarmupsComponent {
  constructor(container) {
    this.container = typeof container === 'string' ? document.getElementById(container) : container;
    this.selectedRoutine = WARMUP_ROUTINES[0];
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="glass-card stat-card target-card">
        <div class="target-card-header">
          <h3>Choir Warm-up Routines</h3>
        </div>
        <div class="warmup-select-container">
          <select id="select-warmup-routine" class="full-width-select">
            ${WARMUP_ROUTINES.map(r => `<option value="${r.id}">${r.name}</option>`).join('')}
          </select>
        </div>
        <p id="lbl-warmup-desc" class="guide-text" style="margin: 12px 0; color: #a1a1aa;">
          ${this.selectedRoutine.description}
        </p>
        <div class="warmup-tip-box glass-panel" style="padding: 12px; margin-bottom: 16px; border-left: 4px solid #818cf8;">
          💡 <strong>Maestro's Warm-up Tip:</strong>
          <span id="lbl-warmup-tip">${this.selectedRoutine.tip}</span>
        </div>
        <div class="target-actions">
          <button id="btn-start-warmup" class="btn btn-primary">▶ Start Warm-up Scale</button>
          <button id="btn-demo-warmup" class="btn btn-secondary">🗣️ Maestro Voice Demo</button>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  attachEvents() {
    const select = this.container.querySelector('#select-warmup-routine');
    const startBtn = this.container.querySelector('#btn-start-warmup');
    const demoBtn = this.container.querySelector('#btn-demo-warmup');
    const descLbl = this.container.querySelector('#lbl-warmup-desc');
    const tipLbl = this.container.querySelector('#lbl-warmup-tip');

    if (select) {
      select.addEventListener('change', (e) => {
        const found = WARMUP_ROUTINES.find(r => r.id === e.target.value);
        if (found) {
          this.selectedRoutine = found;
          if (descLbl) descLbl.textContent = found.description;
          if (tipLbl) tipLbl.textContent = found.tip;
        }
      });
    }

    if (startBtn) {
      startBtn.addEventListener('click', () => {
        this.playRoutine();
      });
    }

    if (demoBtn) {
      demoBtn.addEventListener('click', () => {
        choirTeacher.speak(this.selectedRoutine.tip, true);
      });
    }
  }

  playRoutine() {
    const notes = this.selectedRoutine.notes;
    notes.forEach((midi, idx) => {
      setTimeout(() => {
        musicSynth.playNote(midi);
        setTimeout(() => musicSynth.stopNote(midi), 400);
      }, idx * 500);
    });
  }
}
