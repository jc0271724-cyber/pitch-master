// Key Signature database
const KEY_DATABASE = {
  'C_maj':  { name: 'C Major / A Minor', type: 'sharp', count: 0, rootMajor: 0, rootMinor: 9 },
  'G_maj':  { name: 'G Major / E Minor', type: 'sharp', count: 1, rootMajor: 7, rootMinor: 4 },
  'D_maj':  { name: 'D Major / B Minor', type: 'sharp', count: 2, rootMajor: 2, rootMinor: 11 },
  'A_maj':  { name: 'A Major / F# Minor', type: 'sharp', count: 3, rootMajor: 9, rootMinor: 6 },
  'E_maj':  { name: 'E Major / C# Minor', type: 'sharp', count: 4, rootMajor: 4, rootMinor: 1 },
  'B_maj':  { name: 'B Major / G# Minor', type: 'sharp', count: 5, rootMajor: 11, rootMinor: 8 },
  'F#_maj': { name: 'F# Major / D# Minor', type: 'sharp', count: 6, rootMajor: 6, rootMinor: 3 },
  'C#_maj': { name: 'C# Major / A# Minor', type: 'sharp', count: 7, rootMajor: 1, rootMinor: 10 },
  'F_maj':  { name: 'F Major / D Minor', type: 'flat', count: 1, rootMajor: 5, rootMinor: 2 },
  'Bb_maj': { name: 'Bb Major / G Minor', type: 'flat', count: 2, rootMajor: 10, rootMinor: 7 },
  'Eb_maj': { name: 'Eb Major / C Minor', type: 'flat', count: 3, rootMajor: 3, rootMinor: 0 },
  'Ab_maj': { name: 'Ab Major / F Minor', type: 'flat', count: 4, rootMajor: 8, rootMinor: 5 },
  'Db_maj': { name: 'Db Major / Bb Minor', type: 'flat', count: 5, rootMajor: 1, rootMinor: 10 },
  'Gb_maj': { name: 'Gb Major / Eb Minor', type: 'flat', count: 6, rootMajor: 6, rootMinor: 3 },
  'Cb_maj': { name: 'Cb Major / Ab Minor', type: 'flat', count: 7, rootMajor: 11, rootMinor: 8 }
};

// Computer Keyboard to Piano MIDI Note mappings starting at middle C (C4 = 60)
const KEYBOARD_MAP = {
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
  ';': 76, // E5
  "'": 77  // F5
};

// Note duration values in beats (4/4 time)
const DUR_BEATS = { w: 4, dh: 3, h: 2, dq: 1.5, q: 1, e: 0.5 };

// Words the counting voice speaks for each count syllable
const COUNT_WORDS = { '1': 'one', '2': 'two', '3': 'three', '4': 'four', '&': 'and' };

// One-measure rhythm patterns per difficulty level ('ee' = beamed pair of eighths)
const RHYTHM_L1 = [
  ['q', 'q', 'q', 'q'], ['h', 'h'], ['q', 'q', 'h'], ['h', 'q', 'q'], ['q', 'h', 'q'], ['w']
];
const RHYTHM_L2 = RHYTHM_L1.concat([
  ['ee', 'q', 'q', 'q'], ['q', 'ee', 'q', 'q'], ['q', 'q', 'ee', 'q'], ['q', 'q', 'q', 'ee'],
  ['ee', 'ee', 'h'], ['dh', 'q'], ['q', 'dh'], ['h', 'ee', 'q']
]);
const RHYTHM_L3 = RHYTHM_L2.concat([
  ['dq', 'e', 'q', 'q'], ['q', 'q', 'dq', 'e'], ['dq', 'e', 'h'], ['q', 'dq', 'e', 'q'],
  ['e', 'q', 'e', 'h'], ['dq', 'e', 'ee', 'q']
]);
const MEASURE_PATTERNS = { 1: RHYTHM_L1, 2: RHYTHM_L2, 3: RHYTHM_L3 };

// Global Shared AudioContext to prevent conflicts between synthesizer and mic tracker
window.getSharedAudioContext = function() {
  if (!window.sharedAudioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    window.sharedAudioContext = new AudioContextClass();
  }
  return window.sharedAudioContext;
};

class AppController {
  constructor() {
    this.staff = null;
    this.pitchTracker = null;
    
    // State
    this.currentKeyId = 'C_maj';
    this.scaleMode = 'major'; // 'major', 'minor-la', 'minor-do'
    this.mode = 'free'; // 'free', 'melody', 'practice'
    this.microphoneActive = false;

    // Melody sight-reading state
    this.melody = null;
    this.melodyIndex = 0;
    this.melodyDoneCount = 0;
    this.melodyBusy = false; // true during playback/chime so mic input is ignored
    this.melodyPlaybackActive = false;
    this.melodyMatchStart = null;
    this.melodyAccum = 0;
    this.melodyLast = null;
    this.melodyGraceTimer = null;
    this.melodyRequiredDuration = 600; // ms to hold each melody note
    this.melodyLevel = 1;   // rhythm difficulty: 1, 2, 3
    this.melodyTempo = 84;  // BPM for playback and the counting voice
    this.playTimers = [];   // pending playback/count timeouts, cleared on stop
    this.botSinging = false;    // Maestro is demonstrating — mic input is ignored
    this.maestroLastMidi = null; // last note the theory guide explained
    
    // Game stats
    this.score = 0;
    this.targetMidi = null;
    this.matchStartTime = null;
    this.matchRequiredDuration = 1200; // ms to hold pitch
    this.matchTimerId = null;
    this.targetSuccessActive = false;
    
    // Choir Teacher & Performance Tracking
    this.teacher = new window.ChoirTeacher();
    this.performanceLog = [];
    this.activeWarmupIndex = 0;
    this.activeSATBPiece = null;
    this.userVoicePart = 'tenor';
    
    // Pipe Organ Drone ("The Pipe Place") state
    this.organActivePipes = new Set();

    // Rhythm Trainer state
    this.rhythmBpm = 84;
    this.rhythmPitches = false;
    this.rhythmLevel = 1;
    this.rhythmScore = 0;
    this.rhythmStreak = 0;
    this.rhythmMetronomeTimer = null;
    this.rhythmBeatIndex = 0;
    this.rhythmLastBeatTime = 0;
    this.rhythmPattern = [];

    // Keep track of keys pressed to prevent repeating trigger on keydown
    this.pressedKeys = new Set();
  }

  init() {
    // Initialize staff renderer
    this.staff = new window.MusicStaff('music-staff');
    this.staff.draw();

    // Initialize pitch tracker
    this.pitchTracker = new window.PitchTracker();

    // Populate Warm-up and SATB dropdowns
    this.initDropdowns();

    // Bind UI elements
    this.bindEvents();
    
    // Update key selections & piano key badges
    this.updateKeySignature();
    this.updatePianoKeyLabels();
  }

  initDropdowns() {
    const warmupSelect = document.getElementById('select-warmup-routine');
    if (warmupSelect) {
      warmupSelect.innerHTML = window.WARMUP_ROUTINES.map((r, i) => `<option value="${i}">${r.name}</option>`).join('');
      this.updateWarmupDisplay();
      warmupSelect.addEventListener('change', (e) => {
        this.activeWarmupIndex = parseInt(e.target.value);
        this.updateWarmupDisplay();
      });
    }

    const satbSelect = document.getElementById('select-satb-piece');
    if (satbSelect) {
      satbSelect.innerHTML = window.SATB_PIECES.map(p => `<option value="${p.id}">${p.title} (${p.timeSig})</option>`).join('');
      satbSelect.addEventListener('change', (e) => {
        this.activeSATBPiece = window.SATB_PIECES.find(p => p.id === e.target.value);
      });
      this.activeSATBPiece = window.SATB_PIECES[0];
    }

    const voiceSelect = document.getElementById('select-user-voice');
    if (voiceSelect) {
      voiceSelect.addEventListener('change', (e) => {
        this.userVoicePart = e.target.value;
      });
    }

    // SATB volume sliders
    ['soprano', 'alto', 'tenor', 'bass'].forEach(part => {
      const slider = document.getElementById(`vol-${part}`);
      if (slider) {
        slider.addEventListener('input', (e) => {
          window.synth.setSATBVolume(part, parseFloat(e.target.value));
        });
      }
    });
  }

