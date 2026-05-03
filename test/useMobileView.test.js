import { describe, it, expect } from 'vitest'
import { isMobileWidth } from '../src/lib/useMobileView.js'

describe('isMobileWidth', () => {
  it('returns true for widths under 520', () => {
    expect(isMobileWidth(390)).toBe(true)
    expect(isMobileWidth(375)).toBe(true)
    expect(isMobileWidth(519)).toBe(true)
  })

  it('returns false at exactly 520', () => {
    expect(isMobileWidth(520)).toBe(false)
  })

  it('returns false for desktop widths', () => {
    expect(isMobileWidth(768)).toBe(false)
    expect(isMobileWidth(1440)).toBe(false)
  })
})
