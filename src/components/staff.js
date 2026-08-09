// SVG Grand Staff Renderer for Treble and Bass Clefs
import { getNoteSpelling, KEY_SIGNATURES } from '../theory/solfege.js';

export class MusicStaff {
  constructor(svgId) {
    this.svg = typeof svgId === 'string' ? document.getElementById(svgId) : svgId;
    this.keyConfig = { type: 'sharp', count: 0 };
    this.pianoNote = null;
    this.sungNote = null;
    this.targetNote = null;
    this.melody = null;
    this.melodyIndex = 0;
    this.playbackIndex = null;

    this.LINE_SPACING = 12;
    this.TREBLE_BASE_Y = 112;
    this.BASS_BASE_Y = 136;
    this.MID_C_Y = 124;

    this.SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
    this.FLAT_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];
  }

  setKey(keyKey) {
    const key = KEY_SIGNATURES[keyKey] || KEY_SIGNATURES['C_maj'];
    this.keyConfig = { type: key.type, count: key.count };
    this.draw();
  }

  setPianoNote(midi, solfege) {
    if (midi === null) {
      if (this.pianoNote === null) return;
      this.pianoNote = null;
    } else {
      this.pianoNote = {
        midi,
        spelling: getNoteSpelling(midi, this.keyConfig),
        solfege
      };
    }
    this.draw();
  }

  setSungNote(midi, deviation) {
    if (midi === null) {
      if (this.sungNote === null) return;
      this.sungNote = null;
    } else {
      if (this.sungNote && this.sungNote.midi === midi && Math.round(this.sungNote.deviation) === Math.round(deviation)) {
        this.sungNote.deviation = deviation;
        return;
      }
      this.sungNote = {
        midi,
        spelling: getNoteSpelling(midi, this.keyConfig),
        deviation
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
        midi,
        spelling: getNoteSpelling(midi, this.keyConfig),
        solfege
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

  getNoteY(step) {
    return this.MID_C_Y - step * (this.LINE_SPACING / 2);
  }

  draw() {
    if (!this.svg) return;
    this.svg.innerHTML = '';

    const linesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const clefsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const keySigGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const notesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');

    const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    styleEl.textContent = `
      .staff-line { stroke: rgba(255, 255, 255, 0.28); stroke-width: 1.2px; }
      .clef-text { font-family: "Segoe UI Symbol", "Apple Symbols", "DejaVu Sans", sans-serif; font-size: 56px; fill: #ffffff; text-anchor: middle; }
      .acc-text { font-family: "Segoe UI Symbol", "Apple Symbols", "DejaVu Sans", sans-serif; font-size: 26px; fill: #a5b4fc; text-anchor: middle; }
      .ledger-line { stroke: rgba(255, 255, 255, 0.6); stroke-width: 1.5px; }
      .note-stem { stroke-width: 2px; stroke-linecap: round; }
    `;
    this.svg.appendChild(styleEl);

    // 5 Treble Staff Lines
    for (let i = 0; i < 5; i++) {
      const y = this.TREBLE_BASE_Y - i * this.LINE_SPACING;
      this.drawHorizontalLine(linesGroup, 15, 785, y, 'staff-line');
    }

    // 5 Bass Staff Lines
    for (let i = 0; i < 5; i++) {
      const y = this.BASS_BASE_Y + i * this.LINE_SPACING;
      this.drawHorizontalLine(linesGroup, 15, 785, y, 'staff-line');
    }

    // Measure boundaries
    this.drawVerticalLine(linesGroup, 15, this.TREBLE_BASE_Y - 4 * this.LINE_SPACING, this.BASS_BASE_Y + 4 * this.LINE_SPACING, 'staff-line');
    this.drawVerticalLine(linesGroup, 785, this.TREBLE_BASE_Y - 4 * this.LINE_SPACING, this.BASS_BASE_Y + 4 * this.LINE_SPACING, 'staff-line');
    this.drawVerticalLine(linesGroup, 175, this.TREBLE_BASE_Y - 4 * this.LINE_SPACING, this.BASS_BASE_Y + 4 * this.LINE_SPACING, 'staff-line', 'rgba(255,255,255,0.15)');

    // Render Treble & Bass Clefs
    const trebleClef = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    trebleClef.setAttribute('x', '45');
    trebleClef.setAttribute('y', '92');
    trebleClef.setAttribute('class', 'clef-text');
    trebleClef.textContent = '𝄞';
    clefsGroup.appendChild(trebleClef);

    const bassClef = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    bassClef.setAttribute('x', '45');
    bassClef.setAttribute('y', '172');
    bassClef.setAttribute('class', 'clef-text');
    bassClef.textContent = '𝄢';
    clefsGroup.appendChild(bassClef);

    // Draw Key Signature Accidental Signs
    this.drawKeySignature(keySigGroup);

    // Draw Active Notes (Piano, Sung, Target)
    if (this.pianoNote) {
      this.drawSingleNote(notesGroup, this.pianoNote.spelling, 340, '#818cf8', 'Piano', this.pianoNote.solfege);
    }
    if (this.sungNote) {
      const isTune = Math.abs(this.sungNote.deviation) < 15;
      const color = isTune ? '#10b981' : '#f59e0b';
      this.drawSingleNote(notesGroup, this.sungNote.spelling, 500, color, 'Voice', null, this.sungNote.deviation);
    }
    if (this.targetNote) {
      this.drawSingleNote(notesGroup, this.targetNote.spelling, 660, '#ec4899', 'Target', this.targetNote.solfege);
    }

    this.svg.appendChild(linesGroup);
    this.svg.appendChild(clefsGroup);
    this.svg.appendChild(keySigGroup);
    this.svg.appendChild(notesGroup);
  }

  drawKeySignature(group) {
    const { type, count } = this.keyConfig;
    if (count === 0) return;

    const startX = 80;
    const stepX = 12;

    if (type === 'sharp') {
      const sharpYMapTreble = { 'F': 52, 'C': 70, 'G': 46, 'D': 64, 'A': 82, 'E': 58, 'B': 76 };
      const sharpYMapBass   = { 'F': 160, 'C': 178, 'G': 154, 'D': 172, 'A': 190, 'E': 166, 'B': 184 };

      for (let i = 0; i < count; i++) {
        const noteLetter = this.SHARP_ORDER[i];
        const x = startX + i * stepX;

        const tText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        tText.setAttribute('x', x);
        tText.setAttribute('y', sharpYMapTreble[noteLetter]);
        tText.setAttribute('class', 'acc-text');
        tText.textContent = '♯';
        group.appendChild(tText);

        const bText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        bText.setAttribute('x', x);
        bText.setAttribute('y', sharpYMapBass[noteLetter]);
        bText.setAttribute('class', 'acc-text');
        bText.textContent = '♯';
        group.appendChild(bText);
      }
    } else {
      const flatYMapTreble = { 'B': 76, 'E': 58, 'A': 82, 'D': 64, 'G': 88, 'C': 70, 'F': 94 };
      const flatYMapBass   = { 'B': 184, 'E': 166, 'A': 190, 'D': 172, 'G': 196, 'C': 178, 'F': 202 };

      for (let i = 0; i < count; i++) {
        const noteLetter = this.FLAT_ORDER[i];
        const x = startX + i * stepX;

        const tText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        tText.setAttribute('x', x);
        tText.setAttribute('y', flatYMapTreble[noteLetter]);
        tText.setAttribute('class', 'acc-text');
        tText.textContent = '♭';
        group.appendChild(tText);

        const bText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        bText.setAttribute('x', x);
        bText.setAttribute('y', flatYMapBass[noteLetter]);
        bText.setAttribute('class', 'acc-text');
        bText.textContent = '♭';
        group.appendChild(bText);
      }
    }
  }

  drawSingleNote(group, spelling, x, color, labelText, solfegeLabel, cents = null) {
    if (!spelling) return;
    const y = this.getNoteY(spelling.step);

    // Ledger Lines
    if (spelling.step === 0) { // Middle C (C4)
      this.drawHorizontalLine(group, x - 15, x + 15, this.MID_C_Y, 'ledger-line');
    } else if (spelling.step < -6) { // Below Bass Staff
      for (let s = -6; s >= spelling.step; s -= 2) {
        this.drawHorizontalLine(group, x - 15, x + 15, this.getNoteY(s), 'ledger-line');
      }
    } else if (spelling.step > 12) { // Above Treble Staff
      for (let s = 12; s <= spelling.step; s += 2) {
        this.drawHorizontalLine(group, x - 15, x + 15, this.getNoteY(s), 'ledger-line');
      }
    }

    // Notehead
    const ellipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    ellipse.setAttribute('cx', x);
    ellipse.setAttribute('cy', y);
    ellipse.setAttribute('rx', '7');
    ellipse.setAttribute('ry', '5');
    ellipse.setAttribute('fill', color);
    ellipse.setAttribute('transform', `rotate(-20 ${x} ${y})`);
    group.appendChild(ellipse);

    // Note Stem
    const stemUp = spelling.step < 3;
    const stemX = stemUp ? x + 6.5 : x - 6.5;
    const stemYEnd = stemUp ? y - 32 : y + 32;
    this.drawVerticalLine(group, stemX, y, stemYEnd, 'note-stem', color);

    // Accidental if needed
    if (spelling.isAccidental) {
      const accText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      accText.setAttribute('x', x - 14);
      accText.setAttribute('y', y + 7);
      accText.setAttribute('fill', color);
      accText.setAttribute('font-size', '20');
      accText.setAttribute('text-anchor', 'end');
      accText.textContent = spelling.name.includes('b') ? '♭' : '♯';
      group.appendChild(accText);
    }

    // Note Text Label
    const textLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textLabel.setAttribute('x', x);
    textLabel.setAttribute('y', stemUp ? y + 22 : y - 18);
    textLabel.setAttribute('fill', color);
    textLabel.setAttribute('font-size', '13');
    textLabel.setAttribute('font-weight', '700');
    textLabel.setAttribute('text-anchor', 'middle');
    let labelContent = `${labelText}: ${spelling.name}`;
    if (solfegeLabel) labelContent += ` (${solfegeLabel})`;
    if (cents !== null) labelContent += ` [${cents > 0 ? '+' : ''}${Math.round(cents)}¢]`;
    textLabel.textContent = labelContent;
    group.appendChild(textLabel);
  }

  drawHorizontalLine(group, x1, x2, y, className, overrideStroke) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y);
    line.setAttribute('class', className);
    if (overrideStroke) line.setAttribute('stroke', overrideStroke);
    group.appendChild(line);
  }

  drawVerticalLine(group, x, y1, y2, className, overrideStroke) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x);
    line.setAttribute('y2', y2);
    line.setAttribute('class', className);
    if (overrideStroke) line.setAttribute('stroke', overrideStroke);
    group.appendChild(line);
  }
}
