import { useEffect, useRef } from 'react'

const TAU = Math.PI * 2
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const lerp = (a, b, t) => a + (b - a) * t
const smooth = t => t * t * (3 - 2 * t)

/* Stylized molar outline in a 200×200 box */
function toothPath(ctx, S) {
  const u = S / 200
  ctx.beginPath()
  ctx.moveTo(100 * u, 16 * u)
  ctx.bezierCurveTo(56 * u, 16 * u, 37 * u, 45 * u, 40 * u, 78 * u)
  ctx.bezierCurveTo(42 * u, 98 * u, 51 * u, 106 * u, 53 * u, 126 * u)
  ctx.bezierCurveTo(55 * u, 152 * u, 58 * u, 182 * u, 71 * u, 186 * u)
  ctx.bezierCurveTo(82 * u, 189 * u, 85 * u, 157 * u, 90 * u, 139 * u)
  ctx.bezierCurveTo(93 * u, 127 * u, 107 * u, 127 * u, 110 * u, 139 * u)
  ctx.bezierCurveTo(115 * u, 157 * u, 118 * u, 189 * u, 129 * u, 186 * u)
  ctx.bezierCurveTo(142 * u, 182 * u, 145 * u, 152 * u, 147 * u, 126 * u)
  ctx.bezierCurveTo(149 * u, 106 * u, 158 * u, 98 * u, 160 * u, 78 * u)
  ctx.bezierCurveTo(163 * u, 45 * u, 144 * u, 16 * u, 100 * u, 16 * u)
  ctx.closePath()
}

/* Rasterize a shape, return normalized [x,y] points where alpha > threshold */
function sampleMask(draw, S = 190, step = 2) {
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')
  draw(ctx, S)
  const d = ctx.getImageData(0, 0, S, S).data
  const pts = []
  for (let y = 0; y < S; y += step)
    for (let x = 0; x < S; x += step)
      if (d[(y * S + x) * 4 + 3] > 110) pts.push([x / S, y / S])
  return pts.length ? pts : [[0.5, 0.5]]
}

/* Build 6 target formations: 5 journey stages + dense fill for the hero */
function buildTargets(N) {
  const outline = sampleMask((c, S) => {
    toothPath(c, S); c.lineWidth = 5 * (S / 200); c.strokeStyle = '#fff'; c.stroke()
  })
  const fill = sampleMask((c, S) => { toothPath(c, S); c.fillStyle = '#fff'; c.fill() })
  const fillSet = new Set(fill.map(([x, y]) => `${Math.round(x * 50)},${Math.round(y * 50)}`))
  const inTooth = (x, y) => fillSet.has(`${Math.round(x * 50)},${Math.round(y * 50)}`)

  const pick = (pts, k) =>
    Array.from({ length: k }, (_, i) => pts[((i * pts.length) / k | 0) % pts.length])

  const stages = []

  // 0 · SCAN — contour wireframe
  stages.push(pick(outline, N).map(([x, y]) => [x, y, 0]))

  // 1 · EVALUATE — body + risk cluster on upper-right crown
  stages.push(pick(fill, N).map(([x, y]) => {
    const hot = x > 0.52 && x < 0.8 && y > 0.18 && y < 0.46
    return [x, y, hot ? 1 : 0]
  }))

  // 2 · TREAT — spiral of care
  stages.push(Array.from({ length: N }, (_, i) => {
    const t = i / N
    const r = 0.06 + 0.36 * Math.pow(t, 0.85)
    const a = t * TAU * 2.6 - Math.PI / 2
    return [0.5 + Math.cos(a) * r, 0.5 + Math.sin(a) * r * 1.04, t > 0.55 && t < 0.8 ? 1 : 0]
  }))

  // 3 · FOLLOW-UP — twin orbit rings, sparse accent beacons
  stages.push(Array.from({ length: N }, (_, i) => {
    const t = i / N
    const r = i % 2 ? 0.4 : 0.26
    const a = t * TAU + (i % 2 ? Math.PI / 2 : 0)
    return [0.5 + Math.cos(a) * r, 0.5 + Math.sin(a) * r, i % 9 === 0 ? 1 : 0]
  }))

  // 4 · MAINTAIN — monitoring lattice clipped to the tooth
  const grid = []
  const gstep = 4 / 190
  for (let gy = 0.06; gy < 0.96; gy += gstep)
    for (let gx = 0.06; gx < 0.96; gx += gstep)
      if (inTooth(gx, gy)) grid.push([gx, gy, 0])
  stages.push(pick(grid, N).map(([x, y]) => [x, y, 0]))

  // 5 · HERO — dense filled tooth
  stages.push(pick(fill, N).map(([x, y]) => [x, y, 0]))

  return stages.map(st => {
    const pos = new Float32Array(N * 2)
    const acc = new Uint8Array(N)
    st.forEach(([x, y, a], i) => { pos[i * 2] = x; pos[i * 2 + 1] = y; acc[i] = a })
    return { pos, acc }
  })
}

