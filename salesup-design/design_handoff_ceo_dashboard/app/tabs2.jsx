/* ============================================================
   Tabs — part 2: Kunder, Skalering (simulator + AI + mål + ToC), Varsler
   ============================================================ */
const fmtMoney = (n) => {
  const a = Math.abs(n);
  if (a >= 1e6) return (n / 1e6).toFixed(2).replace(".", ",") + " mill";
  if (a >= 1000) return Math.round(n / 1000) + "k";
  return Math.round(n).toString();
};

/* ===================== KUNDER ===================== */
/* ===================== SKALERING ===================== */
function project(sel, stress) {
  const sc = SU_DATA.scale;
  const chosen = sc.moves.filter(m => sel[m.id]);
  const f = stress ? 0.5 : 1;
  const addCost = chosen.reduce((s, m) => s + m.cost, 0);
  let cash = sc.cash, minCash = cash, cum = 0, payback = null;
  const pts = [cash], base = [cash];
  const baseNet = sc.monthlyRevenue - sc.monthlyCost;
  let addRev12 = 0;
  for (let m = 1; m <= 12; m++) {
    let addRev = 0;
    chosen.forEach(mv => {
      if (mv.recurring) addRev += mv.perMonthMrr * Math.min(Math.max(m - 1, 0), mv.ramp) * f;
      else addRev += mv.flat * Math.min(m / mv.ramp, 1) * f;
    });
    if (m === 12) addRev12 = addRev;
    const net = sc.monthlyRevenue + addRev - sc.monthlyCost - addCost;
    cash += net; pts.push(cash);
    base.push(sc.cash + baseNet * m);
    if (cash < minCash) minCash = cash;
    cum += (addRev - addCost);
    if (payback === null && chosen.length && cum >= 0) payback = m;
  }
  return { pts, base, minCash, payback, addCost, addRev12, chosen };
}

const CashChart = ({ pts, base, floor }) => {
  const W = 520, H = 150, pad = 8;
  const all = [...pts, ...base, floor];
  const yMax = Math.max(...all) * 1.04, yMin = Math.min(...all, floor) * 0.94;
  const x = (i) => pad + (i / (pts.length - 1)) * (W - pad * 2);
  const y = (v) => H - pad - ((v - yMin) / (yMax - yMin)) * (H - pad * 2);
  const line = (arr) => arr.map((v, i) => (i ? "L" : "M") + x(i).toFixed(1) + "," + y(v).toFixed(1)).join(" ");
  const area = line(pts) + ` L${x(pts.length - 1)},${H - pad} L${x(0)},${H - pad} Z`;
  const fy = y(floor);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }}>
      <defs><linearGradient id="cashg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--c-deep)" stopOpacity=".22" /><stop offset="1" stopColor="var(--c-deep)" stopOpacity="0" /></linearGradient></defs>
      <path d={area} fill="url(#cashg)" />
      <line x1={pad} y1={fy} x2={W - pad} y2={fy} stroke="var(--red-dot)" strokeWidth="1.4" strokeDasharray="5 5" />
      <path d={line(base)} fill="none" stroke="var(--ink-3)" strokeWidth="1.5" strokeDasharray="4 4" opacity=".5" />
      <path d={line(pts)} fill="none" stroke="var(--c-deep)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(pts.length - 1)} cy={y(pts[pts.length - 1])} r="3.5" fill="var(--c-deep)" />
    </svg>
  );
};

