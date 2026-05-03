import React, { useState, useEffect, useRef } from 'react'

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

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

export function SettingsView() {
  const [settings,    setSettings]    = useState({ serialPort: '', midiPortIndex: 0, loopPadNote: 36, startSongNote: '', zoom: 1.3 })
  const [midiPorts,   setMidiPorts]   = useState([])
  const [saved,       setSaved]       = useState(false)
  const [playing,     setPlaying]     = useState(false)
  const [noteLog,     setNoteLog]     = useState([])
  const [testFile,    setTestFile]    = useState('test-note36.mid')
  const logRef = useRef(null)

  useEffect(() => {
    window.phr0st?.getSettings().then(s => {
      if (s) {
        setSettings(prev => ({ ...prev, ...s }))
        if (s.zoom) window.phr0st?.setZoomLevel(s.zoom)
      }
    })
    window.phr0st?.listMidiPorts().then(ports => setMidiPorts(ports ?? []))

    const offNote    = window.phr0st?.onMidiNote(({ note, velocity, channel }) => {
      setNoteLog(prev => [{
        note, velocity, channel,
        label: NOTE_NAMES[note % 12] + Math.floor(note / 12 - 1),
        time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      }, ...prev].slice(0, 40))
    })
    const offStopped = window.phr0st?.onMidiPlayerStopped(() => setPlaying(false))

    return () => { offNote?.(); offStopped?.() }
  }, [])

  async function handleSave() {
    await window.phr0st?.saveSettings(settings)
    window.phr0st?.sendCommand('dmx:connect',  { path: settings.serialPort })
    window.phr0st?.sendCommand('midi:connect', {
      portIndex:     settings.midiPortIndex,
      loopPadNote:   settings.loopPadNote,
      startSongNote: settings.startSongNote !== '' ? Number(settings.startSongNote) : null,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ padding: 20, color: '#e0e0f0', maxWidth: 420 }}>
      <div style={{ fontWeight: 700, marginBottom: 20, fontSize: '1rem' }}>Settings</div>

      {/* Zoom Control */}
      <label style={{ display: 'block', marginBottom: 14, fontSize: '0.8rem', color: '#888' }}>
        UI Scale
        <div style={{ display: 'flex', gap: 10, marginTop: 8, alignItems: 'center' }}>
          <button
            onClick={() => {
              const newZoom = Math.max(0.8, settings.zoom - 0.1)
              setSettings(s => ({ ...s, zoom: newZoom }))
              window.phr0st?.setZoomLevel(newZoom)
            }}
            style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #2a2a3a', background: '#131328', color: '#666', fontSize: '0.7rem', cursor: 'pointer' }}
          >−</button>
          <span style={{ fontSize: '0.75rem', color: '#666', minWidth: 50, textAlign: 'center' }}>{Math.round(settings.zoom * 100)}%</span>
          <button
            onClick={() => {
              const newZoom = Math.min(2, settings.zoom + 0.1)
              setSettings(s => ({ ...s, zoom: newZoom }))
              window.phr0st?.setZoomLevel(newZoom)
            }}
            style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #2a2a3a', background: '#131328', color: '#666', fontSize: '0.7rem', cursor: 'pointer' }}
          >+</button>
        </div>
      </label>

      <Field label="Serial Port (DMX — e.g. COM3 or /dev/ttyUSB0)" k="serialPort" settings={settings} onSettingsChange={setSettings} />

      <label style={{ display: 'block', marginBottom: 14, fontSize: '0.8rem', color: '#888' }}>
        MIDI Input Device
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <select
            value={settings.midiPortIndex ?? 0}
            onChange={e => setSettings(s => ({ ...s, midiPortIndex: +e.target.value }))}
            style={{ flex: 1, padding: '6px 10px', background: '#131328', border: '1px solid #2a2a3a', borderRadius: 6, color: '#e0e0f0', fontSize: '0.8rem' }}
          >
            {midiPorts.length === 0
              ? <option value={0}>— No MIDI devices found —</option>
              : midiPorts.map(p => <option key={p.index} value={p.index}>{p.name}</option>)
            }
          </select>
          <button
            onClick={() => window.phr0st?.listMidiPorts().then(ports => setMidiPorts(ports ?? []))}
            style={{ padding: '6px 10px', background: '#131328', border: '1px solid #2a2a3a', borderRadius: 6, color: '#666', fontSize: '0.75rem', cursor: 'pointer' }}
          >↺</button>
        </div>
      </label>

      <Field label="Loop Pad MIDI Note (default 36)" k="loopPadNote" type="number" settings={settings} onSettingsChange={setSettings} />
      <Field label="Start Song MIDI Note (leave blank to disable)" k="startSongNote" settings={settings} onSettingsChange={setSettings} />

      <button onClick={handleSave} style={{
        padding: '8px 20px', borderRadius: 8, border: '1px solid #a855f766',
        background: '#1a0f2e', color: '#a855f7', cursor: 'pointer', fontSize: '0.8rem',
      }}>
        {saved ? 'Saved ✓' : 'Save & Connect'}
      </button>

      {/* ── MIDI Test Player ── */}
      <div style={{ marginTop: 32, borderTop: '1px solid #1e1e3a', paddingTop: 20 }}>
        <div style={{ fontWeight: 700, marginBottom: 12, fontSize: '0.85rem' }}>MIDI Test Player</div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
          <select
            value={testFile}
            onChange={e => setTestFile(e.target.value)}
            disabled={playing}
            style={{ flex: 1, padding: '6px 10px', background: '#131328', border: '1px solid #2a2a3a', borderRadius: 6, color: '#e0e0f0', fontSize: '0.75rem' }}
          >
            <option value="test-note36.mid">test-note36.mid — Note 36 trigger test</option>
            <option value="DKC1_-_Aquatic_Ambience.mid">DKC1_-_Aquatic_Ambience.mid</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            onClick={() => {
              if (playing) {
                window.phr0st?.sendCommand('midi:stopFile', {})
                setPlaying(false)
              } else {
                window.phr0st?.sendCommand('midi:playFile', { file: testFile })
                setPlaying(true)
                setNoteLog([])
              }
            }}
            style={{
              padding: '8px 20px', borderRadius: 8, cursor: 'pointer', fontSize: '0.8rem',
              border: `1px solid ${playing ? '#ef444466' : '#22c55e66'}`,
              background: playing ? '#1a0808' : '#0a1a10',
              color: playing ? '#ef4444' : '#22c55e',
            }}
          >{playing ? '■ Stop' : '▶ Play'}</button>

          <button
            onClick={() => setNoteLog([])}
            style={{ padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: '0.8rem', border: '1px solid #1e1e3a', background: 'transparent', color: '#444' }}
          >Clear</button>
        </div>

        {/* Note monitor */}
        <div ref={logRef} style={{ height: 200, overflowY: 'auto', background: '#0a0a14', border: '1px solid #1a1a2e', borderRadius: 6, fontFamily: 'monospace', fontSize: '0.72rem' }}>
          {noteLog.length === 0
            ? <div style={{ padding: '12px', color: '#2a2a4a' }}>No notes yet — press Play</div>
            : noteLog.map((n, i) => (
              <div key={i} style={{
                padding: '3px 10px', borderBottom: '1px solid #0e0e1a',
                color: n.note === settings.loopPadNote ? '#22c55e' : '#6060a0',
                background: n.note === settings.loopPadNote ? '#091409' : 'transparent',
              }}>
                <span style={{ color: '#333', marginRight: 8 }}>{n.time}</span>
                <span style={{ color: '#a78bfa', width: 28, display: 'inline-block' }}>{n.label}</span>
                <span style={{ color: '#555', marginLeft: 8 }}>#{n.note} vel:{n.velocity} ch:{n.channel + 1}</span>
                {n.note === settings.loopPadNote && <span style={{ color: '#22c55e', marginLeft: 8 }}>← loop pad</span>}
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}
