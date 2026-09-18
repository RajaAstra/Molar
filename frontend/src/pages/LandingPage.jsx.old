import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ShieldCheck, ScanLine, Mic2, HeartPulse } from 'lucide-react'

import Preloader from '../components/Preloader'
import LandingHero from '../components/LandingHero'
import JourneyStageSection from '../components/JourneyStageSection'
import { Marquee } from '../components/Marquee'
import { Reveal, Parallax, Tilt } from '../components/motionKit'

function ProductSection({
  eyebrow,
  title,
  description,
  children,
  reversed = false,
}) {
  return (
    <section className={`molar-product-section ${reversed ? 'is-reversed' : ''}`}>
      <div className="molar-product-section__copy">
        <Reveal>
          <p className="molar-eyebrow">
            <span className="molar-eyebrow__dot" />
            {eyebrow}
          </p>
        </Reveal>

        <Reveal delay={120}>
          <h2>{title}</h2>
        </Reveal>

        <Reveal delay={240}>
          <p className="molar-product-section__description">
            {description}
          </p>
        </Reveal>
      </div>

      <Reveal delay={180} className="molar-product-section__visual">
        <Tilt>
          <div className="molar-product-card">
            {children}
          </div>
        </Tilt>
      </Reveal>
    </section>
  )
}

function ScreeningMockup() {
  return (
    <div className="molar-screening">
      <div className="molar-screening__top">
        <span>ORAL-RISK SCREENING</span>
        <span>01 / 04</span>
      </div>

      <div className="molar-screening__line" />

      <h3>How long has the change been present?</h3>

      <div className="molar-choice-list">
        <button type="button">Less than 1 week</button>
        <button type="button" className="is-selected">1–3 weeks</button>
        <button type="button">More than 3 weeks</button>
      </div>

      <div className="molar-screening__footer">
        <span>Guided screening</span>
        <span>Not a diagnosis</span>
      </div>
    </div>
  )
}

function VoiceChartMockup() {
  return (
    <div className="molar-chart">
      <div className="molar-chart__top">
        <span>VOICE CLINICAL CHART</span>
        <span className="molar-live">
          <i /> LIVE
        </span>
      </div>

      <div className="molar-chart__patient">
        <div className="molar-avatar">S</div>
        <div>
          <strong>Sarah M.</strong>
          <span>Periodontal assessment</span>
        </div>
      </div>

      <div className="molar-tooth-row">
        {['26', '25', '24', '23', '22', '21'].map((tooth, index) => (
          <div
            className={`molar-tooth-cell ${index === 0 ? 'is-active' : ''}`}
            key={tooth}
          >
            <span>{tooth}</span>
            <strong>{[4, 3, 4, 2, 2, 3][index]}</strong>
          </div>
        ))}
      </div>

      <div className="molar-chart__transcript">
        <span>Voice input</span>
        <p>
          “Tooth twenty-six. Four, three, four. Bleeding.”
        </p>
      </div>
    </div>
  )
}

function ToothMapMockup() {
  return (
    <div className="molar-toothmap">
      <div className="molar-toothmap__top">
        <span>CLINICAL RECORD</span>
        <span>TOOTH MAP</span>
      </div>

      <div className="molar-toothmap__mouth">
        <div className="molar-arch molar-arch--upper">
          {Array.from({ length: 14 }).map((_, i) => (
            <span
              key={i}
              className={i === 4 || i === 9 ? 'is-flagged' : ''}
            />
          ))}
        </div>

        <div className="molar-arch molar-arch--lower">
          {Array.from({ length: 14 }).map((_, i) => (
            <span
              key={i}
              className={i === 5 ? 'is-flagged' : ''}
            />
          ))}
        </div>
      </div>

      <div className="molar-toothmap__legend">
        <span><i className="is-normal" /> Recorded</span>
        <span><i className="is-flagged" /> Review</span>
      </div>
    </div>
  )
}

function DentoMockup() {
  return (
    <div className="molar-dento">
      <div className="molar-dento__header">
        <div className="molar-dento__avatar">D</div>
        <div>
          <strong>Dento</strong>
          <span>Care companion</span>
        </div>
        <span className="molar-online">●</span>
      </div>

      <div className="molar-dento__messages">
        <div className="molar-dento__message molar-dento__message--bot">
          Your dentist has added a follow-up for next week.
        </div>

        <div className="molar-dento__message molar-dento__message--user">
          What happens at that visit?
        </div>

        <div className="molar-dento__message molar-dento__message--bot">
          Your dentist can check how the treated area is healing and decide
          whether any next step is needed.
        </div>
      </div>

      <div className="molar-dento__input">
        <span>Ask about your care...</span>
        <ArrowRight size={16} />
      </div>
    </div>
  )
}