  updateWarmupDisplay() {
    const r = window.WARMUP_ROUTINES[this.activeWarmupIndex];
    if (!r) return;
    const descEl = document.getElementById('lbl-warmup-desc');
    if (descEl) descEl.textContent = `${r.description}. Tip: ${r.tip}`;
  }

  bindEvents() {
    // Key signature selectors
    document.getElementById('key-select').addEventListener('change', (e) => {
      this.currentKeyId = e.target.value;
      this.updateKeySignature();
    });

    document.getElementById('mode-select').addEventListener('change', (e) => {
      this.scaleMode = e.target.value;
      this.updateKeySignature();
    });

    // Speech toggle button
    const speechBtn = document.getElementById('btn-toggle-speech');
    if (speechBtn) {
      speechBtn.addEventListener('click', () => {
        this.teacher.speechEnabled = !this.teacher.speechEnabled;
        speechBtn.classList.toggle('active', this.teacher.speechEnabled);
        document.getElementById('lbl-speech-status').textContent = this.teacher.speechEnabled ? 'ON' : 'OFF';
        if (this.teacher.speechEnabled) {
          this.teacher.speak("Speech feedback enabled!");
        } else {
          this.teacher.stopSpeech();
        }
      });
    }

    // Mode toggles
    const TAB_IDS = { 
      free: 'tab-freeplay', 
      warmup: 'tab-warmup', 
      satb: 'tab-satb', 
      academy: 'tab-academy', 
      practice: 'tab-practice',
      organ: 'tab-organ',
      rhythm: 'tab-rhythm'
    };
    Object.entries(TAB_IDS).forEach(([mode, id]) => {
      const btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', () => this.setMode(mode));
    });
    this.tabIds = TAB_IDS;

    // Organ Drone controls ("The Pipe Place")
    const organStopSelect = document.getElementById('select-organ-stop');
    if (organStopSelect) {
      organStopSelect.addEventListener('change', (e) => {
        window.synth.setOrganStop(e.target.value);
      });
    }

    const clearOrganBtn = document.getElementById('btn-clear-organ');
    if (clearOrganBtn) clearOrganBtn.addEventListener('click', () => this.clearOrganPipes());

    const chordC = document.getElementById('btn-organ-chord-c');
    if (chordC) chordC.addEventListener('click', () => this.playOrganChord([60, 64, 67])); // C4, E4, G4

    const chordG = document.getElementById('btn-organ-chord-g');
    if (chordG) chordG.addEventListener('click', () => this.playOrganChord([55, 59, 62, 67])); // G3, B3, D4, G4

    const chordF = document.getElementById('btn-organ-chord-f');
    if (chordF) chordF.addEventListener('click', () => this.playOrganChord([53, 57, 60, 65])); // F3, A3, C4, F4

    const chordAm = document.getElementById('btn-organ-chord-am');
    if (chordAm) chordAm.addEventListener('click', () => this.playOrganChord([57, 60, 64])); // A3, C4, E4

    // Rhythm Trainer controls
    const metroBtn = document.getElementById('btn-rhythm-metronome');
    if (metroBtn) metroBtn.addEventListener('click', () => this.toggleRhythmMetronome());

    const bpmSlider = document.getElementById('rhythm-bpm-slider');
    if (bpmSlider) {
      bpmSlider.addEventListener('input', (e) => {
        this.rhythmBpm = parseInt(e.target.value);
        document.getElementById('lbl-rhythm-bpm').textContent = this.rhythmBpm;
        if (this.rhythmMetronomeTimer) {
          this.toggleRhythmMetronome(); // restart metronome at new tempo
          this.toggleRhythmMetronome();
        }
      });
    }

    const pitchesToggle = document.getElementById('toggle-rhythm-pitches');
    if (pitchesToggle) {
      pitchesToggle.addEventListener('change', (e) => {
        this.rhythmPitches = e.target.checked;
        if (this.mode === 'rhythm') this.generateRhythmExercise();
      });
    }

    const rhythmLevelSelect = document.getElementById('rhythm-level-select');
    if (rhythmLevelSelect) {
      rhythmLevelSelect.addEventListener('change', (e) => {
        this.rhythmLevel = parseInt(e.target.value);
        if (this.mode === 'rhythm') this.generateRhythmExercise();
      });
    }

    const tapBtn = document.getElementById('btn-tap-beat');
    if (tapBtn) tapBtn.addEventListener('click', () => this.handleRhythmTap());

    // Warm-up buttons
    const startWarmupBtn = document.getElementById('btn-start-warmup');
    if (startWarmupBtn) startWarmupBtn.addEventListener('click', () => this.startWarmup());
    const demoWarmupBtn = document.getElementById('btn-demo-warmup');
    if (demoWarmupBtn) demoWarmupBtn.addEventListener('click', () => this.demoWarmup());

    // SATB buttons
    const playSatbBtn = document.getElementById('btn-play-satb');
    if (playSatbBtn) playSatbBtn.addEventListener('click', () => this.playSATBPiece());
    const singSatbBtn = document.getElementById('btn-sing-satb');
    if (singSatbBtn) singSatbBtn.addEventListener('click', () => this.singSATBPiece());

    // Report modal close button
    const closeReportBtn = document.getElementById('btn-close-report');
    if (closeReportBtn) closeReportBtn.addEventListener('click', () => this.hideReportCard());


    // Mic toggle
    const micBtn = document.getElementById('btn-mic');
    micBtn.addEventListener('click', () => {
      this.toggleMicrophone();
    });

    // Play Target Button — Maestro sings the target in solfege at pitch
    const playTargetBtn = document.getElementById('btn-play-target');
    playTargetBtn.addEventListener('click', () => {
      if (this.targetMidi) {
        this.botSinging = true; // the mic must not match Maestro's own voice
        window.synth.singSyllable(this.targetMidi, this.calculateSolfege(this.targetMidi), 800);
        setTimeout(() => { this.botSinging = false; }, 1000);
      }
    });

    // Maestro demonstration buttons
    document.getElementById('btn-sing-scale').addEventListener('click', () => this.singScale());
    document.getElementById('btn-sing-triad').addEventListener('click', () => this.singTriad());
    const demoPianoBtn = document.getElementById('btn-demo-piano-scale');
    if (demoPianoBtn) demoPianoBtn.addEventListener('click', () => this.demonstrateScaleOnPiano());

    // Melody mode buttons
    document.getElementById('btn-play-melody').addEventListener('click', () => this.playMelody());
    document.getElementById('btn-count-melody').addEventListener('click', () => this.countMelody());
    document.getElementById('btn-sing-melody').addEventListener('click', () => this.singMelody());
    document.getElementById('melody-level').addEventListener('change', (e) => {
      this.melodyLevel = parseInt(e.target.value);
      if (this.mode === 'melody') this.generateMelody();
    });
    document.getElementById('melody-tempo').addEventListener('change', (e) => {
      this.melodyTempo = parseInt(e.target.value);
    });
    document.getElementById('btn-new-melody').addEventListener('click', () => {
      // Also acts as a stop button: generateMelody cancels any running playback/count/sing
      if (this.mode === 'melody') this.generateMelody();
    });
    document.getElementById('btn-hear-current').addEventListener('click', () => {
      if (!this.melody || this.melodyIndex >= this.melody.length || this.melodyPlaybackActive) return;
      const current = this.melody[this.melodyIndex];
      this.melodyBusy = true; // keep the mic from "hearing" the speaker and auto-advancing
      window.synth.singSyllable(current.midi, current.solfege, 800);
      setTimeout(() => { if (!this.melodyPlaybackActive) this.melodyBusy = false; }, 1100);
    });

    // Volume Slider
    const volumeSlider = document.getElementById('volume-slider');
    volumeSlider.addEventListener('input', (e) => {
      window.synth.setVolume(parseFloat(e.target.value));
    });

    // Bind Piano Keys with Pointer Events: supports click, drag-glissando and multi-touch
    const keyboard = document.querySelector('.piano-keyboard');
    this.pointerNotes = new Map(); // pointerId -> sounding midi note

    const keyFromPoint = (x, y) => {
      const el = document.elementFromPoint(x, y);
      return el ? el.closest('.piano-key') : null;
    };

    const pointerPlay = (pointerId, keyEl) => {
      const midi = parseInt(keyEl.getAttribute('data-midi'));
      const prev = this.pointerNotes.get(pointerId);
      if (prev === midi) return;
      if (prev !== undefined) this.triggerPianoNoteStop(prev);
      this.pointerNotes.set(pointerId, midi);
      this.triggerPianoNoteStart(midi);
    };

    const pointerRelease = (e) => {
      const prev = this.pointerNotes.get(e.pointerId);
      if (prev !== undefined) {
        this.triggerPianoNoteStop(prev);
        this.pointerNotes.delete(e.pointerId);
      }
    };

    keyboard.addEventListener('pointerdown', (e) => {
      const keyEl = e.target.closest('.piano-key');
      if (!keyEl) return;
      e.preventDefault();
      pointerPlay(e.pointerId, keyEl);
    });

    keyboard.addEventListener('pointermove', (e) => {
      if (!this.pointerNotes.has(e.pointerId)) return;
      const keyEl = keyFromPoint(e.clientX, e.clientY);
      if (keyEl) pointerPlay(e.pointerId, keyEl);
    });

    // Release on window so notes stop even when the pointer is lifted outside the keyboard
    window.addEventListener('pointerup', pointerRelease);
    window.addEventListener('pointercancel', pointerRelease);

    // Bind Computer Keyboard
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (t && (t.tagName === 'SELECT' || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      if (e.code === 'Space' && this.mode === 'rhythm') {
        e.preventDefault();
        this.handleRhythmTap();
        return;
      }
      const char = e.key.toLowerCase();
      if (KEYBOARD_MAP[char] && !this.pressedKeys.has(char)) {
        const midi = KEYBOARD_MAP[char];
        this.pressedKeys.add(char);
        this.triggerPianoNoteStart(midi);
      }
    });

    window.addEventListener('keyup', (e) => {
      const char = e.key.toLowerCase();
      if (KEYBOARD_MAP[char]) {
        const midi = KEYBOARD_MAP[char];
        this.pressedKeys.delete(char);
        this.triggerPianoNoteStop(midi);
      }
    });

    // Wire up pitch detection callbacks
    this.pitchTracker.onPitchDetected = (freq, midi, deviation) => {
      if (this.targetSuccessActive || this.melodyBusy || this.botSinging) return; // Wait during chimes/playback/demos

      // Maestro explains whatever is being sung
      this.explainNote(midi);

      // Compute Solfege name
      const spelling = window.getNoteSpelling(midi, this.staff.keyConfig);
      const solfege = this.calculateSolfege(midi);
      
      // Draw sung note on staff
      this.staff.setSungNote(midi, deviation);
      
      // Update Realtime Dashboard UI
      document.getElementById('lbl-voice-note').textContent = `${spelling.displayName}${spelling.octave}`;
      document.getElementById('lbl-voice-solfege').textContent = solfege || '—';
      document.getElementById('lbl-voice-freq').textContent = `${Math.round(freq)} Hz`;
      document.getElementById('lbl-voice-cents').textContent = `${deviation > 0 ? '+' : ''}${Math.round(deviation)}¢`;

      // Tuner Needle rotation in UI
      const needle = document.getElementById('tuner-needle');
      if (needle) {
        // limit dev between -50 and 50 cents, map to -45deg to 45deg rotation
        const deg = Math.max(-45, Math.min(45, (deviation / 50) * 45));
        needle.style.transform = `translateX(-50%) rotate(${deg}deg)`;
      }

      // Live Maestro Coaching
      const targetMidi = this.mode === 'practice' ? this.targetMidi : (this.melody && this.melody[this.melodyIndex] ? this.melody[this.melodyIndex].midi : null);
      if (targetMidi) {
        const targetSpelling = window.getNoteSpelling(targetMidi, this.staff.keyConfig);
        const tip = this.teacher.provideLiveCoaching(deviation, `${targetSpelling.displayName}${targetSpelling.octave}`, `${spelling.displayName}${spelling.octave}`);
        if (tip) {
          const tipEl = document.getElementById('lbl-maestro-tip');
          if (tipEl) tipEl.textContent = `"${tip.text}"`;
        }
      }

      // Record performance sample
      this.performanceLog.push({
        targetMidi: targetMidi || midi,
        detectedMidi: midi,
        cents: deviation,
        matched: targetMidi ? (targetMidi === midi && Math.abs(deviation) <= 30) : true
      });

      // Handle target matching logic
      if (this.mode === 'practice' && this.targetMidi !== null) {
        const devThreshold = 30; // within 30 cents
        if (midi === this.targetMidi && Math.abs(deviation) <= devThreshold) {
          this.handlePitchMatching(true);
        } else {
          this.handlePitchMatching(false);
        }
      } else if (this.mode === 'melody') {
        this.handleMelodyPitch(midi, deviation);
      }
    };

    this.pitchTracker.onSilent = () => {
      this.staff.setSungNote(null);
      document.getElementById('lbl-voice-note').textContent = '—';
      document.getElementById('lbl-voice-solfege').textContent = '—';
      document.getElementById('lbl-voice-freq').textContent = '—';
      document.getElementById('lbl-voice-cents').textContent = '0¢';

      const needle = document.getElementById('tuner-needle');
      if (needle) needle.style.transform = 'translateX(-50%) rotate(0deg)';

      if (this.mode === 'practice') {
        this.handlePitchMatching(false);
      } else if (this.mode === 'melody') {
        this.handleMelodyPitch(null, 0);
      }
    };
  }

