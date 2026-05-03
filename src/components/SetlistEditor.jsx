import React, { useState, useRef, useEffect } from 'react'
import { useMobileView } from '../lib/useMobileView.js'

const VCR = "inherit"
const PIX = "inherit"

function newSet(n) {
  return { id: `s${Date.now()}${n}`, name: `Set ${n}`, songs: [], breakAfterMins: 15 }
}

function newGig() {
  return {
    id: `g${Date.now()}`,
    date: new Date().toISOString().slice(0, 10),
    venue: '',
    sets: [newSet(1)],
  }
}

function estSetMins(items) {
  return Math.round(items.reduce((sum, item) => sum + (item?.type === 'break' ? (item.durationMins ?? 3) : 3.5), 0))
}

function durColor(mins) {
  if (mins >= 50) return '#f87171'
  if (mins >= 40) return '#fbbf24'
  if (mins >= 30) return '#22c55e'
  return '#888'
}

function Btn({ children, color = '#a855f7', disabled, onClick, style = {} }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '4px 12px', borderRadius: 6,
        border: `1px solid ${disabled ? '#1e1e3a' : color + '55'}`,
        background: disabled ? 'transparent' : color + '12',
        color: disabled ? '#2a2a4a' : color,
        fontFamily: VCR, fontSize: '0.62rem', cursor: disabled ? 'default' : 'pointer',
        letterSpacing: '0.06em', opacity: disabled ? 0.5 : 1,
        ...style,
      }}
    >{children}</button>
  )
}

