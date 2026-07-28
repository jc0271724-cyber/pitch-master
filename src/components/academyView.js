// Sight-Singing Academy & Melody Progress Component
import { musicSynth } from '../audio/synth.js';
import { midiToNoteName, midiToSolfege } from '../theory/solfege.js';

export class AcademyComponent {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.getElementById(container) : container;
    this.onMelodyLoad = options.onMelodyLoad || null;
    this.currentMelody = [60, 62, 64, 65, 67, 69, 71, 72];
    this.currentKeySignature = 'C_maj';
  }

  setKeySignature(keyKey) {
    this.currentKeySignature = keyKey;
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="glass-card stat-card target-card">
        <div class="target-card-header">
          <h3>🎓 Sight-Singing Academy</h3>
        </div>
        <div class="melody-config" style="display: flex; gap: 12px; margin-bottom: 12px;">
          <label class="melody-config-item" style="flex:1;">Level
            <select id="melody-level" class="full-width-select">
              <option value="1" selected>1 · Quarters & Halves</option>
              <option value="2">2 · Eighth Notes</option>
              <option value="3">3 · Syncopated & Dotted</option>
            </select>
          </label>
          <label class="melody-config-item" style="flex:1;">Tempo
            <select id="melody-tempo" class="full-width-select">
              <option value="60">60 BPM</option>
              <option value="72">72 BPM</option>
              <option value="84" selected>84 BPM</option>
              <option value="96">96 BPM</option>
            </select>
          </label>
        </div>

        <div class="target-actions melody-actions" style="display: flex; flex-wrap: wrap; gap: 8px;">
          <button id="btn-play-melody" class="btn btn-primary">▶ Play Melody</button>
          <button id="btn-new-melody" class="btn btn-secondary">🎲 New Melody</button>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  attachEvents() {
    const playBtn = this.container.querySelector('#btn-play-melody');
    const newBtn = this.container.querySelector('#btn-new-melody');

    if (playBtn) {
      playBtn.addEventListener('click', () => {
        this.playMelody();
      });
    }

    if (newBtn) {
      newBtn.addEventListener('click', () => {
        this.generateMelody();
      });
    }
  }

  generateMelody() {
    const pool = [60, 62, 64, 65, 67, 69, 71, 72];
    const newMel = [];
    for (let i = 0; i < 8; i++) {
      const rand = pool[Math.floor(Math.random() * pool.length)];
      newMel.push(rand);
    }
    this.currentMelody = newMel;
    if (this.onMelodyLoad) {
      this.onMelodyLoad(this.currentMelody);
    }
    this.playMelody();
  }

  playMelody() {
    const tempoSelect = this.container.querySelector('#melody-tempo');
    const bpm = parseInt(tempoSelect ? tempoSelect.value : 84, 10);
    const beatMs = (60 / bpm) * 1000;

    this.currentMelody.forEach((midi, idx) => {
      setTimeout(() => {
        musicSynth.playNote(midi);
        setTimeout(() => musicSynth.stopNote(midi), beatMs * 0.8);
      }, idx * beatMs);
    });
  }
}
