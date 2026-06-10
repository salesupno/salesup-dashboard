/* ============================================================
   Kunder — Customer Success dashboard
   You LOG 4 dimensions per customer (dropdowns):
     Resultat · Relasjon · Følelse · Kommersiell
   The system computes a 1–100 score from those four and sets
   the customer to Rød / Gul / Grønn. At-risk surfaced first.
   ============================================================ */

const TYPE_OPTIONS = ["SEO/Ads", "Utvikling", "Hosting", "Annet"];
const GOAL_OPTIONS = ["Flere kvalifiserte leads", "Økt omsetning på nett", "Bedre synlighet i Google", "Vokse i nytt marked", "Stabil og trygg drift", "Lansere ny plattform", "Bli markedsleder", "Lavere kostnad per salg"];
const TYPE_TONE = {
  "SEO/Ads": { bg: "var(--green-soft)", fg: "var(--green)" },
  "Hosting": { bg: "var(--cream)", fg: "var(--ink-2)" },
  "Utvikling": { bg: "#E6EEF6", fg: "#3A6491" },
  "Annet": { bg: "var(--hairline-2)", fg: "var(--ink-2)" },
};
const CUST_KEY = "su_customers_v2";

const loadCustomers = () => {
  try { const r = localStorage.getItem(CUST_KEY); if (r) return JSON.parse(r); } catch (e) {}
  return JSON.parse(JSON.stringify(SU_DATA.customers));
};
const kFmt = (k) => Math.round(k).toLocaleString("nb-NO");
const bandOf = (s) => s >= 72 ? "green" : (s >= 55 ? "yellow" : "red");
const scoreBand = bandOf;
const scoreToIdx = (s) => s >= 72 ? 2 : (s >= 55 ? 1 : 0);
const HEALTH_TX = { green: "Healthy", yellow: "Følg opp", red: "Risky" };

/* retainer = løpende månedskunde (SEO/Ads-retainere) */
const isRetainer = (c) => c.type === "SEO/Ads";
const tenureTxt = (m) => m >= 12 ? (Math.floor(m / 12) + " år" + (m % 12 ? " " + (m % 12) + " mnd" : "")) : (m + " mnd");

/* commercial readiness — the one logged dropdown */
const COMM_LEVELS = [
  { label: "Ikke klar", band: "red" },
  { label: "Vurderer mer", band: "yellow" },
  { label: "Klar for oppgradering", band: "green" },
];

const daysSince = (txt) => { const m = String(txt || "").match(/\d+/); return m ? parseInt(m[0], 10) : 0; };

/* score is set by hand (the wheel); relasjon is auto from calendar; band follows score */
const enrich = (c) => {
  const days = daysSince(c.lastContact);
  const score = typeof c.score === "number" ? c.score : 60;
  const comm = (c.commercial === 0 || c.commercial === 1 || c.commercial === 2) ? c.commercial : scoreToIdx(score);
  return { ...c, days, score, comm, band: bandOf(score) };
};

/* ---- draggable score wheel (the dominant element) ---- */
const ScoreWheel = ({ score, onChange, size = 150 }) => {
  const ref = useR(null);
  const band = bandOf(score);
  const col = "var(--" + band + ")";
  const sw = size * 0.11, r = (size - sw) / 2, cx = size / 2, cy = size / 2;
  const start = 135, sweep = 270;
  const pt = (a) => [cx + r * Math.cos(a * Math.PI / 180), cy + r * Math.sin(a * Math.PI / 180)];
  const arc = (a0, a1, color) => {
    const [x0, y0] = pt(a0), [x1, y1] = pt(a1);
    const large = (a1 - a0) > 180 ? 1 : 0;
    return <path d={`M${x0} ${y0} A${r} ${r} 0 ${large} 1 ${x1} ${y1}`} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" />;
  };
  const setFrom = (e) => {
    const b = ref.current.getBoundingClientRect();
    let a = Math.atan2(e.clientY - (b.top + b.height / 2), e.clientX - (b.left + b.width / 2)) * 180 / Math.PI;
    if (a < 0) a += 360;
    if (a < start) a += 360;
    let pct = Math.max(0, Math.min(1, (a - start) / sweep));
    onChange(Math.round(pct * 100));
  };
  const down = (e) => {
    e.preventDefault(); setFrom(e);
    const mv = (ev) => setFrom(ev);
    const up = () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up);
  };
  const a1 = start + sweep * Math.max(0, Math.min(score, 100)) / 100;
  const knob = pt(a1);
  return (
    <svg ref={ref} width={size} height={size} viewBox={`0 0 ${size} ${size}`} onPointerDown={down}
      style={{ cursor: "grab", touchAction: "none", display: "block", userSelect: "none", flex: "none" }}>
      {arc(start, start + sweep, "rgba(27,28,22,.08)")}
      {score > 0 && arc(start, a1, col)}
      <circle cx={knob[0]} cy={knob[1]} r={sw * 0.6} fill="#fff" stroke={col} strokeWidth="3" />
      <text x={cx} y={cy - size * 0.03} dominantBaseline="central" textAnchor="middle" className="num" fontSize={size * 0.32} fontWeight="800" fill="var(--ink)">{score}</text>
      <text x={cx} y={cy + size * 0.2} dominantBaseline="central" textAnchor="middle" fontSize={size * 0.105} fontWeight="800" fill={col} style={{ letterSpacing: ".06em" }}>{HEALTH_TX[band].toUpperCase()}</text>
    </svg>
  );
};

