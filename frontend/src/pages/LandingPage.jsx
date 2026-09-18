import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  CalendarCheck,
  Check,
  FileText,
  MessageCircle,
  Mic2,
  Moon,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Sun,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const STAGES = [
  { n: '01', label: 'SCREEN', title: 'Catch the signal early.', text: 'Guided questions and oral images turn vague concern into structured information.', icon: Search },
  { n: '02', label: 'EVALUATE', title: 'Put findings in context.', text: 'A dentist reviews the screening case and records clinically relevant findings.', icon: Stethoscope },
  { n: '03', label: 'TREAT', title: 'Make the next step visible.', text: 'Treatment plans become clear actions instead of disconnected appointment notes.', icon: FileText },
  { n: '04', label: 'UNDERSTAND', title: 'Know what your care means.', text: 'Dento explains dentist-provided findings and instructions in plain language.', icon: MessageCircle },
  { n: '05', label: 'FOLLOW UP', title: 'Keep the thread alive.', text: 'Follow-ups and reminders carry the care journey beyond the chair.', icon: CalendarCheck },
];

function SystemGraphic() {
  return (
    <div className="molar-system">
      <div className="molar-system__grid" />
      <div className="molar-system__orbit molar-system__orbit--one" />
      <div className="molar-system__orbit molar-system__orbit--two" />
      <div className="molar-system__orbit molar-system__orbit--three" />

      <div className="molar-system__node molar-system__node--a">01</div>
      <div className="molar-system__node molar-system__node--b">02</div>
      <div className="molar-system__node molar-system__node--c">03</div>
      <div className="molar-system__node molar-system__node--d">05</div>

      <div className="molar-core">
        <div className="molar-core__top">
          <span>LIVE CARE SIGNAL</span>
          <i />
        </div>
        <div className="molar-core__mark">M</div>
        <div className="molar-core__title">CARE<br />CONNECTED</div>
        <div className="molar-core__footer">
          <span>SCREEN → EVALUATE</span>
          <span>01 / 05</span>
        </div>
      </div>

      <div className="molar-float molar-float--risk">
        <span className="molar-float__label">ORAL-RISK SCREEN</span>
        <strong>3 signals</strong>
        <small>need professional review</small>
        <div className="molar-mini-bars"><i /><i /><i /></div>
      </div>

      <div className="molar-float molar-float--voice">
        <span className="molar-float__label">VOICE CHARTING</span>
        <strong>26 · 4 / 3 / 4 mm</strong>
        <small>bleeding · confirmed</small>
        <div className="molar-wave"><i /><i /><i /><i /><i /><i /><i /></div>
      </div>

      <div className="molar-float molar-float--dento">
        <Sparkles size={13} />
        <span>DENTO</span>
        <small>“Why is my follow-up needed?”</small>
      </div>
    </div>
  );
}