export function SetlistEditor({ songs = [], breaks = [], onLoadGig, onDirtyChange }) {
  const [gigs, setGigs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('phr0st-gigs') || '[]') } catch { return [] }
  })
  const [activeGigId, setActiveGigId] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('phr0st-gigs') || '[]')
      return saved[0]?.id ?? null
    } catch { return null }
  })
  const [query, setQuery]               = useState('')
  const [sortBy, setSortBy]             = useState('az')
  const [dropTarget, setDropTarget]     = useState(null)
  const [loadedSet, setLoadedSet]       = useState(null)
  const [saveFlash, setSaveFlash]         = useState(false)
  const [collapsedSets, setCollapsedSets] = useState(new Set())
  const [breaksCollapsed, setBreaksCollapsed] = useState(false)
  const [songsCollapsed,  setSongsCollapsed]  = useState(false)
  const [mobileTargetSet, setMobileTargetSet] = useState(0)
  const dragRef  = useRef(null)
  const isMobile = useMobileView()
  const savedRef = useRef(localStorage.getItem('phr0st-gigs') || '[]')
  const isDirty  = JSON.stringify(gigs) !== savedRef.current

  const activeGig = gigs.find(g => g.id === activeGigId) ?? null

  function findItem(id) {
    return songs.find(s => s.id === id) ?? breaks.find(b => b.id === id) ?? null
  }

  useEffect(() => { onDirtyChange?.(isDirty) }, [isDirty])

  function save() {
    const json = JSON.stringify(gigs)
    localStorage.setItem('phr0st-gigs', json)
    savedRef.current = json
    setSaveFlash(true)
    setTimeout(() => setSaveFlash(false), 1500)
  }

  function updateGig(updater) {
    setGigs(prev => prev.map(g => g.id === activeGigId ? updater(g) : g))
  }

  function createGig() {
    const g = newGig()
    setGigs(prev => [...prev, g])
    setActiveGigId(g.id)
  }

  function deleteGig(id) {
    setGigs(prev => {
      const next = prev.filter(g => g.id !== id)
      if (activeGigId === id) setActiveGigId(next[0]?.id ?? null)
      return next
    })
    if (loadedSet?.gigId === id) setLoadedSet(null)
  }

  function addSet() {
    if (!activeGig || activeGig.sets.length >= 4) return
    updateGig(g => ({ ...g, sets: [...g.sets, newSet(g.sets.length + 1)] }))
  }

  function removeSet(setIdx) {
    updateGig(g => ({ ...g, sets: g.sets.filter((_, i) => i !== setIdx) }))
    if (loadedSet?.gigId === activeGigId && loadedSet?.setIdx === setIdx) setLoadedSet(null)
  }

  function updateGigField(field, value) {
    updateGig(g => ({ ...g, [field]: value }))
  }

  function updateSetField(setIdx, field, value) {
    updateGig(g => ({
      ...g,
      sets: g.sets.map((s, i) => i === setIdx ? { ...s, [field]: value } : s),
    }))
  }

  function removeItemFromSet(setIdx, itemIdx) {
    updateGig(g => ({
      ...g,
      sets: g.sets.map((s, i) => i === setIdx
        ? { ...s, songs: s.songs.filter((_, j) => j !== itemIdx) }
        : s
      ),
    }))
  }

  function moveItem(setIdx, fromIdx, delta) {
    const toIdx = fromIdx + delta
    updateGig(g => {
      const sets = g.sets.map(s => ({ ...s, songs: [...s.songs] }))
      const [item] = sets[setIdx].songs.splice(fromIdx, 1)
      sets[setIdx].songs.splice(Math.max(0, toIdx), 0, item)
      return { ...g, sets }
    })
  }

  function tapAddToSet(itemId, itemType) {
    if (!activeGig) return
    const si = Math.min(mobileTargetSet, activeGig.sets.length - 1)
    updateGig(g => {
      const sets = g.sets.map(s => ({ ...s, songs: [...s.songs] }))
      if (itemType !== 'break' && sets[si].songs.includes(itemId)) return g
      sets[si].songs.push(itemId)
      return { ...g, sets }
    })
  }

  function handleDrop(e, setIdx, atItemIdx) {
    e.preventDefault()
    e.stopPropagation()
    setDropTarget(null)
    const drag = dragRef.current
    dragRef.current = null
    if (!drag) return

    if (drag.type === 'library') {
      updateGig(g => {
        const sets = g.sets.map(s => ({ ...s, songs: [...s.songs] }))
        if (drag.itemType !== 'break' && sets[setIdx].songs.includes(drag.itemId)) return g
        const at = atItemIdx ?? sets[setIdx].songs.length
        sets[setIdx].songs.splice(at, 0, drag.itemId)
        return { ...g, sets }
      })
    } else if (drag.type === 'set') {
      updateGig(g => {
        const sets = g.sets.map(s => ({ ...s, songs: [...s.songs] }))
        const [removed] = sets[drag.setIdx].songs.splice(drag.itemIdx, 1)
        let at = atItemIdx ?? sets[setIdx].songs.length
        if (drag.setIdx === setIdx && atItemIdx !== undefined && atItemIdx > drag.itemIdx) at--
        sets[setIdx].songs.splice(Math.max(0, at), 0, removed)
        return { ...g, sets }
      })
    }
  }

  const filteredSongs = songs
    .filter(s =>
      s.title.toLowerCase().includes(query.toLowerCase()) ||
      (s.artist ?? '').toLowerCase().includes(query.toLowerCase())
    )
    .slice()
    .sort((a, b) => {
      if (sortBy === 'az')     return a.title.localeCompare(b.title)
      if (sortBy === 'za')     return b.title.localeCompare(a.title)
      if (sortBy === 'artist') return (a.artist ?? '').localeCompare(b.artist ?? '') || a.title.localeCompare(b.title)
      if (sortBy === 'bpm')    return (a.bpm ?? 0) - (b.bpm ?? 0) || a.title.localeCompare(b.title)
      return 0
    })

  const gigItemSet = new Set(activeGig?.sets.flatMap(s => s.songs) ?? [])

  const LABEL = {
    fontFamily: VCR, fontSize: '0.55rem', color: '#a78bfa',
    textTransform: 'uppercase', letterSpacing: '0.12em',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#0d0d14' }}>

      {/* ── Event bar ── */}
      <div style={{ background: '#0f0f1e', borderBottom: '1px solid #1e1e3a', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>

        <select
          value={activeGigId ?? ''}
          onChange={e => setActiveGigId(e.target.value || null)}
          style={{ fontFamily: VCR, fontSize: '0.65rem', background: '#131328', border: '1px solid #2a2a3a', color: '#a78bfa', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', maxWidth: 220 }}
        >
          <option value="">— Select Event —</option>
          {gigs.map(g => (
            <option key={g.id} value={g.id}>
              {g.date}{g.venue ? ` · ${g.venue}` : ''}
            </option>
          ))}
        </select>

        <Btn color="#22c55e" onClick={createGig}>+ New Event/Setlist</Btn>

        {activeGig && (
          <>
            <span style={{ width: 1, height: 16, background: '#1e1e3a', flexShrink: 0 }} />

            <input
              value={activeGig.venue}
              onChange={e => updateGigField('venue', e.target.value)}
              placeholder="Venue name…"
              style={{
                fontFamily: PIX, fontSize: '0.9rem',
                background: 'transparent', border: 'none', borderBottom: '1px solid #2a2a3a',
                color: '#e0e0f0', padding: '2px 4px', width: 240, outline: 'none',
              }}
            />

            <input
              type="date"
              value={activeGig.date}
              onChange={e => updateGigField('date', e.target.value)}
              style={{ fontFamily: VCR, fontSize: '0.65rem', background: '#131328', border: '1px solid #2a2a3a', color: '#888', borderRadius: 6, padding: '4px 8px', colorScheme: 'dark' }}
            />

            <Btn color="#a855f7" disabled={activeGig.sets.length >= 4} onClick={addSet}>+ Add Set</Btn>

            <Btn
              color="#a855f7"
              onClick={() => {
                const label = activeGig.venue || activeGig.date
                onLoadGig?.({ label, sets: activeGig.sets.map(s => ({ name: s.name, songs: s.songs })) })
              }}
              style={{ marginLeft: 'auto' }}
            >▶ Load Event</Btn>

            <Btn
              color={saveFlash ? '#22c55e' : isDirty ? '#f59e0b' : '#2a2a4a'}
              disabled={!isDirty && !saveFlash}
              onClick={save}
              style={{ minWidth: 72 }}
            >{saveFlash ? '✓ Saved' : isDirty ? '● Save' : 'Saved'}</Btn>

            <Btn
              color="#ef4444"
              onClick={() => { if (window.confirm(`Delete "${activeGig.venue || activeGig.date}"?`)) deleteGig(activeGigId) }}
            >Delete Event</Btn>
          </>
        )}
      </div>

      {/* ── Mobile set selector bar ── */}
      {isMobile && activeGig && (
        <div style={{ background: '#0f0f1e', borderBottom: '1px solid #1a1a2e', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: VCR, fontSize: '0.52rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', marginRight: 2 }}>Adding to:</span>
          {activeGig.sets.map((s, i) => (
            <button key={s.id} onClick={() => setMobileTargetSet(i)} style={{
              padding: '5px 14px', borderRadius: 6,
              border: `1px solid ${mobileTargetSet === i ? '#a855f755' : '#1e1e3a'}`,
              background: mobileTargetSet === i ? '#a855f720' : 'transparent',
              color: mobileTargetSet === i ? '#a855f7' : '#555',
              fontSize: '0.7rem', cursor: 'pointer', fontFamily: 'inherit', fontWeight: mobileTargetSet === i ? 700 : 400,
            }}>{s.name}</button>
          ))}
        </div>
      )}

      {/* ── Body ── */}
      {!activeGig ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <span style={{ fontFamily: VCR, color: '#2a2a4a', fontSize: '0.75rem', letterSpacing: '0.12em' }}>NO EVENTS</span>
          <Btn color="#a855f7" onClick={createGig}>Create Your First Event/Setlist</Btn>
        </div>
      ) : (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* ── Library panel ── */}
          <div style={{ width: 210, borderRight: '1px solid #1a1a2e', display: 'flex', flexDirection: 'column', background: '#0b0b18', flexShrink: 0 }}>
            <div style={{ padding: '8px 10px', borderBottom: '1px solid #12121f' }}>
              <div style={{ marginBottom: 6 }}><span style={LABEL}>Library</span></div>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search songs…"
                style={{ width: '100%', padding: '5px 8px', background: '#131328', border: '1px solid #2a2a3a', borderRadius: 6, color: '#e0e0f0', fontSize: '0.72rem', outline: 'none' }}
              />
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {/* ── Short Breaks section ── */}
              <div
                onClick={() => setBreaksCollapsed(v => !v)}
                style={{ padding: '6px 10px 5px', background: '#0c0c1a', borderBottom: '1px solid #0e0e1a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
              >
                <span style={{ fontFamily: VCR, fontSize: '0.55rem', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Short Breaks</span>
                <span style={{ fontSize: '0.6rem', color: '#9a7000' }}>{breaksCollapsed ? '▶' : '▼'}</span>
              </div>
              {!breaksCollapsed && breaks.map(brk => (
                <div
                  key={brk.id}
                  draggable
                  onDragStart={e => {
                    dragRef.current = { type: 'library', itemId: brk.id, itemType: 'break' }
                    e.dataTransfer.effectAllowed = 'copy'
                  }}
                  onDragEnd={() => { dragRef.current = null; setDropTarget(null) }}
                  style={{
                    padding: '6px 10px', borderBottom: '1px solid #0e0e1a',
                    cursor: 'grab', userSelect: 'none',
                    borderLeft: '2px solid #f59e0b33',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.72rem', color: '#f59e0b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{brk.name}</div>
                    <div style={{ fontFamily: VCR, fontSize: '0.52rem', color: '#9a7000', marginTop: 1 }}>{brk.durationMins} min break</div>
                  </div>
                  {isMobile && (
                    <button onClick={() => tapAddToSet(brk.id, 'break')} style={{ background: '#f59e0b22', border: '1px solid #f59e0b44', color: '#f59e0b', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1, flexShrink: 0 }}>+</button>
                  )}
                </div>
              ))}

              {/* ── Songs ── */}
              <div
                onClick={() => setSongsCollapsed(v => !v)}
                style={{ padding: '6px 10px 5px', background: '#0c0c1a', borderTop: '1px solid #1a1a2e', borderBottom: '1px solid #0e0e1a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
              >
                <span style={LABEL}>Songs</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }} onClick={e => e.stopPropagation()}>
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    style={{ fontFamily: VCR, fontSize: '0.5rem', background: '#131328', border: '1px solid #2a2a3a', color: '#a78bfa', borderRadius: 4, padding: '2px 4px', cursor: 'pointer' }}
                  >
                    <option value="az">A → Z</option>
                    <option value="za">Z → A</option>
                    <option value="artist">Artist</option>
                    <option value="bpm">BPM</option>
                  </select>
                  <span style={{ fontSize: '0.6rem', color: '#3a3a6a' }}>{songsCollapsed ? '▶' : '▼'}</span>
                </div>
              </div>
              {!songsCollapsed && filteredSongs.map(song => {
                const used = gigItemSet.has(song.id)
                return (
                  <div
                    key={song.id}
                    draggable
                    onDragStart={e => {
                      dragRef.current = { type: 'library', itemId: song.id, itemType: 'song' }
                      e.dataTransfer.effectAllowed = 'copy'
                    }}
                    onDragEnd={() => { dragRef.current = null; setDropTarget(null) }}
                    style={{
                      padding: '6px 10px', borderBottom: '1px solid #0e0e1a',
                      cursor: 'grab', userSelect: 'none',
                      borderLeft: `2px solid ${used ? '#22c55e33' : 'transparent'}`,
                      opacity: used ? 0.4 : 1,
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.72rem', color: used ? '#22c55e99' : '#c0c0d8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</div>
                      <div style={{ fontFamily: VCR, fontSize: '0.52rem', color: '#444', marginTop: 1 }}>{song.artist}</div>
                      <div style={{ fontFamily: VCR, fontSize: '0.52rem', color: '#333', marginTop: 1 }}>{song.bpm} BPM · {song.key}</div>
                    </div>
                    {isMobile && (
                      <button onClick={() => tapAddToSet(song.id, 'song')} style={{ background: '#a855f722', border: '1px solid #a855f744', color: '#a855f7', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1, flexShrink: 0 }}>+</button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Set columns ── */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {activeGig.sets.map((set, setIdx) => {
              const setItems    = set.songs.map(id => findItem(id)).filter(Boolean)
              const isLoaded    = loadedSet?.gigId === activeGigId && loadedSet?.setIdx === setIdx
              const isColDrop   = dropTarget?.setIdx === setIdx && dropTarget?.songIdx === undefined
              const isCollapsed = collapsedSets.has(set.id)

              function toggleCollapse() {
                setCollapsedSets(prev => {
                  const next = new Set(prev)
                  next.has(set.id) ? next.delete(set.id) : next.add(set.id)
                  return next
                })
              }

              if (isCollapsed) {
                return (
                  <div
                    key={set.id}
                    style={{ width: 36, flexShrink: 0, borderRight: '1px solid #1a1a2e', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#0f0f1e', cursor: 'pointer', userSelect: 'none' }}
                    onClick={toggleCollapse}
                    title={`Expand ${set.name}`}
                  >
                    <span style={{ fontFamily: VCR, fontSize: '0.55rem', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.1em', writingMode: 'vertical-rl', transform: 'rotate(180deg)', marginTop: 12, whiteSpace: 'nowrap' }}>
                      {set.name}
                    </span>
                    <span style={{ fontFamily: VCR, fontSize: '0.48rem', color: '#333', marginTop: 6 }}>{setItems.length}</span>
                  </div>
                )
              }

              return (
                <div
                  key={set.id}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid #1a1a2e', minWidth: 0, overflow: 'hidden' }}
                >
                  {/* Set header */}
                  <div style={{ background: '#0f0f1e', borderBottom: '1px solid #1e1e3a', padding: '8px 10px', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 }}>
                      <button
                        onClick={toggleCollapse}
                        style={{ background: 'none', border: 'none', color: '#3a3a6a', cursor: 'pointer', fontSize: '0.75rem', lineHeight: 1, padding: '0 2px', flexShrink: 0 }}
                        title="Collapse set"
                      >‹</button>
                      <input
                        value={set.name}
                        onChange={e => updateSetField(setIdx, 'name', e.target.value)}
                        style={{ fontFamily: VCR, fontSize: '0.72rem', background: 'transparent', border: 'none', borderBottom: '1px solid #2a2a3a', color: '#a78bfa', padding: '1px 2px', outline: 'none', flex: 1, minWidth: 0 }}
                      />
                      <button
                        onClick={() => removeSet(setIdx)}
                        style={{ background: 'none', border: 'none', color: '#2a2a3a', cursor: 'pointer', fontSize: '0.9rem', lineHeight: 1, padding: '0 2px' }}
                        title="Remove set"
                      >×</button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      {(() => { const mins = estSetMins(setItems); return (
                        <span style={{ fontSize: '0.78rem', color: durColor(mins) }}>
                          {setItems.length} items · ~{mins}min
                        </span>
                      ) })()}
                      <Btn
                        color={isLoaded ? '#22c55e' : '#555'}
                        onClick={() => {
                          setLoadedSet({ gigId: activeGigId, setIdx })
                          const label = `${activeGig.venue || activeGig.date} · ${set.name}`
                          onLoadGig?.({ label, sets: [{ name: set.name, songs: set.songs }] })
                        }}
                        style={{ marginLeft: 'auto', fontSize: '0.52rem', padding: '2px 8px', border: isLoaded ? '1px solid #22c55e55' : '1px solid #1e1e3a' }}
                      >{isLoaded ? '✓ Loaded' : '▶ Load'}</Btn>
                    </div>

                    {/* Break time after set */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontFamily: VCR, fontSize: '0.5rem', color: '#2a2a4a' }}>BREAK</span>
                      <input
                        type="number"
                        value={set.breakAfterMins}
                        onChange={e => updateSetField(setIdx, 'breakAfterMins', Number(e.target.value))}
                        min={0} max={60}
                        style={{ fontFamily: VCR, width: 52, padding: '2px 6px', background: '#131328', border: '1px solid #1e1e3a', borderRadius: 4, color: '#555', fontSize: '0.72rem', textAlign: 'center' }}
                      />
                      <span style={{ fontFamily: VCR, fontSize: '0.5rem', color: '#2a2a4a' }}>MIN</span>
                    </div>
                  </div>

                  {/* Item list / drop zone */}
                  <div
                    style={{ flex: 1, overflowY: 'auto', background: isColDrop ? '#a855f706' : 'transparent', transition: 'background 0.1s' }}
                    onDragOver={e => { e.preventDefault(); setDropTarget({ setIdx }) }}
                    onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDropTarget(null) }}
                    onDrop={e => handleDrop(e, setIdx)}
                  >
                    {setItems.length === 0 && (
                      <div style={{ padding: '24px 12px', textAlign: 'center', fontFamily: VCR, fontSize: '0.55rem', color: '#2a2a3a', letterSpacing: '0.1em', userSelect: 'none' }}>
                        DROP SONGS HERE
                      </div>
                    )}

                    {setItems.map((item, itemIdx) => {
                      const isDropBefore = dropTarget?.setIdx === setIdx && dropTarget?.songIdx === itemIdx
                      const isBreak = item.type === 'break'
                      return (
                        <React.Fragment key={`${item.id}-${itemIdx}`}>
                          <div
                            style={{ height: isDropBefore ? 2 : 0, background: '#a855f7', margin: '0 8px', borderRadius: 1, transition: 'height 0.08s', boxShadow: isDropBefore ? '0 0 6px #a855f7' : 'none' }}
                            onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDropTarget({ setIdx, songIdx: itemIdx }) }}
                          />
                          <div
                            draggable
                            onDragStart={e => {
                              dragRef.current = { type: 'set', itemId: item.id, setIdx, itemIdx }
                              e.dataTransfer.effectAllowed = 'move'
                            }}
                            onDragEnd={() => { dragRef.current = null; setDropTarget(null) }}
                            onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDropTarget({ setIdx, songIdx: itemIdx }) }}
                            onDrop={e => handleDrop(e, setIdx, itemIdx)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 6,
                              padding: '5px 10px', cursor: 'grab',
                              borderBottom: '1px solid #0e0e1a',
                              userSelect: 'none',
                              ...(isBreak ? { background: '#0f0d00', borderLeft: '2px solid #f59e0b33' } : {}),
                            }}
                          >
                            <span style={{ fontFamily: VCR, fontSize: '0.52rem', color: '#2a2a4a', width: 14, flexShrink: 0 }}>{itemIdx + 1}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              {isBreak ? (
                                <>
                                  <div style={{ fontSize: '0.65rem', color: '#f59e0b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                                  <div style={{ fontFamily: VCR, fontSize: '0.5rem', color: '#9a7000', marginTop: 1 }}>{item.durationMins} min</div>
                                </>
                              ) : (
                                <>
                                  <div style={{ fontSize: '0.72rem', color: '#c0c0d8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                                  <div style={{ fontFamily: VCR, fontSize: '0.5rem', color: '#444', marginTop: 1 }}>{item.bpm} BPM</div>
                                </>
                              )}
                            </div>
                            {isMobile && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
                                <button
                                  onPointerDown={e => e.stopPropagation()}
                                  onClick={e => { e.stopPropagation(); moveItem(setIdx, itemIdx, -1) }}
                                  disabled={itemIdx === 0}
                                  style={{ background: 'none', border: 'none', color: itemIdx === 0 ? '#1e1e3a' : '#555', cursor: itemIdx === 0 ? 'default' : 'pointer', fontSize: '0.7rem', lineHeight: 1, padding: '1px 3px' }}
                                >▲</button>
                                <button
                                  onPointerDown={e => e.stopPropagation()}
                                  onClick={e => { e.stopPropagation(); moveItem(setIdx, itemIdx, 1) }}
                                  disabled={itemIdx === setItems.length - 1}
                                  style={{ background: 'none', border: 'none', color: itemIdx === setItems.length - 1 ? '#1e1e3a' : '#555', cursor: itemIdx === setItems.length - 1 ? 'default' : 'pointer', fontSize: '0.7rem', lineHeight: 1, padding: '1px 3px' }}
                                >▼</button>
                              </div>
                            )}
                            <button
                              onPointerDown={e => e.stopPropagation()}
                              onClick={e => { e.stopPropagation(); removeItemFromSet(setIdx, itemIdx) }}
                              style={{ background: 'none', border: 'none', color: '#2a2a3a', cursor: 'pointer', fontSize: '0.8rem', lineHeight: 1, padding: '0 2px', flexShrink: 0 }}
                            >×</button>
                          </div>
                        </React.Fragment>
                      )
                    })}

                    {setItems.length > 0 && (
                      <div style={{ height: 24 }} onDragOver={e => { e.preventDefault(); setDropTarget({ setIdx }) }} />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
