import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import ToothCanvas from './ToothCanvas'
import toothImage from '../assets/tooth.jpg'
import { Reveal, SplitText, Counter, Parallax } from './motionKit'

export default function LandingHero({ booted }) {
  return (
    <section className="molar-hero">
      {/* giant ghost word behind everything */}
      <Parallax speed={0.1} className="molar-hero__ghost-wrap">
        <span className="molar-hero__ghost" aria-hidden="true">MOLAR</span>
      </Parallax>

      <ToothCanvas mode="hero" className="molar-hero__canvas" />

      <motion.div
        className="molar-hero__tooth-portrait"
        initial={{ opacity: 0, rotateY: -12, y: 36 }}
        animate={{ opacity: 1, rotateY: 0, y: 0 }}
        transition={{ duration: 1.15, ease: [0.22, 1, 0.36, 1] }}
        aria-hidden="true"
      >
        <img src={toothImage} alt="" />
        <span className="molar-hero__tooth-glow" />
        <span className="molar-hero__particle molar-hero__particle--one" />
        <span className="molar-hero__particle molar-hero__particle--two" />
        <span className="molar-hero__particle molar-hero__particle--three" />
      </motion.div>

      {/* Mount during the intro, so first-visit observers initialize normally. */}
      <div className={`molar-hero__content ${booted ? 'is-ready' : ''}`}>
          <Reveal><p className="molar-eyebrow"><span className="molar-eyebrow__dot" />PRIVATE DENTAL INTELLIGENCE</p></Reveal>

          <h1 className="molar-hero__title">
            <SplitText text="MOLAR" />
            <br />
            <span className="molar-hero__accent">
              <span className="hero-line">
<SplitText text="Intelligent dental-care," delay={220} />              </span>
              <span className="hero-line">
                <SplitText text="reimagined." delay={440} />
              </span>
            </span>
          </h1>

          <Reveal delay={700}>
            <p className="molar-hero__sub">
              A discreet care experience that brings clinical intelligence, precision and
              continuity into a single considered record.
            </p>
          </Reveal>

          <Reveal delay={880}>
            <div className="molar-hero__cta">
              <Link to="/register" className="molar-btn molar-btn--primary">
                <span>Start your screening</span><ArrowRight size={17} />
              </Link>
              <Link to="/login" className="molar-btn molar-btn--ghost"><span>Dentist sign in</span></Link>
            </div>
          </Reveal>
      </div>

      <div className="molar-hero__meta">
        <span><Counter to={5} /> care stages</span><i />
        <span><Counter to={32} /> tooth records</span><i />
        <span>1 connected file</span>
      </div>

      <div className="molar-scrollhint" aria-hidden="true"><span /><p>Scroll</p></div>
    </section>
  )
}
