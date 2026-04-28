import React from 'react'

function Bar({ value, barColor }) {
  const pct = ((value ?? 0) / 255 * 100).toFixed(0)
  return (
    <div style={{ width: 16, height: 56, background: '#1a1a2e', borderRadius: 3, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${pct}%`, background: barColor, borderRadius: 3, transition: 'height 0.5s ease' }} />
    </div>
  )
}

function Group({ values, label, barColor }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ display: 'flex', gap: 3 }}>
        {[].concat(values).map((v, i) => <Bar key={i} value={v} barColor={barColor} />)}
      </div>
      <div style={{ fontSize: '0.55rem', color: '#444' }}>{label}</div>
    </div>
  )
}

export function DmxPanel({ scene, sceneName }) {
  if (!scene) return (
    <div style={{ background: '#0f0f1e', border: '1px solid #1a1a2e', borderRadius: 8, padding: '10px 12px', color: '#333', fontSize: '0.7rem' }}>
      DMX — no scene active
    </div>
  )
  return (
    <div style={{ background: '#0f0f1e', border: '1px solid #1a1a2e', borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ fontSize: '0.6rem', color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 8 }}>
        DMX Fixtures
        <span style={{ color: '#a855f7', fontSize: '0.7rem', textTransform: 'none', letterSpacing: 0, marginLeft: 8 }}>— {sceneName}</span>
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <Group values={scene.pars}    label="PAR Cans ×6" barColor="#a855f7" />
        <Group values={scene.wash}    label="Wash ×4"     barColor="#a855f788" />
        <Group values={scene.strobe}  label="Strobe"      barColor="#ff6b6b" />
        <Group values={scene.laser}   label="Laser"       barColor="#6bffff" />
        <Group values={scene.smoke}   label="Smoke"       barColor="#888" />
      </div>
    </div>
  )
}
