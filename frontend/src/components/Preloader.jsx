// Preloader.jsx — tooth stroke-draw + % counter, once per session
import { useEffect, useRef, useState } from 'react'

const TOOTH_D = 'M100,16 C56,16 37,45 40,78 C42,98 51,106 53,126 C55,152 58,182 71,186 C82,189 85,157 90,139 C93,127 107,127 110,139 C115,157 118,189 129,186 C142,182 145,152 147,126 C149,106 158,98 160,78 C163,45 144,16 100,16 Z'

export default function Preloader({ onDone }) {
  const [pct, setPct] = useState(0)
  const [state, setState] = useState('run') // run | out | gone
  const finishedRef = useRef(false)

  useEffect(() => {
    const finish = () => {
      if (finishedRef.current) return
      finishedRef.current = true
      document.body.style.overflow = ''
      sessionStorage.setItem('molar-intro', '1')
      setState('gone')
      onDone?.()
      window.dispatchEvent(new Event('molar:intro-complete'))
    }
    const skip = () => finish()
    if (sessionStorage.getItem('molar-intro')) {
      skip()
      return undefined
    }
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      skip()
      return undefined
    }
    // Mark the session only after completion. React StrictMode remounts
    // effects in development, so marking it at startup skipped first-visit
    // initialization and desynchronized entrance animations.
    document.body.style.overflow = 'hidden'
    const t0 = performance.now(); let raf
    const tick = ts => {
      const k = Math.min((ts - t0) / 1400, 1)
      setPct(Math.round(100 * (1 - Math.pow(1 - k, 3))))
      if (k < 1) raf = requestAnimationFrame(tick)
      else {
        setState('out'); document.body.style.overflow = ''
        setTimeout(finish, 650)
      }
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); document.body.style.overflow = '' }
  }, [onDone])

  if (state === 'gone') return null
  return (
    <div className={`molar-preloader ${state === 'out' ? 'is-out' : ''}`} aria-hidden="true">
      <div className="molar-preloader__inner">
        <svg viewBox="0 0 200 200" className="molar-preloader__tooth">
          <path d={TOOTH_D} fill="none" stroke="currentColor" strokeWidth="2.5"
            pathLength="100" strokeDasharray="100" strokeDashoffset={100 - pct} strokeLinecap="round" />
        </svg>
        <span className="molar-preloader__pct">{pct}</span>
        <span className="molar-preloader__label">MOLAR — preparing your care system</span>
      </div>
    </div>
  )
}
