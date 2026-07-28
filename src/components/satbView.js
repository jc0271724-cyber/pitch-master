// SATB Choir Sectionals Component
import { SATB_PIECES } from '../theory/teacher.js';
import { musicSynth } from '../audio/synth.js';

export class SatbComponent {
  constructor(container) {
    this.container = typeof container === 'string' ? document.getElementById(container) : container;
    this.selectedPiece = SATB_PIECES[0];
    this.isPlaying = false;
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="glass-card stat-card target-card">
        <div class="target-card-header">
          <h3>🎶 SATB Choir Sectionals</h3>
        </div>
        <div class="satb-select-container">
          <label>Piece:
            <select id="select-satb-piece" class="full-width-select">
              ${SATB_PIECES.map(p => `<option value="${p.id}">${p.title}</option>`).join('')}
            </select>
          </label>
        </div>

        <div class="satb-mix-sliders" style="margin-top:16px;">
          <div class="satb-slider-item">
            <span>Soprano</span>
            <input type="range" id="vol-soprano" min="0" max="1" step="0.1" value="1">
          </div>
          <div class="satb-slider-item">
            <span>Alto</span>
            <input type="range" id="vol-alto" min="0" max="1" step="0.1" value="1">
          </div>
          <div class="satb-slider-item">
            <span>Tenor</span>
            <input type="range" id="vol-tenor" min="0" max="1" step="0.1" value="1">
          </div>
          <div class="satb-slider-item">
            <span>Bass</span>
            <input type="range" id="vol-bass" min="0" max="1" step="0.1" value="1">
          </div>
        </div>

        <div class="target-actions" style="margin-top:16px;">
          <button id="btn-play-satb" class="btn btn-primary">🎼 Play SATB Choir Track</button>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  attachEvents() {
    const select = this.container.querySelector('#select-satb-piece');
    const playBtn = this.container.querySelector('#btn-play-satb');

    ['soprano', 'alto', 'tenor', 'bass'].forEach(part => {
      const slider = this.container.querySelector(`#vol-${part}`);
      if (slider) {
        slider.addEventListener('input', (e) => {
          musicSynth.setSATBVolume(part, parseFloat(e.target.value));
        });
      }
    });

    if (select) {
      select.addEventListener('change', (e) => {
        const found = SATB_PIECES.find(p => p.id === e.target.value);
        if (found) this.selectedPiece = found;
      });
    }

    if (playBtn) {
      playBtn.addEventListener('click', () => {
        this.playPiece();
      });
    }
  }

  playPiece() {
    const piece = this.selectedPiece;
    const parts = piece.parts;
    const len = parts.soprano.length;
    const tempoMs = (60 / piece.tempo) * 1000;

    for (let i = 0; i < len; i++) {
      setTimeout(() => {
        musicSynth.playSATBNote('soprano', parts.soprano[i], tempoMs);
        musicSynth.playSATBNote('alto', parts.alto[i], tempoMs);
        musicSynth.playSATBNote('tenor', parts.tenor[i], tempoMs);
        musicSynth.playSATBNote('bass', parts.bass[i], tempoMs);
      }, i * tempoMs);
    }
  }
}
