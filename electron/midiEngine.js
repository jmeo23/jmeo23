const midi = require('midi')

function createMidiEngine({ onPad }) {
  const input = new midi.Input()
  let portIndex = -1

  function listPorts() {
    const ports = []
    for (let i = 0; i < input.getPortCount(); i++) {
      ports.push({ index: i, name: input.getPortName(i) })
    }
    return ports
  }

  function connect(index) {
    if (portIndex !== -1) input.closePort()
    portIndex = index
    input.openPort(index)
    input.on('message', (_, msg) => {
      const [status, note, velocity] = msg
      const isNoteOn = (status & 0xF0) === 0x90 && velocity > 0
      if (isNoteOn) onPad(note)
    })
  }

  function disconnect() {
    if (portIndex !== -1) { input.closePort(); portIndex = -1 }
  }

  return { listPorts, connect, disconnect }
}

module.exports = { createMidiEngine }
