// How each note-duration kind renders (4/4 time)
const DUR_INFO = {
  w:  { hollow: true,  stem: false },
  dh: { hollow: true,  stem: true, dot: true },
  h:  { hollow: true,  stem: true },
  dq: { hollow: false, stem: true, dot: true },
  q:  { hollow: false, stem: true },
  e:  { hollow: false, stem: true, flag: true }
};

class MusicStaff {
  constructor(svgId) {
    this.svg = document.getElementById(svgId);
    this.keyConfig = { type: 'sharp', count: 0 }; // Default C Major
    this.pianoNote = null;  // Current midi note played on piano { midi, spelling }
    this.sungNote = null;   // Current midi note sung { midi, spelling, deviation }
    this.targetNote = null; // Target midi note to match { midi, spelling }
    this.melody = null;     // Sight-reading melody: [{ midi, solfege, spelling, state, kind, beats, startBeat, ... }]
    this.melodyIndex = 0;   // Index of the note currently being sung
    this.playbackIndex = null; // Note highlighted during playback / count-along
    
    // Constant coordinates
    this.LINE_SPACING = 12;
    this.TREBLE_BASE_Y = 112; // Y-coord for bottom line of treble staff (E4)
    this.BASS_BASE_Y = 136;   // Y-coord for top line of bass staff (A3)
    this.MID_C_Y = 124;       // Y-coord for Middle C (C4)
    
    // Key signature positions
    this.SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
    this.FLAT_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];
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
      if (this.sungNote === null) return; // already clear — skip rebuild
      this.sungNote = null;
    } else {
      // Skip the full SVG rebuild when the visible output would be identical
      if (this.sungNote && this.sungNote.midi === midi &&
          Math.round(this.sungNote.deviation) === Math.round(deviation)) {
        this.sungNote.deviation = deviation;
        return;
      }
      this.sungNote = {
        midi: midi,
        spelling: getNoteSpelling(midi, this.keyConfig),
        deviation: deviation // Cents offset (-50 to +50)
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

  // Set the sight-reading melody: notes = [{ midi, solfege }] or null to clear
  setMelody(notes) {
    if (!notes) {
      if (this.melody === null) return;
      this.melody = null;
    } else {
      this.melody = notes.map(n => ({
        ...n, // midi, solfege + rhythm fields (kind, beats, startBeat, beam, countLabel)
        spelling: getNoteSpelling(n.midi, this.keyConfig),
        state: 'pending'
      }));
      this.melodyIndex = 0;
    }
    this.playbackIndex = null;
    this.draw();
  }

  // Highlight a note during playback / count-along (null to clear)
  setPlaybackIndex(i) {
    if (this.playbackIndex === i) return;
    this.playbackIndex = i;
    this.draw();
  }

  // Mark a melody note as sung correctly and advance the cursor
  completeMelodyNote(index) {
    if (!this.melody || !this.melody[index]) return;
    this.melody[index].state = 'done';
    this.melodyIndex = index + 1;
    this.draw();
  }

  // Total beats in the melody (e.g., 8 for two 4/4 measures)
  melodyTotalBeats() {
    return this.melody.reduce((max, n) => Math.max(max, (n.startBeat || 0) + (n.beats || 1)), 0) || this.melody.length;
  }

  // X of an absolute beat position (bar lines sit exactly on these)
  melodyBeatX(beat) {
    const startX = 252;
    const endX = 770;
    return startX + (beat / this.melodyTotalBeats()) * (endX - startX);
  }

  // X position of the i-th melody note: proportional to its beat, nudged right of the beat gridline
  melodyX(i) {
    const n = this.melody[i];
    return this.melodyBeatX(n.startBeat !== undefined ? n.startBeat : i) + 16;
  }

  // Map white note steps (relative to C4 = 0) to Y coordinate
  // The grand staff coordinates are:
  //   Treble bottom line = E4 (step +2) = Y 100
  //   Middle C ledger    = C4 (step  0) = Y 124
  //   Bass top line      = A3 (step -2) = Y 148
  // Each step = LINE_SPACING/2 = 6px
  getNoteY(step) {
    return this.MID_C_Y - step * (this.LINE_SPACING / 2);
  }

  // Draw the entire staff layout
  draw() {
    if (!this.svg) return;
    
    // Clear previous drawing
    this.svg.innerHTML = '';
 
    // Create SVG element groups
    const bgGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const linesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const clefsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const keySigGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const notesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const tunerGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
 
    // Add CSS stylesheet inside SVG for standard music fonts
    const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    styleEl.textContent = `
      .staff-line { stroke: rgba(255, 255, 255, 0.25); stroke-width: 1.2px; }
      .clef-text { font-family: "Segoe UI Symbol", "Apple Symbols", "DejaVu Sans", sans-serif; font-size: 58px; fill: #ffffff; text-anchor: middle; }
      .acc-text { font-family: "Segoe UI Symbol", "Apple Symbols", "DejaVu Sans", sans-serif; font-size: 26px; fill: #a5b4fc; text-anchor: middle; }
      .note-acc { font-family: "Segoe UI Symbol", "Apple Symbols", "DejaVu Sans", sans-serif; font-size: 26px; text-anchor: end; }
      .ledger-line { stroke: rgba(255, 255, 255, 0.6); stroke-width: 1.5px; }
      .note-stem { stroke-width: 2px; stroke-linecap: round; }
    `;
    this.svg.appendChild(styleEl);
 
    // Render 5 Treble Lines
    for (let i = 0; i < 5; i++) {
      const y = this.TREBLE_BASE_Y - i * this.LINE_SPACING;
      this.drawHorizontalLine(linesGroup, 15, 785, y, 'staff-line');
    }
 
    // Render 5 Bass Lines
    for (let i = 0; i < 5; i++) {
      const y = this.BASS_BASE_Y + i * this.LINE_SPACING;
      this.drawHorizontalLine(linesGroup, 15, 785, y, 'staff-line');
    }
 
    // Draw Left and Right boundaries (Measure bars)
    this.drawVerticalLine(linesGroup, 15, this.TREBLE_BASE_Y - 4 * this.LINE_SPACING, this.BASS_BASE_Y + 4 * this.LINE_SPACING, 'staff-line');
    this.drawVerticalLine(linesGroup, 785, this.TREBLE_BASE_Y - 4 * this.LINE_SPACING, this.BASS_BASE_Y + 4 * this.LINE_SPACING, 'staff-line');
    
    // Draw thin separator bar line after key signature area
    this.drawVerticalLine(linesGroup, 175, this.TREBLE_BASE_Y - 4 * this.LINE_SPACING, this.BASS_BASE_Y + 4 * this.LINE_SPACING, 'staff-line', 'rgba(255,255,255,0.15)');
 
    // Render Clef Symbols
    // Treble Clef: U+1D11E (𝄞)
    const trebleClef = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    trebleClef.setAttribute('x', '45');
    trebleClef.setAttribute('y', '92'); // Center visually on G4 (second line)
    trebleClef.setAttribute('class', 'clef-text');
    trebleClef.textContent = '𝄞';
    clefsGroup.appendChild(trebleClef);
 
    // Bass Clef 𝄢: The two dots must straddle the 4th bass line (F3).
    // F3 = step -9 = Y 124 + 9*6 = Y 178. But the unicode glyph's visual
    // dot center sits ~18px below the text baseline. So baseline = 178-18=160,
    // then shift up by 2 for the top dot: y = 158.
    const bassClef = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    bassClef.setAttribute('x', '45');
    bassClef.setAttribute('y', '158');
    bassClef.setAttribute('class', 'clef-text');
    bassClef.textContent = '𝄢';
    clefsGroup.appendChild(bassClef);

    // Draw Key Signature
    this.drawKeySignature(keySigGroup);

    // Draw Notes
    if (this.melody) {
      // Melody sight-reading layout: time signature, bar lines, full phrase across the staff
      this.drawTimeSignature(clefsGroup);
      this.drawMelodyBarlines(linesGroup);
      this.drawMelody(notesGroup);
      if (this.sungNote) this.drawMelodyFeedback(tunerGroup);
    } else {
      // Draw target note (shown in center, e.g., X = 320)
      if (this.targetNote) {
        this.drawNote(notesGroup, 340, this.targetNote, 'rgba(129, 140, 248, 0.4)', '#818cf8', 'target'); // Semi-transparent indigo
      }

      // Draw piano played note (shown at X = 480)
      if (this.pianoNote) {
        this.drawNote(notesGroup, 480, this.pianoNote, '#60a5fa', '#3b82f6', 'piano'); // Glowing blue
      }

      // Draw voice sung note (shown at X = 620)
      if (this.sungNote) {
        // Color depends on deviation
        const dev = Math.abs(this.sungNote.deviation);
        let noteColor = '#ef4444'; // Red if flat/sharp
        let glowColor = 'rgba(239, 68, 68, 0.4)';

        if (dev <= 15) {
          noteColor = '#10b981'; // Solid green if extremely close
          glowColor = 'rgba(16, 185, 129, 0.7)';
        } else if (dev <= 30) {
          noteColor = '#fbbf24'; // Orange/yellow if close
          glowColor = 'rgba(251, 191, 36, 0.4)';
        }

        this.drawNote(notesGroup, 620, this.sungNote, noteColor, glowColor, 'voice');

        // Draw voice pitch tuner bar above/below the note
        this.drawTuner(tunerGroup, 620, this.sungNote, noteColor);
      }
    }

    // Append all groups to SVG
    this.svg.appendChild(bgGroup);
    this.svg.appendChild(linesGroup);
    this.svg.appendChild(clefsGroup);
    this.svg.appendChild(keySigGroup);
    this.svg.appendChild(notesGroup);
    this.svg.appendChild(tunerGroup);
  }

  // Draw 4/4 time signature after the key signature on both staves
  drawTimeSignature(group) {
    const centers = [
      { num: 64, den: 88 },   // treble staff (center Y 76)
      { num: 160, den: 184 }  // bass staff (center Y 172)
    ];
    centers.forEach(c => {
      [c.num, c.den].forEach(y => {
        const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        t.setAttribute('x', 198);
        t.setAttribute('y', y);
        t.setAttribute('dominant-baseline', 'central');
        t.setAttribute('text-anchor', 'middle');
        t.setAttribute('fill', '#ffffff');
        t.setAttribute('font-family', 'Georgia, "Times New Roman", serif');
        t.setAttribute('font-size', '26');
        t.setAttribute('font-weight', '700');
        t.textContent = '4';
        group.appendChild(t);
      });
    });
  }

  // Bar lines between measures (every 4 beats)
  drawMelodyBarlines(group) {
    const totalBeats = this.melodyTotalBeats();
    for (let b = 4; b < totalBeats; b += 4) {
      this.drawVerticalLine(
        group,
        this.melodyBeatX(b),
        this.TREBLE_BASE_Y - 4 * this.LINE_SPACING,
        this.BASS_BASE_Y + 4 * this.LINE_SPACING,
        'staff-line'
      );
    }
  }

  // Draw all melody notes: green = sung, indigo = current, gold = playback, dim = upcoming
  drawMelody(group) {
    // Beamed eighth pairs share a stem direction (taken from the first note of the pair)
    this.melody.forEach((note, i) => {
      if (note.beam === 'start' && this.melody[i + 1]) {
        const step = note.spelling.step;
        const isTreble = step >= 1;
        const up = step < (isTreble ? 6 : -6);
        note.forcedStemUp = up;
        this.melody[i + 1].forcedStemUp = up;
      }
    });

    let beamStart = null;
    this.melody.forEach((note, i) => {
      let color, glow, role;
      if (i === this.playbackIndex) {
        color = '#f59e0b';
        glow = 'rgba(245, 158, 11, 0.5)';
        role = i === this.melodyIndex ? 'melody-current' : 'melody';
      } else if (note.state === 'done') {
        color = '#10b981';
        glow = 'rgba(16, 185, 129, 0.35)';
        role = 'melody';
      } else if (i === this.melodyIndex) {
        color = '#818cf8';
        glow = 'rgba(129, 140, 248, 0.5)';
        role = 'melody-current'; // only the current note shows its name/solfege
      } else {
        color = 'rgba(244, 244, 245, 0.45)';
        glow = 'rgba(255, 255, 255, 0.06)';
        role = 'melody';
      }
      const x = this.melodyX(i);
      const info = this.drawNote(group, x, note, color, glow, role);

      // Connect beamed eighth pairs with a beam instead of flags
      if (note.beam === 'start') {
        beamStart = { info, color };
      } else if (note.beam === 'stop' && beamStart) {
        if (beamStart.info.stemTipX !== null && info.stemTipX !== null) {
          const beam = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          beam.setAttribute('x1', beamStart.info.stemTipX);
          beam.setAttribute('y1', beamStart.info.stemTipY);
          beam.setAttribute('x2', info.stemTipX);
          beam.setAttribute('y2', info.stemTipY);
          beam.setAttribute('stroke', beamStart.color);
          beam.setAttribute('stroke-width', '4.5');
          beam.setAttribute('stroke-linecap', 'round');
          group.appendChild(beam);
        }
        beamStart = null;
      }

      // Count syllable under every note — the rhythm helper for singers
      if (note.countLabel) {
        const count = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        count.setAttribute('x', x);
        count.setAttribute('y', 224);
        count.setAttribute('fill', (i === this.melodyIndex && note.state !== 'done') ? '#fbbf24' : 'rgba(161, 161, 170, 0.85)');
        count.setAttribute('font-family', '"Inter", sans-serif');
        count.setAttribute('font-weight', '600');
        count.setAttribute('font-size', '12px');
        count.setAttribute('text-anchor', 'middle');
        count.textContent = note.countLabel;
        group.appendChild(count);
      }
    });
  }

  // Live voice feedback anchored on the current melody note
  drawMelodyFeedback(group) {
    if (this.melodyIndex >= this.melody.length) return;
    const x = this.melodyX(this.melodyIndex);
    const current = this.melody[this.melodyIndex];

    if (this.sungNote.midi === current.midi) {
      // Right note: show fine-tuning bar above it
      const dev = Math.abs(this.sungNote.deviation);
      const color = dev <= 15 ? '#10b981' : (dev <= 30 ? '#fbbf24' : '#ef4444');
      this.drawTuner(group, x, this.sungNote, color);
    } else {
      // Wrong note: show what is being sung instead
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', x);
      label.setAttribute('y', 20);
      label.setAttribute('fill', '#f87171');
      label.setAttribute('font-family', '"Plus Jakarta Sans", "Inter", sans-serif');
      label.setAttribute('font-weight', '700');
      label.setAttribute('font-size', '13px');
      label.setAttribute('text-anchor', 'middle');
      label.textContent = `You: ${this.sungNote.spelling.displayName}${this.sungNote.spelling.octave}`;
      group.appendChild(label);
    }
  }

  // Draw key signature accidentals
  drawKeySignature(group) {
    const { type, count } = this.keyConfig;
    if (count === 0) return;

    const spacing = 11;
    const startX = 82;
    const accChar = type === 'sharp' ? '♯' : '♭';

    for (let i = 0; i < count; i++) {
      const x = startX + i * spacing;
      
      // Treble position
      const trebleLetter = type === 'sharp' ? this.SHARP_ORDER[i] : this.FLAT_ORDER[i];
      const trebleOctave = this.getKeySigOctave('treble', trebleLetter, type);
      const trebleStep = getStepForLetter(trebleLetter, trebleOctave);
      let trebleY = this.getNoteY(trebleStep);
      
      // For flats, shift the symbol slightly up so the loop centers exactly on the line/space
      if (type === 'flat') {
        trebleY -= 4;
      }

      const tAcc = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      tAcc.setAttribute('x', x);
      tAcc.setAttribute('y', trebleY);
      tAcc.setAttribute('dominant-baseline', 'central');
      tAcc.setAttribute('class', 'acc-text');
      tAcc.textContent = accChar;
      group.appendChild(tAcc);

      // Bass position
      const bassLetter = type === 'sharp' ? this.SHARP_ORDER[i] : this.FLAT_ORDER[i];
      const bassOctave = this.getKeySigOctave('bass', bassLetter, type);
      const bassStep = getStepForLetter(bassLetter, bassOctave);
      let bassY = this.getNoteY(bassStep);
      
      if (type === 'flat') {
        bassY -= 4;
      }

      const bAcc = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      bAcc.setAttribute('x', x);
      bAcc.setAttribute('y', bassY);
      bAcc.setAttribute('dominant-baseline', 'central');
      bAcc.setAttribute('class', 'acc-text');
      bAcc.textContent = accChar;
      group.appendChild(bAcc);
    }
  }

  // Hardcoded key signature octaves per standard music notation:
  // Sources: music-theory-practice.com, pugetsound.edu, mymusictheory.com
  //
  // TREBLE SHARPS (line/space from bottom, 1=bottom line):
  //   F#: 5th line (F5)   C#: 3rd space (C5)  G#: 4th space... wait, above staff
  //   Standard published positions:
  //   F#=top line(F5), C#=3rd space(C5), G#=4th space(G5 — above staff, use G4+oct)
  //   Actually correct standard octaves:
  //   F5, C5, G5, D5, A4, E5, B4
  //
  // TREBLE FLATS:
  //   Bb=3rd line(B4), Eb=4th space(E5), Ab=2nd space(A4),
  //   Db=4th line(D5), Gb=2nd line(G4), Cb=3rd space(C5), Fb=1st space(F4)
  //
  // BASS SHARPS:
  //   F#=4th line(F3), C#=2nd space(C3), G#=3rd space(G3),
  //   D#=3rd line(D3), A#=1st space(A2), E#=2nd line(E3), B#=3rd space... use B2
  //
  // BASS FLATS:
  //   Bb=2nd line(B2), Eb=3rd space(E3), Ab=1st space(A2),
  //   Db=2nd line... wait standard: Bb=2nd line, Eb=3rd space, Ab=1st space,
  //   Db=3rd line, Gb=4th space... use: B2,E3,A2,D3,G2,C3,F2
  getKeySigOctave(clef, letter, type) {
    // Each entry maps letter -> octave for that clef+type combination
    const TABLE = {
      treble: {
        sharp: { F: 5, C: 5, G: 5, D: 5, A: 4, E: 5, B: 4 },
        flat:  { B: 4, E: 5, A: 4, D: 5, G: 4, C: 5, F: 4 }
      },
      bass: {
        sharp: { F: 3, C: 3, G: 3, D: 3, A: 2, E: 3, B: 2 },
        flat:  { B: 2, E: 3, A: 2, D: 3, G: 2, C: 3, F: 2 }
      }
    };
    return TABLE[clef][type][letter];
  }

  // Draw a single note head, stems, ledger lines, and accidentals
  drawNote(group, x, noteObj, color, glowColor, role) {
    const { step, accidental } = noteObj.spelling;
    const y = this.getNoteY(step);

    // Create note group with identifier
    const noteG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    noteG.setAttribute('class', `note-group note-${role}`);

    // Glow Filter or Highlight Halo
    const halo = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    halo.setAttribute('cx', x);
    halo.setAttribute('cy', y);
    halo.setAttribute('rx', '14');
    halo.setAttribute('ry', '10');
    halo.setAttribute('fill', glowColor);
    halo.setAttribute('opacity', role === 'target' ? '0.2' : '0.5');
    noteG.appendChild(halo);

    // Draw Ledger Lines if out of staff lines
    this.drawLedgerLines(noteG, x, step);

    // Accidental symbol next to note if present
    if (accidental) {
      const accText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      accText.setAttribute('x', x - 14);
      
      let accY = y;
      if (accidental === 'b' || accidental === 'bb') {
        accY = y - 4; // Shift flats slightly up so their loop centers exactly
      }
      
      accText.setAttribute('y', accY);
      accText.setAttribute('dominant-baseline', 'central');
      accText.setAttribute('class', 'note-acc');
      accText.setAttribute('fill', color);
      // Map program code to unicode symbols
      const symbolMap = { '#': '♯', 'b': '♭', '♮': '♮', 'x': '𝄪', 'bb': '𝄫' };
      accText.textContent = symbolMap[accidental] || accidental;
      noteG.appendChild(accText);
    }

    // Duration-aware rendering (no kind = classic quarter-note look)
    const dur = noteObj.kind ? DUR_INFO[noteObj.kind] : null;
    const hollow = !!(dur && dur.hollow);
    const hasStem = dur ? dur.stem !== false : true;
    const hasFlag = !!(dur && dur.flag && !noteObj.beam); // beamed eighths get a beam, not a flag
    const hasDot = !!(dur && dur.dot);

    // Tilted Notehead Ellipse (hollow for half/whole notes)
    const notehead = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    notehead.setAttribute('cx', '0');
    notehead.setAttribute('cy', '0');
    notehead.setAttribute('rx', '6.5');
    notehead.setAttribute('ry', '4.5');
    if (hollow) {
      notehead.setAttribute('fill', 'none');
      notehead.setAttribute('stroke', color);
      notehead.setAttribute('stroke-width', '2.2');
    } else {
      notehead.setAttribute('fill', color);
    }

    // Rotate to match classic music notation notehead skew
    notehead.setAttribute('transform', `translate(${x}, ${y}) rotate(-20)`);
    noteG.appendChild(notehead);

    // Augmentation dot: sits in the space above when the note is on a line
    if (hasDot) {
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', x + 11.5);
      dot.setAttribute('cy', step % 2 === 0 ? y - 3 : y);
      dot.setAttribute('r', '2.2');
      dot.setAttribute('fill', color);
      noteG.appendChild(dot);
    }

    // Draw Stem
    // Middle line of Treble is B4 (step 6). Middle line of Bass is D3 (step -6).
    // Note stems point down if above middle line, and up if below.
    const isTreble = step >= 1;
    const middleStep = isTreble ? 6 : -6;
    const stemUp = noteObj.forcedStemUp !== undefined ? noteObj.forcedStemUp : step < middleStep;

    const stemHeight = 28;
    let stemTipX = null;
    let stemTipY = null;
    if (hasStem) {
      const stem = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      stem.setAttribute('class', 'note-stem');
      stem.setAttribute('stroke', color);

      if (stemUp) {
        // Stem starts on right edge of notehead, goes up
        stemTipX = x + 6.2;
        stemTipY = y - stemHeight;
        stem.setAttribute('x1', stemTipX);
        stem.setAttribute('y1', y - 1);
        stem.setAttribute('x2', stemTipX);
        stem.setAttribute('y2', stemTipY);
      } else {
        // Stem starts on left edge of notehead, goes down
        stemTipX = x - 6.2;
        stemTipY = y + stemHeight;
        stem.setAttribute('x1', stemTipX);
        stem.setAttribute('y1', y + 1);
        stem.setAttribute('x2', stemTipX);
        stem.setAttribute('y2', stemTipY);
      }
      noteG.appendChild(stem);

      // Eighth-note flag (always curves to the right of the stem)
      if (hasFlag) {
        const dir = stemUp ? 1 : -1;
        const flag = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        flag.setAttribute('d', `M ${stemTipX} ${stemTipY} C ${stemTipX + 9} ${stemTipY + 7 * dir}, ${stemTipX + 11} ${stemTipY + 14 * dir}, ${stemTipX + 4} ${stemTipY + 22 * dir}`);
        flag.setAttribute('stroke', color);
        flag.setAttribute('stroke-width', '3');
        flag.setAttribute('fill', 'none');
        flag.setAttribute('stroke-linecap', 'round');
        noteG.appendChild(flag);
      }
    }

    // Label Note Name & Solfege below the staff (skipped for non-current melody
    // notes — reading them without help is the sight-singing exercise)
    if (role !== 'melody') {
      const textG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', x - 48);
      rect.setAttribute('y', 231);
      rect.setAttribute('width', 96);
      rect.setAttribute('height', 24);
      rect.setAttribute('rx', 6);
      rect.setAttribute('ry', 6);
      rect.setAttribute('fill', 'rgba(12, 12, 18, 0.92)');
      rect.setAttribute('stroke', color);
      rect.setAttribute('stroke-width', '1.5');
      textG.appendChild(rect);

      const textLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      textLabel.setAttribute('x', x);
      textLabel.setAttribute('y', '247'); // Bottom label line
      textLabel.setAttribute('fill', color);
      textLabel.setAttribute('font-family', '"Plus Jakarta Sans", "Inter", sans-serif');
      textLabel.setAttribute('font-weight', '800');
      textLabel.setAttribute('font-size', '13px');
      textLabel.setAttribute('text-anchor', 'middle');

      // Set text display (e.g. "C4 (Do)")
      const solfege = noteObj.solfege || '';
      const noteName = noteObj.spelling.displayName + noteObj.spelling.octave;
      textLabel.textContent = solfege ? `${noteName} (${solfege})` : noteName;
      textG.appendChild(textLabel);
      noteG.appendChild(textG);
    }

    group.appendChild(noteG);
    return { stemTipX, stemTipY, stemUp };
  }

  // Draw small horizontal lines for notes sitting outside the 5 staff lines
  drawLedgerLines(group, x, step) {
    const drawLine = (yVal) => {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x - 14);
      line.setAttribute('y1', yVal);
      line.setAttribute('x2', x + 14);
      line.setAttribute('y2', yVal);
      line.setAttribute('class', 'ledger-line');
      group.appendChild(line);
    };

    // 1. Middle C (step 0, Y = 130)
    if (step === 0) {
      drawLine(this.MID_C_Y);
    }

    // 2. High ledger lines (above treble clef top line F5 = step 10)
    if (step >= 12) {
      // Draw lines at steps 12, 14, etc. up to the note step
      const maxLineStep = step % 2 === 0 ? step : step - 1;
      for (let s = 12; s <= maxLineStep; s += 2) {
        drawLine(this.getNoteY(s));
      }
    }

    // 3. Low ledger lines (below bass clef bottom line G2 = step -10)
    if (step <= -12) {
      // Draw lines at steps -12, -14, etc. down to the note step
      const minLineStep = step % 2 === 0 ? step : step + 1;
      for (let s = -12; s >= minLineStep; s -= 2) {
        drawLine(this.getNoteY(s));
      }
    }
  }

  // Draw real-time voice tuner feedback under note
  drawTuner(group, x, noteObj, color) {
    const dev = noteObj.deviation; // in cents (-50 to +50)
    const y = 20; // Show tuner at the very top of the staff container
    
    // Draw tuner background line
    const baseLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    baseLine.setAttribute('x1', x - 40);
    baseLine.setAttribute('y1', y);
    baseLine.setAttribute('x2', x + 40);
    baseLine.setAttribute('y2', y);
    baseLine.setAttribute('stroke', 'rgba(255,255,255,0.15)');
    baseLine.setAttribute('stroke-width', '4');
    baseLine.setAttribute('stroke-linecap', 'round');
    group.appendChild(baseLine);

    // Center tick (In-tune indicator)
    const centerTick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    centerTick.setAttribute('x1', x);
    centerTick.setAttribute('y1', y - 6);
    centerTick.setAttribute('x2', x);
    centerTick.setAttribute('y2', y + 6);
    centerTick.setAttribute('stroke', '#10b981');
    centerTick.setAttribute('stroke-width', '2');
    group.appendChild(centerTick);

    // Tuner needle mapping -50 cents to -40px, +50 cents to +40px
    const needleX = x + (dev / 50) * 40;
    const needle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    needle.setAttribute('cx', needleX);
    needle.setAttribute('cy', y);
    needle.setAttribute('r', '5');
    needle.setAttribute('fill', color);
    group.appendChild(needle);

    // Label showing deviation cents
    const centsText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    centsText.setAttribute('x', x);
    centsText.setAttribute('y', y - 10);
    centsText.setAttribute('fill', color);
    centsText.setAttribute('font-family', 'sans-serif');
    centsText.setAttribute('font-size', '10px');
    centsText.setAttribute('text-anchor', 'middle');
    
    let sign = dev > 0 ? '+' : '';
    centsText.textContent = `${sign}${Math.round(dev)}¢`;
    group.appendChild(centsText);
  }

  // Helpers to draw basic lines
  drawHorizontalLine(group, x1, x2, y, className, color) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y);
    line.setAttribute('class', className);
    if (color) line.setAttribute('style', `stroke: ${color};`);
    group.appendChild(line);
  }

  drawVerticalLine(group, x, y1, y2, className, color) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x);
    line.setAttribute('y2', y2);
    line.setAttribute('class', className);
    if (color) line.setAttribute('style', `stroke: ${color};`);
    group.appendChild(line);
  }
}