/**
 * <ToothCanvas mode="hero" />            → dense tooth, assembles on load
 * <ToothCanvas mode="journey" progressRef={ref} /> → morphs across scroll 0→4
 */
export default function ToothCanvas({ mode = 'hero', progressRef, focus, className = '' }) {
  const hostRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    const host = hostRef.current
    const canvas = canvasRef.current
    if (!host || !canvas) return
    const ctx = canvas.getContext('2d')
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

    let W = 0, H = 0, side = 0, ox = 0, oy = 0
    let raf = 0, running = false, visible = true, resizeT = 0
    let particles = null, targets = null, colors = null

    const readColors = () => {
      const s = getComputedStyle(document.documentElement)
      const pick = (names, fb) => {
        for (const n of names) {
          const v = s.getPropertyValue(n).trim()
          if (v && !v.includes('color-mix')) return v
        }
        return fb
      }
      colors = {
        base: pick(['--ml-ink', '--molar-ink', '--ml-fg'],
          getComputedStyle(document.body).color || '#9aa3b8'),
        accent: pick(['--ml-accent', '--molar-accent'], '#5b8cff'),
        warn: pick(['--molar-warn', '--molar-danger'], '#ff8a5c'),
      }
    }
    readColors()
    const layout = () => {
      const r = host.getBoundingClientRect()
      W = Math.max(1, r.width); H = Math.max(1, r.height)
      const dpr = Math.min(devicePixelRatio || 1, 2)
      canvas.width = W * dpr; canvas.height = H * dpr
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const mobile = W < 760
      const f = focus || (mode === 'journey'
        ? (mobile ? [0.5, 0.4] : [0.62, 0.5])
        : (mobile ? [0.5, 0.42] : [0.5, 0.5]))
      side = Math.min(W, H) * (mobile ? 0.92 : 0.8)
      ox = W * f[0] - side / 2
      oy = H * f[1] - side / 2

      // Keep the graphic atmospheric rather than turning it into a second app.
      // Fewer particles and a capped render rate preserve the form while
      // leaving the main thread available for scrolling and interaction.
      const N = clamp(Math.round((W * H) / (mobile ? 3000 : 4200)), mobile ? 110 : 150, 360)
      targets = buildTargets(N)
      particles = Array.from({ length: N }, () => ({
        x: 0.5 + (Math.random() - 0.5) * 1.4, y: 0.5 + (Math.random() - 0.5) * 1.4, vx: (Math.random() - 0.5) * 0.05, vy: (Math.random() - 0.5) * 0.05,
        size: 0.8 + Math.random() * 1.6, seed: Math.random() * TAU,
      }))
    }

    const drawParticles = (getPos, t, snap) => {
      ctx.clearRect(0, 0, W, H)
      const mobile = W < 760
      const basePts = [], warnPts = [], glowPts = []

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        const [tx, ty, accent] = getPos(i)
        const gx = tx, gy = ty

        if (snap) { p.x = gx; p.y = gy; p.vx = p.vy = 0 }
        else {
          // spring toward target
          p.vx = (p.vx + (gx - p.x) * 0.028) * 0.86
          p.vy = (p.vy + (gy - p.y) * 0.028) * 0.86
          p.x += p.vx; p.y += p.vy
        }

        const px = ox + p.x * side
        const py = oy + p.y * side
        const s = p.size * (mobile ? 0.85 : 1)
        if (accent) { warnPts.push([px, py, s]); glowPts.push([px, py, s * 3.2]) }
        else basePts.push([px, py, s])
      }

      // batched draws — one path per group (fast)
      ctx.globalAlpha = 0.62
      ctx.fillStyle = colors.base
      ctx.beginPath()
      for (const [x, y, r] of basePts) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU) }
      ctx.fill()

      ctx.globalAlpha = 0.1
      ctx.fillStyle = colors.warn
      ctx.beginPath()
      for (const [x, y, r] of glowPts) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU) }
      ctx.fill()

      ctx.globalAlpha = 0.95
      ctx.beginPath()
      for (const [x, y, r] of warnPts) { ctx.moveTo(x + r * 0.7, y); ctx.arc(x, y, r * 0.7, 0, TAU) }
      ctx.fill()

      ctx.globalAlpha = 1
    }

    const getJourneyPos = () => {
      const max = targets.length - 2 // exclude hero fill set
      const p = clamp(progressRef?.current || 0, 0, max)
      const i0 = Math.min(Math.floor(p), max)
      const i1 = Math.min(i0 + 1, max)
      const f = smooth(clamp(p - i0, 0, 1))
      const A = targets[i0], B = targets[i1]
      return i => [
        lerp(A.pos[i * 2], B.pos[i * 2], f),
        lerp(A.pos[i * 2 + 1], B.pos[i * 2 + 1], f),
        f > 0.5 ? B.acc[i] : A.acc[i],
      ]
    }
    const getHeroPos = () => {
      const F = targets[targets.length - 1]
      return i => [F.pos[i * 2], F.pos[i * 2 + 1], F.acc[i]]
    }

    let lastDraw = 0
    const frame = ts => {
      raf = requestAnimationFrame(frame)
      if (ts - lastDraw < 32) return
      lastDraw = ts
      drawParticles(mode === 'journey' ? getJourneyPos() : getHeroPos(), ts / 1000, false)
    }
    const renderStatic = () => {
      const max = targets.length - 2
      const p = clamp(Math.round(progressRef?.current || 0), 0, max)
      const F = mode === 'journey' ? targets[p] : targets[targets.length - 1]
      drawParticles(() => null, 0, true) // snap current positions first
      // overwrite with exact stage targets
      ctx.clearRect(0, 0, W, H)
      ctx.globalAlpha = 0.62; ctx.fillStyle = colors.base
      ctx.beginPath()
      for (let i = 0; i < particles.length; i++) {
        if (F.acc[i]) continue
        const r = particles[i].size * 0.85
        const x = ox + F.pos[i * 2] * side, y = oy + F.pos[i * 2 + 1] * side
        ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU)
      }
      ctx.fill()
      ctx.globalAlpha = 0.95; ctx.fillStyle = colors.warn
      ctx.beginPath()
      for (let i = 0; i < particles.length; i++) {
        if (!F.acc[i]) continue
        const r = particles[i].size * 0.7
        const x = ox + F.pos[i * 2] * side, y = oy + F.pos[i * 2 + 1] * side
        ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU)
      }
      ctx.fill()
      ctx.globalAlpha = 1
    }

    layout()
    if (reduced) {
      renderStatic()
      const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(renderStatic) }
      window.addEventListener('scroll', onScroll, { passive: true })
      return () => {
        window.removeEventListener('scroll', onScroll)
        cancelAnimationFrame(raf)
      }
    }

    const start = () => { if (!running && visible) { running = true; raf = requestAnimationFrame(frame) } }
    const stop = () => { running = false; cancelAnimationFrame(raf) }

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      visible ? start() : stop()
    }, { rootMargin: '120px' })
    io.observe(host)

    const onResize = () => {
      clearTimeout(resizeT)
      resizeT = setTimeout(() => { layout() }, 140)
    }
    window.addEventListener('resize', onResize)
    start()

    return () => {
      stop(); clearTimeout(resizeT)
      io.disconnect()
      window.removeEventListener('resize', onResize)
    }
  }, [mode])

  return (
    <div ref={hostRef} className={`molar-toothcanvas ${className}`} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  )
}
