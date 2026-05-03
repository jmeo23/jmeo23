import { useState, useEffect } from 'react'

export function isMobileWidth(width) {
  return width < 520
}

export function useMobileView() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && isMobileWidth(window.innerWidth)
  )

  useEffect(() => {
    const handler = () => setIsMobile(isMobileWidth(window.innerWidth))
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  return isMobile
}
