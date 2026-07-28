import { MusicStaff, getNoteSpelling } from './staff.js';
import { PitchTracker } from './pitch.js';
import { synth } from './synth.js';
import { ChoirTeacher, SATB_PIECES, WARMUP_ROUTINES } from './teacher.js';
import { getSolfegeRuleExplanation } from './theory/solfege.js';

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

const KEYBOARD_MAP = {
  'a': 60, 'w': 61, 's': 62, 'e': 63, 'd': 64, 'f': 65, 't': 66, 'g': 67, 'y': 68, 'h': 69, 'u': 70, 'j': 71, 'k': 72, 'o': 73, 'l': 74, 'p': 75, ';': 76
};

export class AppController {
  constructor() {
    this.staff = null;
    this.pitchTracker = null;

    this.currentKeyId = 'C_maj';
    this.scaleMode = 'major';
    this.mode = 'freeplay';
    this.microphoneActive = false;

    this.teacher = new ChoirTeacher();
    this.pressedKeys = new Set();
  }

  init() {
    this.staff = new MusicStaff('music-staff');
    this.staff.draw();

    // Clickable Staff Handler: Click on staff lines/spaces to play pitch and show solfege!
    this.staff.onStaffClick = (midi) => {
      const keyElem = document.querySelector(`.piano-key[data-midi="${midi}"]`);
      this.playPianoKey(midi, keyElem);
    };

    this.pitchTracker = new PitchTracker();

    this.pitchTracker.onPitchDetected = (freq, midi, cents) => this.handlePitch(freq, midi, cents);
    this.pitchTracker.onSilent = () => this.handleSilent();

    this.initDropdowns();
    this.bindEvents();
    this.updateKeySignature();
  }

  initDropdowns() {
    const warmupSelect = document.getElementById('select-warmup-routine');
    if (warmupSelect) {
      warmupSelect.innerHTML = WARMUP_ROUTINES.map((r, i) => `<option value="${i}">${r.name}</option>`).join('');
    }

    const satbSelect = document.getElementById('select-satb-piece');
    if (satbSelect) {
      satbSelect.innerHTML = SATB_PIECES.map(p => `<option value="${p.id}">${p.title} (${p.timeSig})</option>`).join('');
    }
  }

