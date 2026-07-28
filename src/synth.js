// Unified Web Audio Synthesizer Engine for PitchMaster

export class MusicSynth {
  constructor() {
    this.audioCtx = null;
    this.masterGain = null;
    this.delayNode = null;
    this.delayGain = null;
    this.activeNotes = new Map();
    this.volume = 0.75;
    this.tuningStandard = 440;
    this.soundProfile = 'choir'; // 'choir', 'organ', 'sine', 'flute'
    this.satbVolumes = { soprano: 1.0, alto: 1.0, tenor: 1.0, bass: 1.0 };
    this.isUnlocked = false;

    this.setupGlobalUnlock();
  }

  setupGlobalUnlock() {
    const unlock = () => {
      this.init();
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      this.isUnlocked = true;
    };
    window.addEventListener('click', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });
  }

  setTuning(freq) {
    this.tuningStandard = parseFloat(freq) || 440;
  }

  setSoundProfile(profile) {
    this.soundProfile = profile;
  }

  setSATBVolume(part, vol) {
    if (this.satbVolumes.hasOwnProperty(part)) {
      this.satbVolumes[part] = Math.max(0.0, Math.min(1.0, vol));
    }
  }

  init() {
    if (this.audioCtx) return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.audioCtx = window.getSharedAudioContext ? window.getSharedAudioContext() : new AudioContextClass();

    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.setValueAtTime(this.volume * 0.4, this.audioCtx.currentTime);

    this.delayNode = this.audioCtx.createDelay(1.0);
    this.delayNode.delayTime.setValueAtTime(0.22, this.audioCtx.currentTime);

    this.delayGain = this.audioCtx.createGain();
    this.delayGain.gain.setValueAtTime(0.12, this.audioCtx.currentTime);

    const delayFeedback = this.audioCtx.createGain();
    delayFeedback.gain.setValueAtTime(0.20, this.audioCtx.currentTime);

    this.delayNode.connect(delayFeedback);
    delayFeedback.connect(this.delayNode);
    this.delayNode.connect(this.delayGain);
    this.delayGain.connect(this.masterGain);

    this.masterGain.connect(this.audioCtx.destination);
  }

  midiToFreq(note) {
    return this.tuningStandard * Math.pow(2, (note - 69) / 12);
  }

  playSATBNote(part, midiNote, durMs) {
    this.init();
    if (!midiNote || this.satbVolumes[part] <= 0) return;

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const dur = Math.max(0.2, durMs / 1000);
    const freq = this.midiToFreq(midiNote);

    const panMap = { soprano: -0.4, alto: -0.15, tenor: 0.15, bass: 0.4 };
    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (panner) panner.pan.setValueAtTime(panMap[part] || 0, now);

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = part === 'bass' ? 'sawtooth' : (part === 'soprano' ? 'sine' : 'triangle');
    osc2.type = 'sine';

    osc1.frequency.setValueAtTime(freq, now);
    osc2.frequency.setValueAtTime(freq * 2, now);

    const gainNode = ctx.createGain();
    const partVol = this.satbVolumes[part] || 1.0;

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.35 * partVol, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(part === 'soprano' ? 3500 : (part === 'bass' ? 1200 : 2400), now);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gainNode);

    if (panner) {
      gainNode.connect(panner);
      panner.connect(this.masterGain);
    } else {
      gainNode.connect(this.masterGain);
    }

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + dur + 0.05);
    osc2.stop(now + dur + 0.05);
  }

  playCelebrationFanfare() {
    this.init();
    const notes = [60, 64, 67, 72];
    notes.forEach((n, idx) => {
      setTimeout(() => {
        this.playNote(n);
        setTimeout(() => this.stopNote(n), 400);
      }, idx * 120);
    });
  }

  playNote(midiNote) {
    this.init();

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    if (this.activeNotes.has(midiNote)) {
      this.stopNote(midiNote);
    }

    const now = this.audioCtx.currentTime;
    const freq = this.midiToFreq(midiNote);

    const osc1 = this.audioCtx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, now);

    const osc2 = this.audioCtx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2, now);

    const osc3 = this.audioCtx.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(freq * 3, now);

    const osc1Gain = this.audioCtx.createGain();
    const osc2Gain = this.audioCtx.createGain();
    const osc3Gain = this.audioCtx.createGain();

    osc1Gain.gain.setValueAtTime(0.6, now);
    osc2Gain.gain.setValueAtTime(0.3, now);
    osc3Gain.gain.setValueAtTime(0.1, now);

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 4, now);
    filter.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 1.2);
    filter.Q.setValueAtTime(1.0, now);

    const noteGain = this.audioCtx.createGain();
    noteGain.gain.setValueAtTime(0, now);
    noteGain.gain.linearRampToValueAtTime(0.8, now + 0.006);
    noteGain.gain.exponentialRampToValueAtTime(0.35, now + 0.4);

    osc1.connect(osc1Gain);
    osc2.connect(osc2Gain);
    osc3.connect(osc3Gain);

    osc1Gain.connect(filter);
    osc2Gain.connect(filter);
    osc3Gain.connect(filter);

    filter.connect(noteGain);
    noteGain.connect(this.masterGain);
    noteGain.connect(this.delayNode);

    osc1.start(now);
    osc2.start(now);
    osc3.start(now);

    this.activeNotes.set(midiNote, {
      oscillators: [osc1, osc2, osc3],
      gain: noteGain,
      filter: filter,
      startTime: now
    });
  }

  stopNote(midiNote) {
    if (!this.activeNotes.has(midiNote)) return;

    const now = this.audioCtx.currentTime;
    const noteObj = this.activeNotes.get(midiNote);
    this.activeNotes.delete(midiNote);

    const gainNode = noteObj.gain;

    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(gainNode.gain.value || 0.35, now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

    setTimeout(() => {
      noteObj.oscillators.forEach(osc => {
        try {
          osc.stop();
          osc.disconnect();
        } catch(e) {}
      });
      try {
        gainNode.disconnect();
        if (noteObj.filter) noteObj.filter.disconnect();
      } catch(e) {}
    }, 600);
  }

  stopAllNotes() {
    Array.from(this.activeNotes.keys()).forEach(n => this.stopNote(n));
  }

  startPitchPipeTone(midiNote, profile = this.soundProfile) {
    this.stopAllNotes();
    this.init();
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const now = this.audioCtx.currentTime;
    const freq = this.midiToFreq(midiNote);

    const osc1 = this.audioCtx.createOscillator();
    const osc2 = this.audioCtx.createOscillator();
    const noteGain = this.audioCtx.createGain();

    if (profile === 'organ') {
      osc1.type = 'sawtooth';
      osc2.type = 'square';
      osc1.frequency.setValueAtTime(freq, now);
      osc2.frequency.setValueAtTime(freq * 2, now);
    } else if (profile === 'sine') {
      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(freq, now);
      osc2.frequency.setValueAtTime(freq, now);
    } else if (profile === 'flute') {
      osc1.type = 'triangle';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(freq, now);
      osc2.frequency.setValueAtTime(freq * 3, now);
    } else { // 'choir' default
      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, now);
      osc2.frequency.setValueAtTime(freq * 2, now);
    }

    noteGain.gain.setValueAtTime(0, now);
    noteGain.gain.linearRampToValueAtTime(0.45, now + 0.08);

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(profile === 'organ' ? 4500 : 2800, now);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(noteGain);

    noteGain.connect(this.masterGain);
    noteGain.connect(this.delayNode);

    osc1.start(now);
    osc2.start(now);

    this.activeNotes.set(midiNote, { oscillators: [osc1, osc2], gain: noteGain, filter });
  }

  playChord(rootMidi, chordType = 'major') {
    this.stopAllNotes();
    let intervals = [0, 4, 7];
    if (chordType === 'minor') intervals = [0, 3, 7];
    if (chordType === 'cadence') intervals = [0, 4, 7, 12];
    if (chordType === 'dom7') intervals = [0, 4, 7, 10];

    intervals.forEach(inv => {
      this.playNote(rootMidi + inv);
    });

    setTimeout(() => {
      intervals.forEach(inv => {
        this.stopNote(rootMidi + inv);
      });
    }, 1800);
  }

  singSyllable(midiNote, syllable, durMs) {
    this.init();
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    const ctx = this.audioCtx;
    const rate = ctx.sampleRate;
    const t0 = ctx.currentTime + 0.01;
    const dur = Math.max(0.28, durMs / 1000);
    const tEnd = t0 + dur;
    const f0 = this.midiToFreq(midiNote);
    const syl = (syllable || 'la').toLowerCase();

    const V = {
      o: [450, 800, 2830],
      u: [350, 700, 2700],
      a: [700, 1150, 2900],
      e: [500, 1750, 2600],
      y: [400, 2000, 2800],
      i: [300, 2250, 3000]
    };
    const C = {
      d: { loci: [200, 1700, 2600], style: 'plosive' },
      t: { loci: [200, 1800, 2700], style: 'plosive' },
      r: { loci: [350, 1100, 1650], style: 'glide' },
      l: { loci: [350, 1000, 3100], style: 'glide' },
      m: { loci: [250, 1000, 2200], style: 'nasal' },
      f: { loci: [400, 1150, 2500], style: 'fricative' },
      s: { loci: [320, 1900, 2800], style: 'fricative' }
    };
    const cons = C[syl.charAt(0)] || C.l;
    const vChar = (syl.slice(1).match(/[aeio]/) || ['a'])[0];
    const vowel = V[vChar];
    let tail = null;
    if (vChar === 'o') tail = V.u;
    if (syl === 're' || syl === 'te' || syl === 'se' || syl === 'le' || syl === 'me') tail = V.y;
    if (syl === 'sol') tail = C.l.loci;

    const glideIn = cons.style === 'plosive' ? 0.06 : 0.11;
    const voiceStart = cons.style === 'fricative' ? t0 + 0.05 : (cons.style === 'plosive' ? t0 + 0.018 : t0);
    const attack = cons.style === 'plosive' ? 0.025 : 0.07;
    const release = Math.min(0.09, dur * 0.25);
    const tailLen = Math.min(0.1, dur * 0.25);

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(f0 * 0.965, voiceStart);
    osc.frequency.linearRampToValueAtTime(f0, voiceStart + 0.06);

    const vib = ctx.createOscillator();
    vib.frequency.setValueAtTime(5.7, t0);
    const vibGain = ctx.createGain();
    vibGain.gain.setValueAtTime(0, t0);
    vibGain.gain.setValueAtTime(0, voiceStart + Math.min(0.22, dur * 0.35));
    vibGain.gain.linearRampToValueAtTime(f0 * 0.0065, voiceStart + Math.min(0.38, dur * 0.65));
    vib.connect(vibGain);
    vibGain.connect(osc.frequency);

    const jit = ctx.createOscillator();
    jit.frequency.setValueAtTime(0.9, t0);
    const jitGain = ctx.createGain();
    jitGain.gain.setValueAtTime(f0 * 0.0022, t0);
    jit.connect(jitGain);
    jitGain.connect(osc.frequency);

    const tilt = ctx.createBiquadFilter();
    tilt.type = 'highshelf';
    tilt.frequency.setValueAtTime(2800, t0);
    tilt.gain.setValueAtTime(-10, t0);
    osc.connect(tilt);

    const bbuf = ctx.createBuffer(1, Math.ceil(rate * (dur + 0.1)), rate);
    const bdata = bbuf.getChannelData(0);
    for (let i = 0; i < bdata.length; i++) bdata[i] = Math.random() * 2 - 1;
    const breath = ctx.createBufferSource();
    breath.buffer = bbuf;
    const breathHp = ctx.createBiquadFilter();
    breathHp.type = 'highpass';
    breathHp.frequency.setValueAtTime(1200, t0);
    const breathGain = ctx.createGain();
    breathGain.gain.setValueAtTime(0.05, t0);
    breath.connect(breathHp);
    breathHp.connect(breathGain);

    const voiceGain = ctx.createGain();
    const formantGains = [1.0, 1.1, 0.6];
    const formantQ = [7, 11, 13];
    [0, 1, 2].forEach(i => {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.setValueAtTime(formantQ[i], t0);
      bp.frequency.setValueAtTime(cons.loci[i], t0);
      bp.frequency.linearRampToValueAtTime(vowel[i], voiceStart + glideIn);
      if (tail) {
        bp.frequency.setValueAtTime(vowel[i], tEnd - tailLen);
        bp.frequency.linearRampToValueAtTime(tail[i], tEnd);
      }
      const fg = ctx.createGain();
      fg.gain.setValueAtTime(formantGains[i], t0);
      tilt.connect(bp);
      breathGain.connect(bp);
      bp.connect(fg);
      fg.connect(voiceGain);
    });

    const ringBp = ctx.createBiquadFilter();
    ringBp.type = 'bandpass';
    ringBp.frequency.setValueAtTime(2900, t0);
    ringBp.Q.setValueAtTime(11, t0);
    const ringGain = ctx.createGain();
    ringGain.gain.setValueAtTime(0.25, t0);
    tilt.connect(ringBp);
    ringBp.connect(ringGain);
    ringGain.connect(voiceGain);

    const warm = ctx.createBiquadFilter();
    warm.type = 'lowpass';
    warm.frequency.setValueAtTime(Math.max(f0 * 1.8, 400), t0);
    const warmGain = ctx.createGain();
    warmGain.gain.setValueAtTime(0.15, t0);
    tilt.connect(warm);
    warm.connect(warmGain);
    warmGain.connect(voiceGain);

    voiceGain.gain.setValueAtTime(0, t0);
    if (cons.style === 'nasal') {
      voiceGain.gain.linearRampToValueAtTime(0.4, t0 + 0.05);
      voiceGain.gain.linearRampToValueAtTime(1, t0 + 0.13);
    } else {
      voiceGain.gain.setValueAtTime(0, voiceStart);
      voiceGain.gain.linearRampToValueAtTime(1, voiceStart + attack);
    }
    voiceGain.gain.setValueAtTime(1, Math.max(voiceStart + attack + 0.01, tEnd - release));
    voiceGain.gain.linearRampToValueAtTime(0.0001, tEnd);

    const out = ctx.createGain();
    out.gain.setValueAtTime(0.9, t0);
    voiceGain.connect(out);
    out.connect(this.masterGain);

    if (cons.style === 'plosive' || cons.style === 'fricative') {
      const nLen = cons.style === 'fricative' ? 0.085 : 0.022;
      const nbuf = ctx.createBuffer(1, Math.ceil(rate * nLen), rate);
      const ndata = nbuf.getChannelData(0);
      for (let i = 0; i < ndata.length; i++) ndata[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = nbuf;
      const nf = ctx.createBiquadFilter();
      nf.type = 'bandpass';
      nf.frequency.setValueAtTime(cons.style === 'fricative' ? (syl.charAt(0) === 's' ? 5600 : 1500) : 3200, t0);
      nf.Q.setValueAtTime(cons.style === 'fricative' ? 0.9 : 1.2, t0);
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(cons.style === 'fricative' ? 0.16 : 0.3, t0);
      ng.gain.exponentialRampToValueAtTime(0.001, t0 + nLen);
      noise.connect(nf);
      nf.connect(ng);
      ng.connect(out);
      noise.start(t0);
    }

    osc.start(voiceStart);
    vib.start(t0);
    jit.start(t0);
    breath.start(t0);
    osc.stop(tEnd + 0.05);
    vib.stop(tEnd + 0.05);
    jit.stop(tEnd + 0.05);
    breath.stop(tEnd + 0.05);
  }

  playClick(accent) {
    this.init();
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(accent ? 1760 : 1175, now);
    const clickGain = this.audioCtx.createGain();
    clickGain.gain.setValueAtTime(accent ? 0.3 : 0.18, now);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
    osc.connect(clickGain);
    clickGain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  setVolume(vol) {
    this.volume = Math.max(0.0, Math.min(1.0, vol));
    if (!this.masterGain) return;
    this.masterGain.gain.setTargetAtTime(this.volume * 0.4, this.audioCtx.currentTime, 0.02);
  }
}

export const synth = new MusicSynth();
export const musicSynth = synth;

window.synth = synth;
window.musicSynth = musicSynth;