const ScalePlanner = () => {
  const sc = SU_DATA.scale;
  const [sel, setSel] = useS({ sdr: false, consultant: false, dev: false });
  const [stress, setStress] = useS(false);
  const r = project(sel, stress);
  const any = r.chosen.length > 0;
  let verdict;
  if (!any) verdict = { label: "Velg grep for å simulere", color: "var(--ink-3)", bg: "var(--cream)" };
  else if (r.minCash >= sc.floor * 1.3) verdict = { label: "Trygt å skalere", color: "var(--green)", bg: "var(--green-soft)", ico: "arrow-up" };
  else if (r.minCash >= sc.floor) verdict = { label: "Innenfor buffer", color: "var(--yellow)", bg: "var(--yellow-soft)", ico: "alert" };
  else verdict = { label: "Overstiger likviditet", color: "var(--red)", bg: "var(--red-soft)", ico: "trend-down" };
  const buffer = (sc.cash / sc.monthlyCost).toFixed(1).replace(".", ",");

  const Metric = ({ label, value, color }) => (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 4 }}>{label}</div>
      <div className="num" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.02em", color: color || "var(--ink)" }}>{value}</div>
    </div>
  );

  return (
    <div className="card" style={{ padding: "28px 30px", marginBottom: 22 }}>
      <SecHead title="Skaler lønnsomt"
        right={<span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>Kan vi ansette uten å overstige likviditeten?</span>} />

      {/* now stats */}
      <div className="grid-resp" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18, marginBottom: 26 }}>
        <div className="card bordered" style={{ padding: "18px 20px" }}><Metric label="Likviditet nå" value={fmtMoney(sc.cash) + " kr"} /></div>
        <div className="card bordered" style={{ padding: "18px 20px" }}><Metric label="Drift nå" value={"+" + fmtMoney(sc.monthlyRevenue - sc.monthlyCost) + " /mnd"} color="var(--green)" /></div>
        <div className="card bordered" style={{ padding: "18px 20px" }}><Metric label="Likviditetsbuffer" value={buffer + " mnd"} /></div>
      </div>

      <div className="grid-resp" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 26 }}>
        {/* moves */}
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-3)", marginBottom: 12, letterSpacing: ".02em" }}>VELG ANSETTELSER</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {sc.moves.map(m => {
              const on = sel[m.id];
              return (
                <button key={m.id} onClick={() => setSel({ ...sel, [m.id]: !on })}
                  style={{ textAlign: "left", cursor: "pointer", fontFamily: "var(--font)",
                    border: "1.5px solid " + (on ? "var(--c-deep)" : "var(--hairline)"),
                    background: on ? "var(--green-soft)" : "var(--surface)", borderRadius: 18, padding: "15px 17px",
                    display: "flex", gap: 14, alignItems: "flex-start", transition: "all .16s ease" }}>
                  <span style={{ width: 22, height: 22, borderRadius: 7, marginTop: 1, flex: "none",
                    background: on ? "var(--c-deep)" : "var(--hairline-2)", color: "#fff", display: "grid", placeItems: "center" }}>
                    {on && <Icon name="arrow-up" size={13} style={{ transform: "rotate(45deg)" }} />}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 14.5, fontWeight: 600 }}>{m.label}</span>
                      <span className="num" style={{ marginLeft: "auto", fontSize: 13.5, fontWeight: 700 }}>{fmtMoney(m.cost)} kr/mnd</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: "var(--green)", fontWeight: 600, marginTop: 3 }}>{m.gain}</div>
                    <p style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.45, marginTop: 6 }}>{m.why}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, cursor: "pointer", fontSize: 12.5, color: "var(--ink-2)" }}>
            <span onClick={() => setStress(!stress)} style={{ width: 38, height: 22, borderRadius: 999, background: stress ? "var(--yellow-dot)" : "var(--hairline)", position: "relative", transition: "background .2s", flex: "none" }}>
              <span style={{ position: "absolute", top: 2, left: stress ? 18 : 2, width: 18, height: 18, borderRadius: 50, background: "#fff", transition: "left .2s", boxShadow: "var(--shadow-sm)" }} />
            </span>
            Konservativt scenario (halv effekt av ansettelser)
          </label>
        </div>

        {/* projection */}
        <div className="card bordered" style={{ padding: "20px 22px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <span style={{ fontSize: 13, color: "var(--ink-3)", fontWeight: 500 }}>Resultat · 12 mnd</span>
            <span className="spill" style={{ background: verdict.bg, color: verdict.color, fontSize: 13, padding: "6px 14px" }}>
              {verdict.ico && <Icon name={verdict.ico} size={13} />}{verdict.label}
            </span>
          </div>
          <div style={{ display: "flex", gap: 20, marginBottom: 8 }}>
            <Metric label="Ny kostnad/mnd" value={any ? "+" + fmtMoney(r.addCost) : "—"} color={any ? "var(--ink)" : "var(--ink-3)"} />
            <Metric label="Laveste likviditet" value={fmtMoney(r.minCash) + " kr"} color={r.minCash < sc.floor ? "var(--red)" : "var(--ink)"} />
          </div>
          <div style={{ display: "flex", gap: 20, marginBottom: 18 }}>
            <Metric label="Payback" value={r.payback ? r.payback + " mnd" : "—"} color="var(--green)" />
            <Metric label="Inntekt/mnd v/12 mnd" value={any ? "+" + fmtMoney(r.addRev12) : "—"} color={any ? "var(--green)" : "var(--ink-3)"} />
          </div>
          <div style={{ marginTop: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ink-3)", marginBottom: 4 }}>
              <span>Likviditet 12 mnd</span>
              <span style={{ display: "inline-flex", gap: 12 }}>
                <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}><span style={{ width: 14, height: 2, background: "var(--c-deep)", display: "inline-block" }} />scenario</span>
                <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}><span style={{ width: 14, height: 2, background: "var(--red-dot)", display: "inline-block" }} />gulv</span>
              </span>
            </div>
            <CashChart pts={r.pts} base={r.base} floor={sc.floor} />
          </div>
        </div>
      </div>
    </div>
  );
};

