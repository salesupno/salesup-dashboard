/* ============================================================
   Tabs — part 1: Oversikt (focus view) + Inntekt
   ============================================================ */

/* ---------------- Oversikt: the simple 5-answer view ---------------- */
const STX = { green: "GRØNN", yellow: "GUL", red: "RØD" };
const worst = (arr) => arr.includes("red") ? "red" : arr.includes("yellow") ? "yellow" : "green";
const oFmt = (n) => {const a = Math.abs(n);return a >= 1e6 ? (n / 1e6).toFixed(2).replace(".", ",") + " mill" : Math.round(n / 1000) + "k";};

const SimpleCard = ({ title, status, onClick, children }) =>
<div className={"card" + (onClick ? " lift" : "")} onClick={onClick} style={{ padding: "22px 30px", display: "flex", flexDirection: "column", gap: 16,
  borderTop: status === "green" ? "5px solid " + COLOR.green : undefined }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--ink-3)", whiteSpace: "nowrap" }}>{title}</span>
      {status === "green" && <span className="spill green" style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: ".06em" }}>{STX.green}</span>}
    </div>
    {children}
  </div>;


const MiniGoal = ({ label, current, target, status }) =>
<div>
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 7 }}>
      <span style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap" }}>{label}</span>
      <span className="num" style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap" }}>{current}<span style={{ color: "var(--ink-3)", fontWeight: 500 }}> / {target}</span></span>
    </div>
    <div style={{ height: 8, borderRadius: 999, background: "var(--hairline-2)", overflow: "hidden" }}>
      <div style={{ height: "100%", width: Math.min(current / target, 1) * 100 + "%", background: COLOR[status], borderRadius: 999 }} />
    </div>
  </div>;


/* ===== editable number (inline) ===== */
const NumEdit = ({ value, onCommit, size = 24, color, dark, decimal }) => {
  const [t, setT] = useS(String(value).replace(".", ","));
  useE(() => setT(String(value).replace(".", ",")), [value]);
  const parse = (s) => {const n = parseFloat(s.replace(",", "."));return isNaN(n) ? 0 : n;};
  return (
    <input className={"edit-num num" + (dark ? " dark" : "")} value={t}
    onChange={(e) => setT(e.target.value.replace(decimal ? /[^0-9.,]/g : /[^0-9]/g, ""))}
    onFocus={(e) => e.target.select()} onBlur={() => onCommit(Math.max(0, parse(t)))}
    inputMode="decimal"
    style={{ width: Math.max(1, t.length) + 0.6 + "ch", fontSize: size, fontWeight: 700, color: color || (dark ? "#fff" : "var(--ink)"), letterSpacing: "-.02em" }} />);

};

/* ===== burn-up chart (progress over the year toward a target) ===== */
const MONTHS_G = ["jan", "feb", "mar", "apr", "mai", "jun", "jul", "aug", "sep", "okt", "nov", "des"];
const pace = (series, target) => {
  const start = series[0] || 0,i = series.length - 1;
  const expected = start + (target - start) * (i / 11);
  const cur = series[i];
  if (cur >= expected) return "green";
  if (cur >= expected * 0.85) return "yellow";
  return "red";
};

