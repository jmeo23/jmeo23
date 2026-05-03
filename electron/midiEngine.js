const midi = require('midi')

function createMidiEngine({ onPad }) {
  const input = new midi.Input()
  const output = new midi.Output()
  let inputPortIndex = -1
  let outputPortIndex = -1

  function listInputPorts() {
    const ports = []
    for (let i = 0; i < input.getPortCount(); i++) {
      ports.push({ index: i, name: input.getPortName(i) })
    }
    return ports
  }

  function listOutputPorts() {
    const ports = []
    for (let i = 0; i < output.getPortCount(); i++) {
      ports.push({ index: i, name: output.getPortName(i) })
    }
    return ports
  }

  function connectInput(index) {
    if (inputPortIndex !== -1) input.closePort()
    inputPortIndex = index
    input.openPort(index)
    input.on('message', (_, msg) => {
      const [status, note, velocity] = msg
      const isNoteOn = (status & 0xF0) === 0x90 && velocity > 0
      if (isNoteOn) onPad(note)
    })
  }

  function connectOutput(index) {
    if (outputPortIndex !== -1) output.closePort()
    outputPortIndex = index
    output.openPort(index)
  }

  function sendNoteOn(note, velocity = 127, channel = 0) {
    if (outputPortIndex === -1) return
    output.sendMessage([0x90 + channel, note, velocity])
  }

  function sendNoteOff(note, channel = 0) {
    if (outputPortIndex === -1) return
    output.sendMessage([0x80 + channel, note, 0])
  }

  function disconnectInput() {
    if (inputPortIndex !== -1) { input.closePort(); inputPortIndex = -1 }
  }

  function disconnectOutput() {
    if (outputPortIndex !== -1) { output.closePort(); outputPortIndex = -1 }
  }

  function disconnect() {
    disconnectInput()
    disconnectOutput()
  }

  return {
    listInputPorts,
    listOutputPorts,
    connectInput,
    connectOutput,
    sendNoteOn,
    sendNoteOff,
    disconnectInput,
    disconnectOutput,
    disconnect,
  }
}

module.exports = { createMidiEngine }
