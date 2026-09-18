import { useEffect, useRef, useState } from 'react'
import ToothCanvas from './ToothCanvas'
import { usePrefersReducedMotion } from './motionKit.jsx'

const STAGES = [
  { label: 'Screening', body: 'Share concerns and establish a clear baseline before the appointment.' },
  { label: 'Diagnosis', body: 'Your dentist reviews the complete clinical context.' },
  { label: 'Treatment Planning', body: 'A considered plan makes every next step understandable.' },
  { label: 'Treatment', body: 'Documented care keeps progress connected across visits.' },
  { label: 'Results', body: 'Review outcomes and your smile transformation together.' },
]

export default function JourneyStageSection() {
  const sectionRef = useRef(null)
  const progressRef = useRef(0)
  const [stage, setStage] = useState(0)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    if (reduced) return
    let raf = 0
    const update = () => {
      raf = 0
      const el = sectionRef.current
      if (!el) return
      const total = Math.max(el.offsetHeight - window.innerHeight, 1)
      const p = Math.min(Math.max(-el.getBoundingClientRect().top / total, 0), 1)
      progressRef.current = p * (STAGES.length - 1)
      setStage(Math.round(progressRef.current))
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf) }
  }, [reduced])

  /* Reduced motion: static, fully visible stage map. */
  if (reduced) {
    return (
      <section className="molar-journey molar-journey--static" ref={sectionRef}>
        <p className="molar-eyebrow"><span className="molar-eyebrow__dot" />THE CARE SYSTEM</p>
        {STAGES.map((s, i) => (
          <div className="molar-journey__stage is-active" key={i}>
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

        <div className="molar-journey__stages" role="list">
        {STAGES.map((s, i) => (
          <article className={`molar-journey__stage ${stage === i ? 'is-active' : ''}`} key={i} role="listitem">
            <span className="molar-journey__index" aria-hidden="true">0{i + 1}</span>
            <h3 className="molar-journey__title">{s.label}</h3>
            <p className="molar-journey__body">{s.body}</p>
          </article>
        ))}
        </div>

        <p className="molar-journey__fraction" aria-hidden="true">
          0{stage + 1} <em>/ 0{STAGES.length}</em>
        </p>
      </div>
    </section>
  )
}
