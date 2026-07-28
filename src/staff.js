// Music Staff SVG Renderer for PitchMaster (Treble & Bass Clefs with Key Signatures)

const DUR_INFO = {
  w:  { hollow: true,  stem: false },
  dh: { hollow: true,  stem: true, dot: true },
  h:  { hollow: true,  stem: true },
  dq: { hollow: false, stem: true, dot: true },
  q:  { hollow: false, stem: true },
  e:  { hollow: false, stem: true, flag: true }
};

export class MusicStaff {
  constructor(svgId) {
    this.svg = document.getElementById(svgId);
    this.keyConfig = { type: 'sharp', count: 0 };
    this.pianoNote = null;
    this.sungNote = null;
    this.targetNote = null;
    this.melody = null;
    this.melodyIndex = 0;
    this.playbackIndex = null;
    
    this.LINE_SPACING = 12;
    this.TREBLE_BASE_Y = 100;
    this.BASS_BASE_Y = 148;
    this.MID_C_Y = 124;
    
    this.SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
    this.FLAT_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];
    this.onStaffClick = null;

    this.attachClickEvents();
  }

  attachClickEvents() {
    if (!this.svg) this.svg = document.getElementById('music-staff');
    if (!this.svg) return;

    this.svg.style.cursor = 'pointer';
    this.svg.addEventListener('click', (e) => {
      const rect = this.svg.getBoundingClientRect();
      const clickY = (e.clientY - rect.top) * (260 / rect.height);
      const midi = this.yToMidi(clickY);
      if (this.onStaffClick) {
        this.onStaffClick(midi);
      }
    });
  }

  yToMidi(y) {
    const totalStepFromC4 = Math.round((this.MID_C_Y - y) / (this.LINE_SPACING / 2));
    const octaveOffset = Math.floor(totalStepFromC4 / 7);
    let stepInOctave = (totalStepFromC4 % 7 + 7) % 7; // 0=C, 1=D, 2=E, 3=F, 4=G, 5=A, 6=B
    const octave = 4 + octaveOffset;

    const baseSemitones = [0, 2, 4, 5, 7, 9, 11];
    let semitone = baseSemitones[stepInOctave];

    const isSharpKey = this.keyConfig.type === 'sharp';
    const count = this.keyConfig.count;

    if (isSharpKey && count > 0) {
      const sharpSteps = [3, 0, 4, 1, 5, 2, 6]; // F, C, G, D, A, E, B
      for (let i = 0; i < count; i++) {
        if (stepInOctave === sharpSteps[i]) {
          semitone += 1;
          break;
        }
      }
    } else if (!isSharpKey && count > 0) {
      const flatSteps = [6, 2, 5, 1, 4, 0, 3]; // B, E, A, D, G, C, F
      for (let i = 0; i < count; i++) {
        if (stepInOctave === flatSteps[i]) {
          semitone -= 1;
          break;
        }
      }
    }

    const midi = (octave + 1) * 12 + semitone;
    return Math.max(36, Math.min(84, midi));
  }

  setKey(type, count) {
    this.keyConfig = { type, count };
    this.draw();
  }

  setPianoNote(midi, solfege) {
    if (midi === null) {
      if (this.pianoNote === null) return;
      this.pianoNote = null;
    } else {
      this.pianoNote = {
        midi: midi,
        spelling: getNoteSpelling(midi, this.keyConfig),
        solfege: solfege
      };
    }
    this.draw();
  }

  setSungNote(midi, deviation) {
    if (midi === null) {
      if (this.sungNote === null) return;
      this.sungNote = null;
    } else {
      if (this.sungNote && this.sungNote.midi === midi &&
          Math.round(this.sungNote.deviation) === Math.round(deviation)) {
        this.sungNote.deviation = deviation;
        return;
      }
      this.sungNote = {
        midi: midi,
        spelling: getNoteSpelling(midi, this.keyConfig),
        deviation: deviation
      };
    }
    this.draw();
  }

  setTargetNote(midi, solfege) {
    if (midi === null) {
      if (this.targetNote === null) return;
      this.targetNote = null;
    } else {
      this.targetNote = {
        midi: midi,
        spelling: getNoteSpelling(midi, this.keyConfig),
        solfege: solfege
      };
    }
    this.draw();
  }

  setMelody(notes) {
    if (!notes) {
      if (this.melody === null) return;
      this.melody = null;
    } else {
      this.melody = notes.map(n => ({
        ...n,
        spelling: getNoteSpelling(n.midi, this.keyConfig),
        state: 'pending'
      }));
      this.melodyIndex = 0;
    }
    this.playbackIndex = null;
    this.draw();
  }

  updateMelodyProgress(index, isCorrect) {
    if (!this.melody) return;
    this.melodyIndex = index;
    if (index > 0 && index <= this.melody.length) {
      this.melody[index - 1].state = isCorrect ? 'correct' : 'wrong';
    }
    this.draw();
  }

  setPlaybackIndex(index) {
    this.playbackIndex = index;
    this.draw();
  }

  midiToY(midi) {
    const semitoneToStep = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
    const octave = Math.floor(midi / 12) - 1;
    const semitone = midi % 12;
    const stepInOctave = semitoneToStep[semitone];
    const totalStepFromC4 = (octave - 4) * 7 + stepInOctave;
    return this.MID_C_Y - (totalStepFromC4 * (this.LINE_SPACING / 2));
  }

  draw() {
    if (!this.svg) this.svg = document.getElementById('music-staff');
    if (!this.svg) return;

    let html = '';

    // Draw Staff Lines
    for (let i = 0; i < 5; i++) {
      const yT = 52 + (i * this.LINE_SPACING);
      html += `<line x1="20" y1="${yT}" x2="780" y2="${yT}" stroke="rgba(255,255,255,0.25)" stroke-width="1.5"/>`;
      const yB = 148 + (i * this.LINE_SPACING);
      html += `<line x1="20" y1="${yB}" x2="780" y2="${yB}" stroke="rgba(255,255,255,0.25)" stroke-width="1.5"/>`;
    }

    // Start & End Bar Lines & Brace
    html += `<line x1="20" y1="52" x2="20" y2="196" stroke="rgba(255,255,255,0.4)" stroke-width="2.5"/>`;
    html += `<line x1="780" y1="52" x2="780" y2="196" stroke="rgba(255,255,255,0.4)" stroke-width="2.5"/>`;

    // Clefs
    html += `<text x="32" y="92" fill="#818cf8" font-size="46" font-family="serif">𝄞</text>`;
    html += `<text x="32" y="174" fill="#818cf8" font-size="40" font-family="serif">𝄢</text>`;

    // Key Signatures
    let keyX = 75;
    if (this.keyConfig.count > 0) {
      const isSharp = this.keyConfig.type === 'sharp';
      const symbol = isSharp ? '♯' : '♭';
      const treblePositions = isSharp ? [52, 70, 46, 64, 82, 58, 76] : [76, 58, 82, 64, 88, 70, 94];
      const bassPositions = isSharp ? [160, 178, 154, 172, 190, 166, 184] : [184, 166, 190, 172, 196, 178, 202];

      for (let i = 0; i < this.keyConfig.count; i++) {
        html += `<text x="${keyX}" y="${treblePositions[i]}" fill="#a78bfa" font-size="18" font-weight="bold">${symbol}</text>`;
        html += `<text x="${keyX}" y="${bassPositions[i]}" fill="#a78bfa" font-size="18" font-weight="bold">${symbol}</text>`;
        keyX += 14;
      }
    }

    // Draw Target Note
    if (this.targetNote) {
      const y = this.midiToY(this.targetNote.midi);
      const x = 320;
      const labelY = Math.max(20, Math.min(240, y - 14));
      html += this.drawLedgerLines(x, y);
      html += `<ellipse cx="${x}" cy="${y}" rx="7" ry="5.5" fill="none" stroke="#fbbf24" stroke-width="2.5" transform="rotate(-15 ${x} ${y})"/>`;
      html += `<text x="${x}" y="${labelY}" fill="#fbbf24" font-size="12" font-weight="bold" text-anchor="middle">TARGET: ${this.targetNote.spelling.name}</text>`;
    }

    // Draw Piano Note
    if (this.pianoNote) {
      const y = this.midiToY(this.pianoNote.midi);
      const x = 460;
      const labelY = Math.max(25, Math.min(245, y + 20));
      html += this.drawLedgerLines(x, y);
      html += `<ellipse cx="${x}" cy="${y}" rx="7" ry="5.5" fill="#818cf8" transform="rotate(-15 ${x} ${y})"/>`;
      html += `<text x="${x}" y="${labelY}" fill="#818cf8" font-size="13" font-weight="bold" text-anchor="middle">${this.pianoNote.spelling.name} (${this.pianoNote.solfege || ''})</text>`;
    }

    // Draw Sung Voice Note
    if (this.sungNote) {
      const y = this.midiToY(this.sungNote.midi);
      const x = 600;
      const isGood = Math.abs(this.sungNote.deviation) <= 15;
      const color = isGood ? '#10b981' : '#f43f5e';
      const labelY = Math.max(20, Math.min(240, y - 14));
      html += this.drawLedgerLines(x, y);
      html += `<ellipse cx="${x}" cy="${y}" rx="8" ry="6" fill="${color}" transform="rotate(-15 ${x} ${y})"/>`;
      html += `<text x="${x}" y="${labelY}" fill="${color}" font-size="13" font-weight="bold" text-anchor="middle">VOICE: ${this.sungNote.spelling.name}</text>`;
    }

    // Draw Sight-Reading Melody
    if (this.melody) {
      let startX = keyX + 30;
      const totalWidth = 740 - startX;
      const noteSpacing = totalWidth / Math.max(this.melody.length, 1);

      this.melody.forEach((n, idx) => {
        const x = startX + (idx * noteSpacing) + (noteSpacing / 2);
        const y = this.midiToY(n.midi);
        let color = 'rgba(255,255,255,0.7)';
        if (n.state === 'correct') color = '#10b981';
        if (n.state === 'wrong') color = '#f43f5e';
        if (idx === this.melodyIndex) color = '#fbbf24';
        if (idx === this.playbackIndex) color = '#ec4899';

        html += this.drawLedgerLines(x, y);
        html += `<ellipse cx="${x}" cy="${y}" rx="6.5" ry="5" fill="${color}" transform="rotate(-15 ${x} ${y})"/>`;
        html += `<text x="${x}" y="235" fill="${color}" font-size="12" font-weight="bold" text-anchor="middle">${n.solfege}</text>`;
      });
    }

    this.svg.innerHTML = html;
  }

  drawLedgerLines(x, y) {
    let html = '';
    // Treble ledger lines above E5 (y = 52) or below E4 (y = 100)
    if (y < 52) {
      for (let ly = 40; ly >= y - 3; ly -= 12) {
        html += `<line x1="${x - 12}" y1="${ly}" x2="${x + 12}" y2="${ly}" stroke="rgba(255,255,255,0.5)" stroke-width="1.5"/>`;
      }
    } else if (y === 124) { // Middle C
      html += `<line x1="${x - 12}" y1="124" x2="${x + 12}" y2="124" stroke="#818cf8" stroke-width="2"/>`;
    } else if (y > 196) {
      for (let ly = 208; ly <= y + 3; ly += 12) {
        html += `<line x1="${x - 12}" y1="${ly}" x2="${x + 12}" y2="${ly}" stroke="rgba(255,255,255,0.5)" stroke-width="1.5"/>`;
      }
    }
    return html;
  }
}

export function getNoteSpelling(midi, keyConfig) {
  const noteNamesSharp = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const noteNamesFlat  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  const semitone = (midi % 12 + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  const isFlat = keyConfig && keyConfig.type === 'flat';
  const name = isFlat ? noteNamesFlat[semitone] : noteNamesSharp[semitone];
  return { name: `${name}${octave}`, base: name, octave };
}

window.MusicStaff = MusicStaff;
