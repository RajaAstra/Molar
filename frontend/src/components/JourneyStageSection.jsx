import { useEffect, useRef, useState } from 'react'
import ToothCanvas from './ToothCanvas'
import { usePrefersReducedMotion } from './motionKit.jsx'

const STAGES = [
  { label: 'Screening',  body: 'Answer guided risk questions and capture a smile image. Your baseline, built in minutes — no appointment needed.' },
  { label: 'Evaluation', body: 'If elevated oral-risk indicators appear, your case reaches a dentist with the full picture already attached.' },
  { label: 'Treatment',  body: 'Your dentist’s plan, in language you can actually read. Every step visible, nothing lost between visits.' },
  { label: 'Follow-up',  body: 'Recovery is tracked, not guessed. Check-ins and reminders keep healing on schedule.' },
  { label: 'Maintenance',body: 'A long-term record that keeps small problems small — year after year.' },
]

export default function JourneyStageSection() {
  const sectionRef = useRef(null)
  const progressRef = useRef(0)
  const fillRef = useRef(null)
  const [stage, setStage] = useState(0)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    if (reduced) return
    let raf = 0
    const update = () => {
      raf = 0
      const el = sectionRef.current
      if (!el) return
      const total = el.offsetHeight - window.innerHeight
      const p = Math.min(Math.max(-el.getBoundingClientRect().top / total, 0), 1)
      progressRef.current = p * (STAGES.length - 1)
      setStage(Math.round(progressRef.current)) // React bails out if unchanged → no re-render spam
      if (fillRef.current) fillRef.current.style.transform = `scaleY(${p})`
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf) }
  }, [reduced])

  /* Reduced motion: static stacked list, no sticky, canvas renders still frames */
  if (reduced) {
    return (
      <section className="molar-journey molar-journey--static" ref={sectionRef}>
        <p className="molar-eyebrow"><span className="molar-eyebrow__dot" />THE CARE SYSTEM</p>
        {STAGES.map((s, i) => (
          <div className="molar-journey__stage is-active" key={i} style={{ position: 'static', marginBottom: '3rem' }}>
            <span className="molar-journey__index">0{i + 1}</span>
            <h3 className="molar-journey__title">{s.label}</h3>
            <p className="molar-journey__body">{s.body}</p>
          </div>
        ))}
      </section>
    )
  }

  return (
    <section className="molar-journey" ref={sectionRef} aria-label="The MOLAR care system">
      <div className="molar-journey__sticky">
        <ToothCanvas mode="journey" progressRef={progressRef} className="molar-journey__canvas" />

        <header className="molar-journey__head">
          <p className="molar-eyebrow"><span className="molar-eyebrow__dot" />THE CARE SYSTEM</p>
          <h2>One record.<br />Five stages.</h2>
        </header>

        {STAGES.map((s, i) => (
          <article className={`molar-journey__stage ${stage === i ? 'is-active' : ''}`} key={i}>
            <span className="molar-journey__index" aria-hidden="true">0{i + 1}</span>
            <h3 className="molar-journey__title">{s.label}</h3>
            <p className="molar-journey__body">{s.body}</p>
          </article>
        ))}

        <ol className="molar-journey__rail" aria-hidden="true">
          <span className="molar-journey__rail-track"><span ref={fillRef} /></span>
          {STAGES.map((s, i) => (
            <li key={i} className={stage === i ? 'is-active' : ''}>
              <span className="molar-journey__rail-dot" />
              <span className="molar-journey__rail-label">{s.label}</span>
            </li>
          ))}
        </ol>

        <p className="molar-journey__fraction" aria-hidden="true">
          0{stage + 1} <em>/ 0{STAGES.length}</em>
        </p>
      </div>
    </section>
  )
}
