// Microphone Vocal Pitch Tracker (YIN Pitch Detection Algorithm)

export class PitchTracker {
  constructor() {
    this.stream = null;
    this.audioCtx = null;
    this.analyser = null;
    this.source = null;
    this.isActive = false;
    this.onPitchDetected = null; // Callback: (frequency, midiNote, centsDeviation)
    this.onSilent = null;        // Callback: ()
    this.buffer = null;
    this.tuningStandard = 440;
  }

  setTuning(freq) {
    this.tuningStandard = parseFloat(freq) || 440;
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
        console.warn('[Pitch Tracker] Advanced constraints failed, falling back to basic audio', innerErr);
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      this.audioCtx = audioContext || new (window.AudioContext || window.webkitAudioContext)();

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
      console.log('[Pitch Tracker] Microphone connected and listening.');
    } catch (err) {
      console.error('[Pitch Tracker] Failed to access microphone:', err);
      throw err;
    }
  }

  stop() {
    if (!this.isActive) return;
    this.isActive = false;

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }

    if (this.source) {
      this.source.disconnect();
    }

    this.stream = null;
    this.source = null;
    this.analyser = null;
    console.log('[Pitch Tracker] Listening stopped.');
  }

  tick() {
    if (!this.isActive) return;

    if (typeof this.analyser.getFloat32TimeDomainData === 'function') {
      this.analyser.getFloat32TimeDomainData(this.buffer);
    } else {
      if (!this.byteBuffer || this.byteBuffer.length !== this.analyser.fftSize) {
        this.byteBuffer = new Uint8Array(this.analyser.fftSize);
      }
      this.analyser.getByteTimeDomainData(this.byteBuffer);
      for (let i = 0; i < this.byteBuffer.length; i++) {
        this.buffer[i] = (this.byteBuffer[i] - 128) / 128;
      }
    }

    let rms = 0;
    for (let i = 0; i < this.buffer.length; i++) {
      rms += this.buffer[i] * this.buffer[i];
    }
    rms = Math.sqrt(rms / this.buffer.length);

    const volumeThreshold = 0.006;

    if (rms < volumeThreshold) {
      if (this.onSilent) this.onSilent();
    } else {
      const freq = this.detectPitch(this.buffer, this.audioCtx.sampleRate);
      if (freq > 0 && freq >= 60 && freq <= 1200) {
        const fractionalMidi = 12 * Math.log2(freq / this.tuningStandard) + 69;
        const nearestMidi = Math.round(fractionalMidi);
        const centsDeviation = (fractionalMidi - nearestMidi) * 100;

        if (this.onPitchDetected) {
          this.onPitchDetected(freq, nearestMidi, centsDeviation);
        }
      } else {
        if (this.onSilent) this.onSilent();
      }
    }

    requestAnimationFrame(() => this.tick());
  }

  // YIN Pitch Detection Algorithm
  detectPitch(buffer, sampleRate) {
    const numSamples = buffer.length;

    let rms = 0;
    for (let i = 0; i < numSamples; i++) {
      rms += buffer[i] * buffer[i];
    }
    rms = Math.sqrt(rms / numSamples);
    if (rms < 0.005) return -1;

    const maxPeriod = Math.min(Math.floor(numSamples / 2), Math.ceil(sampleRate / 60));
    const minPeriod = Math.floor(sampleRate / 1100);

    const yinBuffer = new Float32Array(maxPeriod);
    for (let tau = 0; tau < maxPeriod; tau++) {
      let sum = 0;
      for (let i = 0; i < maxPeriod; i++) {
        const delta = buffer[i] - buffer[i + tau];
        sum += delta * delta;
      }
      yinBuffer[tau] = sum;
    }

    yinBuffer[0] = 1;
    let runningSum = 0;
    for (let tau = 1; tau < maxPeriod; tau++) {
      runningSum += yinBuffer[tau];
      yinBuffer[tau] *= tau / runningSum;
    }

    const threshold = 0.15;
    let tauEstimate = -1;

    for (let tau = minPeriod; tau < maxPeriod; tau++) {
      if (yinBuffer[tau] < threshold) {
        while (tau + 1 < maxPeriod && yinBuffer[tau + 1] < yinBuffer[tau]) {
          tau++;
        }
        tauEstimate = tau;
        break;
      }
    }

    if (tauEstimate === -1) {
      let minVal = 1000;
      for (let tau = minPeriod; tau < maxPeriod; tau++) {
        if (yinBuffer[tau] < minVal) {
          minVal = yinBuffer[tau];
          tauEstimate = tau;
        }
      }
      if (minVal > 0.4) return -1;
    }

    let betterTau = tauEstimate;
    const x0 = tauEstimate > 0 ? tauEstimate - 1 : tauEstimate;
    const x2 = tauEstimate + 1 < maxPeriod ? tauEstimate + 1 : tauEstimate;

    if (x0 !== tauEstimate && x2 !== tauEstimate) {
      const s0 = yinBuffer[x0];
      const s1 = yinBuffer[tauEstimate];
      const s2 = yinBuffer[x2];
      const denom = (s2 - 2 * s1 + s0);
      if (denom !== 0) {
        betterTau = tauEstimate + (s0 - s2) / (2 * denom);
      }
    }

    return sampleRate / betterTau;
  }
}

export const pitchTracker = new PitchTracker();
