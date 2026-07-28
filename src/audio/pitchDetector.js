// Real-Time Vocal Microphone Pitch Detector for Pitch Master
// Uses Web Audio API Autocorrelation Algorithm

class PitchDetectorEngine {
  constructor() {
    this.audioCtx = null;
    this.analyser = null;
    this.micStream = null;
    this.isListening = false;
    this.animFrameId = null;
    this.onPitchCallback = null;
    this.tuningA4 = 440;
    this.bufferSize = 2048;
    this.buffer = new Float32Array(this.bufferSize);

    this.noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  }

  setTuning(freq) {
    this.tuningA4 = parseFloat(freq) || 440;
  }

  async start(callback) {
    if (this.isListening) return true;
    this.onPitchCallback = callback;

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();

      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false
        }
      });

      const source = this.audioCtx.createMediaStreamSource(this.micStream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = this.bufferSize;
      source.connect(this.analyser);

      this.isListening = true;
      this.detectLoop();
      return true;
    } catch (err) {
      console.error('Microphone access error:', err);
      return false;
    }
  }

  stop() {
    this.isListening = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach(track => track.stop());
      this.micStream = null;
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }

  detectLoop = () => {
    if (!this.isListening) return;

    this.analyser.getFloatTimeDomainData(this.buffer);

    // Calculate RMS volume level
    let sumSquares = 0;
    for (let i = 0; i < this.buffer.length; i++) {
      sumSquares += this.buffer[i] * this.buffer[i];
    }
    const rms = Math.sqrt(sumSquares / this.buffer.length);

    // Noise gate threshold
    if (rms < 0.012) {
      if (this.onPitchCallback) {
        this.onPitchCallback({
          isSilent: true,
          rms: rms,
          frequency: 0,
          note: '--',
          octave: '',
          cents: 0
        });
      }
    } else {
      const pitchHz = this.autoCorrelate(this.buffer, this.audioCtx.sampleRate);
      if (pitchHz !== -1 && pitchHz >= 55 && pitchHz <= 1800) { // Vocal range limit C2 to A6
        const pitchData = this.getPitchDataFromFrequency(pitchHz);
        if (this.onPitchCallback) {
          this.onPitchCallback({
            isSilent: false,
            rms: rms,
            frequency: pitchHz,
            ...pitchData
          });
        }
      } else {
        if (this.onPitchCallback) {
          this.onPitchCallback({
            isSilent: true,
            rms: rms,
            frequency: 0,
            note: '--',
            octave: '',
            cents: 0
          });
        }
      }
    }

    this.animFrameId = requestAnimationFrame(this.detectLoop);
  };

  // Autocorrelation algorithm for fundamental frequency detection
  autoCorrelate(buf, sampleRate) {
    const SIZE = buf.length;
    let r1 = 0, r2 = SIZE - 1;
    const thres = 0.2;

    // Truncate silence at edges
    for (let i = 0; i < SIZE / 2; i++) {
      if (Math.abs(buf[i]) < thres) { r1 = i; break; }
    }
    for (let i = 1; i < SIZE / 2; i++) {
      if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }
    }

    const buf2 = buf.slice(r1, r2);
    const c = new Float32Array(buf2.length);

    for (let i = 0; i < buf2.length; i++) {
      for (let j = 0; j < buf2.length - i; j++) {
        c[i] = c[i] + buf2[j] * buf2[j + i];
      }
    }

    let d = 0;
    while (c[d] > c[d + 1]) d++;

    let maxval = -1, maxpos = -1;
    for (let i = d; i < buf2.length; i++) {
      if (c[i] > maxval) {
        maxval = c[i];
        maxpos = i;
      }
    }

    let T0 = maxpos;

    // Parabolic interpolation for fine frequency accuracy
    if (T0 > 0 && T0 < buf2.length - 1) {
      const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
      const a = (x1 + x3 - 2 * x2) / 2;
      const b = (x3 - x1) / 2;
      if (a !== 0) T0 = T0 - b / (2 * a);
    }

    return sampleRate / T0;
  }

  getPitchDataFromFrequency(freq) {
    // MIDI number = 69 + 12 * log2(freq / A4)
    const midiNumber = 69 + 12 * (Math.log(freq / this.tuningA4) / Math.log(2));
    const roundedMidi = Math.round(midiNumber);

    // Cents offset = (midiNumber - roundedMidi) * 100
    const cents = Math.round((midiNumber - roundedMidi) * 100);

    const noteIndex = (roundedMidi % 12 + 12) % 12;
    const octave = Math.floor(roundedMidi / 12) - 1;
    const noteName = this.noteNames[noteIndex];

    // Target perfect frequency for nearest note
    const targetFreq = this.tuningA4 * Math.pow(2, (roundedMidi - 69) / 12);

    return {
      note: noteName,
      octave: octave,
      fullNote: `${noteName}${octave}`,
      cents: cents,
      targetFreq: targetFreq,
      midi: roundedMidi
    };
  }
}

export const pitchDetector = new PitchDetectorEngine();