const Burnup = ({ series, target, color }) => {
  const W = 300,H = 150,L = 4,R = 6,T = 20,B = 26;
  const start = series[0] || 0;
  const yMax = Math.max(target, ...series) * 1.16 || 1;
  const x = (i) => L + (W - L - R) * (i / 11);
  const y = (v) => H - B - (H - T - B) * (v / yMax);
  const elapsed = series.length;
  const act = series.map((v, i) => [x(i), y(v)]);
  const actPath = act.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const last = act[act.length - 1];
  const areaPath = "M" + x(0).toFixed(1) + " " + y(0).toFixed(1) + " " + act.map((p) => "L" + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ") + " L" + last[0].toFixed(1) + " " + y(0).toFixed(1) + " Z";
  const gid = "bu" + Math.round(start * 131 + target * 7 + series.length);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.22" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* target (scope) line */}
      <line x1={x(0)} y1={y(target)} x2={x(11)} y2={y(target)} stroke="var(--ink-3)" strokeWidth="1.5" strokeDasharray="2 4" />
      <text x={x(11)} y={y(target) - 6} textAnchor="end" className="num" fontSize="14" fontWeight="700" fill="var(--ink-2)">mål {target}</text>
      {/* plan / on-pace line */}
      <line x1={x(0)} y1={y(start)} x2={x(11)} y2={y(target)} stroke="var(--hairline)" strokeWidth="2.5" />
      {/* actual area + line */}
      <path d={areaPath} fill={`url(#${gid})`} />
      <path d={actPath} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="4.5" fill={color} stroke="var(--surface)" strokeWidth="2.5" />
      {/* month ticks */}
      {MONTHS_G.map((m, i) =>
      <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize="11.5" fontWeight={i === elapsed - 1 ? 700 : 500} fill={i === elapsed - 1 ? "var(--ink-2)" : "var(--ink-3)"}>{m[0].toUpperCase()}</text>
      )}
    </svg>);

};

/* ===== editable 2026 goals (burn-up charts) ===== */
const GOALS_KEY = "su_goals_v5";
const GOALS_SEED = [
{ id: "seo", short: "SEO/ADS-retainere", current: 7, target: 15, series: [3, 4, 5, 5, 6, 7] },
{ id: "proj", short: "Prosjekter 2026", current: 23, target: 60, series: [8, 13, 17, 20, 22, 23] },
{ id: "mynk", short: "Mynk-kunder", current: 0, target: 100, series: [0, 0, 0, 0, 0, 0] }];

const loadG = () => {
  try {
    const r = localStorage.getItem(GOALS_KEY);
    if (r) {const arr = JSON.parse(r);return GOALS_SEED.map((seed) => {const f = arr.find((x) => x.id === seed.id) || {};return { ...seed, ...f, series: f.series && f.series.length ? f.series : seed.series };});}
  } catch (e) {}
  return JSON.parse(JSON.stringify(GOALS_SEED));
};
const PACE_TX = { green: "Ajour", yellow: "Litt bak", red: "Bak skjema" };

const GOAL_COLORS = ["#4E8A39", "#6BA84F", "#A9D77D"];
const GoalRing = ({ pct, color, size = 130 }) => {
  const sw = 13, r = (size - sw) / 2, c = 2 * Math.PI * r, off = c * (1 - Math.min(Math.max(pct, 0), 1));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--hairline-2)" strokeWidth={sw} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={off} transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset .8s cubic-bezier(.2,.7,.3,1)" }} />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="num" fontSize={size * 0.27} fontWeight="800" fill="var(--ink)">{Math.round(pct * 100)}<tspan fontSize={size * 0.13} fill="var(--ink-3)">%</tspan></text>
    </svg>
  );
};

const GoalBoard = () => {
  const [goals, setGoals] = useS(loadG);
  useE(() => {try {localStorage.setItem(GOALS_KEY, JSON.stringify(goals));} catch (e) {}}, [goals]);
  const setGoal = (id, k, v) => setGoals((p) => p.map((g) => g.id === id ? { ...g, [k]: v } : g));
  const overall = worst(goals.map((g) => pace(g.series, g.target)));
  return (
    <SimpleCard title="2026-mål" status={overall}>
      <div className="grid-resp" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
        {goals.map((g, i) => {
          const pct = g.target ? g.current / g.target : 0;
          return (
            <div key={g.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center", padding: "2px 0" }}>
              <GoalRing pct={pct} color={GOAL_COLORS[i % 3]} size={86} />
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: "-.01em" }}>{g.short}</div>
                <div className="num" style={{ fontSize: 13, color: "var(--ink-3)", fontWeight: 600, marginTop: 3, display: "inline-flex", alignItems: "baseline", justifyContent: "center", gap: 3 }}>
                  <NumEdit value={g.current} onCommit={(v) => setGoal(g.id, "current", v)} size={13} color="var(--ink-3)" />
                  <span>/</span>
                  <NumEdit value={g.target} onCommit={(v) => setGoal(g.id, "target", Math.max(1, v))} size={13} color="var(--ink-3)" />
                </div>
              </div>
            </div>);
        })}
      </div>
    </SimpleCard>);

};

