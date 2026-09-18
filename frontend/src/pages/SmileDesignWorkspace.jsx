import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, ImagePlus, Send, Sparkles } from 'lucide-react';
import { api } from '../api';

function listFromLines(value) { return value.split('\n').map((line) => line.trim()).filter(Boolean); }

export default function SmileDesignWorkspace() {
  const { id: screeningId } = useParams();
  const [screening, setScreening] = useState(null);
  const [designs, setDesigns] = useState([]);
  const [form, setForm] = useState({ notes: '', patient_summary: '', plan: '' });
  const [files, setFiles] = useState({ original: null, simulated: null });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getScreening(screeningId).then(({ screening: value }) => {
      setScreening(value);
      return api.getSmileDesigns({ screening_id: screeningId });
    }).then(({ smile_designs }) => setDesigns(smile_designs)).catch((err) => setError(err.message || 'Could not load smile design workspace.'));
  }, [screeningId]);

  async function submit(event) {
    event.preventDefault();
    if (!screening) return;
    setSaving(true); setError('');
    try {
      const payload = new FormData();
      payload.set('patient_id', screening.patient_id);
      payload.set('screening_id', screeningId);
      payload.set('notes', form.notes);
      payload.set('patient_summary', form.patient_summary);
      payload.set('treatment_plan', JSON.stringify(listFromLines(form.plan)));
      if (files.original) payload.set('original_image', files.original);
      if (files.simulated) payload.set('simulated_image', files.simulated);
      const { smile_design } = await api.createSmileDesign(payload);
      setDesigns((current) => [smile_design, ...current]);
      setForm({ notes: '', patient_summary: '', plan: '' }); setFiles({ original: null, simulated: null });
    } catch (err) { setError(err.message || 'Could not create the smile design.'); } finally { setSaving(false); }
  }

  async function setStatus(design, status) {
    try {
      const { smile_design } = await api.updateSmileDesignStatus(design.id, status);
      setDesigns((current) => current.map((item) => item.id === design.id ? smile_design : item));
    } catch (err) { setError(err.message || 'Could not update design status.'); }
  }

  return <div className="m-page-enter" style={{ maxWidth: 1000, margin: '0 auto' }}>
    <Link to={`/dentist/cases/${screeningId}`} className="molar-back-link"><ChevronLeft size={15} /> Back to case</Link>
    <p className="m-eyebrow" style={{ marginTop: 20 }}>Visual treatment communication</p>
    <h1 style={{ marginTop: 6 }}>Digital Smile Design</h1>
    <p style={{ color: 'var(--text-2)', maxWidth: 700 }}>Create a clinician-reviewed proposal for {screening?.patient_name || 'this patient'}. Only approved designs are visible in the patient portal.</p>
    {error && <p role="alert" className="molar-inline-error">{error}</p>}
    <form onSubmit={submit} className="m-card molar-design-form">
      <div className="molar-design-files"><label><ImagePlus size={17} /> Original smile image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFiles((current) => ({ ...current, original: event.target.files?.[0] || null }))} /><small>{files.original?.name || 'Optional—use the protected case image if appropriate.'}</small></label><label><Sparkles size={17} /> Proposal image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFiles((current) => ({ ...current, simulated: event.target.files?.[0] || null }))} /><small>{files.simulated?.name || 'Optional clinician-created visualization.'}</small></label></div>
      <label className="molar-field-label">Treatment steps (one per line)<textarea className="m-input" value={form.plan} onChange={(event) => setForm({ ...form, plan: event.target.value })} placeholder="Alignment consultation\nWhitening review" rows={3} /></label>
      <label className="molar-field-label">Patient-facing summary<textarea className="m-input" value={form.patient_summary} onChange={(event) => setForm({ ...form, patient_summary: event.target.value })} placeholder="Describe the intended result in clear, non-diagnostic language." rows={3} /></label>
      <label className="molar-field-label">Clinical notes<textarea className="m-input" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={3} /></label>
      <button type="submit" className="m-btn m-btn--primary" disabled={saving || !screening}><Send size={15} /> {saving ? 'Creating…' : 'Create draft proposal'}</button>
    </form>
    <section style={{ marginTop: 30 }}><h2 style={{ fontSize: '1.3rem' }}>Case proposals</h2><div className="molar-design-list">{designs.length ? designs.map((design) => <article className="m-card molar-design-card" key={design.id}><div><p className="molar-eyebrow">{design.status}</p><strong>{design.patient_summary || 'No patient summary added'}</strong><p>{design.treatment_plan?.join(' · ') || 'No treatment steps added'}</p><small>Created {new Date(design.created_at).toLocaleDateString()}</small></div><div className="molar-design-actions">{design.status === 'draft' && <button type="button" className="m-btn m-btn--secondary" onClick={() => setStatus(design, 'review')}>Ready for review</button>}{design.status === 'review' && <button type="button" className="m-btn m-btn--primary" onClick={() => setStatus(design, 'approved')}>Approve for patient</button>}{design.status === 'approved' && <span className="molar-approved">Visible to patient</span>}</div></article>) : <p className="molar-subtle">No smile proposals for this case yet.</p>}</div></section>
  </div>;
}
