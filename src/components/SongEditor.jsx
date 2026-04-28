import React from 'react'
export function SongEditor({ song }) {
  return <div style={{ padding: 20, color: '#555' }}>Song Editor — {song?.title ?? 'New Song'} (coming soon)</div>
}