function ProductPanel({ stage, index }) {
  const Icon = stage.icon;
  return (
    <article className={`molar-product-panel molar-product-panel--${index}`}>
      <div className="molar-product-panel__chrome">
        <span>{stage.n}</span>
        <span>{stage.label}</span>
        <span>●</span>
      </div>
      <div className="molar-product-panel__body">
        <div className="molar-product-panel__copy">
          <div className="molar-icon-square"><Icon size={17} /></div>
          <p className="molar-kicker">MOLAR / CARE SYSTEM</p>
          <h3>{stage.title}</h3>
          <p>{stage.text}</p>
        </div>

        <div className="molar-ui">
          {index === 0 && (
            <>
              <div className="molar-ui__head"><span>SCREENING</span><b>DEMO PATIENT</b></div>
              <div className="molar-ui__row"><span>Persistent ulcer</span><strong>12 days</strong></div>
              <div className="molar-ui__row"><span>Smokeless tobacco</span><strong>Yes</strong></div>
              <div className="molar-ui__row"><span>Oral image</span><strong>Received ✓</strong></div>
              <div className="molar-ui__signal"><i /> Professional evaluation recommended</div>
            </>
          )}
          {index === 1 && (
            <>
              <div className="molar-ui__head"><span>DENTIST REVIEW</span><b>CASE 0042</b></div>
              <div className="molar-ui__measure"><strong>26</strong><span>MESIAL</span><b>4 mm</b></div>
              <div className="molar-ui__measure"><strong>26</strong><span>MIDDLE</span><b>3 mm</b></div>
              <div className="molar-ui__measure"><strong>26</strong><span>DISTAL</span><b>4 mm</b></div>
              <div className="molar-ui__confirm"><Check size={13} /> Dentist-confirmed finding</div>
            </>
          )}
          {index === 2 && (
            <>
              <div className="molar-ui__head"><span>TREATMENT PLAN</span><b>ACTIVE</b></div>
              <div className="molar-plan-row"><i /> Periodontal therapy <b>01</b></div>
              <div className="molar-plan-row"><i /> Review appointment <b>18 SEP</b></div>
              <div className="molar-plan-row"><i /> Home-care instructions <b>03</b></div>
              <div className="molar-progress"><span style={{ width: '64%' }} /></div>
            </>
          )}
          {index === 3 && (
            <>
              <div className="molar-ui__head"><span>DENTO / CARE CONTEXT</span><b>READY</b></div>
              <div className="molar-chat molar-chat--user">Why do I need another appointment?</div>
              <div className="molar-chat molar-chat--bot">Your dentist recorded a follow-up so the treatment response can be reviewed.</div>
              <div className="molar-chat molar-chat--bot">I can only explain information recorded in your care plan.</div>
            </>
          )}
          {index === 4 && (
            <>
              <div className="molar-ui__head"><span>YOUR JOURNEY</span><b>03 / 05</b></div>
              <div className="molar-journey-mini">
                <div className="done"><i>✓</i><span>Screened</span></div>
                <div className="done"><i>✓</i><span>Evaluated</span></div>
                <div className="current"><i>03</i><span>Treatment</span></div>
                <div><i>04</i><span>Follow-up</span></div>
              </div>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

export default function LandingPage() {
  const { theme, toggle } = useTheme();

  return (
    <div className="molar-landing">
      <header className="molar-nav">
        <Link to="/" className="molar-brand" aria-label="MOLAR home">
          <span className="molar-brand__mark">M</span>
          <span>MOLAR</span>
        </Link>

        <nav className="molar-nav__links" aria-label="Main navigation">
          <a href="#system">System</a>
          <a href="#clinical">Clinical layer</a>
          <a href="#dento">Dento</a>
        </nav>

        <div className="molar-nav__actions">
          <button className="molar-theme" onClick={toggle} aria-label="Toggle theme">
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <Link to="/login" className="molar-nav__signin">Sign in</Link>
          <Link to="/register" className="molar-nav__cta">Get started <ArrowUpRight size={14} /></Link>
        </div>
      </header>

      <main>
        <section className="molar-hero">
          <div className="molar-hero__noise" />
          <div className="molar-hero__copy">
            <p className="molar-kicker">DSOLVE 2026 / DENTAL INTELLIGENCE PLATFORM</p>
            <h1>Dental care<br /><em>finally connected.</em></h1>
            <p className="molar-hero__lead">
              MOLAR connects the moments before, during and after a dental visit —
              turning early oral-risk signals into reviewed care, clear treatment and follow-through.
            </p>
            <div className="molar-hero__actions">
              <Link to="/register" className="molar-action molar-action--solid">Start a screening <ArrowRight size={16} /></Link>
              <a href="#system" className="molar-action molar-action--line">Explore the system <ArrowDownIcon /></a>
            </div>
            <div className="molar-hero__meta">
              <span><i /> PROTOTYPE</span>
              <span>NOT A MEDICAL DEVICE</span>
              <span>DEMO ENVIRONMENT</span>
            </div>
          </div>

          <SystemGraphic />

          <div className="molar-hero__edge">
            <span>01</span><span>05</span>
            <div><i /></div>
            <span>CONNECTED CARE PATH</span>
          </div>
        </section>

        <section className="molar-statement">
          <p className="molar-kicker">THE GAP</p>
          <h2>Dental care shouldn't<br /><span>reset after every visit.</span></h2>
          <p>
            A screening can surface a concern. A dentist can document a finding.
            A patient can leave with instructions. The problem is what happens between those moments.
          </p>
        </section>

        <section id="system" className="molar-system-section">
          <div className="molar-section-head">
            <div>
              <p className="molar-kicker">01 / THE MOLAR SYSTEM</p>
              <h2>One thread.<br /><em>Five moments.</em></h2>
            </div>
            <p>Designed around the patient's journey, with a clinical workspace underneath it.</p>
          </div>

          <div className="molar-stage-rail">
            {STAGES.map((stage, i) => (
              <a href={`#stage-${i}`} key={stage.n} className={i === 0 ? 'is-active' : ''}>
                <span>{stage.n}</span>{stage.label}
              </a>
            ))}
          </div>

          <div className="molar-panels">
            {STAGES.map((stage, i) => (
              <div id={`stage-${i}`} key={stage.n}>
                <ProductPanel stage={stage} index={i} />
              </div>
            ))}
          </div>
        </section>

        <section id="clinical" className="molar-clinical">
          <div className="molar-clinical__visual">
            <div className="molar-clinical__top"><span>CLINICAL WORKSPACE</span><span>SECURE / ROLE-AWARE</span></div>
            <div className="molar-clinical__number">02</div>
            <div className="molar-clinical__scanline" />
            <div className="molar-tooth-map">
              {['18','17','16','15','14','13','12','11','21','22','23','24','25','26','27','28'].map((t, i) => (
                <span className={t === '26' ? 'selected' : ''} key={t}>{t}</span>
              ))}
            </div>
            <div className="molar-clinical__voice">
              <div><Mic2 size={15} /><span>LISTENING</span></div>
              <strong>“Tooth twenty-six, four, three, four, bleeding.”</strong>
              <div className="molar-wave molar-wave--large"><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
            </div>
          </div>

          <div className="molar-clinical__copy">
            <p className="molar-kicker">02 / CLINICAL INTELLIGENCE</p>
            <h2>The dentist speaks.<br /><em>MOLAR structures it.</em></h2>
            <p>
              Voice-based periodontal charting converts a dentist's spoken measurements
              into a reviewable structure. The clinician remains in control: parsed values
              are presented for confirmation before they become part of the record.
            </p>
            <div className="molar-feature-list">
              <div><Check size={14} /><span>Tooth-level measurements</span></div>
              <div><Check size={14} /><span>Correction before confirmation</span></div>
              <div><Check size={14} /><span>Structured treatment context</span></div>
            </div>
          </div>
        </section>

        <section id="dento" className="molar-dento">
          <div className="molar-dento__copy">
            <p className="molar-kicker">03 / DENTO</p>
            <h2>Your care,<br /><em>explained.</em></h2>
            <p>
              Dento is not a generic chatbot. It works from the patient's MOLAR care record:
              screening status, dentist-confirmed findings, treatment plan and follow-up.
            </p>
            <Link to="/register" className="molar-text-link">Experience the patient journey <ArrowRight size={15} /></Link>
          </div>

          <div className="molar-dento__panel">
            <div className="molar-dento__bar"><span><Sparkles size={13} /> DENTO</span><span>CARE CONTEXT ACTIVE</span></div>
            <div className="molar-dento__conversation">
              <div className="molar-dento__question">What did my dentist record?</div>
              <div className="molar-dento__answer">
                <span className="molar-dento__avatar">D</span>
                <p>Your dentist recorded measurements for tooth 26: 4 mm mesial, 3 mm middle and 4 mm distal, with bleeding noted. These findings are marked for clinical review.</p>
              </div>
              <div className="molar-dento__suggestions">
                <span>Why do I need follow-up?</span>
                <span>What is my treatment plan?</span>
                <span>What should I do next?</span>
              </div>
            </div>
          </div>
        </section>

        <section className="molar-security">
          <div>
            <p className="molar-kicker">04 / TRUST LAYER</p>
            <h2>Built to keep<br /><em>context in bounds.</em></h2>
          </div>
          <div className="molar-security__grid">
            <div><ShieldCheck size={17} /><strong>Role-aware access</strong><span>Patients and dentists see only the data their role is authorized to access.</span></div>
            <div><ShieldCheck size={17} /><strong>Controlled images</strong><span>Medical-image access is authenticated rather than exposed as a public asset.</span></div>
            <div><ShieldCheck size={17} /><strong>Safer defaults</strong><span>Validation, rate limiting, restrictive CORS and safe error handling form the prototype baseline.</span></div>
          </div>
        </section>

        <section className="molar-final">
          <div className="molar-final__index">M / 05</div>
          <p className="molar-kicker">THE POINT OF MOLAR</p>
          <h2>Make the next step<br /><em>impossible to miss.</em></h2>
          <p>From first signal to follow-up, every moment stays connected.</p>
          <Link to="/register" className="molar-action molar-action--solid">Enter MOLAR <ArrowUpRight size={16} /></Link>
        </section>
      </main>

      <footer className="molar-footer">
        <span>MOLAR / DSOLVE 2026 / PROTOTYPE</span>
        <span>NOT A MEDICAL DEVICE · FOR DEMONSTRATION PURPOSES</span>
        <Link to="/login">SIGN IN</Link>
      </footer>
    </div>
  );
}

function ArrowDownIcon() {
  return <span aria-hidden="true" className="molar-arrow-down">↓</span>;
}
