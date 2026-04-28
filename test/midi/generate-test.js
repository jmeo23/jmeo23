// Generates test-note36.mid — a simple MIDI file that fires Note 36 several
// times interspersed with other notes, so you can confirm only 36 triggers
// the loop pad in phr0stOS.
const fs = require('fs')
const path = require('path')
const { writeMidi } = require('midi-file')

const PPQ    = 480          // ticks per quarter note
const TEMPO  = 500000       // microseconds per beat = 120 BPM
const BEAT   = PPQ          // 1 quarter note
const HALF   = PPQ * 2      // half note gap between hits

function noteOn(note, velocity = 100)  { return { type: 'noteOn',  channel: 0, noteNumber: note, velocity } }
function noteOff(note)                 { return { type: 'noteOff', channel: 0, noteNumber: note, velocity: 0 } }

// Build event list with delta times
// Pattern: [other note] pause [NOTE 36] pause  × 4
const events = [
  { deltaTime: 0,    ...{ type: 'setTempo', microsecondsPerBeat: TEMPO } },

  // Hit 1 — a decoy note first, then note 36
  { deltaTime: 0,    ...noteOn(60) },          // C4 — should NOT trigger pad
  { deltaTime: BEAT, ...noteOff(60) },
  { deltaTime: HALF, ...noteOn(36) },          // ← NOTE 36
  { deltaTime: BEAT, ...noteOff(36) },

  // Hit 2
  { deltaTime: HALF, ...noteOn(48) },          // C3 — not 36
  { deltaTime: BEAT, ...noteOff(48) },
  { deltaTime: HALF, ...noteOn(36) },          // ← NOTE 36
  { deltaTime: BEAT, ...noteOff(36) },

  // Hit 3
  { deltaTime: HALF, ...noteOn(38) },          // D2 — close but not 36
  { deltaTime: BEAT, ...noteOff(38) },
  { deltaTime: HALF, ...noteOn(36) },          // ← NOTE 36
  { deltaTime: BEAT, ...noteOff(36) },

  // Hit 4
  { deltaTime: HALF, ...noteOn(36) },          // ← NOTE 36 (final)
  { deltaTime: BEAT, ...noteOff(36) },

  { deltaTime: HALF, ...{ type: 'endOfTrack' } },
]

const midi = {
  header: { format: 0, numTracks: 1, ticksPerBeat: PPQ },
  tracks: [events],
}

const buf = Buffer.from(writeMidi(midi))
const out = path.join(__dirname, 'test-note36.mid')
fs.writeFileSync(out, buf)
console.log(`Written: ${out}`)
console.log(`Events: 4× Note 36, 3× decoy notes (60, 48, 38)`)
