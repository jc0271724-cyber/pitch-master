/**
 * Maestro Choir Teacher & Vocal Coach Engine
 * Provides speech synthesis, warm-up routines, SATB sectional arrangements,
 * live intonation coaching, and graded report card generation.
 */

// Preset SATB Choir Pieces
export const SATB_PIECES = [
  {
    id: 'ode_to_joy',
    title: 'Ode to Joy (Beethoven)',
    key: 'C_maj',
    tempo: 100,
    timeSig: '4/4',
    parts: {
      soprano: [64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 64, 62, 62],
      alto:    [60, 60, 60, 62, 62, 60, 60, 59, 57, 57, 59, 60, 60, 59, 59],
      tenor:   [52, 52, 53, 55, 55, 53, 52, 50, 48, 48, 50, 52, 52, 50, 50],
      bass:    [48, 48, 48, 48, 48, 48, 48, 47, 45, 45, 47, 48, 48, 43, 48]
    },
    durations: ['q','q','q','q','q','q','q','q','q','q','q','q','dq','e','h']
  },
  {
    id: 'doxology',
    title: 'Old 100th (Doxology)',
    key: 'G_maj',
    tempo: 84,
    timeSig: '4/4',
    parts: {
      soprano: [67, 67, 66, 64, 62, 64, 66, 67, 67, 69, 67, 66, 64, 66, 67],
      alto:    [62, 62, 62, 59, 59, 60, 62, 62, 62, 64, 62, 62, 59, 62, 62],
      tenor:   [55, 55, 54, 52, 50, 52, 54, 55, 55, 57, 55, 54, 52, 54, 55],
      bass:    [43, 43, 47, 48, 50, 48, 47, 43, 43, 45, 43, 47, 48, 47, 43]
    },
    durations: ['h','q','q','q','q','q','q','h','q','q','q','q','q','q','h']
  },
  {
    id: 'amazing_grace',
    title: 'Amazing Grace (Traditional)',
    key: 'F_maj',
    tempo: 76,
    timeSig: '3/4',
    parts: {
      soprano: [60, 65, 69, 67, 69, 67, 65, 62, 60],
      alto:    [57, 60, 65, 65, 65, 65, 60, 57, 57],
      tenor:   [53, 57, 60, 60, 60, 60, 57, 53, 53],
      bass:    [41, 45, 48, 48, 48, 48, 45, 41, 41]
    },
    durations: ['q','h','e','e','h','e','e','h','q']
  }
];

// Preset Warm-up Routines
export const WARMUP_ROUTINES = [
  {
    id: 'scale_ladder',
    name: 'Major Scale Ladder (Solfege Focus)',
    description: 'Build pitch precision with stepping Solfege syllables: Do Re Mi Fa Sol La Ti Do',
    notes: [60, 62, 64, 65, 67, 69, 71, 72],
    syllables: ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Ti', 'Do'],
    tip: 'Keep your neck relaxed and support each note with deep abdominal breath.'
  },
  {
    id: 'arpeggio_glide',
    name: '5-Note Arpeggio (Resonance & Support)',
    description: 'Jump smoothly across harmonic intervals: Do Mi Sol Do\' Sol Mi Do',
    notes: [60, 64, 67, 72, 67, 64, 60],
    syllables: ['Do', 'Mi', 'Sol', 'Do', 'Sol', 'Mi', 'Do'],
    tip: 'Place the sound forward in the mask of your face for maximum vocal resonance.'
  },
  {
    id: 'vowel_matching',
    name: 'Vowel Resonance Drill (Ah-Eh-Ee-Oh-Oo)',
    description: 'Sustain pure choral vowels on a comfortable tone',
    notes: [60, 60, 60, 60, 60],
    syllables: ['Ah', 'Eh', 'Ee', 'Oh', 'Oo'],
    tip: 'Keep your tall jaw position consistent as you morph between vowel shapes.'
  },
  {
    id: 'staccato_bounce',
    name: 'Staccato Agility Bounce',
    description: 'Light, crisp onset practice: Do-Do-Do-Do Sol-Sol-Sol-Sol Do',
    notes: [60, 60, 60, 60, 67, 67, 67, 67, 60],
    syllables: ['Ha', 'Ha', 'Ha', 'Ha', 'Ho', 'Ho', 'Ho', 'Ho', 'Ha'],
    tip: 'Use short diaphragm bounces without pushing tension into your throat.'
  }
];

export class ChoirTeacher {
  constructor() {
    this.speechEnabled = true;
    this.synth = window.speechSynthesis || null;
    this.currentVoice = null;
    this.isSpeaking = false;
    this.lastFeedbackTime = 0;
    this.feedbackCooldown = 3500; // minimum ms between live spoken tips
    
    this.initVoices();
  }

