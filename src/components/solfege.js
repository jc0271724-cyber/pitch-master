// Solfege Wheel & Sight-Singing Guide Component for Pitch Master
import { pitchPipe } from '../audio/pitchPipe.js';

export class SolfegeComponent {
  constructor(container) {
    this.container = container;
    this.keyRoot = 'C';
    this.solfegeType = 'moveable'; // 'moveable' or 'fixed'

    this.syllables = [
      { name: 'Do',  type: 'diatonic', offset: 0,  color: '#e74c3c', sign: '✊ Closed Fist' },
      { name: 'Di / Ra', type: 'chromatic', offset: 1, color: '#e67e22', sign: '✊' },
      { name: 'Re',  type: 'diatonic', offset: 2,  color: '#e67e22', sign: '✋ Flat Palm Tilted' },
      { name: 'Ri / Ma', type: 'chromatic', offset: 3, color: '#f1c40f', sign: '✋' },
      { name: 'Mi',  type: 'diatonic', offset: 4,  color: '#f1c40f', sign: '🖐 Flat Palm Down' },
      { name: 'Fa',  type: 'diatonic', offset: 5,  color: '#2ecc71', sign: '👍 Thumbs Down' },
      { name: 'Fi / Se', type: 'chromatic', offset: 6, color: '#1abc9c', sign: '👍' },
      { name: 'Sol', type: 'diatonic', offset: 7,  color: '#3498db', sign: '✋ Open Palm Up' },
      { name: 'Si / Le', type: 'chromatic', offset: 8, color: '#9b59b6', sign: '✋' },
      { name: 'La',  type: 'diatonic', offset: 9,  color: '#9b59b6', sign: '🖐 Relaxed Curve' },
      { name: 'Li / Te', type: 'chromatic', offset: 10, color: '#ec407a', sign: '☝' },
      { name: 'Ti',  type: 'diatonic', offset: 11, color: '#ec407a', sign: '☝ Pointing Finger' }
    ];

    this.rootMidis = {
      'C': 60, 'C#': 61, 'D': 62, 'D#': 63, 'E': 64, 'F': 65,
      'F#': 66, 'G': 67, 'G#': 68, 'A': 69, 'A#': 70, 'B': 71
    };
  }

  render() {
    this.container.innerHTML = `
      <div class="solfege-card glass-panel">
        <div class="card-header">
          <div class="header-titles">
            <h2>Solfege & Sight-Singing Companion</h2>
            <p class="subtitle">Interactive Curwen hand signs, Moveable/Fixed Do, and scale degree pitches</p>
          </div>

          <div class="key-selector-box">
            <label>Key Center (Do):</label>
            <select id="solfege-key-select" class="custom-select">
              ${Object.keys(this.rootMidis).map(k => `<option value="${k}">${k} Major</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="solfege-body">
          <!-- Curwen Hand Sign Cards Grid -->
          <div class="solfege-grid">
            ${this.renderSolfegeCards()}
          </div>

          <!-- Stave Visualizer Info -->
          <div class="solfege-info-panel glass-panel-inner">
            <h3>Sight-Singing Pitch Helper</h3>
            <p>Click any Solfege syllable card above to hear its pitch synthesized in your chosen key center!</p>

            <div class="stave-visualizer" id="stave-visualizer">
              <div class="stave-lines">
                <span class="clef-symbol">🎼</span>
                <div class="stave-line"></div>
                <div class="stave-line"></div>
                <div class="stave-line"></div>
                <div class="stave-line"></div>
                <div class="stave-line"></div>
              </div>
              <div class="stave-note-head" id="stave-note-head">
                <span class="note-head-symbol">𝅘𝅥𝅯</span>
                <span class="note-head-label" id="stave-note-label">Do (C4)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  renderSolfegeCards() {
    const rootMidi = this.rootMidis[this.keyRoot];

    return this.syllables.map(s => {
      const midi = rootMidi + s.offset;
      const noteName = pitchPipe.midiToNoteName(midi);

      return `
        <div class="solfege-item-card ${s.type}" data-offset="${s.offset}" data-note="${noteName}">
          <div class="solfege-badge" style="background:${s.color}">${s.name}</div>
          <div class="solfege-pitch">${noteName}</div>
          <div class="solfege-sign">${s.sign}</div>
        </div>
      `;
    }).join('');
  }

  attachEvents() {
    const keySelect = this.container.querySelector('#solfege-key-select');
    keySelect.addEventListener('change', (e) => {
      this.keyRoot = e.target.value;
      const grid = this.container.querySelector('.solfege-grid');
      if (grid) grid.innerHTML = this.renderSolfegeCards();
      this.attachCardClickEvents();
    });

    this.attachCardClickEvents();
  }

  attachCardClickEvents() {
    const cards = this.container.querySelectorAll('.solfege-item-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        cards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');

        const fullNote = card.dataset.note;
        pitchPipe.playNote(fullNote);

        // Update Stave position
        const offset = parseInt(card.dataset.offset, 10);
        const staveHead = this.container.querySelector('#stave-note-head');
        const staveLabel = this.container.querySelector('#stave-note-label');

        if (staveHead) {
          // Move stave head vertically based on offset (0 to 11 semitones)
          const bottomPx = 15 + Math.round((offset / 11) * 70);
          staveHead.style.bottom = `${bottomPx}px`;
        }
        if (staveLabel) {
          const sName = card.querySelector('.solfege-badge').textContent;
          staveLabel.textContent = `${sName} (${fullNote})`;
        }
      });
    });
  }
}
