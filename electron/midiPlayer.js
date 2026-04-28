const fs        = require('fs')
const { parseMidi } = require('midi-file')

function createMidiPlayer({ filePath, onNote, onDone }) {
  let timers = []
  let active = false

  function play() {
    stop()
    active = true

    const buf = fs.readFileSync(filePath)
    const mid = parseMidi(buf)
    const ppq = mid.header.ticksPerBeat ?? 480

    // Flatten all tracks into absolute-tick events
    const allEvents = []
    for (const track of mid.tracks) {
      let tick = 0
      for (const ev of track) {
        tick += ev.deltaTime
        allEvents.push({ ...ev, absTick: tick })
      }
    }
    allEvents.sort((a, b) => a.absTick - b.absTick)

    // Build tempo map so tempo changes mid-file are handled correctly
    const tempoMap = [{ tick: 0, tempo: 500000, ms: 0 }]
    for (const ev of allEvents) {
      if (ev.type === 'setTempo') {
        const last = tempoMap[tempoMap.length - 1]
        const ms   = last.ms + (ev.absTick - last.tick) * last.tempo / ppq / 1000
        tempoMap.push({ tick: ev.absTick, tempo: ev.microsecondsPerBeat, ms })
      }
    }

    function tickToMs(tick) {
      let seg = tempoMap[0]
      for (let i = tempoMap.length - 1; i >= 0; i--) {
        if (tempoMap[i].tick <= tick) { seg = tempoMap[i]; break }
      }
      return seg.ms + (tick - seg.tick) * seg.tempo / ppq / 1000
    }

    let maxMs = 0
    for (const ev of allEvents) {
      if (ev.type === 'noteOn' && ev.velocity > 0) {
        const ms = tickToMs(ev.absTick)
        maxMs = Math.max(maxMs, ms)
        const t = setTimeout(() => {
          if (active) onNote({ note: ev.noteNumber, velocity: ev.velocity, channel: ev.channel })
        }, ms)
        timers.push(t)
      }
    }

    if (maxMs > 0) {
      timers.push(setTimeout(() => { active = false; onDone?.() }, maxMs + 500))
    } else {
      active = false
      onDone?.()
    }
  }

  function stop() {
    timers.forEach(t => clearTimeout(t))
    timers = []
    if (active) { active = false; onDone?.() }
  }

  return { play, stop, get isPlaying() { return active } }
}

module.exports = { createMidiPlayer }