/* ===== Omsetningsmål — wide vertical progress column with on-pace marker ===== */
const OMSG_KEY = "su_omsgoal_v1";
const OMSG_SEED = { target: 350000, base: 250000, baseDate: "2026-01-01", targetDate: "2026-12-31" };
const loadOMSG = () => {try {const r = localStorage.getItem(OMSG_KEY);if (r) return { ...OMSG_SEED, ...JSON.parse(r) };} catch (e) {}return { ...OMSG_SEED };};

const OmsGoal = ({ current }) => {
  const [g, setG] = useS(loadOMSG);
  useE(() => {try {localStorage.setItem(OMSG_KEY, JSON.stringify(g));} catch (e) {}}, [g]);
  const set = (k, v) => setG((p) => ({ ...p, [k]: v }));
  const t0 = +new Date(g.baseDate),t1 = +new Date(g.targetDate),now = Date.now();
  const frac = Math.min(Math.max((now - t0) / (t1 - t0 || 1), 0), 1);
  const expected = g.base + (g.target - g.base) * frac;
  const curPct = g.target ? Math.min(current / g.target, 1) : 0;
  const expPct = g.target ? Math.min(expected / g.target, 1) : 0;
  // milestone: where you should be by 30. June to stay on pace
  const chkYear = new Date(g.targetDate).getFullYear();
  const chk = +new Date(chkYear, 5, 30);
  const fracChk = Math.min(Math.max((chk - t0) / (t1 - t0 || 1), 0), 1);
  const expChk = g.base + (g.target - g.base) * fracChk;
  const pctChk = g.target ? Math.min(expChk / g.target, 1) : 0;
  const onPace = current >= expChk;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--ink-3)" }}>Omsetningsmål</span>
        <input type="date" className="date-edit" value={g.targetDate} onChange={(e) => set("targetDate", e.target.value)} />
      </div>
      <div style={{ display: "flex", justifyContent: "center", flex: 1, minHeight: 280 }}>
        <div style={{ position: "relative", width: "100%", maxWidth: 220, background: "var(--hairline-2)", borderRadius: 20, overflow: "hidden" }}>
          {/* fill */}
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: curPct * 100 + "%", background: "#E4F5B4", transition: "height .7s cubic-bezier(.2,.7,.3,1)" }} />
          {/* target = 100% (top, editable) */}
          <div style={{ position: "absolute", top: 12, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "baseline", gap: 1, color: "var(--ink-3)" }}>
            <NumEdit value={Math.round(g.target / 1000)} onCommit={(v) => set("target", v * 1000)} size={14} color="var(--ink-3)" /><span style={{ fontSize: 13, fontWeight: 700 }}>k</span>
          </div>
          {/* big readout */}
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            <span className="num" style={{ fontSize: 52, fontWeight: 800, letterSpacing: "-.045em", color: "var(--ink)", lineHeight: .9, whiteSpace: "nowrap" }}>{Math.round(curPct * 100)}<span style={{ fontSize: 22, color: "rgba(27,28,22,.5)" }}> %</span></span>
            <span className="num" style={{ fontSize: 16, fontWeight: 700, color: "rgba(27,28,22,.7)", marginTop: 6, whiteSpace: "nowrap" }}>{oFmt(current)}</span>
          </div>
          {/* milestone line: where you should be by 30. June */}
          <div style={{ position: "absolute", left: 0, right: 0, bottom: pctChk * 100 + "%", borderTop: "2px dashed var(--ink)", opacity: .7 }} />
          {/* base (0-line, editable) */}
          <div style={{ position: "absolute", bottom: 10, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "baseline", gap: 1, color: "rgba(27,28,22,.65)" }}>
            <NumEdit value={Math.round(g.base / 1000)} onCommit={(v) => set("base", v * 1000)} size={12} /><span style={{ fontSize: 11, fontWeight: 700 }}></span>
          </div>
        </div>
      </div>
      {/* clear milestone caption */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, fontSize: 14 }}>
        <span style={{ fontWeight: 600, color: "var(--ink-3)", whiteSpace: "nowrap" }}>Mål innen 30. juni</span>
        <span className="num" style={{ fontWeight: 800, color: "var(--ink)", whiteSpace: "nowrap" }}>{oFmt(expChk)} <span style={{ color: "var(--ink-3)", fontWeight: 600 }}>· {Math.round(pctChk * 100)} %</span></span>
      </div>
    </div>);

};