// Global mapping function referenced inside staff.js (defined here for convenience, imported by app.js as well)
const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
const FLAT_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];
const LETTER_STEPS = { 'C': 0, 'D': 1, 'E': 2, 'F': 3, 'G': 4, 'A': 5, 'B': 6 };

function getScaleNotes(keyConfig) {
  const baseNotes = [
    { letter: 'C', pc: 0 },
    { letter: 'D', pc: 2 },
    { letter: 'E', pc: 4 },
    { letter: 'F', pc: 5 },
    { letter: 'G', pc: 7 },
    { letter: 'A', pc: 9 },
    { letter: 'B', pc: 11 }
  ];
  
  const scale = {};
  baseNotes.forEach(n => {
    let acc = '';
    let pc = n.pc;
    if (keyConfig.type === 'sharp') {
      const sharpIndex = SHARP_ORDER.indexOf(n.letter);
      if (sharpIndex !== -1 && sharpIndex < keyConfig.count) {
        acc = '#';
        pc = (pc + 1) % 12;
      }
    } else if (keyConfig.type === 'flat') {
      const flatIndex = FLAT_ORDER.indexOf(n.letter);
      if (flatIndex !== -1 && flatIndex < keyConfig.count) {
        acc = 'b';
        pc = (pc - 1 + 12) % 12;
      }
    }
    scale[n.letter] = { letter: n.letter, acc: acc, pc: pc };
  });
  return scale;
}

