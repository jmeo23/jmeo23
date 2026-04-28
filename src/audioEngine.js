const LOOKAHEAD_MS = 100.0
const SCHEDULE_MS  = 25.0

export class AudioEngine {
  constructor({ bpm, downbeatBuffer, upbeatBuffer, onBeat }) {
    this.bpm            = bpm
    this.downbeatBuffer = downbeatBuffer  // AudioBuffer or null → synthesize
    this.upbeatBuffer   = upbeatBuffer    // AudioBuffer or null → synthesize
    this.onBeat         = onBeat          // (beatIndex: 0-3) => void
    this.ctx            = null
    this.nextBeatTime   = 0
    this.beatIndex      = 0
    this.timerId        = null
    this.running        = false
    this.muted          = false
    this.beatTimers     = []
  }

  get beatInterval() { return 60 / this.bpm }

  start() {
    if (this.running) return
    this.ctx          = new (window.AudioContext || window.webkitAudioContext)()
    this.nextBeatTime = this.ctx.currentTime + 0.05
    this.beatIndex    = 0
    this.running      = true
    this._schedule()
  }

  stop() {
    this.running = false
    clearTimeout(this.timerId)
    this.beatTimers.forEach(clearTimeout)
    this.beatTimers = []
    if (this.ctx) { this.ctx.close(); this.ctx = null }
  }

  setMuted(muted) { this.muted = muted }

  _schedule() {
    if (!this.running) return
    const lookahead = LOOKAHEAD_MS / 1000
    while (this.nextBeatTime < this.ctx.currentTime + lookahead) {
      this._scheduleBeat(this.beatIndex, this.nextBeatTime)
      this.nextBeatTime += this.beatInterval
      this.beatIndex     = (this.beatIndex + 1) % 4
    }
    this.timerId = setTimeout(() => this._schedule(), SCHEDULE_MS)
  }

  _scheduleBeat(beatIdx, time) {
    const delayMs = Math.max(0, (time - this.ctx.currentTime) * 1000 - 5)
    const t = setTimeout(() => this.onBeat(beatIdx), delayMs)
    this.beatTimers.push(t)
    if (this.muted) return
    const buffer = beatIdx === 0 ? this.downbeatBuffer : this.upbeatBuffer
    buffer ? this._playBuffer(buffer, time) : this._playTone(beatIdx === 0 ? 1200 : 900, time)
  }

  _playBuffer(buffer, time) {
    const src = this.ctx.createBufferSource()
    src.buffer = buffer
    src.connect(this.ctx.destination)
    src.start(time)
    src.stop(time + buffer.duration)
  }

  _playTone(freq, time) {
    const osc  = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.connect(gain)
    gain.connect(this.ctx.destination)
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.3, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04)
    osc.start(time)
    osc.stop(time + 0.05)
  }

  static async loadWav(ctx, url) {
    const res = await fetch(url)
    const buf = await res.arrayBuffer()
    return ctx.decodeAudioData(buf)
  }
}
