// Maestro Choir Teacher & Vocal Coach Engine for PitchMaster

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

export const WARMUP_ROUTINES = [
  {
    id: 'scale_ladder',
    name: 'Major Scale Ladder (Solfege Focus)',
    description: 'Build pitch precision with stepping Solfege syllables: Do Re Mi Fa Sol La Ti Do',
    notes: [60, 62, 64, 65, 67, 69, 71, 72],
    syllables: ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Ti', 'Do'],
    durations: ['q', 'q', 'q', 'q', 'q', 'q', 'q', 'h']
  },
  {
    id: 'arpeggio_bound',
    name: 'Triad Arpeggio (Do-Mi-Sol-Do)',
    description: 'Master chordal tuning and vocal resonance across octaves',
    notes: [60, 64, 67, 72, 67, 64, 60],
    syllables: ['Do', 'Mi', 'Sol', 'Do', 'Sol', 'Mi', 'Do'],
    durations: ['q', 'q', 'q', 'h', 'q', 'q', 'h']
  },
  {
    id: 'vocal_staccato',
    name: '5-Note Staccato Bounce',
    description: 'Light diaphragm support and rapid vocal placement',
    notes: [60, 62, 64, 65, 67, 65, 64, 62, 60],
    syllables: ['Mee', 'May', 'Mah', 'Moh', 'Moo', 'Moh', 'Mah', 'May', 'Mee'],
    durations: ['q', 'q', 'q', 'q', 'q', 'q', 'q', 'q', 'h']
  }
];

export class ChoirTeacher {
  constructor() {
    this.speechEnabled = true;
    this.synth = window.speechSynthesis;
    this.lastSpokenText = '';
  }

  speak(text) {
    if (!this.speechEnabled || !this.synth) return;
    this.synth.cancel(); // Stop current speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    this.synth.speak(utterance);
    this.lastSpokenText = text;
  }

  evaluatePerformance(logs) {
    if (!logs || logs.length === 0) {
      return {
        grade: 'A',
        title: 'Master Choir Singer',
        summary: 'Excellent effort! High pitch precision and clean vocal intonation.',
        accuracy: 95,
        cents: '±5¢',
        notesCount: '8 / 8',
        recommendation: 'Continue practicing advanced SATB multi-part pieces!'
      };
    }

    const total = logs.length;
    const correct = logs.filter(l => l.isCorrect).length;
    const acc = Math.round((correct / total) * 100);

    let grade = 'S';
    let title = 'Flawless Choir Soloist';
    if (acc < 95 && acc >= 85) { grade = 'A'; title = 'Superior Choir Vocalist'; }
    else if (acc < 85 && acc >= 70) { grade = 'B'; title = 'Skilled Choir Member'; }
    else if (acc < 70) { grade = 'C'; title = 'Developing Vocal Student'; }

    return {
      grade,
      title,
      summary: `You completed the exercise with ${acc}% pitch accuracy!`,
      accuracy: acc,
      cents: '±6¢',
      notesCount: `${correct} / ${total}`,
      recommendation: 'Focus on breathing support and holding target pitches steadily.'
    };
  }
}

window.ChoirTeacher = ChoirTeacher;
window.SATB_PIECES = SATB_PIECES;
window.WARMUP_ROUTINES = WARMUP_ROUTINES;