/* ---- customer card: dominant score wheel + 3 essentials ---- */
const CustomerCard = ({ c, onUpdate, onDelete }) => {
  const band = c.band;
  const relBand = c.days > 60 ? "red" : (c.days > 30 ? "yellow" : "green");
  const relTxt = c.days === 0 ? "Møte i dag" : c.days === 1 ? "Møte i går" : "Siste møte for " + c.days + " dager siden";
  return (
    <div className="card bordered" style={{ padding: "26px 28px", display: "flex", flexDirection: "column", gap: 22,
      background: "var(--" + band + "-soft)", border: "1.5px solid var(--" + band + "-dot)" }}>
      {/* dominant wheel + name */}
      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        <ScoreWheel score={c.score} onChange={(v) => onUpdate(c.id, { score: v })} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-.025em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 7, flexWrap: "wrap" }}>
            <select className="cs-typemini" value={c.type} onChange={(e) => onUpdate(c.id, { type: e.target.value })} title="Flytt kunde til en annen type">
              {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <span style={{ fontSize: 13.5, color: "var(--ink-3)", fontWeight: 600 }}>{kFmt(c.rev)}k kr/år · {c.owner}</span>
          </div>
        </div>
        <button className="cs-del" title="Slett kunde" onClick={() => onDelete(c.id)} style={{ background: "rgba(255,255,255,.6)", alignSelf: "flex-start" }}><Icon name="trash" size={16} /></button>
      </div>

      {/* MÅL — free text */}
      <div>
        <label style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--ink-3)", display: "block", marginBottom: 8 }}>Mål — hva vil kunden</label>
        <input className="cs-textfield" value={c.goal || ""} onChange={(e) => onUpdate(c.id, { goal: e.target.value })} placeholder="Skriv kundens mål…" />
      </div>

      {/* KUNDE SIDEN — kun retainere (løpende månedskunder) */}
      {isRetainer(c) && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--ink-3)" }}><span className="dot green" style={{ width: 11, height: 11 }} />På retainer</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14.5, fontWeight: 700, color: "var(--green)", whiteSpace: "nowrap" }}>
            <Icon name="clock" size={15} />{tenureTxt(c.tenure || 0)}
          </span>
        </div>
      )}

      {/* RELASJON — automatic from Google Calendar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--ink-3)" }}><span className={"dot " + relBand} style={{ width: 11, height: 11 }} />Relasjon</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14.5, fontWeight: 700, color: "var(--" + relBand + ")" }}>
          <Icon name="calendar" size={15} />{relTxt}
        </span>
      </div>

      {/* KOMMERSIELL — dropdown */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--ink-3)" }}><span className={"dot " + COMM_LEVELS[c.comm].band} style={{ width: 11, height: 11 }} />Kommersiell</span>
        <select className="cs-select strong" value={c.comm} onChange={(e) => onUpdate(c.id, { commercial: parseInt(e.target.value, 10) })}
          style={{ color: "var(--" + COMM_LEVELS[c.comm].band + ")", borderColor: "var(--" + COMM_LEVELS[c.comm].band + "-dot)" }}>
          {COMM_LEVELS.map((lv, i) => <option key={i} value={i}>{lv.label}</option>)}
        </select>
      </div>
    </div>
  );
};