/* ===== Selskapsøkonomi — enkelt resultat-kort ===== */
const ECON_KEY = "su_econ_v1";
const ECON_SEED = { omsMnd: 312, ansatte: 2, varekost: 34, lonn: 45 };
const loadEcon = () => { try { const r = localStorage.getItem(ECON_KEY); if (r) return { ...ECON_SEED, ...JSON.parse(r) }; } catch (e) {} return { ...ECON_SEED }; };
const G6 = 820000;

const CompanyEconomics = () => {
  const [e, setE] = useS(loadEcon);
  useE(() => { try { localStorage.setItem(ECON_KEY, JSON.stringify(e)); } catch (_) {} }, [e]);
  const set = (k, v) => setE(p => ({ ...p, [k]: v }));
  const omsAr = e.omsMnd * 1000 * 12;
  const resPct = Math.max(0, Math.round(100 - e.varekost - e.lonn));
  const resultat = omsAr * resPct / 100;
  const bruttoPer = e.ansatte ? omsAr * e.lonn / 100 / e.ansatte : 0;
  const utbyttePer = e.ansatte ? resultat / e.ansatte : 0;
  const Stat = ({ label, value, sub, color }) => (
    <div>
      <div style={{ fontSize: 15, color: "var(--ink-3)", fontWeight: 600, marginBottom: 10 }}>{label}</div>
      <div className="num" style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-.045em", lineHeight: .9, color: color || "var(--ink)" }}>{value}</div>
      {sub && <div style={{ fontSize: 13.5, color: "var(--ink-3)", marginTop: 10 }}>{sub}</div>}
    </div>
  );
  return (
    <SimpleCard title="Selskapsøkonomi" status={resultat > 0 ? "green" : "red"}>
      <div className="grid-resp" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 36 }}>
        <Stat label="Omsetning / år" value={oFmt(omsAr)} sub={<span style={{ display: "inline-flex", alignItems: "baseline", gap: 4 }}><NumEdit value={e.omsMnd} onCommit={(v) => set("omsMnd", v)} size={13} />k / mnd</span>} />
        <Stat label="Resultat / år" value={oFmt(resultat)} color={resultat > 0 ? "var(--green)" : "var(--red)"} sub={resPct + " % margin"} />
        <Stat label="Bruttolønn / ansatt" value={oFmt(bruttoPer)} color={bruttoPer > G6 ? "var(--yellow)" : "var(--ink)"} sub="maks 6G ≈ 820k" />
        <Stat label="Utbytte / ansatt" value={oFmt(utbyttePer)} color="var(--green)" sub="mulig uttak / år" />
      </div>
      <div style={{ height: 1, background: "var(--hairline-2)" }} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 22px", fontSize: 14, color: "var(--ink-3)", alignItems: "center" }}>
        <span style={{ display: "inline-flex", alignItems: "baseline", gap: 5 }}><NumEdit value={e.ansatte} onCommit={(v) => set("ansatte", Math.max(1, v))} size={14} /> ansatte</span>
        <span style={{ color: "var(--hairline)" }}>·</span>
        <span style={{ display: "inline-flex", alignItems: "baseline", gap: 5 }}>varekost <NumEdit value={e.varekost} onCommit={(v) => set("varekost", v)} size={14} /> %</span>
        <span style={{ color: "var(--hairline)" }}>·</span>
        <span style={{ display: "inline-flex", alignItems: "baseline", gap: 5 }}>lønnskost <NumEdit value={e.lonn} onCommit={(v) => set("lonn", v)} size={14} /> %</span>
        <span style={{ marginLeft: "auto", fontWeight: 700, color: "var(--green)" }}>= {resPct} % resultat</span>
      </div>
    </SimpleCard>
  );
};