/* AI recommendation cards */
const AiRecs = () => (
  <div style={{ marginBottom: 22 }}>
    <SecHead title="AI-anbefalinger" right={<span style={{ fontSize: 12, color: "var(--ink-3)" }}>Basert på Tripletex + Copper</span>} />
    <div className="grid-resp" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
      {SU_DATA.ai.recommendations.map((rec, i) => (
        <div key={i} className="card" style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="num" style={{ width: 26, height: 26, borderRadius: 8, background: "var(--green-bg)", color: "var(--ink)", fontSize: 13, fontWeight: 700, display: "grid", placeItems: "center" }}>{rec.rank}</span>
            <span className="spill green">{rec.impact}</span>
          </div>
          <div style={{ fontSize: 15.5, fontWeight: 600, lineHeight: 1.3 }}>{rec.title}</div>
          <p style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5, marginBottom: "auto" }}>{rec.body}</p>
          <div style={{ fontSize: 11.5, color: "var(--ink-3)", display: "inline-flex", alignItems: "center", gap: 6, paddingTop: 6 }}>
            <Icon name="dot-grid" size={12} />{rec.tied}
          </div>
        </div>
      ))}
    </div>
  </div>
);

/* Mål + ToC — front-page section */
const MalToc = () => {
  const [active, setActive] = useS(1);
  return (
    <div className="grid-resp" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 22 }}>
      <div>
        <SecHead title="Mål mot 2027" right={<span style={{ fontSize: 12, color: "var(--ink-3)" }}>skaleringsmål</span>} />
        <div className="grid-resp" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {SU_DATA.goals.map((g, i) => <GoalCard key={i} g={g} />)}
        </div>
      </div>
      <div className="card" style={{ padding: "24px 26px", background: "var(--cream)" }}>
        <SecHead title="Flaskehals-jakten" right={<span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>5 fokuseringstrinn</span>} />
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {SU_DATA.tocSteps.map(t => {
            const on = active === t.n;
            return (
              <button key={t.n} onClick={() => setActive(on ? 0 : t.n)} style={{ textAlign: "left", cursor: "pointer", fontFamily: "var(--font)",
                background: on ? "var(--ink)" : "var(--surface)", color: on ? "#F3F1E6" : "var(--ink)",
                border: "none", borderRadius: 14, padding: "13px 15px", display: "flex", gap: 12, alignItems: "center", transition: "all .16s ease" }}>
                <span className="num" style={{ width: 25, height: 25, borderRadius: 999, flex: "none", display: "grid", placeItems: "center", fontSize: 12.5, fontWeight: 700,
                  background: t.n === 1 ? "var(--c-deep)" : (on ? "rgba(255,255,255,.15)" : "var(--cream)"), color: t.n === 1 || on ? "#fff" : "var(--ink-2)" }}>{t.n}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{t.title}</div>
                  <div style={{ fontSize: 11.5, color: on ? "var(--green-bg)" : "var(--ink-3)", marginTop: 2 }}>{t.note}</div>
                </div>
                {t.n === 1 && <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".06em", color: on ? "var(--green-bg)" : "var(--green)" }}>NÅ</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const TabSkalering = () => (
  <div className="tabview">
    <div className="card" style={{ padding: "26px 30px", marginBottom: 22, background: "linear-gradient(165deg,#23251A,#2D2F22)", color: "#F3F1E6" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
        <span style={{ width: 28, height: 28, borderRadius: 8, background: "var(--green-bg)", color: "#23251A", display: "grid", placeItems: "center" }}><Icon name="spark" size={15} /></span>
        <span style={{ fontSize: 13, fontWeight: 600 }}>AI-analyse</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-.02em", lineHeight: 1.25, marginBottom: 10, maxWidth: 760 }}>{SU_DATA.ai.headline}</div>
      <p style={{ fontSize: 14, lineHeight: 1.55, color: "#CFCEC0", maxWidth: 820 }}>{SU_DATA.ai.summary}</p>
    </div>
    <ScalePlanner />
    <AiRecs />
  </div>
);

/* ===================== LIKVIDITET ===================== */
const TabLikviditet = ({ goTab }) => {
  return (
    <div className="tabview">
      <LiquiditySheet />
    </div>
  );
};

/* ===================== VARSLER ===================== */
const TONE = { red: ["var(--red)", "var(--red-soft)"], yellow: ["var(--yellow)", "var(--yellow-soft)"] };
const TabVarsler = () => (
  <div className="tabview">
    <SecHead title="Varslingssenter" right={<span className="spill red">{SU_DATA.alerts.filter(a => a.sev === "red").length} kritiske</span>} />
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {SU_DATA.alerts.map((al, i) => {
        const [c, soft] = TONE[al.sev];
        return (
          <div key={i} className="card bordered" style={{ padding: "20px 24px", display: "flex", gap: 18, alignItems: "center" }}>
            <span style={{ width: 44, height: 44, borderRadius: 13, background: soft, color: c, display: "grid", placeItems: "center", flex: "none" }}><Icon name={al.icon} size={20} /></span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15.5, fontWeight: 600 }}>{al.title}</div>
              <div style={{ fontSize: 13.5, color: "var(--ink-2)", marginTop: 3 }}>{al.body}</div>
            </div>
            <span style={{ fontSize: 12, color: "var(--ink-3)", whiteSpace: "nowrap" }}>{al.time}</span>
          </div>
        );
      })}
    </div>
  </div>
);

Object.assign(window, { TabSkalering, TabVarsler, TabLikviditet, ScalePlanner, fmtMoney });