function getStepForLetter(letter, octave) {
  return LETTER_STEPS[letter] + (octave - 4) * 7;
}

const LETTER_PCS = { 'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11 };

// Scientific octave of a SPELLED note follows the letter, not the sounding pitch:
// B#3 sounds as C4 but sits on B3's staff position; Cb4 sounds as B3 but sits on C4's.
function spelledOctave(midi, letter) {
  let octave = Math.floor(midi / 12) - 1;
  const delta = midi - ((octave + 1) * 12 + LETTER_PCS[letter]);
  if (delta > 6) octave += 1;       // e.g., Cb: letter C lives an octave above the sounding B
  else if (delta < -6) octave -= 1; // e.g., B#: letter B lives an octave below the sounding C
  return octave;
}

function getNoteSpelling(midi, keyConfig) {
  const pc = midi % 12;
  const scale = getScaleNotes(keyConfig);

  // 1. Check for exact pitch class match in scale
  for (let letter in scale) {
    if (scale[letter].pc === pc) {
      const octave = spelledOctave(midi, letter);
      return {
        letter: letter,
        accidental: '', // matches key signature
        octave: octave,
        step: getStepForLetter(letter, octave),
        displayName: letter + (scale[letter].acc || '')
      };
    }
  }
  
  // 2. Select chromatic spelling if not in key scale
  const isFlatKey = keyConfig.type === 'flat' && keyConfig.count > 0;
  
  const standardFlats = [
    { letter: 'C', acc: '' },   // 0
    { letter: 'D', acc: 'b' },  // 1
    { letter: 'D', acc: '' },   // 2
    { letter: 'E', acc: 'b' },  // 3
    { letter: 'E', acc: '' },   // 4
    { letter: 'F', acc: '' },   // 5
    { letter: 'G', acc: 'b' },  // 6
    { letter: 'G', acc: '' },   // 7
    { letter: 'A', acc: 'b' },  // 8
    { letter: 'A', acc: '' },   // 9
    { letter: 'B', acc: 'b' },  // 10
    { letter: 'B', acc: '' }    // 11
  ];

  const standardSharps = [
    { letter: 'C', acc: '' },   // 0
    { letter: 'C', acc: '#' },  // 1
    { letter: 'D', acc: '' },   // 2
    { letter: 'D', acc: '#' },  // 3
    { letter: 'E', acc: '' },   // 4
    { letter: 'F', acc: '' },   // 5
    { letter: 'F', acc: '#' },  // 6
    { letter: 'G', acc: '' },   // 7
    { letter: 'G', acc: '#' },  // 8
    { letter: 'A', acc: '' },   // 9
    { letter: 'A', acc: '#' },  // 10
    { letter: 'B', acc: '' }    // 11
  ];

  const spelling = isFlatKey ? standardFlats[pc] : standardSharps[pc];
  const letter = spelling.letter;
  
  // Calculate accidental symbol based on the difference from key's default letter
  const scaleNote = scale[letter];
  const scaleAcc = scaleNote.acc;
  const scalePC = scaleNote.pc;
  
  // Wrap difference in [-6, 5] range to get the shortest distance
  let diff = pc - scalePC;
  diff = ((diff + 18) % 12) - 6;
  
  let drawAcc = '';
  if (diff === 1) {
    if (scaleAcc === 'b') drawAcc = '♮'; // Flat note raised 1 = natural
    else if (scaleAcc === '') drawAcc = '#'; // Natural note raised 1 = sharp
    else if (scaleAcc === '#') drawAcc = 'x'; // Sharp note raised 1 = double sharp
  } else if (diff === -1) {
    if (scaleAcc === '#') drawAcc = '♮'; // Sharp note lowered 1 = natural
    else if (scaleAcc === '') drawAcc = 'b'; // Natural note lowered 1 = flat
    else if (scaleAcc === 'b') drawAcc = 'bb'; // Flat note lowered 1 = double flat
  }

  const octave = spelledOctave(midi, letter);
  // Display name mirrors the accidental actually drawn on the staff, so a
  // natural in a sharp/flat key reads "E♮", never a misleading "Eb"/"E#"
  const ACC_DISPLAY = { '#': '#', 'b': 'b', '♮': '♮', 'x': '𝄪', 'bb': '𝄫' };
  return {
    letter: letter,
    accidental: drawAcc,
    octave: octave,
    step: getStepForLetter(letter, octave),
    displayName: letter + (ACC_DISPLAY[drawAcc] || '')
  };
}

window.MusicStaff = MusicStaff;
window.getNoteSpelling = getNoteSpelling;
window.getScaleNotes = getScaleNotes;
