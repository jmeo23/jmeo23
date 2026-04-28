import React, { useState } from 'react'

export function LibraryView({ songs, onSelect }) {
  const [query,  setQuery]  = useState('')
  const [sortBy, setSortBy] = useState('az')

  const filtered = songs
    .filter(s =>
      s.title.toLowerCase().includes(query.toLowerCase()) ||
      (s.key ?? '').toLowerCase().includes(query.toLowerCase()) ||
      (s.artist ?? '').toLowerCase().includes(query.toLowerCase())
    )
    .slice()
    .sort((a, b) => {
      if (sortBy === 'az')     return a.title.localeCompare(b.title)
      if (sortBy === 'za')     return b.title.localeCompare(a.title)
      if (sortBy === 'key')    return (a.key ?? '').localeCompare(b.key ?? '') || a.title.localeCompare(b.title)
      if (sortBy === 'artist') return (a.artist ?? '').localeCompare(b.artist ?? '') || a.title.localeCompare(b.title)
      return 0
    })

  return (
    <div style={{ padding: 16, color: '#e0e0f0', display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by name, artist, or key…"
          style={{ flex: 1, padding: '8px 12px', background: '#131328', border: '1px solid #2a2a3a', borderRadius: 8, color: '#e0e0f0', fontSize: '0.85rem', outline: 'none' }}
        />
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          style={{ padding: '8px 10px', background: '#131328', border: '1px solid #2a2a3a', borderRadius: 8, color: '#a78bfa', fontSize: '0.75rem', cursor: 'pointer' }}
        >
          <option value="az">A → Z</option>
          <option value="za">Z → A</option>
          <option value="artist">Artist</option>
          <option value="key">Key</option>
        </select>
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {filtered.map(s => (
          <div key={s.id} onClick={() => onSelect(s)} style={{ padding: '10px 12px', borderBottom: '1px solid #1a1a2e', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = '#0f0f20'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{ fontWeight: 700, color: '#e0e0f0' }}>{s.title}</div>
            <div style={{ fontSize: '0.7rem', color: '#a78bfa' }}>{s.artist} · {s.bpm} BPM · {s.key}</div>
          </div>
        ))}
        {filtered.length === 0 && <div style={{ color: '#555', padding: 12 }}>No songs match "{query}"</div>}
      </div>
    </div>
  )
}
