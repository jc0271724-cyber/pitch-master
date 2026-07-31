// Music Theory & Solfege Engine for Pitch Master

export const KEY_SIGNATURES = {
  'C_maj':  { name: 'C Major / A Minor', type: 'sharp', count: 0, rootMidi: 60, rootName: 'C' },
  'G_maj':  { name: 'G Major / E Minor', type: 'sharp', count: 1, rootMidi: 67, rootName: 'G' },
  'D_maj':  { name: 'D Major / B Minor', type: 'sharp', count: 2, rootMidi: 62, rootName: 'D' },
  'A_maj':  { name: 'A Major / F# Minor', type: 'sharp', count: 3, rootMidi: 69, rootName: 'A' },
  'E_maj':  { name: 'E Major / C# Minor', type: 'sharp', count: 4, rootMidi: 64, rootName: 'E' },
  'B_maj':  { name: 'B Major / G# Minor', type: 'sharp', count: 5, rootMidi: 71, rootName: 'B' },
  'F#_maj': { name: 'F# Major / D# Minor', type: 'sharp', count: 6, rootMidi: 66, rootName: 'F#' },
  'Fs_maj': { name: 'F# Major / D# Minor', type: 'sharp', count: 6, rootMidi: 66, rootName: 'F#' },
  'C#_maj': { name: 'C# Major / A# Minor', type: 'sharp', count: 7, rootMidi: 61, rootName: 'C#' },
  'Cs_maj': { name: 'C# Major / A# Minor', type: 'sharp', count: 7, rootMidi: 61, rootName: 'C#' },
  'F_maj':  { name: 'F Major / D Minor', type: 'flat',  count: 1, rootMidi: 65, rootName: 'F' },
  'Bb_maj': { name: 'Bb Major / G Minor', type: 'flat',  count: 2, rootMidi: 70, rootName: 'Bb' },
  'Eb_maj': { name: 'Eb Major / C Minor', type: 'flat',  count: 3, rootMidi: 63, rootName: 'Eb' },
  'Ab_maj': { name: 'Ab Major / F Minor', type: 'flat',  count: 4, rootMidi: 68, rootName: 'Ab' },
  'Db_maj': { name: 'Db Major / Bb Minor', type: 'flat',  count: 5, rootMidi: 61, rootName: 'Db' },
  'Gb_maj': { name: 'Gb Major / Eb Minor', type: 'flat',  count: 6, rootMidi: 66, rootName: 'Gb' },
  'Cb_maj': { name: 'Cb Major / Ab Minor', type: 'flat',  count: 7, rootMidi: 71, rootName: 'Cb' }
};

// Standard Note Names
const NOTE_NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_NAMES_FLAT  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Chromatic Movable Do Solfege syllables (0 to 11 semitones from Key Tonic)
const MOVABLE_DO_SYLLABLES = [
  'Do',  // 0 semitones
  'Di',  // 1
  'Re',  // 2
  'Ri',  // 3
  'Mi',  // 4
  'Fa',  // 5
  'Fi',  // 6
  'Sol', // 7
  'Si',  // 8
  'La',  // 9
  'Li',  // 10
  'Ti'   // 11
];

// Fixed Do Solfege syllables for pitch C through B
const FIXED_DO_SYLLABLES = [
  'Do',  // C
  'Di',  // C#
  'Re',  // D
  'Ri',  // D#
  'Mi',  // E
  'Fa',  // F
  'Fi',  // F#
  'Sol', // G
  'Si',  // G#
  'La',  // A
  'Li',  // A#
  'Ti'   // B
];

// Convert MIDI number to Note Name (e.g. 60 -> C4)
export function midiToNoteName(midi, keyKey = 'C_maj') {
  if (midi === null || midi === undefined) return '—';
  const key = KEY_SIGNATURES[keyKey] || KEY_SIGNATURES['C_maj'];
  const noteIdx = (midi % 12 + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  const nameArray = key.type === 'flat' ? NOTE_NAMES_FLAT : NOTE_NAMES_SHARP;
  return `${nameArray[noteIdx]}${octave}`;
}

// Convert MIDI number to Solfege Syllable based on selected system and key signature
export function midiToSolfege(midi, keyKey = 'C_maj', system = 'major') {
  if (midi === null || midi === undefined) return '—';
  const key = KEY_SIGNATURES[keyKey] || KEY_SIGNATURES['C_maj'];
  const pitchClass = (midi % 12 + 12) % 12;

  if (system === 'fixed') {
    return FIXED_DO_SYLLABLES[pitchClass];
  }

  // Calculate distance in semitones relative to key tonic
  const tonicPitchClass = (key.rootMidi % 12 + 12) % 12;
  const semitonesFromTonic = (pitchClass - tonicPitchClass + 12) % 12;

  if (system === 'minor-la') {
    // La-based minor: Tonic is La (9 semitones above Do)
    // Relative shift: 0 semitones from minor tonic = La
    const laIndex = (semitonesFromTonic + 9) % 12;
    return MOVABLE_DO_SYLLABLES[laIndex];
  }

  // Movable Do (Major or Do-based minor)
  return MOVABLE_DO_SYLLABLES[semitonesFromTonic];
}

// Complete note spelling metadata for staff placement
export function getNoteSpelling(midi, keyConfig = { type: 'sharp', count: 0 }) {
  if (midi === null || midi === undefined) return null;
  const pitchClass = (midi % 12 + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  
  // Step relative to Middle C (C4 = MIDI 60 = Step 0)
  // Standard diatonic white key steps: C=0, D=1, E=2, F=3, G=4, A=5, B=6
  const diatonicSteps = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
  const isAccidental = [1, 3, 6, 8, 10].includes(pitchClass);
  
  let name = midiToNoteName(midi, 'C_maj');
  let step = (octave - 4) * 7 + diatonicSteps[pitchClass];
  
  return {
    midi,
    name,
    octave,
    step,
    isAccidental,
    pitchClass
  };
}

// Master Music Theory Rule Explanation for Key Signatures
export function getSolfegeRuleExplanation(keyKey = 'C_maj') {
  const key = KEY_SIGNATURES[keyKey] || KEY_SIGNATURES['C_maj'];
  
  if (key.count === 0) {
    return `<strong>C Major (0 ♯/♭):</strong> C = <em>Do</em>, D = <em>Re</em>, E = <em>Mi</em>, F = <em>Fa</em>, G = <em>Sol</em>, A = <em>La</em>, B = <em>Ti</em>. Perfect natural scale.`;
  }
  
  if (key.type === 'sharp') {
    const lastSharps = ['F#', 'C#', 'G#', 'D#', 'A#', 'E#', 'B#'];
    const lastSharp = lastSharps[key.count - 1];
    return `<strong>Sharp Rule (${key.count} ♯):</strong> The LAST SHARP (<strong>${lastSharp}</strong>) is ALWAYS <em>Ti</em> (7th degree). Step up 1 half-step to find <em>Do</em> (<strong>${key.rootName}</strong>).`;
  }
  
  const lastFlats = ['Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb', 'Fb'];
  const lastFlat = lastFlats[key.count - 1];
  const secondToLast = key.count > 1 ? lastFlats[key.count - 2] : 'F';
  return `<strong>Flat Rule (${key.count} ♭):</strong> The LAST FLAT (<strong>${lastFlat}</strong>) is ALWAYS <em>Fa</em> (4th degree). The 2nd-to-last flat (<strong>${secondToLast}</strong>) is <em>Do</em> (Tonic).`;
}

