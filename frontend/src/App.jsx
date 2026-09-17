const workspaceCards = [
  { label: "Today's appointments", value: '08', detail: '2 next up' },
  { label: 'Open follow-ups', value: '12', detail: 'Across your team' },
  { label: 'Shared records', value: '24', detail: 'Recently updated' },
]

function App() {
  return (
    <main className="min-h-screen overflow-hidden px-5 py-5 sm:px-8 lg:px-12">
      <header className="mx-auto flex max-w-7xl items-center justify-between border-b border-slate-200/80 pb-5">
        <a className="flex items-center gap-3" href="#top" aria-label="MOLAR home">
          <span className="logo-mark" aria-hidden="true">M</span>
          <span className="text-lg font-semibold tracking-[0.22em] text-slate-950">MOLAR</span>
        </a>
        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-500 md:flex" aria-label="Main navigation">
          <a className="nav-link nav-link-active" href="#workspace">Workspace</a>
          <a className="nav-link" href="#workspace">Appointments</a>
          <a className="nav-link" href="#workspace">Follow-up</a>
        </nav>
        <a className="button button-dark" href="#workspace">Open workspace <span aria-hidden="true">-&gt;</span></a>
      </header>

      <section id="top" className="mx-auto grid max-w-7xl items-center gap-14 py-16 lg:grid-cols-[0.88fr_1.12fr] lg:py-24">
        <div className="max-w-xl">
          <p className="eyebrow">Dental practice, in sync</p>
          <h1 className="mt-5 text-5xl font-semibold leading-[0.98] tracking-[-0.055em] text-slate-950 sm:text-7xl">One calm place for better dental care.</h1>
          <p className="mt-7 max-w-md text-lg leading-8 text-slate-600">MOLAR brings your team, patient context, and next steps into one clear workspace.</p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <a className="button button-primary" href="#workspace">Explore the workspace <span aria-hidden="true">-&gt;</span></a>
            <a className="text-sm font-semibold text-slate-600 underline decoration-slate-300 underline-offset-8 transition hover:text-slate-950" href="#preview">See the preview</a>
          </div>
          <p className="mt-7 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Designed for the moments between chairside and follow-up</p>
        </div>

        <div id="preview" className="dashboard-frame" aria-label="MOLAR workspace preview">
          <div className="dashboard-topbar">
            <div className="flex items-center gap-2"><span className="logo-mark logo-mark-small" aria-hidden="true">M</span><span className="text-xs font-semibold tracking-[0.16em] text-slate-700">MOLAR / WORKSPACE</span></div>
            <span className="status-pill"><span className="status-dot" aria-hidden="true"></span>Workspace ready</span>
          </div>
          <div className="dashboard-body">
            <aside className="dashboard-sidebar" aria-label="Workspace preview navigation">
              <span className="sidebar-label">Practice</span>
              {['Overview', 'Schedule', 'Records', 'Messages'].map((item, index) => <span className={index === 0 ? 'sidebar-item sidebar-item-active' : 'sidebar-item'} key={item}>{item}</span>)}
              <span className="sidebar-label sidebar-label-lower">Workspace</span><span className="sidebar-item">Settings</span>
            </aside>
            <section className="min-w-0 flex-1 p-5 sm:p-7" id="workspace">
              <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Thursday, September 17</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Good morning, team</h2></div><span className="avatar" aria-label="Team profile">T</span></div>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">{workspaceCards.map((card) => <div className="workspace-card" key={card.label}><p className="text-xs font-medium leading-5 text-slate-500">{card.label}</p><p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-slate-950">{card.value}</p><p className="mt-1 text-[11px] text-slate-400">{card.detail}</p></div>)}</div>
              <div className="mt-4 grid gap-4 md:grid-cols-[1.12fr_0.88fr]">
                <div className="workspace-panel"><div className="flex items-center justify-between"><h3>Today at a glance</h3><span className="panel-action">View schedule</span></div><div className="schedule-row"><span className="schedule-time">09:30</span><span className="schedule-line"></span><span className="schedule-label">Morning appointments</span></div><div className="schedule-row"><span className="schedule-time">12:45</span><span className="schedule-line schedule-line-muted"></span><span className="schedule-label">Team handover</span></div><div className="schedule-row"><span className="schedule-time">15:00</span><span className="schedule-line schedule-line-light"></span><span className="schedule-label">Follow-up block</span></div></div>
                <div className="workspace-panel panel-tinted"><h3>Care team pulse</h3><p className="mt-4 text-sm leading-6 text-slate-600">Keep the whole practice aligned with a shared view of what needs attention next.</p><div className="pulse-bar" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div><p className="mt-3 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">Clear context, fewer handoffs</p></div>
              </div>
            </section>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-3 border-t border-slate-200/80 py-5 text-xs font-medium uppercase tracking-[0.14em] text-slate-400 sm:flex-row sm:items-center sm:justify-between"><span>Practice clarity, by MOLAR</span><span>Foundation preview / 01</span></footer>
    </main>
  )
}

export default App
