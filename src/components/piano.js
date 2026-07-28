// 49-Key Interactive Piano Keyboard Component (C2 - C6)
import { musicSynth } from '../audio/synth.js';
import { midiToNoteName, midiToSolfege } from '../theory/solfege.js';

export class PianoKeyboard {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.getElementById(container) : container;
    this.onNotePlay = options.onNotePlay || null;
    this.onNoteStop = options.onNoteStop || null;

    this.activeMidis = new Set();
    this.isMouseDown = false;
    this.currentKeySignature = 'C_maj';
    this.currentSolfegeSystem = 'major';

    // PC Keyboard Mappings (Octave 4 - Middle C)
    this.keyMap = {
      'a': 60, // C4
      'w': 61, // C#4
      's': 62, // D4
      'e': 63, // D#4
      'd': 64, // E4
      'f': 65, // F4
      't': 66, // F#4
      'g': 67, // G4
      'y': 68, // G#4
      'h': 69, // A4
      'u': 70, // A#4
      'j': 71, // B4
      'k': 72, // C5
      'o': 73, // C#5
      'l': 74, // D5
      'p': 75, // D#5
      ';': 76  // E5
    };
  }

  setKeySignature(keyKey) {
    this.currentKeySignature = keyKey;
  }

  setSolfegeSystem(system) {
    this.currentSolfegeSystem = system;
  }

  render() {
    if (!this.container) return;

    let keysHTML = '';
    // Build 49 keys (MIDI 36 / C2 to MIDI 84 / C6)
    for (let midi = 36; midi <= 84; midi++) {
      const pitchClass = midi % 12;
      const isBlack = [1, 3, 6, 8, 10].includes(pitchClass);
      const octave = Math.floor(midi / 12) - 1;
      const noteName = midiToNoteName(midi, 'C_maj');
      const isMiddleC = midi === 60;

      if (isBlack) {
        keysHTML += `<div class="piano-key black-key" data-midi="${midi}"></div>`;
      } else {
        keysHTML += `
          <div class="piano-key white-key ${isMiddleC ? 'middle-c' : ''}" data-midi="${midi}">
            <span class="key-note-label">${noteName}</span>
          </div>
        `;
      }
    }

    this.container.innerHTML = `
      <div class="piano-wrapper">
        <div class="piano-octave-bar">
          <span class="octave-label">Octave Focus:</span>
          <div class="octave-pills">
            <button class="oct-pill active" data-range="all">All (C2 - C6)</button>
            <button class="oct-pill" data-range="oct23">Bass (C2 - B3)</button>
            <button class="oct-pill" data-range="oct34">Middle (C3 - B4)</button>
            <button class="oct-pill" data-range="oct45">Treble (C4 - C6)</button>
          </div>
        </div>
        <div class="piano-scroll-box">
          <div class="piano-keyboard">${keysHTML}</div>
        </div>
      </div>
    `;
    this.attachEvents();
  }

  attachEvents() {
    const keyboardEl = this.container.querySelector('.piano-keyboard');
    const scrollBox = this.container.querySelector('.piano-scroll-box');
    const octPills = this.container.querySelectorAll('.oct-pill');
    if (!keyboardEl) return;

    // Octave focus switching for mobile screens
    octPills.forEach(pill => {
      pill.addEventListener('click', () => {
        octPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const range = pill.dataset.range;
        if (!scrollBox) return;

        if (range === 'oct23') {
          scrollBox.scrollLeft = 0;
        } else if (range === 'oct34') {
          const middleKey = keyboardEl.querySelector('[data-midi="48"]');
          if (middleKey) scrollBox.scrollLeft = middleKey.offsetLeft - 20;
        } else if (range === 'oct45') {
          const c4Key = keyboardEl.querySelector('[data-midi="60"]');
          if (c4Key) scrollBox.scrollLeft = c4Key.offsetLeft - 20;
        } else {
          scrollBox.scrollLeft = 0;
        }
      });
    });

    const playKey = (midi) => {
      if (this.activeMidis.has(midi)) return;
      this.activeMidis.add(midi);

      const keyEl = keyboardEl.querySelector(`[data-midi="${midi}"]`);
      if (keyEl) keyEl.classList.add('active');

      musicSynth.playNote(midi);

      const noteName = midiToNoteName(midi, this.currentKeySignature);
      const solfege = midiToSolfege(midi, this.currentKeySignature, this.currentSolfegeSystem);

      if (this.onNotePlay) {
        this.onNotePlay(midi, noteName, solfege);
      }
    };

    const stopKey = (midi) => {
      if (!this.activeMidis.has(midi)) return;
      this.activeMidis.delete(midi);

      const keyEl = keyboardEl.querySelector(`[data-midi="${midi}"]`);
      if (keyEl) keyEl.classList.remove('active');

      musicSynth.stopNote(midi);

      if (this.onNoteStop) {
        this.onNoteStop(midi);
      }
    };

    const stopAllActiveKeys = () => {
      Array.from(this.activeMidis).forEach(midi => stopKey(midi));
    };

    // Mouse events
    keyboardEl.addEventListener('mousedown', (e) => {
      this.isMouseDown = true;
      const key = e.target.closest('.piano-key');
      if (key) {
        const midi = parseInt(key.dataset.midi, 10);
        playKey(midi);
      }
    });

    keyboardEl.addEventListener('mouseover', (e) => {
      if (!this.isMouseDown) return;
      const key = e.target.closest('.piano-key');
      if (key) {
        const midi = parseInt(key.dataset.midi, 10);
        playKey(midi);
      }
    });

    keyboardEl.addEventListener('mouseout', (e) => {
      if (!this.isMouseDown) return;
      const key = e.target.closest('.piano-key');
      if (key) {
        const midi = parseInt(key.dataset.midi, 10);
        stopKey(midi);
      }
    });

    window.addEventListener('mouseup', () => {
      if (this.isMouseDown) {
        this.isMouseDown = false;
        stopAllActiveKeys();
      }
    });

    // Touch events (TouchStart, TouchMove, TouchEnd, TouchCancel)
    const handleTouch = (e) => {
      e.preventDefault();
      const currentActive = new Set();
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        const el = document.elementFromPoint(touch.clientX, touch.clientY);
        const key = el ? el.closest('.piano-key') : null;
        if (key) {
          const midi = parseInt(key.dataset.midi, 10);
          currentActive.add(midi);
          playKey(midi);
        }
      }

      // Stop any keys no longer touched
      Array.from(this.activeMidis).forEach(midi => {
        if (!currentActive.has(midi)) {
          stopKey(midi);
        }
      });
    };

    keyboardEl.addEventListener('touchstart', handleTouch, { passive: false });
    keyboardEl.addEventListener('touchmove', handleTouch, { passive: false });
    keyboardEl.addEventListener('touchend', (e) => {
      if (e.touches.length === 0) {
        stopAllActiveKeys();
      } else {
        handleTouch(e);
      }
    }, { passive: false });
    keyboardEl.addEventListener('touchcancel', () => stopAllActiveKeys(), { passive: false });

    // PC Keyboard events
    window.addEventListener('keydown', (e) => {
      if (e.repeat || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      const k = e.key.toLowerCase();
      if (this.keyMap[k]) {
        playKey(this.keyMap[k]);
      }
    });

    window.addEventListener('keyup', (e) => {
      const k = e.key.toLowerCase();
      if (this.keyMap[k]) {
        stopKey(this.keyMap[k]);
      }
    });
  }
}

