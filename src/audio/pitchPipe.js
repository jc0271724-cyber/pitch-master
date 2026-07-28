// Pitch Pipe Web Audio Bridge for PitchMaster
import { synth } from '../synth.js';

class PitchPipeEngine {
  constructor() {
    this.tuningA4 = 440;
    this.instrument = 'choir';
    this.isPlaying = false;
    this.currentNote = null;
  }

  setTuning(freqHz) {
    this.tuningA4 = parseFloat(freqHz) || 440;
    synth.setTuning(this.tuningA4);
  }

  setInstrument(type) {
    this.instrument = type;
    synth.setSoundProfile(type);
  }

  getNoteFrequency(noteName) {
    const midi = this.noteToMidi(noteName);
    return synth.midiToFreq(midi);
  }

  midiToFreq(midi) {
    return synth.midiToFreq(midi);
  }

  noteToMidi(noteName) {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const match = (noteName || 'C4').match(/^([A-G]#?)(-?\d+)$/);
    if (!match) return 60;
    return (parseInt(match[2], 10) + 1) * 12 + noteNames.indexOf(match[1]);
  }

  midiToNoteName(midi) {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const semitone = (midi % 12 + 12) % 12;
    const octave = Math.floor(midi / 12) - 1;
    return `${noteNames[semitone]}${octave}`;
  }

  stopAll() {
    synth.stopAllNotes();
    this.isPlaying = false;
    this.currentNote = null;
  }

  playNote(noteName, duration = null) {
    const midi = typeof noteName === 'number' ? noteName : this.noteToMidi(noteName);
    this.currentNote = typeof noteName === 'number' ? this.midiToNoteName(midi) : noteName;
    this.isPlaying = true;

    synth.startPitchPipeTone(midi, this.instrument);

    if (duration) {
      setTimeout(() => {
        synth.stopNote(midi);
        this.isPlaying = false;
      }, duration * 1000);
    }

    return synth.midiToFreq(midi);
  }

  playChord(rootNoteName, chordType = 'major') {
    const midi = typeof rootNoteName === 'number' ? rootNoteName : this.noteToMidi(rootNoteName);
    synth.playChord(midi, chordType);
    this.isPlaying = true;
    this.currentNote = `${this.midiToNoteName(midi)} ${chordType}`;
  }
}

export const pitchPipe = new PitchPipeEngine();
window.pitchPipe = pitchPipe;

