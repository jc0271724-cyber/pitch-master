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
        <div class="piano-scroll-track">
          <span class="scroll-track-label">C2</span>
          <input
            type="range"
            class="piano-scroll-slider"
            min="0" max="1000" value="0"
            aria-label="Scroll keyboard left or right"
          />
          <span class="scroll-track-label">C6</span>
        </div>
      </div>
    `;
    this.attachEvents();
  }

  attachEvents() {
    const keyboardEl = this.container.querySelector('.piano-keyboard');
    const scrollBox = this.container.querySelector('.piano-scroll-box');
    const octPills = this.container.querySelectorAll('.oct-pill');
    const scrollSlider = this.container.querySelector('.piano-scroll-slider');
    if (!keyboardEl) return;

    // Helper: sync slider thumb to current scroll position
    const syncSliderToScroll = () => {
      if (!scrollBox || !scrollSlider) return;
      const maxScroll = scrollBox.scrollWidth - scrollBox.clientWidth;
      if (maxScroll <= 0) return;
      const pct = scrollBox.scrollLeft / maxScroll;
      scrollSlider.value = Math.round(pct * 1000);
    };

    // Slider → scroll box
    if (scrollSlider) {
      scrollSlider.addEventListener('input', () => {
        if (!scrollBox) return;
        const maxScroll = scrollBox.scrollWidth - scrollBox.clientWidth;
        scrollBox.scrollLeft = (parseInt(scrollSlider.value, 10) / 1000) * maxScroll;
      });
    }

    // Scroll box → slider (keeps thumb in sync when swiping or using pills)
    if (scrollBox) {
      scrollBox.addEventListener('scroll', syncSliderToScroll, { passive: true });
    }

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
        // Sync slider after pill-driven scroll
        setTimeout(syncSliderToScroll, 50);
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

    // Touch events — swipe-aware: horizontal swipes scroll the keyboard,
    // taps/vertical drags play notes.
    const SWIPE_THRESHOLD = 8; // px of horizontal movement before treating as scroll
    let touchStartX = 0;
    let touchStartY = 0;
    let isScrollSwipe = false;   // true when user is swiping horizontally to scroll
    let touchPlayActive = false; // true when user has started playing a key

    const playTouchKeys = (e) => {
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

    keyboardEl.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      touchStartX = t.clientX;
      touchStartY = t.clientY;
      isScrollSwipe = false;
      touchPlayActive = false;

      // Tentatively play the key on touch-down (instant response)
      const el = document.elementFromPoint(t.clientX, t.clientY);
      const key = el ? el.closest('.piano-key') : null;
      if (key) {
        touchPlayActive = true;
        e.preventDefault(); // prevent default only when on a key
        playTouchKeys(e);
      }
      // If not on a key, let event propagate naturally (don't prevent)
    }, { passive: false });

    keyboardEl.addEventListener('touchmove', (e) => {
      const t = e.touches[0];
      const dx = Math.abs(t.clientX - touchStartX);
      const dy = Math.abs(t.clientY - touchStartY);

      if (!isScrollSwipe && dx > SWIPE_THRESHOLD && dx > dy) {
        // User is swiping horizontally — switch to scroll mode, stop all notes
        isScrollSwipe = true;
        touchPlayActive = false;
        stopAllActiveKeys();
      }

      if (isScrollSwipe) {
        // Let the browser handle horizontal scroll natively — do NOT preventDefault
        return;
      }

      // Not a swipe — playing keys across the keyboard
      e.preventDefault();
      playTouchKeys(e);
    }, { passive: false });

    keyboardEl.addEventListener('touchend', (e) => {
      if (isScrollSwipe) {
        // Ended a scroll swipe, nothing to do for notes
        isScrollSwipe = false;
        return;
      }
      if (e.touches.length === 0) {
        stopAllActiveKeys();
      } else {
        playTouchKeys(e);
      }
    }, { passive: false });

    keyboardEl.addEventListener('touchcancel', () => {
      isScrollSwipe = false;
      touchPlayActive = false;
      stopAllActiveKeys();
    }, { passive: false });

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

