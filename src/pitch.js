export class PitchTracker {
  constructor() {
    this.stream = null;
    this.audioCtx = null;
    this.analyser = null;
    this.source = null;
    this.isActive = false;
    this.onPitchDetected = null; // Callback: function(frequency, midiNote, centsDeviation)
    this.onSilent = null;        // Callback: function()
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
        console.warn('[Pitch Tracker] Advanced constraints failed, falling back to basic audio', innerErr);
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      
      this.audioCtx = audioContext || 
                      (window.getSharedAudioContext ? window.getSharedAudioContext() : null) || 
                      window.synth.audioCtx || 
                      new (window.AudioContext || window.webkitAudioContext)();
      
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      this.source = this.audioCtx.createMediaStreamSource(this.stream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 2048; // Large enough for good low-frequency resolution, low enough for minimal lag
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
      // Fallback polyfill for browsers/environments lacking getFloat32TimeDomainData
      if (!this.byteBuffer || this.byteBuffer.length !== this.analyser.fftSize) {
        this.byteBuffer = new Uint8Array(this.analyser.fftSize);
      }
      this.analyser.getByteTimeDomainData(this.byteBuffer);
      for (let i = 0; i < this.byteBuffer.length; i++) {
        this.buffer[i] = (this.byteBuffer[i] - 128) / 128;
      }
    }
    
    // Calculate Root Mean Square (RMS) volume to filter out background noise
    let rms = 0;
    for (let i = 0; i < this.buffer.length; i++) {
      rms += this.buffer[i] * this.buffer[i];
    }
    rms = Math.sqrt(rms / this.buffer.length);

    const volumeThreshold = 0.006; // Lowered noise gate threshold for quiet microphones

    if (rms < volumeThreshold) {
      if (this.onSilent) this.onSilent();
    } else {
      const freq = this.detectPitch(this.buffer, this.audioCtx.sampleRate);
      if (freq > 0 && freq >= 60 && freq <= 1400) { // Extended vocal/instrument range (C2 to E6)
        // Convert Frequency to fractional MIDI note
        // f = 440 * 2^((d - 69) / 12)  =>  d = 12 * log2(f/440) + 69
        const fractionalMidi = 12 * Math.log2(freq / 440) + 69;
        const nearestMidi = Math.round(fractionalMidi);
        const centsDeviation = (fractionalMidi - nearestMidi) * 100;
        
        if (this.onPitchDetected) {
          this.onPitchDetected(freq, nearestMidi, centsDeviation);
        }
      } else {
        if (this.onSilent) this.onSilent();
      }
    }

    // Keep polling via requestAnimationFrame
    requestAnimationFrame(() => this.tick());
  }

  // YIN Pitch Detection Algorithm with Cumulative Mean Normalized Difference & Parabolic Interpolation
  detectPitch(buffer, sampleRate) {
    const numSamples = buffer.length;
    
    // RMS Noise Gate check
    let rms = 0;
    for (let i = 0; i < numSamples; i++) {
      rms += buffer[i] * buffer[i];
    }
    rms = Math.sqrt(rms / numSamples);
    if (rms < 0.005) return -1;

    const maxPeriod = Math.min(Math.floor(numSamples / 2), Math.ceil(sampleRate / 60));  // 60 Hz min pitch (C2)
    const minPeriod = Math.floor(sampleRate / 1400); // 1400 Hz max pitch (E6)

    // Step 1: Difference Function d(tau)
    const yinBuffer = new Float32Array(maxPeriod);
    for (let tau = 0; tau < maxPeriod; tau++) {
      let sum = 0;
      for (let i = 0; i < maxPeriod; i++) {
        const delta = buffer[i] - buffer[i + tau];
        sum += delta * delta;
      }
      yinBuffer[tau] = sum;
    }

    // Step 2: Cumulative Mean Normalized Difference Function d'(tau)
    yinBuffer[0] = 1;
    let runningSum = 0;
    for (let tau = 1; tau < maxPeriod; tau++) {
      runningSum += yinBuffer[tau];
      yinBuffer[tau] = (yinBuffer[tau] * tau) / runningSum;
    }

    // Step 3: Absolute Thresholding - find first tau where d'(tau) < threshold
    const threshold = 0.15;
    let tau = minPeriod;

    while (tau < maxPeriod) {
      if (yinBuffer[tau] < threshold) {
        while (tau + 1 < maxPeriod && yinBuffer[tau + 1] < yinBuffer[tau]) {
          tau++;
        }
        break;
      }
      tau++;
    }

    // Fallback if no tau below threshold was found: find global minimum in valid range
    if (tau >= maxPeriod || yinBuffer[tau] >= 0.40) {
      let minVal = Infinity;
      let minTau = -1;
      for (let t = minPeriod; t < maxPeriod; t++) {
        if (yinBuffer[t] < minVal) {
          minVal = yinBuffer[t];
          minTau = t;
        }
      }
      if (minVal > 0.45 || minTau === -1) return -1; // Voicing threshold check
      tau = minTau;
    }

    // Step 4: Parabolic Interpolation for sub-sample accuracy
    let betterTau = tau;
    if (tau > 0 && tau < maxPeriod - 1) {
      const s0 = yinBuffer[tau - 1];
      const s1 = yinBuffer[tau];
      const s2 = yinBuffer[tau + 1];
      const denom = s2 - 2 * s1 + s0;
      if (Math.abs(denom) > 0.00001) {
        betterTau = tau + (s0 - s2) / (2 * denom);
      }
    }

    return sampleRate / betterTau;
  }
}

// Export class globally
window.PitchTracker = PitchTracker;