/* ===== sales funnel (vertical, last 3 months) ===== */
const FUNNEL = [
  { label: "Møter avholdt", value: 48, color: "#6BA84F" },
  { label: "Tilbud sendt", value: 22, color: "#4E8A39" },
  { label: "Closed", value: 8, color: "#2E5E22" },
];
const SalesFunnel = () => {
  const W = 260, sh = 54, gap = 6, maxW = 244;
  const max = FUNNEL[0].value;
  const wAt = (v) => Math.max(78, (v / max) * maxW);
  const bottoms = [wAt(FUNNEL[1].value), wAt(FUNNEL[2].value), wAt(FUNNEL[2].value) * 0.62];
  const H = FUNNEL.length * sh + (FUNNEL.length - 1) * gap;
  const cx = W / 2;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
      {FUNNEL.map((s, i) => {
        const y0 = i * (sh + gap), y1 = y0 + sh;
        const topW = wAt(s.value), botW = bottoms[i];
        const pts = `${cx - topW / 2},${y0} ${cx + topW / 2},${y0} ${cx + botW / 2},${y1} ${cx - botW / 2},${y1}`;
        return (
          <g key={i}>
            <polygon points={pts} fill={s.color} />
            <text x={cx} y={(y0 + y1) / 2} dominantBaseline="central" textAnchor="middle" className="num" fontSize="30" fontWeight="800" fill="#fff">{s.value}</text>
          </g>
        );
      })}
    </svg>
  );
};

/* ===== Møter & Wins — dual-line monthly trend ===== */
const MW_MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mai", "Jun"];
const MW_MEET = [34, 41, 38, 45, 43, 48];
const MW_WIN = [5, 7, 6, 9, 8, 11];
const MW_MEET_C = "#6BA84F";   // møter — mid green
const MW_WIN_C = "#1B1C16";    // wins — ink