  bindEvents() {
    const keySelect = document.getElementById('key-select');
    if (keySelect) {
      keySelect.addEventListener('change', (e) => {
        this.currentKeyId = e.target.value;
        this.updateKeySignature();
      });
    }

    const modeSelect = document.getElementById('mode-select');
    if (modeSelect) {
      modeSelect.addEventListener('change', (e) => {
        this.scaleMode = e.target.value;
        this.updateKeySignature();
      });
    }

    // Tabs
    const tabBtns = document.querySelectorAll('.nav-item, .tab-button');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.switchTab(btn.dataset.tab);
      });
    });

    // Mic button
    const micBtn = document.getElementById('btn-mic');
    if (micBtn) {
      micBtn.addEventListener('click', async () => {
        if (this.microphoneActive) {
          this.pitchTracker.stop();
          this.microphoneActive = false;
          micBtn.classList.remove('btn-danger');
          micBtn.classList.add('btn-primary');
          micBtn.innerHTML = `🎙️ Start Microphone`;
        } else {
          try {
            await this.pitchTracker.start();
            this.microphoneActive = true;
            micBtn.classList.remove('btn-primary');
            micBtn.classList.add('btn-danger');
            micBtn.innerHTML = `⏹️ Stop Microphone`;
          } catch (e) {
            alert('Could not access microphone permissions.');
          }
        }
      });
    }

    // Piano Keyboard UI Keys
    const pianoKeys = document.querySelectorAll('.piano-key');
    pianoKeys.forEach(key => {
      const midi = parseInt(key.dataset.midi, 10);
      key.addEventListener('mousedown', () => this.playPianoKey(midi, key));
      key.addEventListener('mouseup', () => this.stopPianoKey(midi, key));
      key.addEventListener('mouseleave', () => this.stopPianoKey(midi, key));
    });

    // Computer Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.repeat || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      const keyChar = e.key.toLowerCase();
      if (KEYBOARD_MAP[keyChar]) {
        const midi = KEYBOARD_MAP[keyChar];
        const keyEl = document.querySelector(`.piano-key[data-midi="${midi}"]`);
        this.playPianoKey(midi, keyEl);
      }
    });

    window.addEventListener('keyup', (e) => {
      const keyChar = e.key.toLowerCase();
      if (KEYBOARD_MAP[keyChar]) {
        const midi = KEYBOARD_MAP[keyChar];
        const keyEl = document.querySelector(`.piano-key[data-midi="${midi}"]`);
        this.stopPianoKey(midi, keyEl);
      }
    });

    // Speech feedback toggle
    const speechBtn = document.getElementById('btn-toggle-speech');
    if (speechBtn) {
      speechBtn.addEventListener('click', () => {
        this.teacher.speechEnabled = !this.teacher.speechEnabled;
        const statusEl = document.getElementById('lbl-speech-status');
        if (statusEl) statusEl.textContent = this.teacher.speechEnabled ? 'ON' : 'OFF';
        speechBtn.classList.toggle('active', this.teacher.speechEnabled);
      });
    }

    // Warm-up Panel Controls
    const startWarmupBtn = document.getElementById('btn-start-warmup');
    const demoWarmupBtn = document.getElementById('btn-demo-warmup');
    const warmupSelect = document.getElementById('select-warmup-routine');

    if (warmupSelect) {
      warmupSelect.addEventListener('change', (e) => {
        const idx = parseInt(e.target.value, 10);
        const r = WARMUP_ROUTINES[idx];
        const descEl = document.getElementById('lbl-warmup-desc');
        if (r && descEl) descEl.textContent = r.description;
      });
    }

    if (startWarmupBtn) {
      startWarmupBtn.addEventListener('click', () => {
        const idx = parseInt(warmupSelect ? warmupSelect.value : 0, 10);
        const routine = WARMUP_ROUTINES[idx] || WARMUP_ROUTINES[0];
        routine.notes.forEach((midi, i) => {
          setTimeout(() => {
            synth.singSyllable(midi, routine.syllables[i] || 'Do', 500);
            this.staff.setTargetNote(midi, routine.syllables[i]);
          }, i * 600);
        });
      });
    }

    if (demoWarmupBtn) {
      demoWarmupBtn.addEventListener('click', () => {
        const idx = parseInt(warmupSelect ? warmupSelect.value : 0, 10);
        const routine = WARMUP_ROUTINES[idx] || WARMUP_ROUTINES[0];
        this.teacher.speak(`Here is the warm-up: ${routine.name}. ${routine.description}`);
      });
    }

    // SATB Panel Controls
    const playSatbBtn = document.getElementById('btn-play-satb');
    const singSatbBtn = document.getElementById('btn-sing-satb');
    const satbSelect = document.getElementById('select-satb-piece');

    ['soprano', 'alto', 'tenor', 'bass'].forEach(part => {
      const slider = document.getElementById(`vol-${part}`);
      if (slider) {
        slider.addEventListener('input', (e) => {
          synth.setSATBVolume(part, parseFloat(e.target.value));
        });
      }
    });

    if (playSatbBtn) {
      playSatbBtn.addEventListener('click', () => {
        const pieceId = satbSelect ? satbSelect.value : 'ode_to_joy';
        const piece = SATB_PIECES.find(p => p.id === pieceId) || SATB_PIECES[0];
        const beatMs = (60 / piece.tempo) * 1000;
        piece.parts.soprano.forEach((_, i) => {
          setTimeout(() => {
            synth.playSATBNote('soprano', piece.parts.soprano[i], beatMs);
            synth.playSATBNote('alto', piece.parts.alto[i], beatMs);
            synth.playSATBNote('tenor', piece.parts.tenor[i], beatMs);
            synth.playSATBNote('bass', piece.parts.bass[i], beatMs);
          }, i * beatMs);
        });
      });
    }

    if (singSatbBtn) {
      singSatbBtn.addEventListener('click', () => {
        const userVoiceSelect = document.getElementById('select-user-voice');
        const userVoice = userVoiceSelect ? userVoiceSelect.value : 'tenor';
        this.teacher.speak(`Get ready to sing your ${userVoice} part! Microphone is active.`);
      });
    }

    // Melody / Academy Sight-Singing Controls
    const playMelodyBtn = document.getElementById('btn-play-melody');
    const singMelodyBtn = document.getElementById('btn-sing-melody');
    const countMelodyBtn = document.getElementById('btn-count-melody');
    const hearCurrentBtn = document.getElementById('btn-hear-current');
    const newMelodyBtn = document.getElementById('btn-new-melody');

    this.currentMelody = [60, 62, 64, 65, 67, 69, 71, 72];
    this.melodyIndex = 0;

    if (newMelodyBtn) {
      newMelodyBtn.addEventListener('click', () => {
        const pool = [60, 62, 64, 65, 67, 69, 71, 72];
        this.currentMelody = Array.from({ length: 8 }, () => pool[Math.floor(Math.random() * pool.length)]);
        this.melodyIndex = 0;
        this.updateMelodyDisplay();
      });
    }

    if (playMelodyBtn) {
      playMelodyBtn.addEventListener('click', () => {
        const tempoSelect = document.getElementById('melody-tempo');
        const bpm = parseInt(tempoSelect ? tempoSelect.value : 84, 10);
        const beatMs = (60 / bpm) * 1000;

        this.currentMelody.forEach((midi, idx) => {
          setTimeout(() => {
            synth.playNote(midi);
            this.staff.setPlaybackIndex(idx);
            setTimeout(() => synth.stopNote(midi), beatMs * 0.8);
          }, idx * beatMs);
        });
      });
    }

    if (singMelodyBtn) {
      singMelodyBtn.addEventListener('click', () => {
        const tempoSelect = document.getElementById('melody-tempo');
        const bpm = parseInt(tempoSelect ? tempoSelect.value : 84, 10);
        const beatMs = (60 / bpm) * 1000;

        this.currentMelody.forEach((midi, idx) => {
          setTimeout(() => {
            const solfege = this.getSolfegeForMidi(midi);
            synth.singSyllable(midi, solfege, beatMs * 0.8);
          }, idx * beatMs);
        });
      });
    }

    if (countMelodyBtn) {
      countMelodyBtn.addEventListener('click', () => {
        const tempoSelect = document.getElementById('melody-tempo');
        const bpm = parseInt(tempoSelect ? tempoSelect.value : 84, 10);
        const beatMs = (60 / bpm) * 1000;
        for (let b = 1; b <= 8; b++) {
          setTimeout(() => {
            synth.playClick(b % 4 === 1);
          }, (b - 1) * beatMs);
        }
      });
    }

    if (hearCurrentBtn) {
      hearCurrentBtn.addEventListener('click', () => {
        const currentMidi = this.currentMelody[this.melodyIndex] || 60;
        synth.playNote(currentMidi);
        setTimeout(() => synth.stopNote(currentMidi), 1000);
      });
    }

    // Practice Target Controls
    const playTargetBtn = document.getElementById('btn-play-target');
    this.targetMidi = 60;

    if (playTargetBtn) {
      playTargetBtn.addEventListener('click', () => {
        synth.playNote(this.targetMidi);
        setTimeout(() => synth.stopNote(this.targetMidi), 1000);
      });
    }

    // Maestro Theory Guide Controls
    const singScaleBtn = document.getElementById('btn-sing-scale');
    const singTriadBtn = document.getElementById('btn-sing-triad');

    if (singScaleBtn) {
      singScaleBtn.addEventListener('click', () => {
        const keyInfo = KEY_DATABASE[this.currentKeyId];
        const rootMidi = 60 + (keyInfo ? keyInfo.rootMajor : 0);
        const scaleOffsets = [0, 2, 4, 5, 7, 9, 11, 12];
        const solfegeNames = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Ti', 'Do'];
        scaleOffsets.forEach((off, i) => {
          setTimeout(() => {
            synth.singSyllable(rootMidi + off, solfegeNames[i], 450);
          }, i * 500);
        });
      });
    }

    if (singTriadBtn) {
      singTriadBtn.addEventListener('click', () => {
        const keyInfo = KEY_DATABASE[this.currentKeyId];
        const rootMidi = 60 + (keyInfo ? keyInfo.rootMajor : 0);
        synth.playChord(rootMidi, 'major');
      });
    }

    // Report Modal Close Button
    const closeReportBtn = document.getElementById('btn-close-report');
    const reportModal = document.getElementById('report-modal');
    if (closeReportBtn && reportModal) {
      closeReportBtn.addEventListener('click', () => {
        reportModal.classList.add('hidden');
      });
    }
  }

  updateMelodyDisplay() {
    const melodyObj = this.currentMelody.map(midi => ({
      midi,
      solfege: this.getSolfegeForMidi(midi)
    }));
    this.staff.setMelody(melodyObj);

    const noteLbl = document.getElementById('lbl-melody-note');
    const solfegeLbl = document.getElementById('lbl-melody-solfege');
    const currentMidi = this.currentMelody[this.melodyIndex] || 60;
    const spelling = getNoteSpelling(currentMidi, KEY_DATABASE[this.currentKeyId]);
    if (noteLbl) noteLbl.textContent = spelling.name;
    if (solfegeLbl) solfegeLbl.textContent = this.getSolfegeForMidi(currentMidi);
  }

  playPianoKey(midi, element) {
    if (element) element.classList.add('active');
    synth.playNote(midi);

    const noteSpelling = getNoteSpelling(midi, KEY_DATABASE[this.currentKeyId]);
    const solfege = this.getSolfegeForMidi(midi);

    const noteEl = document.getElementById('lbl-piano-note');
    const solfegeEl = document.getElementById('lbl-piano-solfege');
    if (noteEl) noteEl.textContent = noteSpelling.name;
    if (solfegeEl) solfegeEl.textContent = solfege;

    this.staff.setPianoNote(midi, solfege);
  }

  stopPianoKey(midi, element) {
    if (element) element.classList.remove('active');
    synth.stopNote(midi);
  }

  switchTab(tabId) {
    this.mode = tabId;

    const staffSection = document.getElementById('staff-section');
    const pianoNotePanel = document.getElementById('piano-note-panel');
    const warmupPanel = document.getElementById('warmup-panel');
    const satbPanel = document.getElementById('satb-panel');
    const practicePanel = document.getElementById('practice-panel');
    const melodyPanel = document.getElementById('melody-panel');
    const pitchpipePanel = document.getElementById('panel-pitchpipe');
    const solfegePanel = document.getElementById('panel-solfege');

    // Hide all panels
    [warmupPanel, satbPanel, practicePanel, melodyPanel, pitchpipePanel, solfegePanel].forEach(p => {
      if (p) p.classList.add('hidden');
    });

    if (staffSection) staffSection.classList.remove('hidden');
    if (pianoNotePanel) pianoNotePanel.classList.remove('hidden');

    if (tabId === 'pitchpipe') {
      if (pitchpipePanel) pitchpipePanel.classList.remove('hidden');
    } else if (tabId === 'warmup') {
      if (warmupPanel) warmupPanel.classList.remove('hidden');
    } else if (tabId === 'satb') {
      if (satbPanel) satbPanel.classList.remove('hidden');
    } else if (tabId === 'practice') {
      if (practicePanel) practicePanel.classList.remove('hidden');
    } else if (tabId === 'academy') {
      if (melodyPanel) melodyPanel.classList.remove('hidden');
      this.updateMelodyDisplay();
    } else if (tabId === 'solfege') {
      if (solfegePanel) solfegePanel.classList.remove('hidden');
    }

    if (this.staff) {
      this.staff.draw();
    }
  }

  updateKeySignature() {
    const keyInfo = KEY_DATABASE[this.currentKeyId];
    if (!keyInfo) return;

    this.staff.setKey(keyInfo.type, keyInfo.count);

    const maestroInfo = document.getElementById('maestro-key-info');
    if (maestroInfo) {
      const ruleText = getSolfegeRuleExplanation(this.currentKeyId);
      maestroInfo.innerHTML = `<div style="font-size: 13px; line-height: 1.5; color: #f8fafc;">${ruleText}</div>`;
    }
  }

  handlePitch(freq, midi, cents) {
    const noteSpelling = getNoteSpelling(midi, KEY_DATABASE[this.currentKeyId]);
    const solfege = this.getSolfegeForMidi(midi);

    const noteEl = document.getElementById('lbl-voice-note');
    const solfegeEl = document.getElementById('lbl-voice-solfege');
    const freqEl = document.getElementById('lbl-voice-freq');
    const centsEl = document.getElementById('lbl-voice-cents');
    const needle = document.getElementById('tuner-needle');

    if (noteEl) noteEl.textContent = noteSpelling.name;
    if (solfegeEl) solfegeEl.textContent = solfege;
    if (freqEl) freqEl.textContent = `${freq.toFixed(1)} Hz`;
    if (centsEl) centsEl.textContent = `${cents > 0 ? '+' : ''}${cents}¢`;

    if (needle) {
      const angle = Math.max(-45, Math.min(45, (cents / 50) * 45));
      needle.style.transform = `translateX(-50%) rotate(${angle}deg)`;
    }

    this.staff.setSungNote(midi, cents);
  }

  handleSilent() {
    const noteEl = document.getElementById('lbl-voice-note');
    const solfegeEl = document.getElementById('lbl-voice-solfege');
    const freqEl = document.getElementById('lbl-voice-freq');
    const centsEl = document.getElementById('lbl-voice-cents');
    const needle = document.getElementById('tuner-needle');

    if (noteEl) noteEl.textContent = '—';
    if (solfegeEl) solfegeEl.textContent = '—';
    if (freqEl) freqEl.textContent = '—';
    if (centsEl) centsEl.textContent = '0¢';

    if (needle) {
      needle.style.transform = `translateX(-50%) rotate(0deg)`;
    }

    this.staff.setSungNote(null, 0);
  }

  getSolfegeForMidi(midi) {
    const keyInfo = KEY_DATABASE[this.currentKeyId];
    const root = this.scaleMode.startsWith('minor') ? keyInfo.rootMinor : keyInfo.rootMajor;
    const semitonesFromRoot = ((midi % 12) - root + 12) % 12;

    const majorSolfege = ['Do', 'Di', 'Re', 'Ri', 'Mi', 'Fa', 'Fi', 'Sol', 'Si', 'La', 'Li', 'Ti'];
    return majorSolfege[semitonesFromRoot] || 'Do';
  }
}

window.AppController = AppController;

