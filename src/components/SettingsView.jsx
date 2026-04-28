import React, { useState, useEffect } from 'react'

function Field({ label, k, type = 'text', settings, onSettingsChange }) {
  return (
    <label style={{ display: 'block', marginBottom: 14, fontSize: '0.8rem', color: '#888' }}>
      {label}
      <input
        type={type}
        value={settings[k] ?? ''}
        onChange={e => onSettingsChange(s => ({ ...s, [k]: type === 'number' ? +e.target.value : e.target.value }))}
        style={{ display: 'block', width: '100%', marginTop: 4, padding: '6px 10px', background: '#131328', border: '1px solid #2a2a3a', borderRadius: 6, color: '#e0e0f0', fontSize: '0.8rem' }}
      />
    </label>
  )
}

export function SettingsView() {
  const [settings, setSettings] = useState({ serialPort: '', midiDevice: '', loopPadNote: 36 })
  const [saved,    setSaved]    = useState(false)

  useEffect(() => {
    window.phr0st?.getSettings().then(s => s && setSettings(s))
  }, [])

  async function handleSave() {
    await window.phr0st?.saveSettings(settings)
    window.phr0st?.sendCommand('dmx:connect',  { path: settings.serialPort })
    window.phr0st?.sendCommand('midi:connect', { portIndex: 0, loopPadNote: settings.loopPadNote })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ padding: 20, color: '#e0e0f0', maxWidth: 420 }}>
      <div style={{ fontWeight: 700, marginBottom: 20, fontSize: '1rem' }}>Settings</div>
      <Field label="Serial Port (DMX — e.g. COM3 or /dev/ttyUSB0)" k="serialPort" settings={settings} onSettingsChange={setSettings} />
      <Field label="MIDI Device Name (e.g. SPD-SX)" k="midiDevice" settings={settings} onSettingsChange={setSettings} />
      <Field label="SPD-SX Loop Pad MIDI Note" k="loopPadNote" type="number" settings={settings} onSettingsChange={setSettings} />
      <button onClick={handleSave} style={{
        padding: '8px 20px', borderRadius: 8, border: '1px solid #a855f766',
        background: '#1a0f2e', color: '#a855f7', cursor: 'pointer', fontSize: '0.8rem',
      }}>
        {saved ? 'Saved ✓' : 'Save & Connect'}
      </button>
    </div>
  )
}
