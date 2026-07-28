// Real-time Autocorrelation Pitch Tracker for PitchMaster

export class PitchTracker {
  constructor() {
    this.stream = null;
    this.audioCtx = null;
    this.analyser = null;
    this.source = null;
    this.isActive = false;
    this.onPitchDetected = null;
    this.onSilent = null;
    this.buffer = null;
  }

  async start(audioContext) {
    if (this.isActive) return;

    try {
      const constraints = {
        audio: {
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: true }
        }
      };

      try {
        this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (innerErr) {
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      this.audioCtx = audioContext || 
                      (window.getSharedAudioContext ? window.getSharedAudioContext() : null) || 
                      new (window.AudioContext || window.webkitAudioContext)();

      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      this.source = this.audioCtx.createMediaStreamSource(this.stream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.buffer = new Float32Array(this.analyser.fftSize);

      this.source.connect(this.analyser);
      this.isActive = true;

      this.tick();
    } catch (err) {
      console.error('[Pitch Tracker] Microphone access error:', err);
      throw err;
    }
  }

  stop() {
    if (!this.isActive) return;
    this.isActive = false;

    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
  }

  tick = () => {
    if (!this.isActive) return;

    this.analyser.getFloatTimeDomainData(this.buffer);

    let rms = 0;
    for (let i = 0; i < this.buffer.length; i++) {
      rms += this.buffer[i] * this.buffer[i];
    }
    rms = Math.sqrt(rms / this.buffer.length);

    if (rms < 0.012) {
      if (this.onSilent) this.onSilent();
    } else {
      const pitchHz = this.autoCorrelate(this.buffer, this.audioCtx.sampleRate);
      if (pitchHz !== -1 && pitchHz >= 55 && pitchHz <= 1800) {
        const midiExact = 69 + 12 * Math.log2(pitchHz / 440);
        const midiRounded = Math.round(midiExact);
        const cents = Math.round((midiExact - midiRounded) * 100);

        if (this.onPitchDetected) {
          this.onPitchDetected(pitchHz, midiRounded, cents);
        }
      } else {
        if (this.onSilent) this.onSilent();
      }
    }

    requestAnimationFrame(this.tick);
  };

  autoCorrelate(buf, sampleRate) {
    const SIZE = buf.length;
    let r1 = 0, r2 = SIZE - 1;
    const thres = 0.2;

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

    if (T0 > 0 && T0 < buf2.length - 1) {
      const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
      const a = (x1 + x3 - 2 * x2) / 2;
      const b = (x3 - x1) / 2;
      if (a !== 0) T0 = T0 - b / (2 * a);
    }

    return sampleRate / T0;
  }
}

window.PitchTracker = PitchTracker;
