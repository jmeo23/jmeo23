import React from 'react'

export function Sidebar({ songs, setlist, activeSongId, onSelectSong }) {
  const setlistSongs = setlist.map(id => songs.find(s => s.id === id)).filter(Boolean)
  return (
    <div style={{ width: 200, borderRight: '1px solid #1a1a2e', display: 'flex', flexDirection: 'column', overflowY: 'auto', flexShrink: 0 }}>
      <div style={{ fontSize: '0.6rem', color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '10px 12px 4px', fontWeight: 700 }}>Tonight's Set</div>
      {setlistSongs.map((song, i) => (
        <div key={song.id} onClick={() => onSelectSong(song.id)} style={{
          padding: '8px 12px', fontSize: '0.75rem', cursor: 'pointer',
          borderBottom: '1px solid #111827',
          color: activeSongId === song.id ? '#22c55e' : '#555',
          background: activeSongId === song.id ? '#0a1a10' : 'transparent',
          borderLeft: `3px solid ${activeSongId === song.id ? '#22c55e' : 'transparent'}`,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ fontSize: '0.65rem', color: activeSongId === song.id ? '#22c55e66' : '#333', width: 14 }}>{i + 1}</span>
          {song.title}
        </div>
      ))}
      <div style={{ borderTop: '1px solid #1a1a2e', margin: '8px 0' }} />
      <div style={{ fontSize: '0.6rem', color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '4px 12px', fontWeight: 700 }}>Library</div>
      {songs.map(song => (
        <div key={song.id} onClick={() => onSelectSong(song.id)} style={{
          padding: '8px 12px', fontSize: '0.75rem', color: '#555', cursor: 'pointer', borderBottom: '1px solid #111827',
        }}>
          {song.title}
        </div>
      ))}
    </div>
  )
}
