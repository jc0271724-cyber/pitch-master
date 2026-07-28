// Physical-Style Arc Tuner Gauge & Pitch Input Card Component

export class TunerGaugeComponent {
  constructor(container) {
    this.container = typeof container === 'string' ? document.getElementById(container) : container;
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="glass-card stat-card feedback-card">
        <h3>VOCAL MIC INPUT</h3>
        <div class="tuner-container">
          <!-- Physical Arc Tuner Gauge -->
          <div class="tuner-gauge">
            <div class="tuner-scale"></div>
            <div id="tuner-needle" class="tuner-needle"></div>
            <div class="tuner-center-marker"></div>
          </div>

          <div class="tuner-status">
            <div class="note-display">
              <span id="lbl-voice-note" class="note-value">—</span>
              <span id="lbl-voice-solfege" class="solfege-value">—</span>
            </div>
            <div class="metric-row">
              <div class="metric">
                <span class="metric-label">FREQUENCY</span>
                <span id="lbl-voice-freq" class="metric-value">—</span>
              </div>
              <div class="metric">
                <span class="metric-label">DEVIATION</span>
                <span id="lbl-voice-cents" class="metric-value">0¢</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  update(freq, noteName, solfege, cents) {
    const needle = this.container.querySelector('#tuner-needle');
    const noteLbl = this.container.querySelector('#lbl-voice-note');
    const solfegeLbl = this.container.querySelector('#lbl-voice-solfege');
    const freqLbl = this.container.querySelector('#lbl-voice-freq');
    const centsLbl = this.container.querySelector('#lbl-voice-cents');

    if (noteLbl) noteLbl.textContent = noteName || '—';
    if (solfegeLbl) solfegeLbl.textContent = solfege || '—';
    if (freqLbl) freqLbl.textContent = freq ? `${freq.toFixed(1)} Hz` : '—';

    if (centsLbl) {
      const rounded = Math.round(cents || 0);
      centsLbl.textContent = cents !== null ? `${rounded > 0 ? '+' : ''}${rounded}¢` : '0¢';
      if (Math.abs(rounded) <= 10) {
        centsLbl.style.color = '#10b981';
      } else if (Math.abs(rounded) <= 25) {
        centsLbl.style.color = '#f59e0b';
      } else {
        centsLbl.style.color = '#ef4444';
      }
    }

    if (needle) {
      // Map cents (-50 to +50) to rotation angle (-45deg to +45deg)
      const clampedCents = Math.max(-50, Math.min(50, cents || 0));
      const angle = (clampedCents / 50) * 45;
      needle.style.transform = `rotate(${angle}deg)`;
    }
  }

  clear() {
    this.update(null, '—', '—', 0);
  }
}