/* (inline logging now lives on the card — no modal) */

/* ---- add customer form ---- */
const CustForm = ({ onAdd, onCancel }) => {
  const [f, setF] = useS({ name: "", type: "SEO/Ads", market: "NO", rev: "", owner: "", health: "green" });
  const up = (k, v) => setF(p => ({ ...p, [k]: v }));
  const inp = { fontFamily: "var(--font)", fontSize: 14, padding: "11px 14px", borderRadius: 12, border: "1px solid var(--hairline)", background: "var(--surface)", color: "var(--ink)", outline: "none", width: "100%" };
  const lab = { fontSize: 12, color: "var(--ink-3)", fontWeight: 600, marginBottom: 7, display: "block" };
  const submit = () => {
    if (!f.name.trim()) return;
    const idx = f.health === "green" ? 2 : f.health === "yellow" ? 1 : 0;
    const score = f.health === "green" ? 85 : f.health === "yellow" ? 63 : 45;
    onAdd({ name: f.name.trim(), type: f.type, market: f.market.trim() || "NO", rev: Number(f.rev) || 0,
      owner: f.owner.trim() || "—", tenure: 0, lastContact: "i dag", expand: 0,
      score, commercial: idx, goal: "" });
  };
  return (
    <div className="card bordered" style={{ padding: "22px 24px", marginBottom: 16 }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Ny kunde</div>
      <div className="grid-resp" style={{ display: "grid", gridTemplateColumns: "1.5fr 1.8fr", gap: 18, marginBottom: 16 }}>
        <div><label style={lab}>Kundenavn</label><input style={inp} value={f.name} onChange={e => up("name", e.target.value)} placeholder="F.eks. Fjordsol AS" autoFocus /></div>
        <div>
          <label style={lab}>Kundetype</label>
          <div style={{ display: "flex", gap: 8 }}>
            {TYPE_OPTIONS.map(t => (
              <button key={t} onClick={() => up("type", t)} style={{ flex: 1, cursor: "pointer", fontFamily: "var(--font)",
                border: "1.5px solid " + (f.type === t ? "var(--c-deep)" : "var(--hairline)"), background: f.type === t ? "var(--green-soft)" : "var(--surface)",
                borderRadius: 12, padding: "10px 6px", fontSize: 12.5, fontWeight: 600, color: "var(--ink)", transition: "all .15s ease" }}>{t}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="grid-resp" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
        <div><label style={lab}>Marked</label><input style={inp} value={f.market} onChange={e => up("market", e.target.value)} placeholder="NO" /></div>
        <div><label style={lab}>Oms. 2026 (k)</label><input style={inp} value={f.rev} onChange={e => up("rev", e.target.value.replace(/[^0-9]/g, ""))} placeholder="0" inputMode="numeric" /></div>
        <div><label style={lab}>Ansvarlig</label><input style={inp} value={f.owner} onChange={e => up("owner", e.target.value)} placeholder="Ina H." /></div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={lab}>Starthelse</label>
        <div style={{ display: "flex", gap: 8 }}>
          {[["green", "Frisk"], ["yellow", "Følg opp"], ["red", "I faresonen"]].map(([h, l]) => (
            <button key={h} onClick={() => up("health", h)} style={{ flex: 1, cursor: "pointer", fontFamily: "var(--font)",
              border: "1.5px solid " + (f.health === h ? (h === "green" ? "var(--c-deep)" : "var(--" + h + "-dot)") : "var(--hairline)"),
              background: f.health === h ? "var(--" + h + "-soft)" : "var(--surface)", borderRadius: 12, padding: "10px 8px",
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
              <span className={"dot " + h} /><span style={{ fontSize: 12.5, fontWeight: 600 }}>{l}</span></button>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button className="pill-btn ghost" onClick={onCancel} style={{ padding: "10px 18px", fontSize: 13 }}>Avbryt</button>
        <button className="pill-btn" onClick={submit} style={{ padding: "10px 18px", fontSize: 13, opacity: f.name.trim() ? 1 : .5 }}><Icon name="plus" size={15} /> Legg til kunde</button>
      </div>
    </div>
  );
};

/* ---- upsell pitch modal (Brevo) ---- */
const slugMail = (name) => "kontakt@" + name.toLowerCase().replace(/[æ]/g, "ae").replace(/[ø]/g, "o").replace(/[å]/g, "a").replace(/[^a-z0-9]/g, "") + ".no";
const UpsellModal = ({ c, onClose }) => {
  const recipient = slugMail(c.name);
  const defSubject = "En idé for å vokse " + c.name + " videre";
  const defBody =
    "Hei " + c.name + "-teamet,\n\n" +
    "Vi har fulgt resultatene deres tett, og ser et tydelig neste steg mot målet deres: " + c.goal + "\n\n" +
    "Konkret forslag fra oss: " + c.nextStep + "\n" +
    (c.expand > 0 ? "Vi anslår at dette kan løfte verdien med rundt " + c.expand + "k kr/mnd.\n" : "") +
    "\nHar dere 20 minutter til en kort prat?\n\nBeste hilsen,\n" + c.owner + " · SalesUp";
  const [subject, setSubject] = useS(defSubject);
  const [body, setBody] = useS(defBody);
  const [state, setState] = useS("edit");

  useE(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const send = () => { setState("sending"); setTimeout(() => setState("sent"), 1100); };
  const inp = { fontFamily: "var(--font)", fontSize: 14, padding: "11px 14px", borderRadius: 12, border: "1px solid var(--hairline)", background: "var(--surface)", color: "var(--ink)", outline: "none", width: "100%" };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(27,28,22,.45)", backdropFilter: "blur(3px)", zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()} className="rise" style={{ width: 560, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", background: "var(--bg)", borderRadius: 22, boxShadow: "var(--shadow-lg)" }}>
        {state === "sent" ? (
          <div style={{ padding: "44px 32px", textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: 50, background: "var(--green-bg)", color: "var(--green)", display: "grid", placeItems: "center", margin: "0 auto 18px" }}><Icon name="check" size={28} /></div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.02em", marginBottom: 8 }}>Pitch sendt</div>
            <p style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.5, marginBottom: 22 }}>
              Pitchen er sendt til <b>{recipient}</b> via Brevo. Aktivitet logges automatisk i Copper.
            </p>
            <button className="pill-btn" onClick={onClose} style={{ margin: "0 auto" }}>Ferdig</button>
          </div>
        ) : (
          <>
            <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--hairline)", display: "flex", alignItems: "center", gap: 12 }}>
              <span className="badge-ico green" style={{ width: 38, height: 38 }}><Icon name="mail" size={18} /></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-.01em" }}>Mersalgs-pitch</div>
                <div style={{ fontSize: 12.5, color: "var(--ink-3)" }}>{c.name} · {c.type}</div>
              </div>
              <button className="round-btn" onClick={onClose} style={{ width: 36, height: 36 }}><Icon name="x" size={16} /></button>
            </div>
            <div style={{ padding: "18px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 600, display: "block", marginBottom: 6 }}>Til</label>
                <div style={{ ...inp, display: "flex", alignItems: "center", gap: 8, background: "var(--cream)", color: "var(--ink-2)" }}>
                  <Icon name="user" size={14} />{recipient}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 600, display: "block", marginBottom: 6 }}>Emne</label>
                <input style={inp} value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 600, display: "block", marginBottom: 6 }}>Melding</label>
                <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={9}
                  style={{ ...inp, resize: "vertical", lineHeight: 1.5, minHeight: 180 }} />
              </div>
            </div>
            <div style={{ padding: "0 24px 22px", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 11.5, color: "var(--ink-3)", flex: 1, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span className="dot green" /> Sendes via Brevo API
              </span>
              <button className="pill-btn ghost" onClick={onClose} style={{ padding: "10px 18px", fontSize: 13 }}>Avbryt</button>
              <button className="pill-btn" onClick={send} disabled={state === "sending"} style={{ padding: "10px 20px", fontSize: 13, opacity: state === "sending" ? .6 : 1 }}>
                {state === "sending" ? "Sender…" : <><Icon name="send" size={14} /> Send pitch</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/* ---- top KPI tile ---- */
const KpiTile = ({ label, value, unit, sub, color }) => (
  <div className="card" style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 8 }}>
    <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: ".03em", textTransform: "uppercase", color: "var(--ink-3)" }}>{label}</span>
    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
      <span className="num" style={{ fontSize: 52, fontWeight: 800, letterSpacing: "-.045em", lineHeight: .9, color: color || "var(--ink)" }}>{value}</span>
      {unit && <span style={{ fontSize: 17, color: "var(--ink-3)", fontWeight: 600 }}>{unit}</span>}
    </div>
    {sub && <span style={{ fontSize: 13.5, color: "var(--ink-3)" }}>{sub}</span>}
  </div>
);

const FILTERS = [["all", "Alle kunder"], ["red", "Ikke bra"], ["yellow", "Må gjøres noe"], ["green", "Good"]];

const TabKunder = () => {
  const [list, setList] = useS(loadCustomers);
  const [filter, setFilter] = useS("all");
  const [typeF, setTypeF] = useS("Alle");
  const [q, setQ] = useS("");
  const [adding, setAdding] = useS(false);

  useE(() => { try { localStorage.setItem(CUST_KEY, JSON.stringify(list)); } catch (e) {} }, [list]);

  const del = (id) => setList(l => l.filter(c => c.id !== id));
  const add = (c) => { setList(l => [{ ...c, id: "k" + Date.now() }, ...l]); setAdding(false); };
  const update = (id, patch) => setList(l => l.map(c => c.id === id ? { ...c, ...patch } : c));
  const setDim = (id, key, idx) => setList(l => l.map(c => c.id === id ? { ...c, dims: { ...(c.dims || {}), [key]: idx } } : c));

  const data = list.map(enrich);
  const total = data.length;
  const arr = data.reduce((s, c) => s + c.rev, 0);
  const mix = { green: 0, yellow: 0, red: 0 };
  data.forEach(c => { mix[c.band]++; });
  const retainers = data.filter(isRetainer);
  const avgTenure = retainers.length ? Math.round(retainers.reduce((s, c) => s + (c.tenure || 0), 0) / retainers.length) : 0;

  let rows = data.filter(c =>
    (filter === "all" || c.band === filter) &&
    (typeF === "Alle" || c.type === typeF) &&
    (q.trim() === "" || c.name.toLowerCase().includes(q.toLowerCase())));
  rows.sort((a, b) => a.score - b.score); // at-risk first

  return (
    <div className="tabview">
      {/* portfolio KPIs */}
      <div className="grid-resp" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,240px))", gap: 16, marginBottom: 22 }}>
        <KpiTile label="Kunder" value={total} sub="" />
        <KpiTile label="Snitt levetid" value={avgTenure} unit="mnd" color="var(--green)" sub={retainers.length + " retainere på løpende"} />
        <KpiTile label="Må gjøres noe" value={mix.yellow} color="var(--yellow)" sub={mix.yellow ? "følg opp snart" : "ingenting på vent"} />
        <KpiTile label="Ikke bra" value={mix.red} color="var(--red)" sub={mix.red ? "trenger handling nå" : "ingen — bra jobba"} />
      </div>

      {/* controls */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 18 }}>
        <select className="cs-bigselect" value={typeF} onChange={(e) => setTypeF(e.target.value)}>
          <option value="Alle">Alle typer · {total}</option>
          {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t} · {data.filter(c => c.type === t).length}</option>)}
        </select>
        <select className="cs-bigselect" value={filter} onChange={(e) => setFilter(e.target.value)}>
          {FILTERS.map(([h, l]) => { const n = h === "all" ? total : mix[h]; return <option key={h} value={h}>{l} · {n}</option>; })}
        </select>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 7, background: "var(--surface)", border: "1px solid var(--hairline)", borderRadius: 999, padding: "9px 16px" }}>
          <Icon name="search" size={15} style={{ color: "var(--ink-3)" }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Søk kunde…" style={{ border: "none", outline: "none", background: "none", fontFamily: "var(--font)", fontSize: 13.5, width: 130, color: "var(--ink)" }} />
        </div>
        <button className="pill-btn" onClick={() => setAdding(true)} style={{ padding: "10px 18px" }}><Icon name="plus" size={16} /> Ny kunde</button>
      </div>

      {adding && <CustForm onAdd={add} onCancel={() => setAdding(false)} />}

      {/* customer cards */}
      <div className="grid-resp" style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
        {rows.map(c => <CustomerCard key={c.id} c={c} onUpdate={update} onDelete={del} />)}
      </div>
      {rows.length === 0 && <div style={{ textAlign: "center", color: "var(--ink-3)", fontSize: 14, padding: "40px 0" }}>Ingen kunder matcher filteret.</div>}
    </div>
  );
};

Object.assign(window, { TabKunder });
