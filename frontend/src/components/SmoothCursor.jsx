// SmoothCursor.jsx — dot + lagging ring; fine pointers only, landing-scoped lifecycle
import { useEffect, useRef } from 'react'

export default function SmoothCursor() {
  const dotRef = useRef(null), ringRef = useRef(null)
  useEffect(() => {
    if (!matchMedia('(pointer: fine)').matches) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const dot = dotRef.current, ring = ringRef.current
    let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y, raf, hot = false
    const move = e => { x = e.clientX; y = e.clientY; dot.style.transform = `translate(${x}px,${y}px)` }
    const loop = () => {
      rx += (x - rx) * 0.16; ry += (y - ry) * 0.16
      ring.style.transform = `translate(${rx}px,${ry}px) scale(${hot ? 2.2 : 1})`
      raf = requestAnimationFrame(loop)
    }
    const over = e => { hot = !!e.target.closest('a,button,[data-cursor]') }
    addEventListener('pointermove', move, { passive: true })
    addEventListener('pointerover', over, { passive: true })
    raf = requestAnimationFrame(loop)
    document.documentElement.classList.add('molar-cursor-on')
    return () => {
      removeEventListener('pointermove', move); removeEventListener('pointerover', over)
      cancelAnimationFrame(raf)
      document.documentElement.classList.remove('molar-cursor-on')
    }
  }, [])
  return (<><div ref={dotRef} className="molar-cursor__dot" /><div ref={ringRef} className="molar-cursor__ring" /></>)
}
