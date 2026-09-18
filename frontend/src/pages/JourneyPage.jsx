/**
 * JourneyPage — patient dental journey timeline + Dento contextual assistant.
 *
 * Layout: full-width two-panel (lg:grid-cols-2), stacked on mobile.
 *
 * Left panel:  Journey timeline — 5 stages, m-timeline-node variants.
 * Right panel: Dento chat — typing animation, suggested questions, message history.
 *
 * Dento is deterministic keyword logic — no external AI API.
 * It MUST never diagnose or prescribe.
 */

import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Spinner } from '../components/ui';
import {
  Search,
  Stethoscope,
  FileText,
  CalendarCheck,
  Star,
  Send,
  Bot,
  CheckCheck,
  ArrowRight,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Journey stages definition
// ---------------------------------------------------------------------------
const STAGES = [
  {
    key: 'screening',
    label: 'Screening',
    description: 'Completed your oral health questionnaire.',
    icon: Search,
  },
  {
    key: 'evaluation',
    label: 'Professional Evaluation',
    description: 'A dentist is reviewing your screening.',
    icon: Stethoscope,
  },
  {
    key: 'treatment',
    label: 'Treatment Plan',
    description: 'Your dentist has created a personalised treatment plan.',
    icon: FileText,
  },
  {
    key: 'followup',
    label: 'Follow-up',
    description: 'Completing follow-up actions and check-ins.',
    icon: CalendarCheck,
  },
  {
    key: 'maintenance',
    label: 'Maintenance',
    description: 'Ongoing care to maintain your oral health.',
    icon: Star,
  },
];

// ---------------------------------------------------------------------------
// Stage logic
// ---------------------------------------------------------------------------
function getCurrentStage(screenings, plans, followUps) {
  if (!screenings.length) return -1;
  const latestScreening = screenings[0];
  const activePlan = plans.find((p) => p.status === 'active') || plans[0] || null;

  if (activePlan) {
    const allDone =
      followUps.length > 0 && followUps.every((f) => f.status === 'completed');
    if (allDone) return 4; // Maintenance
    if (followUps.length > 0) return 3; // Follow-up
    return 2; // Treatment
  }
  if (latestScreening.status === 'reviewed') return 1;
  if (latestScreening.status === 'under_review') return 1;
  return 0; // Screening submitted, awaiting review
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Dento responder — deterministic keyword logic
//
// buildDentoResponder(screenings, plans, followUps) → (msg: string) → string
// ---------------------------------------------------------------------------
function match(input, keywords) {
  return keywords.some((k) => input.includes(k));
}

function buildDentoResponder(screenings, plans, followUps) {
  const latestScreening = screenings[0] || null;
  const activePlan = plans.find((p) => p.status === 'active') || plans[0] || null;
  const pendingFollowUps = followUps.filter((f) => f.status === 'pending');

  return function respond(msg) {
    const m = msg.toLowerCase().trim();

    // ------------------------------------------------------------------ //
    // HARD BOUNDARY: diagnoses & prescriptions — always respond first
    // ------------------------------------------------------------------ //
    if (
      match(m, [
        'diagnose', 'do i have', 'is it cancer', 'cancer', 'is this serious',
        'what disease', 'do i have cancer',
      ])
    ) {
      return (
        "Dento can't provide diagnoses — only a qualified dental professional can do that " +
        "after a clinical examination. If you have concerns about a specific symptom, the " +
        "best step is to book an appointment with your dentist. Your screening information " +
        "has been shared with your dental team."
      );
    }

    if (
      match(m, [
        'prescribe', 'medication', 'antibiotic', 'medicine', 'drug',
        'tablet', 'pill', 'painkiller',
      ])
    ) {
      return (
        "Dento can't prescribe medication or recommend specific medicines. Your dentist or GP " +
        "can prescribe appropriate treatment after examining you. Please contact your dental " +
        "practice for guidance."
      );
    }

    // ------------------------------------------------------------------ //
    // 1. WHAT IS MY TREATMENT PLAN
    // ------------------------------------------------------------------ //
    if (
      match(m, [
        'what is my treatment plan', 'my plan', 'plan details', 'explain my plan',
        'explain plan', 'treatment plan', 'what is the plan',
      ])
    ) {
      if (!activePlan) {
        return (
          "You don't have a treatment plan yet. Your dentist will create one after reviewing " +
          "your screening. In the meantime, make sure your screening is submitted — it's the " +
          "first step."
        );
      }

      const steps = Array.isArray(activePlan.steps)
        ? activePlan.steps
        : JSON.parse(activePlan.steps || '[]');

      let reply =
        `Your treatment plan is called **"${activePlan.title}"**.\n\n` +
        `${activePlan.explanation}`;

      if (steps.length) {
        reply +=
          '\n\nYour treatment steps are:\n' +
          steps
            .map((s, i) => `${i + 1}. ${typeof s === 'object' ? s.step : s}`)
            .join('\n');
      }

      if (activePlan.next_appointment) {
        reply += `\n\nYour next appointment is on **${formatDate(activePlan.next_appointment)}**.`;
      }

      return reply;
    }

    // ------------------------------------------------------------------ //
    // 2. WHAT ARE MY FOLLOW-UPS
    // ------------------------------------------------------------------ //
    if (
      match(m, [
        'follow up', 'follow-up', 'followup', 'what are my follow',
        'my follow', 'reminder', 'what do i need to do', 'next steps',
      ])
    ) {
      if (!pendingFollowUps.length) {
        return (
          "You have no pending follow-up tasks right now. Great work staying on top of " +
          "your care! Check back after your next dental appointment."
        );
      }
      const list = pendingFollowUps
        .map(
          (f) =>
            `• ${f.task}${f.due_date ? ` (due ${formatDate(f.due_date)})` : ''}`
        )
        .join('\n');
      return (
        `You have ${pendingFollowUps.length} pending follow-up task${pendingFollowUps.length > 1 ? 's' : ''}:\n\n` +
        `${list}\n\nCompleting these tasks helps your dental team monitor your progress.`
      );
    }

    // ------------------------------------------------------------------ //
    // 3. WHY DO I NEED ANOTHER APPOINTMENT
    // ------------------------------------------------------------------ //
    if (
      match(m, [
        'why do i need another appointment', 'why another appointment',
        'why do i need to go back', 'another visit', 'another appointment',
      ])
    ) {
      if (activePlan) {
        return (
          `Your dentist has set a follow-up appointment as part of your treatment plan **"${activePlan.title}"**. ` +
          `Follow-up visits allow your dental team to monitor your progress, check that treatments are working, ` +
          `and adjust your care plan if needed. Regular check-ins are a key part of good dental care.` +
          (activePlan.next_appointment
            ? `\n\nYour next scheduled appointment is **${formatDate(activePlan.next_appointment)}**.`
            : '')
        );
      }
      return (
        "Follow-up appointments are an important part of dental care. They allow your dentist " +
        "to monitor your progress, ensure any treatments are working, and update your care plan " +
        "if necessary. Your dental team will advise you on when to come back."
      );
    }

    // ------------------------------------------------------------------ //
    // 4. WHAT SHOULD I DO NEXT
    // ------------------------------------------------------------------ //
    if (
      match(m, [
        'what should i do next', 'what do i do next', 'what now',
        'next step', 'what next',
      ])
    ) {
      if (!latestScreening) {
        return (
          "Start by completing your oral health screening if you haven't already — it only " +
          "takes a few minutes and helps your dental team understand your situation."
        );
      }
      if (!activePlan) {
        return (
          "Your screening has been submitted. The next step is to wait for your dentist to " +
          "review it and create a treatment plan. Keep an eye on your dashboard for updates."
        );
      }
      if (pendingFollowUps.length > 0) {
        return (
          `Your next step is to complete your pending follow-up tasks. You have ` +
          `${pendingFollowUps.length} task${pendingFollowUps.length > 1 ? 's' : ''} pending:\n\n` +
          pendingFollowUps
            .slice(0, 3)
            .map((f) => `• ${f.task}`)
            .join('\n') +
          (activePlan.next_appointment
            ? `\n\nAlso, your next appointment is on **${formatDate(activePlan.next_appointment)}**. Make sure to attend.`
            : '')
        );
      }
      return (
        "You're in great shape! Continue following your treatment plan. " +
        "Maintain good oral hygiene daily — brush twice with fluoride toothpaste and floss " +
        "once a day. Your dental team will guide you to the next phase of your care."
      );
    }

    // ------------------------------------------------------------------ //
    // 5. WHAT DID MY DENTIST RECORD
    // ------------------------------------------------------------------ //
    if (
      match(m, [
        'what did my dentist record', 'dentist note', 'dentist comment',
        'what did the dentist say', 'dentist wrote', 'dentist recorded',
      ])
    ) {
      if (!latestScreening) {
        return "No screening has been submitted yet, so there are no dentist records to show.";
      }
      if (!latestScreening.dentist_note) {
        return (
          `Your latest screening (submitted ${formatDate(latestScreening.created_at)}) ` +
          `has status **${latestScreening.status.replace(/_/g, ' ')}**. ` +
          `Your dentist hasn't added notes yet — check back after your screening is reviewed.`
        );
      }
      return (
        `Your dentist's note on your screening reads:\n\n` +
        `"${latestScreening.dentist_note}"\n\n` +
        `This was recorded after reviewing your screening submitted on ` +
        `${formatDate(latestScreening.created_at)}.`
      );
    }

    // ------------------------------------------------------------------ //
    // 6. WHAT HAPPENS AT MY FOLLOW-UP
    // ------------------------------------------------------------------ //
    if (
      match(m, [
        'what happens at my follow-up', 'what happens at follow up',
        'what is a follow-up', 'follow up appointment', 'follow-up visit',
      ])
    ) {
      return (
        "At a follow-up appointment, your dentist will:\n\n" +
        "• Review the progress of your treatment plan\n" +
        "• Check for any changes in your oral health\n" +
        "• Complete any scheduled procedures (e.g., scaling, fillings)\n" +
        "• Update your care plan based on how things are going\n\n" +
        "Bring up any new symptoms or concerns — no matter how small — when you attend."
      );
    }

    // ------------------------------------------------------------------ //
    // Screening status
    // ------------------------------------------------------------------ //
    if (
      match(m, [
        'my screening', 'screening result', 'screening status',
        'what did i report', 'what are my symptoms',
      ])
    ) {
      if (!latestScreening) {
        return (
          "You haven't submitted a screening yet. Head to the Screening page to complete " +
          "one — it only takes a few minutes."
        );
      }
      const symptoms = Array.isArray(latestScreening.symptoms)
        ? latestScreening.symptoms
        : JSON.parse(latestScreening.symptoms || '[]');

      let reply =
        `Your latest screening was submitted on ${formatDate(latestScreening.created_at)} ` +
        `and its status is **${latestScreening.status.replace(/_/g, ' ')}**.`;

      if (symptoms.length) {
        reply += `\n\nYou reported these symptoms: ${symptoms.join(', ')}.`;
      }
      if (latestScreening.dentist_note) {
        reply += `\n\nYour dentist noted: "${latestScreening.dentist_note}"`;
      }
      reply +=
        '\n\n⚠ Remember: this screening is not a diagnosis. A dental professional must evaluate any concerns.';
      return reply;
    }

    // ------------------------------------------------------------------ //
    // Appointment
    // ------------------------------------------------------------------ //
    if (
      match(m, [
        'next appointment', 'when is my appointment', 'appointment date',
        'when do i go',
      ])
    ) {
      if (activePlan?.next_appointment) {
        return (
          `Your next appointment is scheduled for **${formatDate(activePlan.next_appointment)}**. ` +
          `Please contact your dental practice to confirm the exact time.`
        );
      }
      return (
        "No next appointment date has been set in your treatment plan yet. " +
        "Please contact your dental practice to schedule one."
      );
    }

    // ------------------------------------------------------------------ //
    // General dental education
    // ------------------------------------------------------------------ //
    if (match(m, ['periodontal', 'gum disease', 'periodontitis', 'gingivitis'])) {
      return (
        "Periodontal disease (gum disease) affects the gums and bone supporting your teeth. " +
        "It ranges from mild gingivitis (gum inflammation) to more advanced periodontitis. " +
        "Treatment typically involves professional cleaning (scaling and root planing), improved " +
        "home care, and sometimes medication. Your dentist is the right person to assess " +
        "the severity for your specific case."
      );
    }

    if (match(m, ['scaling', 'root plan', 'deep clean', 'deep cleaning'])) {
      return (
        "Scaling and root planing is a deep cleaning procedure that removes plaque and tartar " +
        "from below the gumline. It's a common first-line treatment for gum disease. Your dentist " +
        "numbs the area, then carefully cleans the root surfaces to help your gums reattach. " +
        "It's usually done in one or two visits depending on how many areas need treatment."
      );
    }

    if (match(m, ['cavity', 'caries', 'decay', 'filling'])) {
      return (
        "Dental cavities (caries) are areas of tooth decay caused by bacteria and acids eroding " +
        "the enamel. Early cavities are treated with fillings — your dentist removes the decayed " +
        "material and fills the space. Good brushing, flossing, and regular check-ups are " +
        "key to preventing them."
      );
    }

    if (match(m, ['crown', 'cap'])) {
      return (
        "A dental crown (or cap) is a tooth-shaped covering placed over a damaged or weakened " +
        "tooth to restore its shape, size, and strength. Crowns are used after root canals, large " +
        "fillings, or cracked teeth. Your dentist will take impressions to create a crown that " +
        "fits your bite precisely."
      );
    }

    if (match(m, ['root canal'])) {
      return (
        "Root canal treatment removes infected pulp (the soft tissue inside the tooth) when it " +
        "becomes infected or inflamed. After removing the pulp, the tooth is cleaned, sealed, " +
        "and usually covered with a crown. Modern root canals are no more uncomfortable than " +
        "having a filling and save teeth that would otherwise need extraction."
      );
    }

    if (match(m, ['brush', 'brushing', 'floss', 'flossing', 'oral hygiene'])) {
      return (
        "Good oral hygiene involves brushing twice a day with fluoride toothpaste (for 2 minutes " +
        "each time) and flossing or using interdental brushes once a day. Use a soft-bristled " +
        "toothbrush and replace it every 3 months. Your dentist can advise on specific " +
        "techniques based on your needs."
      );
    }

    if (match(m, ['sensitive teeth', 'sensitivity', 'tooth pain'])) {
      return (
        "Tooth sensitivity can be caused by worn enamel, exposed roots, cavities, cracked teeth, " +
        "or gum recession. Sensitive toothpastes can help, but it's important to see a dentist " +
        "to find the underlying cause. Don't ignore ongoing tooth pain — it usually means " +
        "something needs professional attention."
      );
    }

    if (match(m, ['ulcer', 'mouth sore', 'canker', 'sore in mouth'])) {
      return (
        "Minor mouth ulcers (aphthous ulcers) usually heal within 1–2 weeks and can be managed " +
        "with over-the-counter gels. However, any ulcer that persists for more than 2 weeks " +
        "should be evaluated by a dental professional as a precaution — this is exactly the " +
        "kind of finding your screening is designed to flag."
      );
    }

    if (match(m, ['white patch', 'red patch', 'leukoplakia', 'erythroplakia'])) {
      return (
        "White or red patches in the mouth should always be assessed by a dental professional. " +
        "While most have benign causes, persistent patches warrant a clinical evaluation. " +
        "Your screening questionnaire was designed to help flag these concerns to your dental team."
      );
    }

    if (match(m, ['diet', 'food', 'sugar', 'what to eat', 'what to avoid'])) {
      return (
        "For good oral health, reduce frequent sugary snacks and drinks to help prevent cavities. " +
        "Acidic foods and drinks (citrus, fizzy drinks) can erode enamel. Crunchy fruits and " +
        "vegetables help clean teeth naturally. Staying hydrated with water — especially fluoridated " +
        "water — supports saliva production, which protects teeth."
      );
    }

    if (match(m, ['tobacco', 'smoking', 'vaping', 'smoke'])) {
      return (
        "Tobacco use significantly increases the risk of gum disease, tooth loss, and oral health " +
        "problems. Quitting tobacco is one of the most impactful things you can do for your oral " +
        "health. Your GP or a smoking cessation service can provide support. If you use tobacco, " +
        "it's especially important to have regular dental check-ups."
      );
    }

    // ------------------------------------------------------------------ //
    // Journey questions
    // ------------------------------------------------------------------ //
    if (match(m, ['journey', 'stages', 'process', 'what happens next'])) {
      return (
        "Your MOLAR dental journey has five stages: **Screening** → **Professional Evaluation** " +
        "→ **Treatment Plan** → **Follow-up** → **Maintenance**. The timeline on the left " +
        "shows exactly where you are. Each stage ensures you receive the right care at the right time."
      );
    }

    // ------------------------------------------------------------------ //
    // Greetings / help
    // ------------------------------------------------------------------ //
    if (match(m, ['hello', 'hi', 'hey', 'help', 'what can you do', 'what are you'])) {
      return (
        "Hello! I'm **Dento**, your MOLAR care companion. I can:\n\n" +
        "• Explain your treatment plan\n" +
        "• Tell you about your pending follow-up tasks\n" +
        "• Answer general dental care questions\n" +
        "• Explain what to expect at each stage of your journey\n\n" +
        "I can't diagnose conditions or prescribe medication. For clinical concerns, " +
        "please contact your dental practice directly. What would you like to know?"
      );
    }

    // ------------------------------------------------------------------ //
    // Default fallback
    // ------------------------------------------------------------------ //
    return (
      "I'm not sure I have a good answer for that. Try asking about your treatment plan, " +
      "pending follow-ups, or a general dental topic like brushing, gum disease, or " +
      "tooth sensitivity. For clinical questions, your dental team is the best source of advice."
    );
  };
}

// ---------------------------------------------------------------------------
// Markdown bold renderer helper
// ---------------------------------------------------------------------------
function RenderText({ text }) {
  return (
    <>
      {text.split('\n').map((line, li) => (
        <p key={li} className={li > 0 ? 'mt-1' : ''}>
          {line.split(/\*\*(.+?)\*\*/).map((part, pi) =>
            pi % 2 === 1 ? <strong key={pi}>{part}</strong> : part
          )}
        </p>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Typing indicator
// ---------------------------------------------------------------------------
function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div
        className="m-card rounded-2xl rounded-bl-sm px-4 py-3"
        style={{ background: 'var(--surface-2)' }}
      >
        <div className="m-typing">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Suggested question chips
// ---------------------------------------------------------------------------
const SUGGESTED_QUESTIONS = [
  'What is my treatment plan?',
  'What are my follow-ups?',
  'Why do I need another appointment?',
  'What should I do next?',
];

// ---------------------------------------------------------------------------
// Dento chat panel
// ---------------------------------------------------------------------------
const INITIAL_MESSAGES = [
  {
    role: 'dento',
    text:
      'Hello, I am Dento — your MOLAR care companion. I can explain your treatment plan, ' +
      'follow-up tasks, and general dental care. What would you like to know?',
  },
];

function DentoPanel({ screenings, plans, followUps }) {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const respond = buildDentoResponder(screenings, plans, followUps);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  function sendMessage(text) {
    const trimmed = (text || input).trim();
    if (!trimmed) return;

    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setInput('');
    setTyping(true);

    // 600 ms typing delay before Dento responds
    setTimeout(() => {
      const reply = respond(trimmed);
      setMessages((prev) => [...prev, { role: 'dento', text: reply }]);
      setTyping(false);
    }, 600);

    inputRef.current?.focus();
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const showSuggestions = messages.length <= 1;

  return (
    <div
      className="flex flex-col rounded-[var(--radius-lg)] overflow-hidden"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow)',
        height: '680px',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-4 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
          style={{ background: 'var(--accent-3)' }}
        >
          <Bot size={20} style={{ color: 'var(--accent)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-bold leading-none"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}
          >
            Dento
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
            Your care companion
          </p>
        </div>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold shrink-0"
          style={{
            background: 'var(--success-bg)',
            color: 'var(--success)',
            border: '1px solid rgba(5,150,105,0.20)',
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: 'var(--success)' }}
          />
          Online
        </span>
      </div>

      {/* Disclaimer banner */}
      <div
        className="px-4 py-2 text-xs shrink-0"
        style={{
          background: 'var(--warning-bg)',
          borderBottom: '1px solid rgba(217,119,6,0.18)',
          color: 'var(--warning)',
        }}
      >
        ⚠ Dento explains your care record. Not a diagnosis tool.
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {/* Dento avatar */}
            {msg.role === 'dento' && (
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs mb-0.5"
                style={{ background: 'var(--accent-3)', color: 'var(--accent)' }}
                aria-hidden="true"
              >
                <Bot size={14} />
              </div>
            )}

            <div
              className="max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
              style={
                msg.role === 'user'
                  ? {
                      background: 'var(--accent)',
                      color: 'var(--accent-2)',
                      borderBottomRightRadius: '4px',
                    }
                  : {
                      background: 'var(--surface-2)',
                      color: 'var(--text)',
                      border: '1px solid var(--border)',
                      borderBottomLeftRadius: '4px',
                    }
              }
            >
              <RenderText text={msg.text} />
            </div>

            {/* Read tick for user */}
            {msg.role === 'user' && (
              <CheckCheck
                size={12}
                className="mb-0.5 shrink-0"
                style={{ color: 'var(--text-3)' }}
                aria-hidden="true"
              />
            )}
          </div>
        ))}

        {/* Typing dots */}
        {typing && <TypingIndicator />}

        <div ref={bottomRef} />
      </div>

      {/* Suggested questions (shown when chat is fresh) */}
      {showSuggestions && (
        <div
          className="px-4 pb-2 pt-2 flex flex-wrap gap-1.5 shrink-0"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => sendMessage(q)}
              className="rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text-2)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.color = 'var(--accent)';
                e.currentTarget.style.background = 'var(--accent-3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.color = 'var(--text-2)';
                e.currentTarget.style.background = 'var(--surface-2)';
              }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input row */}
      <div
        className="px-4 py-3 shrink-0"
        style={{ borderTop: showSuggestions ? undefined : '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            className="m-input flex-1"
            placeholder="Ask about your plan, follow-ups, or dental care…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={typing}
            aria-label="Message Dento"
          />
          <button
            type="button"
            onClick={() => sendMessage()}
            disabled={!input.trim() || typing}
            className="m-btn m-btn--primary m-btn--icon shrink-0"
            aria-label="Send message"
          >
            <Send size={15} />
          </button>
        </div>
        <p className="mt-1.5 text-center" style={{ fontSize: '10px', color: 'var(--text-3)' }}>
          Not a diagnosis tool. Contact your dental practice for clinical advice.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Journey timeline panel
// ---------------------------------------------------------------------------
function TimelinePanel({ currentStage, plans, followUps }) {
  const activePlan = plans.find((p) => p.status === 'active') || plans[0] || null;
  const pendingFollowUps = followUps.filter((f) => f.status === 'pending');

  return (
    <div>
      <h1
        className="text-3xl font-bold mb-2"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--text)', letterSpacing: '-0.03em' }}
      >
        Your dental journey.
      </h1>
      <p className="text-sm mb-8" style={{ color: 'var(--text-2)' }}>
        Track every stage of your care — from screening to long-term maintenance.
      </p>

      {/* Timeline */}
      <div className="space-y-0">
        {STAGES.map((stage, index) => {
          const isDone = index < currentStage;
          const isCurrent = index === currentStage;
          const isUpcoming = index > currentStage;
          const isLast = index === STAGES.length - 1;
          const IconComponent = stage.icon;

          return (
            <div key={stage.key} className="flex gap-5">
              {/* Node + connector */}
              <div className="flex flex-col items-center" style={{ flexShrink: 0 }}>
                {/* Node */}
                <div
                  className={`m-timeline-node ${
                    isDone
                      ? 'm-timeline-node--done'
                      : isCurrent
                      ? 'm-timeline-node--current'
                      : 'm-timeline-node--upcoming'
                  }`}
                  aria-label={
                    isDone ? `${stage.label} — completed` :
                    isCurrent ? `${stage.label} — current stage` :
                    `${stage.label} — upcoming`
                  }
                >
                  <IconComponent size={15} />
                </div>

                {/* Connector line */}
                {!isLast && (
                  <div
                    style={{
                      width: '2px',
                      flexGrow: 1,
                      minHeight: '40px',
                      margin: '4px 0',
                      background: isDone ? 'var(--accent)' : 'var(--border)',
                      transition: 'background 0.3s ease',
                    }}
                  />
                )}
              </div>

              {/* Content */}
              <div className={`pb-8 min-w-0 flex-1 ${isLast ? 'pb-0' : ''}`}>
                {/* Stage name */}
                <div className="flex items-center gap-2 mb-0.5" style={{ marginTop: '6px' }}>
                  <h3
                    className="text-sm font-bold leading-tight"
                    style={{
                      color: isCurrent
                        ? 'var(--accent)'
                        : isDone
                        ? 'var(--text)'
                        : 'var(--text-3)',
                    }}
                  >
                    {stage.label}
                  </h3>
                  {isCurrent && (
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-semibold"
                      style={{
                        background: 'var(--accent-3)',
                        color: 'var(--accent)',
                      }}
                    >
                      Current
                    </span>
                  )}
                  {isDone && (
                    <span
                      className="text-xs font-semibold"
                      style={{ color: 'var(--success)' }}
                    >
                      ✓
                    </span>
                  )}
                </div>

                {/* Stage description */}
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: isUpcoming ? 'var(--text-3)' : 'var(--text-3)' }}
                >
                  {stage.description}
                </p>

                {/* Inline details for current Treatment stage */}
                {isCurrent && stage.key === 'treatment' && activePlan && (
                  <div
                    className="mt-2.5 rounded-xl px-3 py-2.5"
                    style={{
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border-accent)',
                    }}
                  >
                    <p className="text-xs font-bold" style={{ color: 'var(--text)' }}>
                      {activePlan.title}
                    </p>
                    {activePlan.next_appointment && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <CalendarCheck size={11} style={{ color: 'var(--accent)' }} />
                        <span className="text-xs" style={{ color: 'var(--text-2)' }}>
                          Next appt:{' '}
                          <strong style={{ color: 'var(--accent)' }}>
                            {formatDate(activePlan.next_appointment)}
                          </strong>
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Inline details for current Follow-up stage */}
                {isCurrent && stage.key === 'followup' && pendingFollowUps.length > 0 && (
                  <div className="mt-2.5 space-y-1.5">
                    {pendingFollowUps.slice(0, 3).map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center gap-2 rounded-xl px-3 py-2"
                        style={{
                          background: 'var(--warning-bg)',
                          border: '1px solid rgba(217,119,6,0.20)',
                        }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full shrink-0"
                          style={{ background: 'var(--warning)' }}
                        />
                        <span className="text-xs flex-1" style={{ color: 'var(--warning)' }}>
                          {f.task}
                        </span>
                        {f.due_date && (
                          <span
                            className="text-xs font-semibold shrink-0"
                            style={{ color: 'var(--warning)', opacity: 0.75 }}
                          >
                            {formatDate(f.due_date)}
                          </span>
                        )}
                      </div>
                    ))}
                    {pendingFollowUps.length > 3 && (
                      <p className="text-xs pl-2" style={{ color: 'var(--text-3)' }}>
                        +{pendingFollowUps.length - 3} more tasks
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main JourneyPage
// ---------------------------------------------------------------------------
export default function JourneyPage() {
  const [screenings, setScreenings] = useState([]);
  const [plans, setPlans] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getScreenings().catch(() => ({ screenings: [] })),
      api.getPlans().catch(() => ({ plans: [] })),
      api.getFollowUps().catch(() => ({ followUps: [] })),
    ]).then(([s, p, f]) => {
      setScreenings(s.screenings || []);
      setPlans(p.plans || []);
      setFollowUps(f.followUps || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <span
          className="m-spinner m-spinner--lg"
          role="status"
          aria-label="Loading"
          style={{ color: 'var(--accent)' }}
        />
      </div>
    );
  }

  const currentStage = getCurrentStage(screenings, plans, followUps);
  const hasNoData = screenings.length === 0;

  // No data: show empty state nudge
  if (hasNoData) {
    return (
      <div className="m-page-enter mx-auto max-w-xl py-16 text-center px-4">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-3xl text-4xl mx-auto mb-6"
          style={{ background: 'var(--surface-2)' }}
        >
          🦷
        </div>
        <h1
          className="text-2xl font-bold mb-2"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}
        >
          Your journey starts with a screening.
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-2)' }}>
          Complete your oral health screening to begin your MOLAR dental journey and unlock
          Dento, your care companion.
        </p>
        <Link
          to="/screening"
          className="m-btn m-btn--primary m-btn--lg inline-flex items-center gap-2"
        >
          Start screening <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  return (
    <div className="m-page-enter">
      {/* Two-panel grid */}
      <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
        {/* Left — Journey timeline */}
        <div>
          <TimelinePanel
            currentStage={currentStage}
            plans={plans}
            followUps={followUps}
          />
        </div>

        {/* Right — Dento */}
        <div className="lg:sticky lg:top-6">
          <DentoPanel
            screenings={screenings}
            plans={plans}
            followUps={followUps}
          />
        </div>
      </div>

      {/* Footer link */}
      <p className="mt-8 text-xs text-center" style={{ color: 'var(--text-3)' }}>
        Questions about your care? Ask Dento above. ·{' '}
        <Link
          to="/dashboard"
          className="font-semibold"
          style={{ color: 'var(--accent)' }}
        >
          Back to dashboard
        </Link>
      </p>
    </div>
  );
}