const TwoLineChart = ({ months, meet, win }) => {
  const W = 720, H = 268, padL = 14, padR = 14, padT = 26, padB = 34;
  const n = months.length;
  const maxM = Math.max(...meet) * 1.18 || 1;
  const maxW = Math.max(...win) * 1.4 || 1;
  const x = (i) => padL + (W - padL - padR) * (n === 1 ? 0.5 : i / (n - 1));
  const yM = (v) => H - padB - (H - padT - padB) * (v / maxM);
  const yW = (v) => H - padB - (H - padT - padB) * (v / maxW);
  const path = (vals, y) => vals.map((v, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1)).join(" ");
  const meetPts = meet.map((v, i) => [x(i), yM(v)]);
  const lastM = meetPts[meetPts.length - 1];
  const area = "M" + x(0).toFixed(1) + " " + yM(0).toFixed(1) + " " + meetPts.map((p) => "L" + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ") + " L" + lastM[0].toFixed(1) + " " + yM(0).toFixed(1) + " Z";
  const grid = [0, 0.25, 0.5, 0.75, 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id="mwArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={MW_MEET_C} stopOpacity="0.20" />
          <stop offset="1" stopColor={MW_MEET_C} stopOpacity="0" />
        </linearGradient>
      </defs>
      {grid.map((g, i) => {
        const yy = padT + (H - padT - padB) * g;
        return <line key={i} x1={padL} y1={yy} x2={W - padR} y2={yy} stroke="var(--hairline-2)" strokeWidth="1" />;
      })}
      {/* møter area + line */}
      <path d={area} fill="url(#mwArea)" />
      <path d={path(meet, yM)} fill="none" stroke={MW_MEET_C} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      {/* wins line */}
      <path d={path(win, yW)} fill="none" stroke={MW_WIN_C} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      {/* points + labels */}
      {meet.map((v, i) => (
        <g key={"m" + i}>
          <circle cx={x(i)} cy={yM(v)} r="4.5" fill={MW_MEET_C} stroke="var(--surface)" strokeWidth="2.5" />
          <text x={x(i)} y={yM(v) - 12} textAnchor="middle" className="num" fontSize="13" fontWeight="700" fill={MW_MEET_C}>{v}</text>
        </g>
      ))}
      {win.map((v, i) => (
        <g key={"w" + i}>
          <circle cx={x(i)} cy={yW(v)} r="4.2" fill={MW_WIN_C} stroke="var(--surface)" strokeWidth="2.5" />
          <text x={x(i)} y={yW(v) + 22} textAnchor="middle" className="num" fontSize="13" fontWeight="700" fill={MW_WIN_C}>{v}</text>
        </g>
      ))}
      {months.map((m, i) => (
        <text key={"x" + i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="12.5" fontWeight={i === n - 1 ? 700 : 500} fill={i === n - 1 ? "var(--ink-2)" : "var(--ink-3)"}>{m}</text>
      ))}
    </svg>
  );
};

const MeetingsWins = () => {
  const totalMeet = MW_MEET.reduce((s, v) => s + v, 0);
  const totalWin = MW_WIN.reduce((s, v) => s + v, 0);
  const rate = totalMeet ? Math.round(totalWin / totalMeet * 100) : 0;
  const Tile = ({ label, value, sub, dot }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, letterSpacing: ".03em", textTransform: "uppercase", color: "var(--ink-3)" }}>
        <span style={{ width: 11, height: 11, borderRadius: 4, background: dot }} />{label}
      </span>
      <span className="num" style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-.045em", lineHeight: .85, color: "var(--ink)" }}>{value}</span>
      <span style={{ fontSize: 12.5, color: "var(--ink-3)", fontWeight: 600 }}>{sub}</span>
    </div>
  );
  return (
    <div className="card" style={{ padding: "18px 26px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--ink-3)" }}>Møter &amp; Wins</span>
        <span style={{ fontSize: 12.5, color: "var(--ink-3)", fontWeight: 600 }}>per måned · siste 6 mnd</span>
      </div>
      <div className="grid-resp" style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 28, alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Tile label="Møter" value={totalMeet} sub="avholdt i perioden" dot={MW_MEET_C} />
          <Tile label="Wins" value={totalWin} sub={rate + " % av møtene"} dot={MW_WIN_C} />
        </div>
        <TwoLineChart months={MW_MONTHS} meet={MW_MEET} win={MW_WIN} />
      </div>
    </div>
  );
};

