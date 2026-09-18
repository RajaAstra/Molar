import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Mic, MicOff, Save, ChevronLeft, History, Pencil } from 'lucide-react';
import { api } from '../api';

const recognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
const TOOTH_NUMBERS = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28, 38, 37, 36, 35, 34, 33, 32, 31, 41, 42, 43, 44, 45, 46, 47, 48];

function readableType(type) { return type.replace(/_/g, ' '); }

export default function ClinicalMeasurementWorkspace() {
  const { id: screeningId } = useParams();
  const [screening, setScreening] = useState(null);
  const [items, setItems] = useState([]);
  const [transcript, setTranscript] = useState('');
  const [parsed, setParsed] = useState(null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedTooth, setSelectedTooth] = useState('');
  const [editing, setEditing] = useState(null);
  const recognition = useRef(null);

  useEffect(() => {
    api.getScreening(screeningId).then(({ screening: value }) => {
      setScreening(value);
      return api.getVoiceClinicalMeasurements({ patient_id: value.patient_id, screening_id: screeningId });
    }).then(({ measurements }) => setItems(measurements)).catch((err) => setError(err.message || 'Could not load this clinical workspace.'));
    return () => recognition.current?.stop();
  }, [screeningId]);

  async function parse(value = transcript) {
    setError('');
    try {
      const result = await api.parseClinicalVoice(value);
      if (!result.ok) throw new Error(result.error);
      setParsed(result.data);
      setSelectedTooth(result.data.tooth_identifier || '');
    } catch (err) { setParsed(null); setError(err.message || 'Unable to interpret that measurement.'); }
  }

  function toggleListening() {
    if (!recognitionConstructor) { setError('Speech recognition is not supported in this browser. You can still type a measurement.'); return; }
    if (listening) return recognition.current?.stop();
    const instance = new recognitionConstructor();
    instance.continuous = false;
    instance.interimResults = true;
    instance.lang = 'en-US';
    instance.onresult = (event) => {
      const value = Array.from(event.results).map((result) => result[0].transcript).join(' ').trim();
      setTranscript(value);
      if (event.results[event.results.length - 1].isFinal) parse(value);
    };
    instance.onerror = (event) => { if (event.error !== 'aborted') setError(`Speech input failed: ${event.error}.`); };
    instance.onend = () => setListening(false);
    recognition.current = instance;
    setListening(true);
    instance.start();
  }

  async function save() {
    if (!parsed || !screening) return;
    setSaving(true); setError('');
    try {
      const { measurement } = await api.createVoiceClinicalMeasurement({
        ...parsed,
        tooth_identifier: selectedTooth || null,
        patient_id: screening.patient_id,
        screening_id: Number(screeningId),
        voice_transcription: transcript,
      });
      setItems((current) => [measurement, ...current]);
      setParsed(null); setTranscript('');
    } catch (err) { setError(err.message || 'Unable to save measurement.'); } finally { setSaving(false); }
  }

  async function correct(item) {
    if (editing?.id !== item.id) {
      setEditing({ id: item.id, value: String(item.value), site: item.site || '' });
      return;
    }
    try {
      const value = item.measurement_type === 'bleeding'
        ? editing.value === 'true'
        : Number(editing.value);
      const { measurement } = await api.updateVoiceClinicalMeasurement(item.id, { value, site: editing.site || null });
      setItems((current) => [measurement, ...current.map((entry) => entry.id === item.id ? { ...entry, corrected: true } : entry)]);
      setEditing(null);
    } catch (err) { setError(err.message || 'Unable to save correction.'); }
  }

  return <div className="m-page-enter" style={{ maxWidth: 920, margin: '0 auto' }}>
    <Link to={`/dentist/cases/${screeningId}`} className="molar-back-link"><ChevronLeft size={15} /> Back to case</Link>
    <p className="m-eyebrow" style={{ marginTop: 20 }}>Hands-free documentation</p>
    <h1 style={{ marginTop: 6 }}>Real-time clinical measurement</h1>
    <p style={{ color: 'var(--text-2)', maxWidth: 680 }}>Speak naturally, review the structured finding, then save it to the protected clinical record. Every correction retains its source history.</p>
    {screening && <p className="molar-subtle">Patient: {screening.patient_name} · Case #{screening.id}</p>}
    {error && <p role="alert" className="molar-inline-error">{error}</p>}

    <section className="m-card" style={{ padding: 24, marginTop: 24 }}>
      <div className="voice-workspace">
        <div>
          <label className="molar-field-label" htmlFor="voice-transcript">Live transcript</label>
          <textarea id="voice-transcript" className="m-input" value={transcript} onChange={(event) => setTranscript(event.target.value)} placeholder={'Try: “Tooth 26, pocket depth 4 millimeters, distal”'} rows={4} />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
            <button type="button" className="m-btn m-btn--primary" onClick={toggleListening}><>{listening ? <MicOff size={16} /> : <Mic size={16} />}</> {listening ? 'Stop listening' : 'Start voice input'}</button>
            <button type="button" className="m-btn m-btn--secondary" onClick={() => parse()} disabled={!transcript.trim()}>Interpret transcript</button>
          </div>
        </div>
        <aside className="molar-parse-panel">
          <span className="molar-field-label">Structured result</span>
          {parsed ? <>
            <strong>{readableType(parsed.measurement_type)}</strong>
            <label className="molar-field-label" htmlFor="tooth-selector">Tooth location
              <select id="tooth-selector" className="m-input" value={selectedTooth} onChange={(event) => setSelectedTooth(event.target.value)}>
                <option value="">Not specified</option>{TOOTH_NUMBERS.map((tooth) => <option key={tooth} value={tooth}>Tooth {tooth}</option>)}
              </select>
            </label>
            <dl><div><dt>Value</dt><dd>{parsed.measurement_type === 'bleeding' ? (parsed.value ? 'Positive' : 'Negative') : `${parsed.value} ${parsed.unit}`}</dd></div><div><dt>Site</dt><dd>{parsed.site || 'Not specified'}</dd></div></dl>
            <button type="button" className="m-btn m-btn--primary" onClick={save} disabled={saving}><Save size={15} /> {saving ? 'Saving…' : 'Confirm & save'}</button>
          </> : <p>Awaiting a complete measurement.</p>}
        </aside>
      </div>
    </section>

    <section style={{ marginTop: 28 }}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><History size={16} color="var(--accent)" /><h2 style={{ fontSize: '1.3rem', margin: 0 }}>Documentation history</h2></div>
      <div className="molar-record-list">{items.length ? items.map((item) => <article className="molar-record" key={item.id}><div><strong>{item.tooth_identifier ? `Tooth ${item.tooth_identifier} · ` : ''}{readableType(item.measurement_type)}</strong><p>{item.measurement_type === 'bleeding' ? (item.value ? 'Positive' : 'Negative') : `${item.value} ${item.unit || ''}`} {item.site ? `· ${item.site}` : ''} {item.corrected ? '· superseded' : ''}</p><small>{new Date(item.created_at).toLocaleString()} {item.voice_transcription ? `· “${item.voice_transcription}”` : ''}</small>{editing?.id === item.id && <div className="molar-correction-editor"><label>Corrected value {item.measurement_type === 'bleeding' ? <select value={editing.value} onChange={(event) => setEditing({ ...editing, value: event.target.value })}><option value="true">Positive</option><option value="false">Negative</option></select> : <input className="m-input" type="number" min="0" max="20" value={editing.value} onChange={(event) => setEditing({ ...editing, value: event.target.value })} />}</label><label>Site <select value={editing.site} onChange={(event) => setEditing({ ...editing, site: event.target.value })}><option value="">Not specified</option><option value="mesial">Mesial</option><option value="distal">Distal</option><option value="buccal">Buccal</option><option value="lingual">Lingual</option></select></label><button type="button" className="m-btn m-btn--primary" onClick={() => correct(item)}>Save correction</button><button type="button" className="m-btn m-btn--secondary" onClick={() => setEditing(null)}>Cancel</button></div>}</div>{!item.corrected && <button type="button" onClick={() => correct(item)} aria-label="Correct measurement"><Pencil size={15} /></button>}</article>) : <p className="molar-subtle">No measurements recorded for this case yet.</p>}</div>
    </section>
  </div>;
}