function SecuritySection() {
  return (
    <section className="molar-security">
      <div className="molar-security__intro">
        <Reveal>
          <p className="molar-eyebrow">
            <span className="molar-eyebrow__dot" />
            BUILT AROUND TRUST
          </p>
        </Reveal>

        <Reveal delay={120}>
          <h2>
            Clinical context
            <br />
            stays connected.
          </h2>
        </Reveal>

        <Reveal delay={240}>
          <p>
            MOLAR keeps patient and dentist workflows connected while keeping
            authorization, validation and access control at the center of the
            system.
          </p>
        </Reveal>
      </div>

      <div className="molar-security__grid">
        <Reveal delay={100}>
          <div className="molar-security-card">
            <ShieldCheck size={22} />
            <span>01</span>
            <h3>Controlled access</h3>
            <p>
              Patient information is available only through authorized
              application flows.
            </p>
          </div>
        </Reveal>

        <Reveal delay={180}>
          <div className="molar-security-card">
            <ScanLine size={22} />
            <span>02</span>
            <h3>Validated inputs</h3>
            <p>
              Requests and uploaded screening data are validated before being
              processed.
            </p>
          </div>
        </Reveal>

        <Reveal delay={260}>
          <div className="molar-security-card">
            <Mic2 size={22} />
            <span>03</span>
            <h3>Explainable workflow</h3>
            <p>
              Clinical measurements and treatment decisions remain visible in
              the care record.
            </p>
          </div>
        </Reveal>

        <Reveal delay={340}>
          <div className="molar-security-card">
            <HeartPulse size={22} />
            <span>04</span>
            <h3>Patient-first context</h3>
            <p>
              Dento supports understanding and follow-through without replacing
              the dentist.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export default function LandingPage() {
  const [booted, setBooted] = useState(false)

  return (
    <div className="molar-landing">
      <Preloader onDone={() => setBooted(true)} />

      <LandingHero booted={booted} />

      <Marquee
        items={[
          'EARLY ORAL-RISK IDENTIFICATION',
          'CONNECTED CARE RECORDS',
          'VOICE CLINICAL CHARTING',
          'TREATMENT FOLLOW-THROUGH',
          'PATIENT-FIRST DESIGN',
        ]}
      />

      <JourneyStageSection />

      <main>
        <ProductSection
          eyebrow="01 — SCREENING"
          title={
            <>
              Start before
              <br />
              the appointment.
            </>
          }
          description="A guided screening experience helps patients organize what they are noticing before a dentist reviews the case."
        >
          <ScreeningMockup />
        </ProductSection>

        <ProductSection
          eyebrow="02 — CLINICAL INPUT"
          title={
            <>
              Let the dentist
              <br />
              speak naturally.
            </>
          }
          description="Voice-first periodontal charting turns spoken measurements into structured clinical records without breaking the examination flow."
          reversed
        >
          <VoiceChartMockup />
        </ProductSection>

        <ProductSection
          eyebrow="03 — RECORD"
          title={
            <>
              Every tooth has
              <br />
              a place in the story.
            </>
          }
          description="A connected tooth record keeps findings, measurements and treatment context together instead of scattering them across disconnected notes."
        >
          <ToothMapMockup />
        </ProductSection>

        <ProductSection
          eyebrow="04 — FOLLOW-THROUGH"
          title={
            <>
              Care shouldn't
              <br />
              disappear after checkout.
            </>
          }
          description="Treatment plans and follow-up checkpoints make the next step visible to the patient and the care team."
          reversed
        >
          <DentoMockup />
        </ProductSection>

        <SecuritySection />

        <section className="molar-final-cta">
          <Parallax speed={0.08}>
            <div className="molar-final-cta__ghost" aria-hidden="true">
              MOLAR
            </div>
          </Parallax>

          <Reveal>
            <p className="molar-eyebrow">
              <span className="molar-eyebrow__dot" />
              THE CONNECTED CARE RECORD
            </p>
          </Reveal>

          <Reveal delay={120}>
            <h2>
              Your dental care,
              <br />
              finally connected.
            </h2>
          </Reveal>

          <Reveal delay={240}>
            <div className="molar-final-cta__actions">
              <Link to="/register" className="molar-btn molar-btn--primary">
                Start your screening
                <ArrowRight size={17} />
              </Link>

              <Link to="/login" className="molar-btn molar-btn--ghost">
                Dentist sign in
              </Link>
            </div>
          </Reveal>

          <p className="molar-final-cta__note">
            Screening support only. MOLAR does not provide a diagnosis.
          </p>
        </section>
      </main>
    </div>
  )
}