const TabOversikt = ({ goTab }) => {
  // --- omsetning & MRR ---
  const omsMnd = 312000,omsMal = 350000,mrr = 290000;
  const omsStatus = omsMnd >= omsMal ? "green" : omsMnd >= omsMal * 0.85 ? "yellow" : "red";
  const salesStatus = "yellow";

  return (
    <div className="tabview" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* rad 1: 2026-mål + Omsetning & MRR */}
      <div className="grid-resp" style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: 14, alignItems: "stretch" }}>
      <GoalBoard />
      {/* Omsetning & MRR — to store hjul mot 2026-mål */}
      <SimpleCard title="Omsetning & MRR" status={omsStatus}>
        <div className="grid-resp" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "center" }}>
          {[
            { label: "Omsetning / mnd", cur: omsMnd, mal: 500000, color: "#4E8A39" },
            { label: "MRR (gjentakende)", cur: mrr, mal: 400000, color: "#6BA84F" },
          ].map((w, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center", padding: "2px 0" }}>
              <GoalRing pct={w.cur / w.mal} color={w.color} size={104} />
              <div>
                <div style={{ fontSize: 15.5, fontWeight: 800, letterSpacing: "-.01em" }}>{w.label}</div>
                <div className="num" style={{ fontSize: 13.5, color: "var(--ink-3)", fontWeight: 700, marginTop: 5 }}>{oFmt(w.cur)} av {oFmt(w.mal)} <span style={{ fontWeight: 600 }}>mål 2026</span></div>
              </div>
            </div>
          ))}
        </div>
      </SimpleCard>
      </div>

      {/* rad 2: Salg + Møter & Wins */}
      <div className="grid-resp" style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 14, alignItems: "stretch" }}>
      {/* Salg */}
      <SimpleCard title="Salg" status={salesStatus}>
        <div className="grid-resp" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28, alignItems: "center" }}>
          {/* funnel — siste 3 måneder */}
          <div>
            <div style={{ fontSize: 13.5, color: "var(--ink-3)", fontWeight: 600, marginBottom: 10 }}>Salgstrakt · siste 3 måneder</div>
            <SalesFunnel />
            <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
              {FUNNEL.map((s, i) => (
                <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 700, color: "var(--ink-2)" }}>
                  <span style={{ width: 11, height: 11, borderRadius: 4, background: s.color }} />{s.label}
                </span>
              ))}
            </div>
          </div>
          {/* bold stat tiles */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ background: "var(--ink)", color: "#fff", borderRadius: 18, padding: "16px 20px" }}>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.6)", fontWeight: 700, letterSpacing: ".03em", textTransform: "uppercase", marginBottom: 7 }}>Pipeline</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span className="num" style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-.04em", lineHeight: .82 }}>4,2</span>
                <span style={{ fontSize: 18, color: "rgba(255,255,255,.65)", fontWeight: 700 }}>mill</span>
              </div>
            </div>
            <div style={{ background: "#4E8A39", color: "#fff", borderRadius: 18, padding: "16px 20px" }}>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.72)", fontWeight: 700, letterSpacing: ".03em", textTransform: "uppercase", marginBottom: 7 }}>Win rate</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                <span className="num" style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-.04em", lineHeight: .82 }}>28</span>
                <span style={{ fontSize: 20, color: "rgba(255,255,255,.72)", fontWeight: 700 }}>%</span>
              </div>
            </div>
          </div>
        </div>
      </SimpleCard>

      {/* Møter & Wins — månedlig trend */}
      <MeetingsWins />
      </div>
    </div>);

};

/* ---------------- Inntekt: revenue streams ---------------- */
const StreamCard = ({ s, onOpen }) => {
  const [open, setOpen] = useS(false);
  const big = s.id === "projects" ? s.count : s.count;
  const mrrTxt = s.mrr ? (s.mrr >= 1000 ? Math.round(s.mrr / 1000) + "k" : s.mrr) + " kr MRR" : Math.round(s.projRev / 1000) + "k kr/mnd";
  const last = s.spark[s.spark.length - 1];
  const prev3 = s.spark[Math.max(0, s.spark.length - 4)];
  const t3 = last - prev3;
  const gap = s.target ? s.target - s.count : null;
  const trendEl =
  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: t3 >= 0 ? "var(--green)" : "var(--red)" }}>
      <Sparkline data={s.spark.slice(-4)} w={34} h={15} color={t3 >= 0 ? "var(--c-deep)" : "var(--red-dot)"} />
      {(t3 >= 0 ? "+" : "\u2212") + Math.abs(t3)} siste 3 mnd
    </span>;

  return (
    <div className="card" style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className={"badge-ico " + (s.status === "green" ? "green" : "cream")}><Icon name={s.icon} size={19} /></span>
        <span className={"spill " + s.status}>{mrrTxt}</span>
      </div>
      <div>
        <div style={{ fontSize: 13.5, color: "var(--ink-3)", fontWeight: 500, marginBottom: 7 }}>{s.name}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
          <span className="num" style={{ fontSize: 44, fontWeight: 700, letterSpacing: "-.035em", lineHeight: .95 }}>{big}</span>
          {s.unit && <span style={{ fontSize: 15, color: "var(--ink-3)" }}>{s.unit}</span>}
          {s.target && <span style={{ fontSize: 15, color: "var(--ink-3)" }} className="num">/ {s.target}</span>}
        </div>
      </div>
      {s.target ?
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <div style={{ height: 8, borderRadius: 999, background: "var(--hairline-2)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.min(s.count / s.target, 1) * 100}%`, borderRadius: 999,
            background: s.status === "green" ? "var(--c-deep)" : "var(--yellow-dot)" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span className="num" style={{ fontSize: 12.5, color: "var(--ink-2)", fontWeight: 600 }}>
              Mål {s.target}{s.unit} · <span style={{ color: gap > 0 ? "var(--ink-3)" : "var(--green)", fontWeight: 500 }}>{gap > 0 ? gap + " unna" : "nådd"}</span>
            </span>
            {trendEl}
          </div>
        </div> :

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12.5, color: "var(--ink-2)", fontWeight: 600 }}>Stabil base</span>
          {trendEl}
        </div>
      }
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12.5, color: "var(--ink-3)" }}>
        <span>{s.price}</span>
        <button onClick={() => setOpen(!open)} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--ink-2)",
          fontSize: 12.5, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
          {open ? "Skjul" : "Mer"} <Icon name="chevron-r" size={13} style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform .2s" }} />
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateRows: open ? "1fr" : "0fr", transition: "grid-template-rows .28s ease" }}>
        <div style={{ overflow: "hidden" }}>
          <div style={{ paddingTop: 14, borderTop: "1px solid var(--hairline)", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span style={{ color: "var(--ink-3)" }}>Snittverdi</span><span className="num" style={{ fontWeight: 600 }}>{s.detail.arpa}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span style={{ color: "var(--ink-3)" }}>{s.detail.margin}</span></div>
            <p style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.5, marginTop: 2 }}>{s.detail.note}</p>
          </div>
        </div>
      </div>
    </div>);

};