  // --- Warm-up Engine ---
  startWarmup() {
    const routine = window.WARMUP_ROUTINES[this.activeWarmupIndex];
    if (!routine) return;
    this.teacher.speak(`Starting warm-up: ${routine.name}. ${routine.tip}`, true);
    
    // Set notes as melody on staff
    const melodyNotes = routine.notes.map((midi, i) => ({
      midi,
      solfege: routine.syllables[i] || 'Do',
      beats: 1,
      kind: 'q'
    }));
    this.setMode('melody');
    this.staff.setMelody(melodyNotes);
    this.melody = this.staff.melody;
  }

  demoWarmup() {
    const routine = window.WARMUP_ROUTINES[this.activeWarmupIndex];
    if (!routine) return;
    this.botSinging = true;
    this.teacher.speak(`Maestro Demonstration for ${routine.name}`);
    
    routine.notes.forEach((midi, i) => {
      setTimeout(() => {
        window.synth.singSyllable(midi, routine.syllables[i] || 'la', 700);
      }, i * 800 + 1200);
    });
    
    setTimeout(() => {
      this.botSinging = false;
    }, routine.notes.length * 800 + 1500);
  }

  // --- SATB Sectional Engine ---
  playSATBPiece() {
    if (!this.activeSATBPiece) return;
    const piece = this.activeSATBPiece;
    this.botSinging = true;
    this.teacher.speak(`Playing SATB arrangement of ${piece.title}`, true);

    const parts = piece.parts;
    const durMs = 60000 / piece.tempo;

    piece.durations.forEach((d, i) => {
      setTimeout(() => {
        ['soprano', 'alto', 'tenor', 'bass'].forEach(part => {
          if (parts[part] && parts[part][i]) {
            window.synth.playSATBNote(part, parts[part][i], durMs * 0.9);
          }
        });
      }, i * durMs);
    });

    setTimeout(() => {
      this.botSinging = false;
    }, piece.durations.length * durMs + 500);
  }

  singSATBPiece() {
    if (!this.activeSATBPiece) return;
    const piece = this.activeSATBPiece;
    const myNotes = piece.parts[this.userVoicePart] || piece.parts.soprano;
    
    this.teacher.speak(`Sing your ${this.userVoicePart.toUpperCase()} part for ${piece.title}. Maestro will play background choir accompaniment!`, true);
    
    // Render user's part on staff
    const melodyNotes = myNotes.map((midi, i) => ({
      midi,
      solfege: this.calculateSolfege(midi),
      beats: 1,
      kind: 'q'
    }));
    
    this.staff.setMelody(melodyNotes);
    this.melody = this.staff.melody;
    this.playSATBPiece();
  }

