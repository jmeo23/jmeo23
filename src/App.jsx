import React, { useState, useEffect } from 'react'
import { unlockAudio } from './audioEngine.js'
import { PerformView }       from './components/PerformView.jsx'
import { MobilePerformView } from './components/MobilePerformView.jsx'
import { LibraryView }       from './components/LibraryView.jsx'
import { SettingsView }      from './components/SettingsView.jsx'
import { SetlistEditor }     from './components/SetlistEditor.jsx'
import { Sidebar }           from './components/Sidebar.jsx'
import { useMobileView }     from './lib/useMobileView.js'
import { DEMO_SONGS, DEMO_BREAKS } from './demoSongs.js'
import { computeNextSong }   from './lib/setNavigation.js'

const TABS = ['Perform', 'Sets', 'Library', 'Settings']

export default function App() {
  const [view,         setView]         = useState('Perform')
  const [songs,        setSongs]        = useState(DEMO_SONGS)
  const [breaks,       setBreaks]       = useState(DEMO_BREAKS)
  const [activeSongId, setActiveSongId] = useState(DEMO_SONGS[0]?.id)
  const [loadedGig,    setLoadedGig]    = useState(null)
  const [smState,      setSmState]      = useState('idle')
  const [setsDirty,    setSetsDirty]    = useState(false)
  const [drawerOpen,   setDrawerOpen]   = useState(false)

  const isMobile = useMobileView()

  useEffect(() => {
    document.addEventListener('touchstart', unlockAudio, { once: true })
    window.phr0st?.initializeZoom()
    window.phr0st?.getSongs().then(s => { if (s?.length) setSongs(s) })
    window.phr0st?.onSongsUpdated(s => setSongs(s))
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
    setDrawerOpen(false)
  }

  function handleSelectSong(id) {
    setActiveSongId(id)
    setView('Perform')
    setDrawerOpen(false)
  }

  const mainContent = (
    <>
      {view === 'Perform'  && (isMobile
        ? <MobilePerformView song={activeItem} onStateChange={setSmState} nextSong={nextSong} onAutoAdvance={handleAutoAdvance} />
        : <PerformView       song={activeItem} onStateChange={setSmState} nextSong={nextSong} onAutoAdvance={handleAutoAdvance} />
      )}
      {view === 'Library'  && <LibraryView songs={songs} onSelect={s => { setActiveSongId(s.id); setView('Perform') }} />}
      {view === 'Sets'     && <SetlistEditor songs={songs} breaks={breaks} onLoadGig={(gig) => { setLoadedGig(gig); setView('Perform') }} onDirtyChange={setSetsDirty} />}
      {view === 'Settings' && <SettingsView />}
    </>
  )

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0d0d14', color: '#e0e0f0', position: 'relative' }}>

        {/* Mobile top bar */}
        <div style={{ background: '#13132a', padding: '10px 14px 8px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '2px solid #1e1e3a', flexShrink: 0 }}>
          <span onClick={() => setView('Perform')} style={{ fontFamily: "'Pix32', monospace", color: '#a855f7', fontSize: '1rem', letterSpacing: '0.04em', textShadow: '0 0 18px #a855f766', userSelect: 'none', cursor: 'pointer' }}>phr0stOS</span>
          <span style={{ width: 1, height: 14, background: '#2a2a3a' }} />
          <span style={{ color: '#c0c0d8', fontWeight: 700, fontSize: '0.9rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {activeItem?.title ?? activeItem?.name}
          </span>
          <span style={{
            fontSize: '0.55rem', padding: '3px 8px', borderRadius: 10, fontWeight: 700,
            fontFamily: "'VCR', monospace", userSelect: 'none',
            background: smState === 'idle' ? 'transparent' : '#a855f711',
            color: smState === 'idle' ? '#2a2a4a' : '#a855f7',
            border: `1px solid ${smState === 'idle' ? '#1e1e3a' : '#a855f744'}`,
          }}>
            {smState === 'idle' ? '● IDLE' : '● LIVE'}
          </span>
          <button
            onClick={() => setDrawerOpen(v => !v)}
            style={{ background: 'none', border: 'none', color: drawerOpen ? '#a855f7' : '#555', fontSize: '1.3rem', cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}
          >
            {drawerOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {mainContent}

          {/* Hamburger drawer */}
          {drawerOpen && (
            <>
              <div
                onClick={() => setDrawerOpen(false)}
                style={{ position: 'absolute', inset: 0, background: '#00000077', zIndex: 9 }}
              />
              <div style={{
                position: 'absolute', top: 0, left: 0, bottom: 0, width: 220,
                background: '#0b0b18', borderRight: '1px solid #1a1a2e',
                display: 'flex', flexDirection: 'column', zIndex: 10, overflowY: 'auto',
              }}>
                <div style={{ padding: '10px 14px 6px', borderBottom: '1px solid #12121f', flexShrink: 0 }}>
                  <div style={{ fontFamily: "'VCR', monospace", fontSize: '0.55rem', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.14em' }}>Tonight's Set</div>
                  {loadedGig?.label && (
                    <div style={{ fontSize: '0.68rem', color: '#6060a0', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loadedGig.label}</div>
                  )}
                </div>

                {!loadedGig ? (
                  <div style={{ padding: '14px 12px' }}>
                    <div style={{ fontFamily: "'VCR', monospace", fontSize: '0.58rem', color: '#2a2a4a', marginBottom: 8 }}>No set loaded</div>
                    <button onClick={() => handleTabChange('Sets')} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #a855f744', background: '#a855f711', color: '#a855f7', fontSize: '0.65rem', cursor: 'pointer' }}>Open Sets →</button>
                  </div>
                ) : (
                  loadedGig.sets.map((set, si) => {
                    const setSongs = set.songs.map(id => songs.find(s => s.id === id) ?? breaks.find(b => b.id === id)).filter(Boolean)
                    return (
                      <React.Fragment key={si}>
                        {loadedGig.sets.length > 1 && (
                          <div style={{ padding: '7px 12px 6px', background: '#13110a', borderBottom: '1px solid #2a2000' }}>
                            <span style={{ fontFamily: "'VCR', monospace", fontSize: '0.68rem', color: '#daa520', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{set.name}</span>
                          </div>
                        )}
                        {setSongs.map((item, i) => {
                          const isBreak  = item.type === 'break'
                          const isActive = !isBreak && activeSongId === item.id
                          if (isBreak) {
                            return (
                              <div key={`${item.id}-${i}`} style={{ padding: '5px 12px', fontSize: '0.65rem', borderBottom: '1px solid #0f0f1c', borderLeft: '3px solid #f59e0b44', background: '#0f0d00', color: '#f59e0b' }}>
                                <span style={{ fontFamily: "'VCR', monospace", fontSize: '0.55rem', color: '#9a7000', marginRight: 6 }}>{i + 1}</span>
                                {item.name}
                              </div>
                            )
                          }
                          return (
                            <div key={item.id} onClick={() => handleSelectSong(item.id)} style={{
                              padding: '9px 12px', fontSize: '0.82rem', cursor: 'pointer',
                              borderBottom: '1px solid #0f0f1c',
                              color: isActive ? '#22c55e' : '#a0a0c8',
                              background: isActive ? '#091409' : 'transparent',
                              borderLeft: `3px solid ${isActive ? '#22c55e' : 'transparent'}`,
                              display: 'flex', alignItems: 'center', gap: 8,
                            }}>
                              <span style={{ fontFamily: "'VCR', monospace", fontSize: '0.6rem', color: isActive ? '#22c55e55' : '#222', width: 14 }}>{i + 1}</span>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
                            </div>
                          )
                        })}
                      </React.Fragment>
                    )
                  })
                )}

                {/* Nav links */}
                <div style={{ marginTop: 'auto', padding: '12px 14px', borderTop: '1px solid #12121f', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {['Sets', 'Library', 'Settings'].map(tab => (
                    <button key={tab} onClick={() => handleTabChange(tab)} style={{
                      background: 'none', border: 'none', color: '#a855f7', fontSize: '0.75rem',
                      cursor: 'pointer', textAlign: 'left', padding: 0, fontFamily: 'inherit',
                    }}>{tab} →</button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // Desktop layout (unchanged)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0d0d14', color: '#e0e0f0' }}>
      <div style={{ background: '#13132a', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '2px solid #1e1e3a', flexShrink: 0 }}>
        <span style={{
          fontFamily: "'EmojiFont', 'Segoe UI Emoji', sans-serif",
          fontSize: '1.3rem', lineHeight: 1,
          color: smState === 'idle' ? '#6060a0' : '#a855f7',
          textShadow: smState !== 'idle' ? '0 0 14px #a855f7cc' : 'none',
          transition: 'color 0.4s, text-shadow 0.4s',
          userSelect: 'none', width: 22, textAlign: 'center',
        }}>
          {smState === 'idle' ? 't' : '♪'}
        </span>
        <span onClick={() => setView('Perform')} style={{ fontFamily: "'Pix32', monospace", color: '#a855f7', fontSize: '1.1rem', letterSpacing: '0.04em', textShadow: '0 0 18px #a855f766', userSelect: 'none', cursor: 'pointer' }}>phr0stOS</span>
        <span style={{ width: 1, height: 16, background: '#2a2a3a' }} />
        <span style={{ color: '#c0c0d8', fontWeight: 700, fontSize: '0.85rem' }}>{activeItem?.title ?? activeItem?.name}</span>
        {activeItem?.type !== 'break' && <>
          <span style={{ color: '#444', fontSize: '0.7rem' }}>{activeItem?.artist}</span>
          <span style={{ color: '#333', fontSize: '0.65rem' }}>{activeItem?.bpm} BPM</span>
        </>}
        <span style={{
          marginLeft: 'auto',
          background: smState === 'idle' ? 'transparent' : '#a855f711',
          color: smState === 'idle' ? '#2a2a4a' : '#a855f7',
          fontSize: '0.6rem', padding: '3px 10px', borderRadius: 12,
          border: `1px solid ${smState === 'idle' ? '#1e1e3a' : '#a855f744'}`,
          fontWeight: 700, fontFamily: "'VCR', monospace",
          transition: 'all 0.4s', userSelect: 'none',
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
          {mainContent}
        </div>
      </div>
    </div>
  )
}
