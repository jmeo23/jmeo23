const CH = {
  PARS:   [0, 1, 2, 3, 4, 5],
  WASH:   [6, 7, 8, 9],
  STROBE: 10,
  LASER:  11,
  SMOKE:  12,
}

function clamp(v) { return Math.max(0, Math.min(255, Math.round(v ?? 0))) }

function sceneToBuffer(values) {
  const buf = Buffer.alloc(512, 0)
  if (values.pars)           values.pars.forEach((v, i)  => { buf[CH.PARS[i]] = clamp(v) })
  if (values.wash)           values.wash.forEach((v, i)  => { buf[CH.WASH[i]] = clamp(v) })
  if (values.strobe != null) buf[CH.STROBE] = clamp(values.strobe)
  if (values.laser  != null) buf[CH.LASER]  = clamp(values.laser)
  if (values.smoke  != null) buf[CH.SMOKE]  = clamp(values.smoke)
  return buf
}

function lerp(from, to, t) {
  return {
    pars:   from.pars.map((v, i)  => v + (to.pars[i]  - v) * t),
    wash:   from.wash.map((v, i)  => v + (to.wash[i]  - v) * t),
    strobe: from.strobe + (to.strobe - from.strobe) * t,
    laser:  from.laser  + (to.laser  - from.laser)  * t,
    smoke:  from.smoke  + (to.smoke  - from.smoke)  * t,
  }
}

function createDmxEngine(port) {
  let fadeTimer  = null
  let pulseTimer = null

  function fireScene(scene) {
    port.write(sceneToBuffer(scene))
  }

  function startCountInAnimation(countInScene, durationMs) {
    stopCountInAnimation()
    if (!countInScene) return

    if (countInScene.type === 'beat-pulse') {
      fireScene(countInScene.base)
    }

    if (countInScene.type === 'fade') {
      fireScene(countInScene.from)
      const start = Date.now()
      fadeTimer = setInterval(() => {
        const t = Math.min((Date.now() - start) / durationMs, 1)
        fireScene(lerp(countInScene.from, countInScene.to, t))
        if (t >= 1) stopCountInAnimation()
      }, 16)
    }
  }

  function onCountInBeat(countInScene, beatIntervalMs) {
    if (!countInScene || countInScene.type !== 'beat-pulse') return
    if (pulseTimer) clearTimeout(pulseTimer)
    fireScene(countInScene.peak)
    const steps  = 8
    const stepMs = (beatIntervalMs ?? 500) / steps
    let step = 0
    function decay() {
      step++
      fireScene(lerp(countInScene.peak, countInScene.base, step / steps))
      if (step < steps) pulseTimer = setTimeout(decay, stepMs)
    }
    pulseTimer = setTimeout(decay, stepMs)
  }

  function stopCountInAnimation() {
    if (fadeTimer)  { clearInterval(fadeTimer);  fadeTimer  = null }
    if (pulseTimer) { clearTimeout(pulseTimer);  pulseTimer = null }
  }

  return { fireScene, startCountInAnimation, onCountInBeat, stopCountInAnimation }
}

module.exports = { createDmxEngine, CH }