  // --- Performance Report Card & Confetti ---
  showReportCard(levelName = 'Lesson Complete') {
    const report = this.teacher.evaluatePerformance(this.performanceLog);
    
    document.getElementById('report-level-name').textContent = levelName;
    document.getElementById('report-grade-circle').textContent = report.grade;
    document.getElementById('report-title').textContent = report.title;
    document.getElementById('report-summary').textContent = report.summary;
    document.getElementById('report-accuracy').textContent = `${report.accuracy}%`;
    document.getElementById('report-cents').textContent = `±${report.avgCents}¢`;
    document.getElementById('report-notes').textContent = `${report.matchedNotes} / ${report.totalNotes}`;
    document.getElementById('report-recommendation').textContent = report.recommendation;

    const modal = document.getElementById('report-modal');
    if (modal) modal.classList.remove('hidden');

    if (report.grade === 'S' || report.grade === 'A+' || report.grade === 'A') {
      window.synth.playCelebrationFanfare();
      this.launchConfetti();
      this.teacher.speak(`Congratulations! Grade ${report.grade}. ${report.title}!`);
    } else {
      this.teacher.speak(`Lesson finished. Grade ${report.grade}. Keep practicing!`);
    }
  }

  hideReportCard() {
    const modal = document.getElementById('report-modal');
    if (modal) modal.classList.add('hidden');
    this.performanceLog = [];
  }

  launchConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth || 500;
    canvas.height = canvas.offsetHeight || 400;

