import { useEffect, useRef, useState } from 'react'

export function usePrefersReducedMotion() {
  const [r, setR] = useState(false)
  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)')
    setR(mq.matches)
    const fn = e => setR(e.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])
  return r
}

export function useInView(ref, { threshold = 0.2, once = true } = {}) {
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const revealIfVisible = () => {
      const rect = el.getBoundingClientRect()
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        setInView(true)
        return true
      }
      return false
    }
    if (revealIfVisible() && once) return undefined
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setInView(true); if (once) io.disconnect() }
      else if (!once) setInView(false)
    }, { threshold })
    io.observe(el)
    window.addEventListener('molar:intro-complete', revealIfVisible)
    return () => {
      io.disconnect()
      window.removeEventListener('molar:intro-complete', revealIfVisible)
    }
  }, [once, threshold, ref])
  return inView
}

/* Fade/slide reveal on scroll */
export function Reveal({ as: Tag = 'div', children, delay = 0, y = 30, className = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  return (
    <Tag ref={ref} className={`molar-reveal ${inView ? 'is-in' : ''} ${className}`}
      style={{ '--rd': `${delay}ms`, '--ry': `${y}px` }}>
      {children}
    </Tag>
  )
}

/* Per-character masked rise — editorial headline reveal */
export function SplitText({ text, delay = 0, stagger = 26, className = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { threshold: 0.3 })
  let ci = 0
  const words = text.split(' ').map((w, wi) => (
    <span className="molar-word" key={wi} aria-hidden="true">
      {[...w].map((ch, i) => (
        <span key={i} className="molar-char" style={{ '--cd': `${delay + ci++ * stagger}ms` }}>{ch}</span>
      ))}
      {wi < text.split(' ').length - 1 ? ' ' : null}
    </span>
  ))
  return (
    <span ref={ref} className={`molar-split ${inView ? 'is-in' : ''} ${className}`} aria-label={text}>
      {words}
    </span>
  )
}

/* Count-up number */
export function Counter({ to, duration = 1400, suffix = '', className = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, threshold: 0.5 })
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!inView) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setV(to); return }
    let raf, t0
    const tick = ts => {
      t0 ??= ts
      const k = Math.min((ts - t0) / duration, 1)
      setV(Math.round(to * (1 - Math.pow(1 - k, 3))))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, to])
  return <span ref={ref} className={className}>{v}{suffix}</span>
}

/* Magnetic hover for CTAs (fine pointers only) */
export function Magnetic({ children, strength = 0.3, className = '' }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !matchMedia('(pointer: fine)').matches) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const move = e => {
      const r = el.getBoundingClientRect()
      const x = e.clientX - (r.left + r.width / 2)
      const y = e.clientY - (r.top + r.height / 2)
      el.style.transform = `translate(${x * strength}px, ${y * strength}px)`
    }
    const leave = () => { el.style.transform = '' }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave) }
  }, [strength])
  return <div ref={ref} className={`molar-magnetic ${className}`}>{children}</div>
}

/* 3D tilt card */
export function Tilt({ children, max = 7, className = '' }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !matchMedia('(pointer: fine)').matches) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const move = e => {
      const r = el.getBoundingClientRect()
      const rx = ((e.clientY - r.top) / r.height - 0.5) * -2 * max
      const ry = ((e.clientX - r.left) / r.width - 0.5) * 2 * max
      el.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`
    }
    const leave = () => { el.style.transform = '' }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave) }
  }, [max])
  return <div ref={ref} className={`molar-tilt ${className}`}>{children}</div>
}

/* Scroll parallax wrapper */
export function Parallax({ children, speed = 0.08, className = '' }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const update = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      const center = r.top + r.height / 2 - window.innerHeight / 2
      el.style.transform = `translate3d(0, ${(-center * speed).toFixed(1)}px, 0)`
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf) }
  }, [speed])
  return <div ref={ref} className={className} style={{ willChange: 'transform' }}>{children}</div>
}
