import React, { useState, useEffect } from 'react'
import { PerformView }    from './components/PerformView.jsx'
import { LibraryView }    from './components/LibraryView.jsx'
import { SettingsView }   from './components/SettingsView.jsx'
import { SetlistEditor }  from './components/SetlistEditor.jsx'
import { Sidebar }        from './components/Sidebar.jsx'
import { DEMO_SONGS, DEMO_BREAKS } from './demoSongs.js'
import { computeNextSong } from './lib/setNavigation.js'

const TABS = ['Perform', 'Sets', 'Library', 'Settings']

export default function App() {
  const [view,          setView]          = useState('Perform')
  const [songs,         setSongs]         = useState(DEMO_SONGS)
  const [breaks,        setBreaks]        = useState(DEMO_BREAKS)
  const [activeSongId,  setActiveSongId]  = useState(DEMO_SONGS[0]?.id)
  const [loadedGig,     setLoadedGig]     = useState(null)
  const [smState,       setSmState]       = useState('idle')
  const [setsDirty,     setSetsDirty]     = useState(false)

  useEffect(() => {
    window.phr0st?.getSongs().then(s  => { if (s?.length) setSongs(s) })
    window.phr0st?.onSongsUpdated(s   => setSongs(s))
    window.phr0st?.onStateUpdate(data => {
      if (data.event === 'midi:loopPad') {
        // Handled inside PerformView via smRef — nothing needed here
      }
    })
  }, [])

  const activeItem = songs.find(s => s.id === activeSongId)
    ?? breaks.find(b => b.id === activeSongId)
    ?? songs[0]

  // activeSongId may be a break ID; computeNextSong returns null for breaks (no auto-advance during breaks)
  const nextSong = computeNextSong(loadedGig, songs, activeSongId)

  function handleAutoAdvance() {
    if (nextSong) setActiveSongId(nextSong.id)
  }

  function handleTabChange(tab) {
    if (view === 'Sets' && setsDirty && tab !== 'Sets') {
      if (!window.confirm('You have unsaved changes. Leave without saving?')) return
    }
    setView(tab)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0d0d14', color: '#e0e0f0' }}>
      {/* Top bar */}
      <div style={{ background: '#13132a', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '2px solid #1e1e3a', flexShrink: 0 }}>
        {/* Status glyph */}
        <span style={{
          fontFamily: "'EmojiFont', 'Segoe UI Emoji', sans-serif",
          fontSize: '1.3rem',
          lineHeight: 1,
          color: smState === 'idle' ? '#6060a0' : '#a855f7',
          textShadow: smState !== 'idle' ? '0 0 14px #a855f7cc' : 'none',
          transition: 'color 0.4s, text-shadow 0.4s',
          userSelect: 'none',
          width: 22,
          textAlign: 'center',
        }}>
          {smState === 'idle' ? 't' : '♪'}
        </span>
        {/* App title */}
        <span style={{ fontFamily: "'Pix32', monospace", color: '#a855f7', fontSize: '1.1rem', letterSpacing: '0.04em', textShadow: '0 0 18px #a855f766', userSelect: 'none' }}>phr0stOS</span>
        <span style={{ width: 1, height: 16, background: '#2a2a3a' }} />
        <span style={{ color: '#c0c0d8', fontWeight: 700, fontSize: '0.85rem' }}>{activeItem?.title ?? activeItem?.name}</span>
        {activeItem?.type !== 'break' && <>
          <span style={{ color: '#444', fontSize: '0.7rem' }}>{activeItem?.artist}</span>
          <span style={{ color: '#333', fontSize: '0.65rem' }}>{activeItem?.bpm} BPM</span>
        </>}
        {/* Live / idle badge */}
        <span style={{
          marginLeft: 'auto',
          background: smState === 'idle' ? 'transparent' : '#a855f711',
          color: smState === 'idle' ? '#2a2a4a' : '#a855f7',
          fontSize: '0.6rem', padding: '3px 10px', borderRadius: 12,
          border: `1px solid ${smState === 'idle' ? '#1e1e3a' : '#a855f744'}`,
          fontWeight: 700, fontFamily: "'VCR', monospace",
          transition: 'all 0.4s',
          userSelect: 'none',
        }}>
          {smState === 'idle' ? '● IDLE' : '● LIVE'}
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => handleTabChange(tab)} style={{
              padding: '4px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.7rem',
              background: view === tab ? '#a855f720' : 'transparent',
              color:      view === tab ? '#a855f7'   : '#444',
              fontFamily: 'inherit',
            }}>{tab}</button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar
          songs={songs}
          breaks={breaks}
          loadedGig={loadedGig}
          activeSongId={activeSongId}
          onSelectSong={(id) => { setActiveSongId(id); setView('Perform') }}
          onOpenSets={() => setView('Sets')}
        />
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {view === 'Perform'  && <PerformView song={activeItem} onStateChange={setSmState} nextSong={nextSong} onAutoAdvance={handleAutoAdvance} />}
          {view === 'Library'  && <LibraryView songs={songs} onSelect={s => { setActiveSongId(s.id); setView('Perform') }} />}
          {view === 'Sets'     && <SetlistEditor songs={songs} breaks={breaks} onLoadGig={(gig) => { setLoadedGig(gig); setView('Perform') }} onDirtyChange={setSetsDirty} />}
          {view === 'Settings' && <SettingsView />}
        </div>
      </div>
    </div>
  )
}