const TabInntekt = () => {
  const totalMrr = SU_DATA.streams.reduce((s, x) => s + (x.mrr || 0), 0);
  return (
    <div className="tabview">
      <div className="grid-resp" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 20, marginBottom: 22 }}>
        <BigStat icon="spark" iconKind="green" label="Total MRR" value={Math.round(totalMrr / 1000) + "k"} unit="kr/mnd"
        delta={{ dir: "up", txt: "8,4 %" }} sub="Sum av faste strømmer" />
        <div className="card" style={{ padding: "26px 28px", display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span className="badge-ico"><Icon name="ebitda" size={20} /></span>
            <span className="spill yellow"><Icon name="alert" size={12} />Ikke ajour</span>
          </div>
          <div>
            <div style={{ fontSize: 14, color: "var(--ink-3)", fontWeight: 500, marginBottom: 8 }}>Omsetning / mnd</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span className="num" style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-.035em", lineHeight: .95 }}>260k</span>
              <span style={{ fontSize: 14, color: "var(--ink-3)", fontWeight: 500 }}>kr</span>
            </div>
          </div>
          <div style={{ marginTop: "auto" }}>
            <div style={{ height: 8, borderRadius: 999, background: "var(--hairline-2)", overflow: "hidden", position: "relative" }}>
              <div style={{ height: "100%", width: `${260 / 350 * 100}%`, borderRadius: 999, background: "var(--yellow-dot)" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12.5, color: "var(--ink-3)" }}>
              <span className="num">Mål 350k/mnd</span>
              <span className="num" style={{ color: "var(--yellow)", fontWeight: 600 }}>90k unna</span>
            </div>
          </div>
        </div>
        <BigStat icon="invoice" label="Snitt retainer" value="41k" unit="kr/mnd" sub="7 retainere · mål 20" />
        <BigStat icon="dot-grid" label="Aktive kunder" value="66" sub="på tvers av strømmer" />
      </div>
      <SecHead title="Inntektsstrømmer" right={<span style={{ fontSize: 12, color: "var(--ink-3)" }}>Fra Tripletex · siste 3 mnd</span>} />
      <div className="grid-resp" style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 20 }}>
        {SU_DATA.streams.map((s) => <StreamCard key={s.id} s={s} />)}
      </div>
    </div>);

};

Object.assign(window, { TabOversikt, TabInntekt, StreamCard });