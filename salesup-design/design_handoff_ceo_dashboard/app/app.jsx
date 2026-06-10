/* ============================================================
   App shell — centered pill nav + tabbed focus dashboard
   ============================================================ */
const { useState: aS } = React;

const TABS = [
  { id: "oversikt", label: "Oversikt", title: "Det viktigste i dag", sub: "" },
  { id: "kunder", label: "Kunder", title: "Customer Success", sub: "Hvem trives, hvem er i faresonen, hvor kan vi vokse" },
  { id: "kapasitet", label: "Kapasitet", title: "Kapasitet", sub: "Hvor fort kan vi vokse før noe sprekker?" },
];

function App() {
  const [tab, setTab] = aS("oversikt");
  const t = TABS.find(x => x.id === tab);

  return (
    <div className="shell">
      {/* top bar */}
      <div className="topbar">
        <img className="logo" src="assets/salesup-logo.png" alt="SalesUp" />
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <nav className="nav">
            {TABS.map(x => (
              <button key={x.id} className={tab === x.id ? "active" : ""} onClick={() => setTab(x.id)}>
                {x.label}{x.badge && tab !== x.id && <span className="badge" />}
              </button>
            ))}
          </nav>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button className="round-btn"><Icon name="search" size={18} /></button>
          <div style={{ width: 44, height: 44, borderRadius: 50, background: "var(--green-bg)", display: "grid", placeItems: "center",
            fontSize: 14, fontWeight: 700, color: "var(--ink)", border: "1px solid var(--hairline)" }}>SU</div>
        </div>
      </div>

      {/* contextual header */}
      <div className="topbar" style={{ marginBottom: 16, alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-.03em", lineHeight: 1.1 }}>{t.title}</h1>
          {t.sub && <div style={{ fontSize: 14.5, color: "var(--ink-2)", marginTop: 5 }}>{t.sub}</div>}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 12 }}>
          <button className="pill-btn ghost">
            <Icon name="calendar" size={16} />
            <span style={{ display: "flex", flexDirection: "column", lineHeight: 1, alignItems: "flex-start" }}>
              <span style={{ fontSize: 10, color: "var(--ink-3)", fontWeight: 500 }}>Periode</span>
              <span>Siste 3 måneder</span>
            </span>
            <Icon name="chevron-r" size={14} style={{ transform: "rotate(90deg)", color: "var(--ink-3)" }} />
          </button>
          <button className="pill-btn"><Icon name="download" size={16} /> Eksporter</button>
        </div>
      </div>

      {/* tab content */}
      {tab === "oversikt" && <TabOversikt key="o" goTab={setTab} />}
      {tab === "kunder" && <TabKunder key="k" />}
      {tab === "kapasitet" && <TabKapasitet key="c" />}

      <footer style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 36, paddingTop: 18,
        borderTop: "1px solid var(--hairline)", fontSize: 12, color: "var(--ink-3)" }}>
        <span>SalesUp Norway AS · CEO Dashboard · data per {SU_DATA.meta.asOf}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
          <span className="dot green" />Live · Tripletex + Copper CRM
        </span>
      </footer>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
