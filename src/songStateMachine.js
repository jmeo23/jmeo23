const COUNT_IN_DISPLAY = [1, null, 2, null, 1, 2, 3, 4]

export function createStateMachine(song) {
  const listeners = {}
  let state         = 'idle'
  let activeSection = -1
  let currentBar    = 0
  let beatInBar     = 0
  let countInBeat   = 0
  let pendingSection = -1
  let isLooping     = false

  function emit(event, data) {
    ;(listeners[event] || []).forEach(cb => cb(data))
  }

  function on(event, cb) {
    if (!listeners[event]) listeners[event] = []
    listeners[event].push(cb)
  }

  function toIdle() {
    state = 'idle'; activeSection = -1; currentBar = 0
    beatInBar = 0; countInBeat = 0; pendingSection = -1; isLooping = false
    emit('overlayHide')
  }

  function startCountIn(toSection, mode) {
    countInBeat    = 0
    pendingSection = toSection
    state          = mode
    emit('overlayShow', { mode: mode === 'songStart:countIn' ? 'songStart' : 'sectionTransition', from: activeSection, to: toSection })
  }

  function activateSection(idx) {
    activeSection  = idx
    currentBar     = 1
    beatInBar      = 0
    isLooping      = false
    pendingSection = -1
    countInBeat    = 0
    state          = 'playing'
    emit('overlayHide')
    emit('sectionActivated', { index: idx, section: song.sections[idx] })
    emit('barAdvanced', { bar: 1, totalBars: song.sections[idx].bars })
  }

  function onBeat() {
    if (state === 'idle') return

    if (state === 'songStart:prepBar') {
      beatInBar++
      if (beatInBar >= song.timeSignature[0]) {
        beatInBar = 0
        startCountIn(0, 'songStart:countIn')
      }
      return
    }

    if (state === 'songStart:countIn' || state === 'playing:sectionCountIn') {
      emit('countInBeat', COUNT_IN_DISPLAY[countInBeat] ?? null)
      countInBeat++
      if (countInBeat >= 8) activateSection(pendingSection)
      return
    }

    if (state === 'playing') {
      beatInBar = (beatInBar + 1) % song.timeSignature[0]
      if (beatInBar === 0) {
        currentBar++
        const section = song.sections[activeSection]
        emit('barAdvanced', { bar: currentBar, totalBars: section.bars })

        if (currentBar > section.bars) {
          if (isLooping) {
            currentBar = 1
            emit('barAdvanced', { bar: 1, totalBars: section.bars })
          } else {
            const nextIdx = activeSection + 1
            if (nextIdx < song.sections.length) {
              startCountIn(nextIdx, 'playing:sectionCountIn')
            } else {
              toIdle()
              emit('songEnded')
            }
          }
        }
      }
    }
  }

  function startSong() {
    if (state !== 'idle') return
    state     = 'songStart:prepBar'
    beatInBar = 0
    emit('songStarted')
  }

  function stop()   { toIdle() }
  function cancel() { toIdle() }

  function toggleLoop(sectionIdx) {
    if (sectionIdx !== activeSection) return
    isLooping = !isLooping
    emit('loopChanged', { isLooping })
  }

  function jumpToSection(idx) {
    if (state !== 'playing') return
    startCountIn(idx, 'playing:sectionCountIn')
  }

  return {
    get state()          { return state },
    get activeSection()  { return activeSection },
    get currentBar()     { return currentBar },
    get isLooping()      { return isLooping },
    on, startSong, stop, cancel, toggleLoop, jumpToSection, onBeat,
  }
}
