import React, { useState } from 'react'

export function LibraryView({ songs, onSelect }) {
  const [query, setQuery] = useState('')
  const filtered = songs.filter(s =>
    s.title.toLowerCase().includes(query.toLowerCase()) ||
    (s.key ?? '').toLowerCase().includes(query.toLowerCase())
  )
  return (
    <div style={{ padding: 16, color: '#e0e0f0', display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search by name or key…"
        style={{ padding: '8px 12px', background: '#131328', border: '1px solid #2a2a3a', borderRadius: 8, color: '#e0e0f0', fontSize: '0.85rem' }}
      />
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {filtered.map(s => (
          <div key={s.id} onClick={() => onSelect(s)} style={{ padding: '10px 12px', borderBottom: '1px solid #1a1a2e', cursor: 'pointer' }}>
            <div style={{ fontWeight: 700, color: '#e0e0f0' }}>{s.title}</div>
            <div style={{ fontSize: '0.7rem', color: '#555' }}>{s.artist} · {s.bpm} BPM · {s.key}</div>
          </div>
        ))}
        {filtered.length === 0 && <div style={{ color: '#333', padding: 12 }}>No songs match "{query}"</div>}
      </div>
    </div>
  )
}