    const particles = Array.from({ length: 70 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 6 + 3,
      color: ['#4f46e5', '#ec4899', '#10b981', '#f59e0b', '#3b82f6'][Math.floor(Math.random() * 5)],
      vx: Math.random() * 2 - 1,
      vy: Math.random() * 3 + 2
    }));

    let animId;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        p.x += p.vx;
        p.y += p.vy;
      });
      if (particles.some(p => p.y < canvas.height)) {
        animId = requestAnimationFrame(render);
      }
    };
    render();
  }


  triggerPianoNoteStart(midi) {
    if (this.mode === 'organ') {
      const keyEl = document.querySelector(`.piano-key[data-midi="${midi}"]`);
      if (this.organActivePipes.has(midi)) {
        window.synth.stopOrganPipe(midi);
        this.organActivePipes.delete(midi);
        if (keyEl) keyEl.classList.remove('active');
      } else {
        window.synth.playOrganPipe(midi);
        this.organActivePipes.add(midi);
        if (keyEl) keyEl.classList.add('active');
      }
      this.updateOrganStatus();
      this.explainNote(midi);
      return;
    }

    window.synth.playNote(midi);
    
    // Highlight piano key in UI
    const keyEl = document.querySelector(`.piano-key[data-midi="${midi}"]`);
    if (keyEl) keyEl.classList.add('active');

    // Spell note and compute solfege for display
    const spelling = window.getNoteSpelling(midi, this.staff.keyConfig);
    const solfege = this.calculateSolfege(midi);

    // Update piano note label
    document.getElementById('lbl-piano-note').textContent = `${spelling.displayName}${spelling.octave}`;
    document.getElementById('lbl-piano-solfege').textContent = solfege || '—';

    // Draw on staff with solfege label (in melody mode the staff shows the melody instead)
    this.staff.setPianoNote(midi, solfege);

    // Maestro explains the played note
    this.explainNote(midi);

    // In melody mode, playing the correct piano key also advances the exercise
    if (this.mode === 'melody' && this.melody && !this.melodyBusy &&
        this.melodyIndex < this.melody.length && midi === this.melody[this.melodyIndex].midi) {
      this.advanceMelody();
    }
  }

  triggerPianoNoteStop(midi) {
    if (this.mode === 'organ') {
      // In Pipe Organ Drone mode, notes hold sustained pitches until toggled or cleared
      return;
    }

    window.synth.stopNote(midi);
    
    // Remove UI highlight
    const keyEl = document.querySelector(`.piano-key[data-midi="${midi}"]`);
    if (keyEl) keyEl.classList.remove('active');

    this.staff.setPianoNote(null);
  }

  updateKeySignature() {
    const keyData = KEY_DATABASE[this.currentKeyId];
    this.staff.setKey(keyData.type, keyData.count);
    this.updateMaestroCard();
    this.updatePianoKeyLabels();
    
    // Regenerate exercises so they stay diatonic in the new key signature
    if (this.mode === 'practice') {
      this.generateNewTarget();
    } else if (this.mode === 'melody') {
      this.generateMelody();
    } else if (this.mode === 'rhythm') {
      this.generateRhythmExercise();
    }
  }

  setMode(mode) {
    // Stop all active synth audio when changing tabs
    window.synth.stopAllNotes();

    this.mode = mode;
    if (this.tabIds) {
      Object.entries(this.tabIds).forEach(([m, id]) => {
        const btn = document.getElementById(id);
        if (btn) btn.classList.toggle('active', m === mode);
      });
    }

    const practicePanel = document.getElementById('practice-panel');
    const melodyPanel = document.getElementById('melody-panel');
    const warmupPanel = document.getElementById('warmup-panel');
    const satbPanel = document.getElementById('satb-panel');
    const organPanel = document.getElementById('organ-panel');
    const rhythmPanel = document.getElementById('rhythm-panel');

    if (practicePanel) practicePanel.classList.toggle('hidden', mode !== 'practice');
    if (melodyPanel) melodyPanel.classList.toggle('hidden', mode !== 'melody' && mode !== 'academy');
    if (warmupPanel) warmupPanel.classList.toggle('hidden', mode !== 'warmup');
    if (satbPanel) satbPanel.classList.toggle('hidden', mode !== 'satb');
    if (organPanel) organPanel.classList.toggle('hidden', mode !== 'organ');
    if (rhythmPanel) rhythmPanel.classList.toggle('hidden', mode !== 'rhythm');

    // Clear state belonging to the other modes
    if (mode !== 'practice') {
      this.staff.setTargetNote(null);
      this.targetMidi = null;
      this.resetMatchingState();
    }
    if (mode !== 'melody' && mode !== 'academy' && mode !== 'warmup' && mode !== 'satb') {
      this.stopMelodyPlayback();
      if (mode !== 'rhythm') {
        this.staff.setMelody(null);
        this.melody = null;
      }
      this.resetMelodyMatchState();
    }
    if (mode !== 'organ') {
      this.clearOrganPipes();
    }
    if (mode !== 'rhythm' && this.rhythmMetronomeTimer) {
      this.toggleRhythmMetronome();
    }

    if (mode === 'practice') this.generateNewTarget();
    if (mode === 'melody' || mode === 'academy') this.generateMelody();
    if (mode === 'rhythm') this.generateRhythmExercise();
  }


  getScalePitchClasses() {
    const keyData = KEY_DATABASE[this.currentKeyId];
    let doRoot = 0;
    if (this.scaleMode === 'major' || this.scaleMode === 'minor-la') {
      doRoot = keyData.rootMajor;
    } else { // minor-do
      doRoot = keyData.rootMinor;
    }
    
    let intervals;
    if (this.scaleMode === 'major' || this.scaleMode === 'minor-la') {
      intervals = [0, 2, 4, 5, 7, 9, 11]; // Major diatonic steps
    } else {
      intervals = [0, 2, 3, 5, 7, 8, 10]; // Natural Minor diatonic steps
    }
    
    return intervals.map(inter => (doRoot + inter) % 12);
  }

  generateNewTarget() {
    const scalePCs = this.getScalePitchClasses();
    const comfortableRange = [];
    
    // Scan comfortable singing range: F3 (53) to C5 (72)
    for (let midi = 53; midi <= 72; midi++) {
      if (scalePCs.includes(midi % 12)) {
        comfortableRange.push(midi);
      }
    }
    
    const range = comfortableRange.length > 0 ? comfortableRange : [60, 62, 64, 65, 67, 69, 71, 72];
    let newTarget;
    do {
      newTarget = range[Math.floor(Math.random() * range.length)];
    } while (newTarget === this.targetMidi);

    this.targetMidi = newTarget;
    this.updateTargetDisplay();
    this.resetMatchingState();
  }

  updateTargetDisplay() {
    if (!this.targetMidi) return;
    
    const spelling = window.getNoteSpelling(this.targetMidi, this.staff.keyConfig);
    const solfege = this.calculateSolfege(this.targetMidi);
    
    this.staff.setTargetNote(this.targetMidi, solfege);

    document.getElementById('lbl-target-note').textContent = `${spelling.displayName}${spelling.octave}`;
    document.getElementById('lbl-target-solfege').textContent = solfege || '—';
    document.getElementById('target-match-ring').style.strokeDashoffset = '220'; // reset ring
  }

  async toggleMicrophone() {
    const micBtn = document.getElementById('btn-mic');
    
    if (this.microphoneActive) {
      this.pitchTracker.stop();
      this.microphoneActive = false;
      micBtn.classList.remove('active');
      micBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
        Start Microphone
      `;
    } else {
      try {
        await this.pitchTracker.start(window.getSharedAudioContext());
        this.microphoneActive = true;
        micBtn.classList.add('active');
        micBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
          Mute Microphone
        `;
      } catch (err) {
        alert("Microphone access is required for pitch feedback. Please allow microphone permissions.");
      }
    }
  }

  resetMatchingState() {
    if (this.resetTimerId) {
      clearTimeout(this.resetTimerId);
      this.resetTimerId = null;
    }
    this.matchStartTime = null;
    this.matchAccumulatedTime = 0;
    this.lastMatchTime = null;
    const ring = document.getElementById('target-match-ring');
    const targetCard = document.getElementById('target-card');
    if (targetCard) targetCard.classList.remove('matching');
    if (ring) ring.style.strokeDashoffset = '220';
  }

  // Pitch matching status checker with 400ms grace window
  handlePitchMatching(isMatching) {
    if (this.matchAccumulatedTime === undefined) this.matchAccumulatedTime = 0;
    if (this.resetTimerId === undefined) this.resetTimerId = null;
    if (this.lastMatchTime === undefined) this.lastMatchTime = null;

    const ring = document.getElementById('target-match-ring');
    const targetCard = document.getElementById('target-card');

    if (isMatching) {
      // Clear any pending reset grace timer
      if (this.resetTimerId) {
        clearTimeout(this.resetTimerId);
        this.resetTimerId = null;
      }

      if (this.matchStartTime === null) {
        this.matchStartTime = Date.now();
        this.lastMatchTime = Date.now();
        this.matchAccumulatedTime = 0;
        targetCard.classList.add('matching');
      }

      const now = Date.now();
      const dt = now - this.lastMatchTime;
      this.lastMatchTime = now;

      // Accumulate matching time (cap dt to prevent large jumps if there is context switching)
      this.matchAccumulatedTime += Math.min(dt, 200);

      const progress = Math.min(1.0, this.matchAccumulatedTime / this.matchRequiredDuration);
      const offset = 220 - (progress * 220);
      if (ring) ring.style.strokeDashoffset = offset;

      if (progress >= 1.0) {
        this.handleSuccess();
      }
    } else {
      // Sings wrong note or is silent: start 400ms grace period before resetting progress
      this.lastMatchTime = Date.now();
      
      if (!this.resetTimerId && this.matchStartTime !== null) {
        this.resetTimerId = setTimeout(() => {
          this.matchStartTime = null;
          this.matchAccumulatedTime = 0;
          if (targetCard) targetCard.classList.remove('matching');
          if (ring) ring.style.strokeDashoffset = '220';
          this.resetTimerId = null;
        }, 400); // 400ms grace window
      }
    }
  }

  handleSuccess() {
    this.resetMatchingState();
    this.targetSuccessActive = true;
    
    // Play success arpeggio chime
    this.playSuccessChime();

    // Trigger visual confetti/pulse effect on target card
    const targetCard = document.getElementById('target-card');
    targetCard.classList.add('success-flash');
    
    this.score += 10;
    document.getElementById('lbl-score').textContent = this.score;

    setTimeout(() => {
      targetCard.classList.remove('success-flash');
      this.targetSuccessActive = false;
      this.generateNewTarget();
    }, 1500);
  }

  // ===== Melody Sight-Reading =====

  generateMelody() {
    this.stopMelodyPlayback();
    const scalePCs = this.getScalePitchClasses();
    const keyData = KEY_DATABASE[this.currentKeyId];
    const tonicPC = this.scaleMode === 'major' ? keyData.rootMajor : keyData.rootMinor;

    // --- Rhythm: two 4/4 measures picked from the level's pattern pool ---
    const patterns = MEASURE_PATTERNS[this.melodyLevel];
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    const cadences = patterns.filter(p => {
      const last = p[p.length - 1];
      return last !== 'ee' && DUR_BEATS[last] >= 2; // final measure ends on a held note
    });

    const buildMeasure = (pattern, measureStart) => {
      const out = [];
      let beat = measureStart;
      pattern.forEach(tok => {
        if (tok === 'ee') {
          out.push({ kind: 'e', beats: 0.5, startBeat: beat, beam: 'start' });
          out.push({ kind: 'e', beats: 0.5, startBeat: beat + 0.5, beam: 'stop' });
          beat += 1;
        } else {
          out.push({ kind: tok, beats: DUR_BEATS[tok], startBeat: beat });
          beat += DUR_BEATS[tok];
        }
      });
      return out;
    };

    const rhythm = buildMeasure(pick(patterns), 0).concat(buildMeasure(pick(cadences), 4));

    // --- Pitches: diatonic pool across a comfortable singing range: F3 (53) to C5 (72) ---
    const pool = [];
    for (let m = 53; m <= 72; m++) {
      if (scalePCs.includes(m % 12)) pool.push(m);
    }

    // Start on the tonic closest to the middle of the range
    let idx = 0;
    let bestDist = Infinity;
    pool.forEach((m, i) => {
      const dist = Math.abs(m - 62) + (m % 12 === tonicPC ? 0 : 100); // strongly prefer tonic
      if (dist < bestDist) { bestDist = dist; idx = i; }
    });

    // Stepwise-biased random walk with occasional leaps of a third
    const STEPS = [-2, -1, -1, 1, 1, 2, -3, 3];
    const length = rhythm.length;
    const midis = [pool[idx]];
    for (let i = 1; i < length - 1; i++) {
      let next;
      do {
        const step = STEPS[Math.floor(Math.random() * STEPS.length)];
        next = Math.max(0, Math.min(pool.length - 1, idx + step));
      } while (next === idx); // reroll when clamping lands on the same note
      idx = next;
      midis.push(pool[idx]);
    }

    // Resolve the final note to the nearest tonic for a satisfying ending
    let endIdx = idx;
    let endDist = Infinity;
    pool.forEach((m, i) => {
      if (m % 12 !== tonicPC) return;
      const dist = Math.abs(i - idx);
      if (dist < endDist) { endDist = dist; endIdx = i; }
    });
    midis.push(pool[endIdx]);

    this.melody = rhythm.map((r, i) => {
      const label = this.melodyCountLabel(r.startBeat, r.beats);
      const base = label.split('–')[0];
      return {
        ...r,
        midi: midis[i],
        solfege: this.calculateSolfege(midis[i]),
        countLabel: label,
        countWord: COUNT_WORDS[base] || base
      };
    });
    this.melodyIndex = 0;
    this.resetMelodyMatchState();
    this.staff.setMelody(this.melody);
    this.updateMelodyPanel();
  }

  // Count syllable for a note at a beat position: "1".."4" on beats, "&" on off-beats,
  // and a "3–4" style range for held notes so singers see the sustain
  melodyCountLabel(startBeat, beats) {
    const beatInMeasure = startBeat % 4;
    const whole = Math.floor(beatInMeasure) + 1;
    const frac = beatInMeasure - Math.floor(beatInMeasure);
    const base = frac === 0 ? String(whole) : '&';
    if (beats >= 2) {
      const endBeat = Math.floor(beatInMeasure + beats - 0.5) + 1;
      return `${base}–${endBeat}`;
    }
    return base;
  }

  stopMelodyPlayback() {
    this.playTimers.forEach(t => clearTimeout(t));
    this.playTimers = [];
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    window.synth.stopAllNotes(); // a cancelled stop-timer must not leave a note droning
    this.melodyPlaybackActive = false;
    this.melodyBusy = false;
    this.botSinging = false;
    if (this.staff) this.staff.setPlaybackIndex(null);
  }

  resetMelodyMatchState() {
    if (this.melodyGraceTimer) {
      clearTimeout(this.melodyGraceTimer);
      this.melodyGraceTimer = null;
    }
    this.melodyMatchStart = null;
    this.melodyAccum = 0;
    this.melodyLast = null;
  }

  // Mic feedback for melody mode: hold the current note briefly to advance.
  // midi === null means silence / unpitched input.
  handleMelodyPitch(midi, deviation) {
    if (this.melodyBusy || !this.melody || this.melodyIndex >= this.melody.length) return;
    const target = this.melody[this.melodyIndex].midi;
    const now = Date.now();

    if (midi !== null && midi === target && Math.abs(deviation) <= 30) {
      if (this.melodyGraceTimer) {
        clearTimeout(this.melodyGraceTimer);
        this.melodyGraceTimer = null;
      }
      if (this.melodyMatchStart === null) {
        this.melodyMatchStart = now;
        this.melodyLast = now;
        this.melodyAccum = 0;
      }
      this.melodyAccum += Math.min(now - this.melodyLast, 200);
      this.melodyLast = now;
      if (this.melodyAccum >= this.melodyRequiredDuration) {
        this.advanceMelody();
      }
    } else {
      this.melodyLast = now;
      // Grace window so a wobble doesn't wipe accumulated progress
      if (!this.melodyGraceTimer && this.melodyMatchStart !== null) {
        this.melodyGraceTimer = setTimeout(() => {
          this.melodyMatchStart = null;
          this.melodyAccum = 0;
          this.melodyGraceTimer = null;
        }, 400);
      }
    }
  }

  advanceMelody() {
    this.staff.completeMelodyNote(this.melodyIndex);
    this.melodyIndex++;
    this.resetMelodyMatchState();
    if (this.melodyIndex >= this.melody.length) {
      this.handleMelodyComplete();
    }
    this.updateMelodyPanel();
  }

  handleMelodyComplete() {
    this.melodyBusy = true;
    this.melodyDoneCount++;
    this.playSuccessChime(this.melody[this.melody.length - 1].midi);
    
    // Show Choir Report Card Modal
    this.showReportCard(`Sight-Reading Level ${this.melodyLevel}`);

    // Tracked timer: cancelled if the user switches modes before it fires
    this.playTimers.push(setTimeout(() => {
      this.melodyBusy = false;
      this.generateMelody();
    }, 1800));
  }


  updateMelodyPanel() {
    if (!this.melody) return;
    const finished = this.melodyIndex >= this.melody.length;
    document.getElementById('lbl-melody-pos').textContent = Math.min(this.melodyIndex + 1, this.melody.length);
    document.getElementById('lbl-melody-len').textContent = this.melody.length;
    document.getElementById('lbl-melody-done').textContent = this.melodyDoneCount;

    const current = finished ? null : this.melody[this.melodyIndex];
    const spelling = current ? window.getNoteSpelling(current.midi, this.staff.keyConfig) : null;
    document.getElementById('lbl-melody-note').textContent = current ? `${spelling.displayName}${spelling.octave}` : '✓';
    document.getElementById('lbl-melody-solfege').textContent = current ? (current.solfege || '—') : 'Complete!';
  }

  playMelody() {
    if (!this.melody || this.melodyPlaybackActive) return;
    this.melodyBusy = true; // mic must ignore the speaker during playback
    this.melodyPlaybackActive = true;
    const beatMs = 60000 / this.melodyTempo;
    const totalBeats = this.melody.reduce((s, n) => Math.max(s, n.startBeat + n.beats), 0);

    this.melody.forEach((n, i) => {
      this.playTimers.push(setTimeout(() => {
        window.synth.playNote(n.midi);
        this.staff.setPlaybackIndex(i);
        this.playTimers.push(setTimeout(() => window.synth.stopNote(n.midi), Math.max(200, n.beats * beatMs - 80)));
      }, n.startBeat * beatMs));
    });

    this.playTimers.push(setTimeout(() => {
      this.melodyPlaybackActive = false;
      this.melodyBusy = false;
      this.staff.setPlaybackIndex(null);
    }, totalBeats * beatMs + 400));
  }

  // The counting bot: one spoken count-in measure, then a metronome click on every
  // beat while the voice count-sings each note's syllable exactly when it lands
  countMelody() {
    if (!this.melody || this.melodyPlaybackActive) return;
    this.melodyBusy = true;
    this.melodyPlaybackActive = true;
    const beatMs = 60000 / this.melodyTempo;
    const totalBeats = this.melody.reduce((s, n) => Math.max(s, n.startBeat + n.beats), 0);

    // Count-in measure: "one two three four"
    for (let b = 0; b < 4; b++) {
      this.playTimers.push(setTimeout(() => {
        window.synth.playClick(b === 0);
        this.speakCount(COUNT_WORDS[String(b + 1)]);
      }, b * beatMs));
    }

    const offset = 4 * beatMs;

    // Metronome clicks through the melody (accented downbeats)
    for (let b = 0; b < totalBeats; b++) {
      this.playTimers.push(setTimeout(() => window.synth.playClick(b % 4 === 0), offset + b * beatMs));
    }

    // Count-sing each note at its onset and light it up on the staff
    this.melody.forEach((n, i) => {
      this.playTimers.push(setTimeout(() => {
        this.speakCount(n.countWord);
        this.staff.setPlaybackIndex(i);
      }, offset + n.startBeat * beatMs));
    });

    this.playTimers.push(setTimeout(() => {
      this.melodyPlaybackActive = false;
      this.melodyBusy = false;
      this.staff.setPlaybackIndex(null);
    }, offset + totalBeats * beatMs + 400));
  }

  speakCount(word) {
    if (!('speechSynthesis' in window) || !word) return;
    const u = new SpeechSynthesisUtterance(word);
    u.rate = 1.6; // brisk so syllables fit between beats
    u.pitch = 1.05;
    window.speechSynthesis.speak(u);
  }

  // The demo singer: count-in, then it "sings" every note — a sung-style tone holds the
  // exact pitch for its full rhythm value while the voice names the solfege syllable,
  // with the metronome pulsing every beat underneath
  singMelody() {
    if (!this.melody || this.melodyPlaybackActive) return;
    this.melodyBusy = true; // mic must ignore the speaker while the demo sings
    this.melodyPlaybackActive = true;
    const beatMs = 60000 / this.melodyTempo;
    const totalBeats = this.melody.reduce((s, n) => Math.max(s, n.startBeat + n.beats), 0);

    // Count-in measure: "one two three four"
    for (let b = 0; b < 4; b++) {
      this.playTimers.push(setTimeout(() => {
        window.synth.playClick(b === 0);
        this.speakCount(COUNT_WORDS[String(b + 1)]);
      }, b * beatMs));
    }

    const offset = 4 * beatMs;

    // Beat pulse through the melody (accented downbeats)
    for (let b = 0; b < totalBeats; b++) {
      this.playTimers.push(setTimeout(() => window.synth.playClick(b % 4 === 0), offset + b * beatMs));
    }

    // Sing each note: the formant voice sings the solfege syllable at the exact pitch
    this.melody.forEach((n, i) => {
      this.playTimers.push(setTimeout(() => {
        window.synth.singSyllable(n.midi, n.solfege, n.beats * beatMs - 40);
        this.staff.setPlaybackIndex(i);
      }, offset + n.startBeat * beatMs));
    });

    this.playTimers.push(setTimeout(() => {
      this.melodyPlaybackActive = false;
      this.melodyBusy = false;
      this.staff.setPlaybackIndex(null);
    }, offset + totalBeats * beatMs + 400));
  }

  // ===== Maestro: the theory guide that knows every key, pitch, and degree =====

  // Diatonic scale of the current key/mode, one octave up from a comfortable tonic
  maestroScaleMidis() {
    const keyData = KEY_DATABASE[this.currentKeyId];
    const tonicPC = this.scaleMode === 'major' ? keyData.rootMajor : keyData.rootMinor;
    const scalePCs = this.getScalePitchClasses();
    const pool = [];
    for (let m = 50; m <= 79; m++) {
      if (scalePCs.includes(m % 12)) pool.push(m);
    }
    const start = pool.find(m => m % 12 === tonicPC && m >= 55) || pool[0];
    const si = pool.indexOf(start);
    return pool.slice(si, si + 8); // tonic to tonic inclusive
  }

  // Sing the scale of the current key up and back down, in solfege at pitch
  singScale() {
    if (this.botSinging || this.melodyPlaybackActive) return;
    const midis = this.maestroScaleMidis();
    if (midis.length < 8) return;
    this.singSequence(midis.concat(midis.slice(0, 7).reverse()), 520);
  }

  // Sing the tonic triad: Do Mi Sol Do Sol Mi Do (or La Do Mi La... in minor)
  singTriad() {
    if (this.botSinging || this.melodyPlaybackActive) return;
    const m = this.maestroScaleMidis();
    if (m.length < 8) return;
    this.singSequence([m[0], m[2], m[4], m[7], m[4], m[2], m[0]], 560);
  }

  singSequence(midis, noteMs) {
    this.botSinging = true;
    midis.forEach((midi, i) => {
      this.playTimers.push(setTimeout(() => {
        window.synth.singSyllable(midi, this.calculateSolfege(midi), noteMs - 60);
      }, i * noteMs));
    });
    this.playTimers.push(setTimeout(() => { this.botSinging = false; }, midis.length * noteMs + 200));
  }

  // Scale-degree name of a note in the current key/mode
  describeDegree(midi) {
    const keyData = KEY_DATABASE[this.currentKeyId];
    const isMinor = this.scaleMode !== 'major';
    const tonicPC = isMinor ? keyData.rootMinor : keyData.rootMajor;
    const interval = ((midi % 12) - tonicPC + 12) % 12;
    const MAJOR_DEGREES = {
      0: 'the Tonic (1st degree — home base)',
      2: 'the Supertonic (2nd degree)',
      4: 'the Mediant (3rd degree)',
      5: 'the Subdominant (4th degree)',
      7: 'the Dominant (5th degree)',
      9: 'the Submediant (6th degree)',
      11: 'the Leading Tone (7th degree — pulls to Do)'
    };
    const MINOR_DEGREES = {
      0: 'the Tonic (1st degree — home base)',
      2: 'the Supertonic (2nd degree)',
      3: 'the Mediant (3rd degree)',
      5: 'the Subdominant (4th degree)',
      7: 'the Dominant (5th degree)',
      8: 'the Submediant (6th degree)',
      10: 'the Subtonic (7th degree)',
      11: 'the raised Leading Tone (from harmonic minor)'
    };
    const table = isMinor ? MINOR_DEGREES : MAJOR_DEGREES;
    return table[interval] || 'a chromatic tone (outside the scale)';
  }

  // Refresh the Maestro card's key-signature lesson
  updateMaestroCard() {
    const keyData = KEY_DATABASE[this.currentKeyId];
    const cfg = this.staff.keyConfig;
    const accList = cfg.count === 0
      ? 'no sharps or flats'
      : (cfg.type === 'sharp' ? this.staff.SHARP_ORDER : this.staff.FLAT_ORDER)
          .slice(0, cfg.count)
          .map(l => l + (cfg.type === 'sharp' ? '♯' : '♭'))
          .join(' ');

    const scale = window.getScaleNotes(cfg);
    const nameOf = pc => {
      for (const l in scale) {
        if (scale[l].pc === pc) {
          return l + (scale[l].acc === '#' ? '♯' : (scale[l].acc === 'b' ? '♭' : ''));
        }
      }
      return '?';
    };
    const majName = nameOf(keyData.rootMajor);
    const minName = nameOf(keyData.rootMinor);

    let solfegeRuleHint = '';
    if (cfg.count > 0) {
      if (cfg.type === 'sharp') {
        const lastSharp = this.staff.SHARP_ORDER[cfg.count - 1];
        solfegeRuleHint = ` <br>💡 <strong>Sight-Reading Tip:</strong> The last sharp (<strong>${lastSharp}♯</strong>) is <strong>Ti</strong> — step up 1 half-step to find <strong>Do (${majName})</strong>!`;
      } else {
        const lastFlat = this.staff.FLAT_ORDER[cfg.count - 1];
        solfegeRuleHint = ` <br>💡 <strong>Sight-Reading Tip:</strong> The last flat (<strong>${lastFlat}♭</strong>) is <strong>Fa</strong> — the 2nd-to-last flat (or 4 steps down) is <strong>Do (${majName})</strong>!`;
      }
    } else {
      solfegeRuleHint = ` <br>💡 <strong>Sight-Reading Tip:</strong> Key has no sharps or flats — <strong>C is Do</strong>!`;
    }

    let doLine;
    if (this.scaleMode === 'major') {
      doLine = `Do = ${majName}. Sing the major scale from Do.${solfegeRuleHint}`;
    } else if (this.scaleMode === 'minor-la') {
      doLine = `Do = ${majName}, and the minor tonic ${minName} = La (la-based minor).${solfegeRuleHint}`;
    } else {
      doLine = `Do = ${minName}, the minor tonic (do-based minor). The minor color notes are Me, Le, Te.${solfegeRuleHint}`;
    }

    document.getElementById('maestro-key-info').innerHTML =
      `<strong>${keyData.name}</strong> — ${accList}.<br>${doLine}`;
    document.getElementById('maestro-note-info').textContent = 'Play or sing any note and I will explain it.';
    this.maestroLastMidi = null;
  }

  // Explain a note the student just played or sang
  explainNote(midi) {
    if (this.maestroLastMidi === midi) return;
    this.maestroLastMidi = midi;
    const spelling = window.getNoteSpelling(midi, this.staff.keyConfig);
    const solfege = this.calculateSolfege(midi);
    const freq = Math.round(440 * Math.pow(2, (midi - 69) / 12));
    document.getElementById('maestro-note-info').textContent =
      `${spelling.displayName}${spelling.octave} (${freq} Hz) is ${solfege} — ${this.describeDegree(midi)}.`;
  }

  playSuccessChime(rootMidi) {
    // Play a lovely major triad arpeggio
    const root = rootMidi || this.targetMidi;
    const notes = [root, root + 4, root + 7, root + 12];
    
    notes.forEach((note, index) => {
      setTimeout(() => {
        window.synth.playNote(note);
        setTimeout(() => window.synth.stopNote(note), 400);
      }, index * 120);
    });
  }

  // Calculate Movable Do Solfege based on active key signature and mode
  calculateSolfege(midi) {
    const keyData = KEY_DATABASE[this.currentKeyId];
    const isFlatKey = keyData.type === 'flat' && keyData.count > 0;

    // Determine what pitch class = 'Do'
    let doRoot;
    if (this.scaleMode === 'major') {
      doRoot = keyData.rootMajor;
    } else if (this.scaleMode === 'minor-la') {
      // La-based minor: Do = relative major root (e.g., in A minor, Do = C)
      doRoot = keyData.rootMajor;
    } else { // minor-do
      // Do-based minor: Do = the minor tonic itself
      doRoot = keyData.rootMinor;
    }

    const interval = (midi % 12 - doRoot + 12) % 12;

    if (this.scaleMode === 'major') {
      // Standard major mode — 7 diatonic + chromatic alternates
      const syllables = {
        0: 'Do',
        1: isFlatKey ? 'Ra' : 'Di',
        2: 'Re',
        3: isFlatKey ? 'Me' : 'Ri',
        4: 'Mi',
        5: 'Fa',
        6: isFlatKey ? 'Se' : 'Fi',
        7: 'Sol',
        8: isFlatKey ? 'Le' : 'Si',
        9: 'La',
        10: isFlatKey ? 'Te' : 'Li',
        11: 'Ti'
      };
      return syllables[interval];
    } else if (this.scaleMode === 'minor-la') {
      // La-based minor: same syllables as major but read from Do.
      // The diatonic scale degrees of the relative major become:
      //   Do Re Mi Fa Sol La Ti  (C D E F G A B in C major / A minor)
      // When singing in A minor the tonic note 'A' = 'La', not 'Do'.
      const syllables = {
        0: 'Do',   // relative major tonic (e.g., C in A minor)
        1: isFlatKey ? 'Ra' : 'Di',
        2: 'Re',
        3: isFlatKey ? 'Me' : 'Ri',
        4: 'Mi',
        5: 'Fa',
        6: isFlatKey ? 'Se' : 'Fi',
        7: 'Sol',
        8: isFlatKey ? 'Le' : 'Si',
        9: 'La',   // minor tonic (e.g., A in A minor) — this is correct!
        10: isFlatKey ? 'Te' : 'Li',
        11: 'Ti'
      };
      return syllables[interval];
    } else {
      // Do-based minor: Do = minor tonic, diatonic scale uses Me, Le, Te
      const syllables = {
        0: 'Do',
        1: 'Ra',   // ♭2
        2: 'Re',
        3: 'Me',   // ♭3 (minor 3rd)
        4: 'Mi',   // natural 3 (chromatic passing tone)
        5: 'Fa',
        6: 'Se',   // ♭5 enharmonic / ♯4
        7: 'Sol',
        8: 'Le',   // ♭6 (minor 6th)
        9: 'La',   // natural 6 (chromatic passing tone)
        10: 'Te',  // ♭7 (minor 7th)
        11: 'Ti'   // natural 7 (leading tone, chromatic)
      };
      return syllables[interval];
    }
  }

  // ===== Organ Drone ("The Pipe Place") Methods =====
  playOrganChord(midis) {
    this.clearOrganPipes();
    midis.forEach(m => {
      window.synth.playOrganPipe(m);
      this.organActivePipes.add(m);
      const keyEl = document.querySelector(`.piano-key[data-midi="${m}"]`);
      if (keyEl) keyEl.classList.add('active');
    });
    this.updateOrganStatus();
  }

  clearOrganPipes() {
    window.synth.stopAllOrganPipes();
    this.organActivePipes.forEach(m => {
      const keyEl = document.querySelector(`.piano-key[data-midi="${m}"]`);
      if (keyEl) keyEl.classList.remove('active');
    });
    this.organActivePipes.clear();
    this.updateOrganStatus();
  }

  updateOrganStatus() {
    const el = document.getElementById('lbl-organ-status');
    if (el) {
      const count = this.organActivePipes.size;
      el.textContent = `${count} Pipe${count === 1 ? '' : 's'} Active`;
    }
  }

  // ===== Rhythm Trainer Engine =====
  generateRhythmExercise() {
    if (this.rhythmMetronomeTimer) this.toggleRhythmMetronome();
    const patterns = MEASURE_PATTERNS[this.rhythmLevel] || MEASURE_PATTERNS[1];
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    const pattern = pick(patterns).concat(pick(patterns));

    let beat = 0;
    const rhythmNotes = [];
    pattern.forEach(tok => {
      if (tok === 'ee') {
        rhythmNotes.push({ kind: 'e', beats: 0.5, startBeat: beat, beam: 'start', midi: 60, solfege: 'Do' });
        rhythmNotes.push({ kind: 'e', beats: 0.5, startBeat: beat + 0.5, beam: 'stop', midi: 62, solfege: 'Re' });
        beat += 1;
      } else {
        const b = DUR_BEATS[tok] || 1;
        rhythmNotes.push({ kind: tok, beats: b, startBeat: beat, midi: 60, solfege: 'Do' });
        beat += b;
      }
    });

    this.rhythmPattern = rhythmNotes;
    this.rhythmBeatIndex = 0;
    this.staff.setMelody(rhythmNotes);
  }

  toggleRhythmMetronome() {
    const btn = document.getElementById('btn-rhythm-metronome');
    if (this.rhythmMetronomeTimer) {
      clearInterval(this.rhythmMetronomeTimer);
      this.rhythmMetronomeTimer = null;
      if (btn) btn.innerHTML = '▶ Start Metronome';
      if (this.staff) this.staff.setPlaybackIndex(null);
    } else {
      const intervalMs = (60000 / this.rhythmBpm);
      this.rhythmLastBeatTime = Date.now();
      this.rhythmBeatIndex = 0;

      this.rhythmMetronomeTimer = setInterval(() => {
        const now = Date.now();
        this.rhythmLastBeatTime = now;
        const isDownbeat = (this.rhythmBeatIndex % 4 === 0);
        window.synth.playClick(isDownbeat);

        if (this.rhythmPattern && this.rhythmPattern.length > 0) {
          const noteIdx = this.rhythmBeatIndex % this.rhythmPattern.length;
          this.staff.setPlaybackIndex(noteIdx);
          if (this.rhythmPitches && this.rhythmPattern[noteIdx]) {
            window.synth.playNote(this.rhythmPattern[noteIdx].midi);
            setTimeout(() => window.synth.stopNote(this.rhythmPattern[noteIdx].midi), intervalMs * 0.7);
          }
        }

        this.rhythmBeatIndex++;
      }, intervalMs);

      if (btn) btn.innerHTML = '⏹ Stop Metronome';
    }
  }

  handleRhythmTap() {
    if (this.mode !== 'rhythm') return;
    window.synth.playWoodblock();

    const now = Date.now();
    const intervalMs = 60000 / this.rhythmBpm;
    const elapsedSinceBeat = now - this.rhythmLastBeatTime;
    const delta = Math.min(elapsedSinceBeat, Math.abs(elapsedSinceBeat - intervalMs));

    let rating = 'PERFECT!';
    let points = 100;

    if (delta <= 75) {
      rating = 'PERFECT!';
      points = 100;
      this.rhythmStreak++;
    } else if (delta <= 160) {
      rating = elapsedSinceBeat < intervalMs / 2 ? 'EARLY' : 'LATE';
      points = 50;
      this.rhythmStreak++;
    } else {
      rating = 'MISSED';
      points = 0;
      this.rhythmStreak = 0;
    }

    this.rhythmScore += points;

    const ratingEl = document.getElementById('lbl-rhythm-rating');
    const scoreEl = document.getElementById('lbl-rhythm-score');
    const streakEl = document.getElementById('lbl-rhythm-streak');

    if (ratingEl) {
      ratingEl.textContent = rating;
      ratingEl.style.color = rating === 'PERFECT!' ? '#10b981' : (rating === 'MISSED' ? '#ef4444' : '#f59e0b');
    }
    if (scoreEl) scoreEl.textContent = this.rhythmScore;
    if (streakEl) streakEl.textContent = this.rhythmStreak;
  }

  // Dynamic Movable Do Badges & Home-Base Highlight on Piano Keyboard
  updatePianoKeyLabels() {
    const diatonicSyllables = {
      'Do': 'do',
      'Re': 're',
      'Mi': 'mi',
      'Fa': 'fa',
      'Sol': 'sol',
      'La': 'la',
      'Ti': 'ti'
    };

    const keys = document.querySelectorAll('.piano-key');
    keys.forEach(keyEl => {
      const midi = parseInt(keyEl.getAttribute('data-midi'));
      if (isNaN(midi)) return;

      const solfege = this.calculateSolfege(midi);
      
      const oldBadge = keyEl.querySelector('.solfege-key-badge');
      if (oldBadge) oldBadge.remove();
      keyEl.classList.remove('tonic-do');

      if (solfege && diatonicSyllables[solfege]) {
        const badge = document.createElement('span');
        badge.className = `solfege-key-badge solfege-${diatonicSyllables[solfege]}`;
        badge.textContent = solfege;
        keyEl.appendChild(badge);

        if (solfege === 'Do') {
          keyEl.classList.add('tonic-do');
        }
      }
    });
  }

  // Demonstrate diatonic scale fingerings on piano keyboard key-by-key
  demonstrateScaleOnPiano() {
    if (this.botSinging || this.melodyPlaybackActive) return;
    const midis = this.maestroScaleMidis();
    if (!midis || midis.length < 8) return;
    
    this.botSinging = true;
    const keyName = KEY_DATABASE[this.currentKeyId].name;
    this.teacher.speak(`Demonstrating scale fingerings on piano for ${keyName}`, true);

    const stepMs = 600;
    midis.forEach((midi, i) => {
      setTimeout(() => {
        this.triggerPianoNoteStart(midi);
        window.synth.singSyllable(midi, this.calculateSolfege(midi), 500);

        setTimeout(() => {
          this.triggerPianoNoteStop(midi);
        }, 520);
      }, i * stepMs);
    });

    setTimeout(() => {
      this.botSinging = false;
    }, midis.length * stepMs + 300);
  }
}

// Instantiate controller on window load
window.addEventListener('DOMContentLoaded', () => {
  window.app = new AppController();
  window.app.init();
});

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('[PWA] Service Worker registered successfully.'))
      .catch(err => console.error('[PWA] Service Worker registration failed:', err));
  });
}
