import ToothCanvas from './ToothCanvas'
import { Reveal } from './motionKit.jsx'

const STAGES = [
  { label: 'Screening', body: 'Share concerns and establish a clear baseline before the appointment.' },
  { label: 'Diagnosis', body: 'Your dentist reviews the complete clinical context.' },
  { label: 'Treatment Planning', body: 'A considered plan makes every next step understandable.' },
  { label: 'Treatment', body: 'Documented care keeps progress connected across visits.' },
  { label: 'Results', body: 'Review outcomes and your smile transformation together.' },
]

export default function JourneyStageSection() {
  return (
    <section className="molar-journey" aria-label="The MOLAR care system">
      <div className="molar-journey__sticky">
        <div className="molar-journey__canvas" aria-hidden="true">
          <ToothCanvas mode="hero" className="molar-journey__canvas-inner" />
        </div>

        <header className="molar-journey__head">
          <p className="molar-eyebrow"><span className="molar-eyebrow__dot" />THE CARE SYSTEM</p>
          <h2>One record.<br />Five stages.</h2>
        </header>

        <div className="molar-journey__stages" role="list">
          {STAGES.map((stage, index) => (
            <Reveal
              as="article"
              className="molar-journey__stage"
              delay={index * 70}
              key={stage.label}
            >
              <span className="molar-journey__index" aria-hidden="true">0{index + 1}</span>
              <h3 className="molar-journey__title">{stage.label}</h3>
              <p className="molar-journey__body">{stage.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
