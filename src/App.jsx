import React, { useState, useEffect } from 'react'
import { PerformView }   from './components/PerformView.jsx'
import { LibraryView }   from './components/LibraryView.jsx'
import { SettingsView }  from './components/SettingsView.jsx'
import { Sidebar }       from './components/Sidebar.jsx'
import { DEMO_SONGS }    from './demoSongs.js'

const TABS = ['Perform', 'Library', 'Settings']

export default function App() {
  const [view,          setView]          = useState('Perform')
  const [songs,         setSongs]         = useState(DEMO_SONGS)
  const [activeSongId,  setActiveSongId]  = useState(DEMO_SONGS[0]?.id)
  const [setlist,       setSetlist]       = useState(DEMO_SONGS.map(s => s.id))

  useEffect(() => {
    window.phr0st?.getSongs().then(s  => { if (s?.length) setSongs(s) })
    window.phr0st?.onSongsUpdated(s   => setSongs(s))
    window.phr0st?.onStateUpdate(data => {
      if (data.event === 'midi:loopPad') {
        // Handled inside PerformView via smRef — nothing needed here
      }
    })
  }, [])

  const activeSong = songs.find(s => s.id === activeSongId) ?? songs[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0d0d14', color: '#e0e0f0' }}>
      {/* Top bar */}
      <div style={{ background: '#13132a', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '2px solid #2a2a3a', flexShrink: 0 }}>
        <span style={{ color: '#a855f7', fontWeight: 900, fontSize: '1rem', letterSpacing: '0.06em' }}>phr0stOS</span>
        <span style={{ color: '#e0e0f0', fontWeight: 700, fontSize: '0.9rem' }}>{activeSong?.title}</span>
        <span style={{ color: '#555', fontSize: '0.75rem' }}>{activeSong?.artist} · {activeSong?.bpm} BPM · {activeSong?.key}</span>
        <span style={{ marginLeft: 'auto', background: '#22c55e22', color: '#22c55e', fontSize: '0.65rem', padding: '3px 10px', borderRadius: 12, border: '1px solid #22c55e66', fontWeight: 700 }}>● LIVE</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setView(tab)} style={{
              padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.7rem',
              background: view === tab ? '#a855f722' : 'transparent',
              color:      view === tab ? '#a855f7'   : '#555',
            }}>{tab}</button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar
          songs={songs}
          setlist={setlist}
          activeSongId={activeSongId}
          onSelectSong={(id) => { setActiveSongId(id); setView('Perform') }}
        />
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {view === 'Perform'  && <PerformView song={activeSong} />}
          {view === 'Library'  && <LibraryView songs={songs} onSelect={s => { setActiveSongId(s.id); setView('Perform') }} />}
          {view === 'Settings' && <SettingsView />}
        </div>
      </div>
    </div>
  )
}
