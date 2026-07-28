// Solfege Reference Guide & Chromatic Syllable Matrix Component
import { musicSynth } from '../audio/synth.js';
import { midiToSolfege } from '../theory/solfege.js';

export class SolfegeMatrixComponent {
  constructor(container) {
    this.container = typeof container === 'string' ? document.getElementById(container) : container;
    this.syllables = [
      { name: 'Do',  midiOffset: 0,  deg: '1',  type: 'Diatonic', desc: 'Key Tonic (Home / Foundation Note)' },
      { name: 'Di',  midiOffset: 1,  deg: '#1', type: 'Chromatic', desc: 'Raised 1st Degree (Ascending Chromatic)' },
      { name: 'Re',  midiOffset: 2,  deg: '2',  type: 'Diatonic', desc: 'Supertonic (2nd Scale Degree)' },
      { name: 'Ri',  midiOffset: 3,  deg: '#2', type: 'Chromatic', desc: 'Raised 2nd Degree' },
      { name: 'Mi',  midiOffset: 4,  deg: '3',  type: 'Diatonic', desc: 'Mediant (3rd Degree - Major Triad)' },
      { name: 'Fa',  midiOffset: 5,  deg: '4',  type: 'Diatonic', desc: 'Subdominant (4th Scale Degree)' },
      { name: 'Fi',  midiOffset: 6,  deg: '#4', type: 'Chromatic', desc: 'Raised 4th Degree (Tritone / Lydian)' },
      { name: 'Sol', midiOffset: 7,  deg: '5',  type: 'Diatonic', desc: 'Dominant (5th Scale Degree - Perfect 5th)' },
      { name: 'Si',  midiOffset: 8,  deg: '#5', type: 'Chromatic', desc: 'Raised 5th Degree' },
      { name: 'La',  midiOffset: 9,  deg: '6',  type: 'Diatonic', desc: 'Submediant (Relative Minor Tonic)' },
      { name: 'Li',  midiOffset: 10, deg: '#6', type: 'Chromatic', desc: 'Raised 6th Degree' },
      { name: 'Ti',  midiOffset: 11, deg: '7',  type: 'Diatonic', desc: 'Leading Tone (7th Degree - Pulls to Do)' }
    ];
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="solfege-card glass-panel">
        <div class="card-header">
          <h2>🎼 Solfege Reference Guide & Matrix</h2>
          <p class="subtitle">Movable Do, La-Based Minor & Chromatic Pitch Syllables for Choir Singers</p>
        </div>

        <div class="solfege-matrix-grid">
          ${this.syllables.map(s => `
            <div class="solfege-tile ${s.type.toLowerCase()}" data-offset="${s.midiOffset}">
              <div class="tile-header">
                <span class="solfege-syllable">${s.name}</span>
                <span class="degree-badge">${s.deg}</span>
              </div>
              <p class="tile-desc">${s.desc}</p>
              <button class="btn btn-secondary btn-sm preview-btn">🔊 Hear Tone</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this.attachEvents();
  }

  attachEvents() {
    const tiles = this.container.querySelectorAll('.solfege-tile');
    tiles.forEach(tile => {
      const offset = parseInt(tile.dataset.offset, 10);
      const btn = tile.querySelector('.preview-btn');
      if (btn) {
        btn.addEventListener('click', () => {
          const baseMidi = 60; // Middle C
          musicSynth.playNote(baseMidi + offset);
          setTimeout(() => musicSynth.stopNote(baseMidi + offset), 800);
        });
      }
    });
  }
}