  initVoices() {
    if (!this.synth) return;
    const loadVoices = () => {
      const voices = this.synth.getVoices();
      this.currentVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel'))) ||
                         voices.find(v => v.lang.startsWith('en')) ||
                         voices[0];
    };
    loadVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = loadVoices;
    }
  }

  speak(text, priority = false) {
    if (!this.speechEnabled || !this.synth) return;
    
    if (priority) {
      this.synth.cancel();
    } else if (this.synth.speaking) {
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    if (this.currentVoice) {
      utterance.voice = this.currentVoice;
    }
    utterance.rate = 1.0;
    utterance.pitch = 1.05;
    utterance.volume = 0.9;
    
    utterance.onstart = () => { this.isSpeaking = true; };
    utterance.onend = () => { this.isSpeaking = false; };
    utterance.onerror = () => { this.isSpeaking = false; };

    this.synth.speak(utterance);
  }

  stopSpeech() {
    if (this.synth) {
      this.synth.cancel();
      this.isSpeaking = false;
    }
  }

  speakCountIn(timeSig = '4/4', callback) {
    const beats = parseInt(timeSig.split('/')[0]) || 4;
    const words = Array.from({ length: beats }, (_, i) => (i + 1).toString());
    
    let count = 0;
    const interval = setInterval(() => {
      if (count < words.length) {
        this.speak(words[count], true);
        count++;
      } else {
        clearInterval(interval);
        if (callback) callback();
      }
    }, 600);
  }

  provideLiveCoaching(centsOffset, targetNoteName, detectedNoteName) {
    const now = Date.now();
    if (now - this.lastFeedbackTime < this.feedbackCooldown) return null;

    let tip = null;
    if (Math.abs(centsOffset) <= 10) {
      tip = { text: `Spot-on intonation! Pure ${targetNoteName}!`, type: 'perfect' };
    } else if (centsOffset > 15 && centsOffset < 45) {
      tip = { text: `Slightly sharp (+${Math.round(centsOffset)}c). Relax throat tension.`, type: 'sharp' };
    } else if (centsOffset < -15 && centsOffset > -45) {
      tip = { text: `Slightly flat (${Math.round(centsOffset)}c). Lift soft palate and support with air!`, type: 'flat' };
    }

    if (tip) {
      this.lastFeedbackTime = now;
      if (Math.abs(centsOffset) > 15) {
        this.speak(tip.text);
      }
    }
    return tip;
  }

  evaluatePerformance(performanceLog) {
    if (!performanceLog || performanceLog.length === 0) {
      return {
        accuracy: 0,
        avgCents: 0,
        grade: 'N/A',
        title: 'Needs Practice',
        summary: 'No notes recorded. Give it another try!',
        recommendation: 'Start with free-play or warm-ups to calibrate your vocal range.'
      };
    }

    const totalNotes = performanceLog.length;
    const matchedNotes = performanceLog.filter(p => p.matched).length;
    const accuracy = Math.round((matchedNotes / totalNotes) * 100);

    const validCents = performanceLog.filter(p => p.cents !== undefined && !isNaN(p.cents)).map(p => Math.abs(p.cents));
    const avgCents = validCents.length > 0 ? Math.round(validCents.reduce((a, b) => a + b, 0) / validCents.length) : 0;

    let grade = 'C';
    let title = 'Developing Vocalist';
    let summary = 'Solid effort! Consistent practice will sharpen your pitch accuracy.';
    let recommendation = 'Focus on sustaining notes longer and matching reference tones.';

    if (accuracy >= 95 && avgCents <= 12) {
      grade = 'S';
      title = 'Master Choir Vocalist';
      summary = 'Flawless intonation and pitch placement! Outstanding choir performance.';
      recommendation = 'Challenge yourself with higher level sight-reading or multi-part SATB sectionals.';
    } else if (accuracy >= 85) {
      grade = 'A+';
      title = 'Choir Soloist Level';
      summary = 'Exceptional pitch precision and beautiful tonal center!';
      recommendation = 'Work on maintaining breath support on large interval jumps.';
    } else if (accuracy >= 75) {
      grade = 'A';
      title = 'Advanced Section Member';
      summary = 'Great job! Strong vocal control with high note accuracy.';
      recommendation = 'Watch out for slight flatting on note endings.';
    } else if (accuracy >= 60) {
      grade = 'B';
      title = 'Choir Apprentice';
      summary = 'Good effort! You hit many target notes accurately.';
      recommendation = 'Try the Scale Ladder warm-up routine before sight-reading.';
    }

    return {
      accuracy,
      avgCents,
      grade,
      title,
      summary,
      recommendation,
      totalNotes,
      matchedNotes
    };
  }
}

window.ChoirTeacher = ChoirTeacher;
window.SATB_PIECES = SATB_PIECES;
window.WARMUP_ROUTINES = WARMUP_ROUTINES;
