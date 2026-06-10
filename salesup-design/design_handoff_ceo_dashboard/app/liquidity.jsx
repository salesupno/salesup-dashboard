/* ============================================================
   Editable monthly liquidity tool ("stålkontroll på cashflow")
   Replaces a Google Sheet. Persists to localStorage.
   Seeded with the user's real figures (Nov–Mai).
   ============================================================ */
const { useState: lS, useEffect: lE } = React;

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Des"];

const LIQ_SEED = {
  startBalance: 163855.67,
  months: ["Nov", "Des", "Jan", "Feb", "Mar", "Apr", "Mai"],
  inflows: [
    { id: "i1", name: "Salg", vals: [135218.75, 57314.5, 237070.93, 247843.75, 249432, 241360, 210000] },
    { id: "i2", name: "Utestående salg", vals: [99250, 99250, 73750, 30000, 30000, 55000, 22000] },
  ],
  outflows: [
    { id: "o1", name: "Utbetaling til Klatre", vals: [null, 25000, 75000, 25000, 96875, 68750, 37500] },
    { id: "o2", name: "Digimark, Hosting", vals: [25000, 31300, 21378, 20200, 35000, null, 25000] },
    { id: "o3", name: "Lønn inkl. skattetrekk", vals: [180161, 40000, 145000, 124074.81, 74809, 109718, 82000] },
    { id: "o4", name: "Line Spania", vals: [null, 10000, null, null, null, null, null] },
    { id: "o5", name: "Regnskap Aider + Tripletex", vals: [null, null, 1237, 9908, 5000, 8558, 13175] },
    { id: "o6", name: "Emman", vals: [null, 23150, null, null, 3800, 3800, 10513] },
    { id: "o7", name: "Arbeidsgiveravgift 14,1 %", vals: [null, null, 19797, null, 23004, null, -3041] },
    { id: "o8", name: "Merverdiavgift", vals: [null, 84537, 4870, 54052, null, 36820, null] },
    { id: "o9", name: "Venezu (møtebooking)", vals: [null, null, null, null, null, 37500, 37500] },
    { id: "o10", name: "Shala Consulting", vals: [null, 12500, null, null, null, null, null] },
    { id: "o11", name: "Husleie", vals: [2000, 1000, null, null, 6250, 3125, 8125] },
    { id: "o12", name: "Cardboard", vals: [15000, 20000, null, 20000, 20000, 20000, 20000] },
    { id: "o13", name: "Annet", vals: [3221.76, 12335.44, 911.44, 11692, 11445, 9071, null] },
  ],
  valuation: { multippel: 6, cash: 200000, debt: 0, aksjer: 1000, gulv: 450000, mal: 20000000 },
};

const LIQ_KEY = "su_liq_v2";

function loadLiq() {
  try {
    const raw = localStorage.getItem(LIQ_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return JSON.parse(JSON.stringify(LIQ_SEED));
}

const parseNum = (t) => {
  if (t == null) return null;
  const s = String(t).replace(/\s/g, "").replace(/kr/gi, "").replace(",", ".");
  if (s === "" || s === "-") return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
};
const fmtN = (n) => (n == null || n === 0) ? "" : Number(n).toLocaleString("nb-NO", { maximumFractionDigits: 0 });
const fmtKr = (n) => Math.round(n).toLocaleString("nb-NO");
const fmtBig = (n) => {
  const a = Math.abs(n);
  if (a >= 1e6) return (n / 1e6).toLocaleString("nb-NO", { maximumFractionDigits: 2 }) + " mill";
  if (a >= 1000) return Math.round(n / 1000) + "k";
  return Math.round(n).toString();
};

/* editable numeric cell */
function Cell({ value, onCommit, bold, color }) {
  const [editing, setEditing] = lS(false);
  const [draft, setDraft] = lS("");
  return (
    <input
      className="num liq-cell"
      value={editing ? draft : fmtN(value)}
      onFocus={() => { setEditing(true); setDraft(value == null ? "" : String(value).replace(".", ",")); }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { setEditing(false); onCommit(parseNum(draft)); }}
      inputMode="decimal"
      style={{ fontWeight: bold ? 700 : 500, color: color || "var(--ink)" }}
    />
  );
}

function LiquiditySheet() {
  const [d, setD] = lS(loadLiq);
  const [showSettings, setShowSettings] = lS(false);
  const [focus, setFocus] = lS(-1); // -1 = hele perioden, else month index
  lE(() => { try { localStorage.setItem(LIQ_KEY, JSON.stringify(d)); } catch (e) {} }, [d]);

  const M = d.months.length;
  const update = (fn) => setD(prev => { const next = JSON.parse(JSON.stringify(prev)); fn(next); return next; });

  const setCell = (kind, rowId, m, v) => update(n => {
    const row = n[kind].find(r => r.id === rowId); if (row) row.vals[m] = v;
  });
  const setName = (kind, rowId, name) => update(n => {
    const row = n[kind].find(r => r.id === rowId); if (row) row.name = name;
  });
  const addRow = (kind) => update(n => {
    n[kind].push({ id: kind[0] + Date.now(), name: "", vals: Array(M).fill(null) });
  });
  const delRow = (kind, rowId) => update(n => { n[kind] = n[kind].filter(r => r.id !== rowId); });
  const addMonth = () => update(n => {
    const last = n.months[n.months.length - 1];
    let idx = MONTHS_SHORT.indexOf(last);
    const next = MONTHS_SHORT[(idx + 1) % 12];
    n.months.push(next);
    n.inflows.forEach(r => r.vals.push(null));
    n.outflows.forEach(r => r.vals.push(null));
  });
  const delMonth = () => { if (M <= 1) return; update(n => {
    n.months.pop(); n.inflows.forEach(r => r.vals.pop()); n.outflows.forEach(r => r.vals.pop());
  }); };
  const setVal = (key, v) => update(n => { n.valuation[key] = v; });
  const reset = () => { if (confirm("Tilbakestille til opprinnelige tall? Dine endringer forsvinner.")) setD(JSON.parse(JSON.stringify(LIQ_SEED))); };

  /* ---- compute ---- */
  const sumAt = (rows, m) => rows.reduce((s, r) => s + (r.vals[m] || 0), 0);
  const opening = [], closing = [], inn = [], out = [], net = [];
  let bal = d.startBalance;
  for (let m = 0; m < M; m++) {
    opening[m] = bal;
    inn[m] = sumAt(d.inflows, m);
    out[m] = sumAt(d.outflows, m);
    net[m] = inn[m] - out[m];
    bal = opening[m] + net[m];
    closing[m] = bal;
  }
  const v = d.valuation;
  const fcfTTM = net.reduce((s, x) => s + x, 0);
  const selskapsverdi = fcfTTM * v.multippel + v.cash - v.debt;
  const perAksje = v.aksjer ? selskapsverdi / v.aksjer : 0;
  const monthsAboveFloor = closing.filter(c => c >= v.gulv).length;
  const floorOk = monthsAboveFloor >= 5;
  const malPct = Math.max(0, Math.min(1, selskapsverdi / v.mal));

  /* ---- styles ---- */
  const COL_W = 96, LABEL_W = 210;
  const th = { padding: "10px 12px", textAlign: "right", fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap" };
  const labelCell = { position: "sticky", left: 0, zIndex: 2, background: "var(--surface)", padding: "0 10px",
    minWidth: LABEL_W, maxWidth: LABEL_W, textAlign: "left" };

  const ValBox = ({ label, value, sub, big, color, status }) => (
    <div className="card bordered" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
      <span style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 600 }}>{label}</span>
      <span className="num" style={{ fontSize: big ? 26 : 19, fontWeight: 700, letterSpacing: "-.02em", color: color || "var(--ink)" }}>{value}</span>
      {sub && <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{sub}</span>}
      {status && <span className={"spill " + status.s} style={{ alignSelf: "flex-start", marginTop: 2 }}>{status.t}</span>}
    </div>
  );

  const SettingInput = ({ k, label, suffix }) => (
    <div>
      <label style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 600, display: "block", marginBottom: 6 }}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid var(--hairline)", borderRadius: 11, padding: "9px 12px", background: "var(--surface)" }}>
        <input className="num" defaultValue={v[k]} onBlur={(e) => setVal(k, parseNum(e.target.value) || 0)}
          inputMode="decimal" style={{ border: "none", outline: "none", background: "none", fontFamily: "var(--font)", fontSize: 14, fontWeight: 600, width: "100%", color: "var(--ink)" }} />
        {suffix && <span style={{ fontSize: 12, color: "var(--ink-3)", whiteSpace: "nowrap" }}>{suffix}</span>}
      </div>
    </div>
  );

  return (
    <div style={{ marginTop: 26 }}>
      <SecHead title="Månedslikviditet" right={
        <div style={{ display: "flex", gap: 10 }}>
          <button className="pill-btn ghost" onClick={() => setShowSettings(s => !s)} style={{ padding: "9px 16px", fontSize: 12.5 }}>
            <Icon name="target" size={15} /> Verdivurdering
          </button>
          <button className="pill-btn ghost" onClick={reset} style={{ padding: "9px 16px", fontSize: 12.5, color: "var(--ink-3)" }}>
            <Icon name="refresh" size={14} /> Tilbakestill
          </button>
        </div>} />

      {/* valuation summary (cash perpetuation) */}
      <div className="grid-resp" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 16 }}>
        <ValBox big label="Selskapsverdi" value={fmtKr(selskapsverdi) + " kr"} color={selskapsverdi < 0 ? "var(--red)" : "var(--green)"}
          sub={"FCF × " + v.multippel + " + cash − gjeld"} />
        <ValBox label="Verdi per aksje" value={perAksje.toLocaleString("nb-NO", { maximumFractionDigits: 2 }) + " kr"} color={perAksje < 0 ? "var(--red)" : "var(--ink)"}
          sub={v.aksjer + " aksjer"} />
        <ValBox label="FCF (perioden)" value={fmtKr(fcfTTM) + " kr"} color={fcfTTM < 0 ? "var(--red)" : "var(--green)"}
          sub={"sum netto · " + M + " mnd"} />
        <ValBox label="Likviditetsgulv" value={fmtBig(v.gulv) + " kr"}
          status={{ s: floorOk ? "green" : "red", t: monthsAboveFloor + " av " + M + " mnd over gulv" }} />
      </div>

      {/* period selector — focus a single month */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12.5, color: "var(--ink-3)", fontWeight: 600 }}>Periode:</span>
        <button onClick={() => setFocus(-1)} style={{ cursor: "pointer", fontFamily: "var(--font)", fontSize: 12.5, fontWeight: 600,
          border: "1px solid " + (focus === -1 ? "var(--ink)" : "var(--hairline)"), background: focus === -1 ? "var(--ink)" : "var(--surface)",
          color: focus === -1 ? "#fff" : "var(--ink-2)", borderRadius: 999, padding: "6px 13px" }}>Hele perioden</button>
        {d.months.map((mo, m) => (
          <button key={m} onClick={() => setFocus(m)} style={{ cursor: "pointer", fontFamily: "var(--font)", fontSize: 12.5, fontWeight: 600,
            border: "1px solid " + (focus === m ? "var(--ink)" : "var(--hairline)"), background: focus === m ? "var(--ink)" : "var(--surface)",
            color: focus === m ? "#fff" : "var(--ink-2)", borderRadius: 999, padding: "6px 13px" }}>{mo}</button>
        ))}
      </div>

      {/* single-month focus summary */}
      {focus >= 0 && focus < M && (
        <div className="grid-resp" style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 16 }}>
          {[
            ["Inngående", opening[focus], "var(--ink-2)"],
            ["Innbetalinger", inn[focus], "var(--green)"],
            ["Utbetalinger", out[focus], "var(--ink)"],
            ["Netto", net[focus], net[focus] < 0 ? "var(--red)" : "var(--green)"],
            ["Utgående", closing[focus], closing[focus] < v.gulv ? "var(--red)" : "var(--ink)"],
          ].map(([lab, val, col], i) => (
            <div key={i} className="card bordered" style={{ padding: "14px 16px", background: i === 4 ? "var(--green-bg)" : "var(--surface)" }}>
              <div style={{ fontSize: 11.5, color: "var(--ink-3)", fontWeight: 600, marginBottom: 5 }}>{lab}</div>
              <div className="num" style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-.01em", color: col }}>{val < 0 ? "−" : ""}{fmtKr(Math.abs(val))}</div>
            </div>
          ))}
        </div>
      )}

      {/* settings */}
      {showSettings && (
        <div className="card bordered" style={{ padding: "20px 22px", marginBottom: 16 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 14 }}>Cash perpetuation — forutsetninger</div>
          <div className="grid-resp" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 16 }}>
            <SettingInput k="multippel" label="Multippel" suffix="×" />
            <SettingInput k="cash" label="Cash" suffix="kr" />
            <SettingInput k="debt" label="Gjeld" suffix="kr" />
            <SettingInput k="aksjer" label="Antall aksjer" />
            <SettingInput k="gulv" label="Likviditetsgulv" suffix="kr" />
            <SettingInput k="mal" label="5-års mål (selskapsverdi)" suffix="kr" />
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 6 }}>
              <span style={{ color: "var(--ink-3)" }}>Mot 5-års mål ({fmtBig(v.mal)} kr)</span>
              <span className="num" style={{ fontWeight: 700, color: "var(--ink-2)" }}>{(malPct * 100).toFixed(1).replace(".", ",")} %</span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: "var(--hairline-2)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: (malPct * 100) + "%", background: "var(--c-deep)", borderRadius: 999 }} />
            </div>
          </div>
        </div>
      )}

      {/* the sheet */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="scroll" style={{ overflowX: "auto", paddingBottom: 14 }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: LABEL_W + COL_W * M + 60 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--hairline)" }}>
                <th style={{ ...th, ...labelCell, textAlign: "left", padding: "14px 14px", fontSize: 14 }}>Post</th>
                {d.months.map((mo, m) => (
                  <th key={m} style={{ ...th, minWidth: COL_W, padding: "14px 12px", background: focus === m ? "var(--green-bg)" : "transparent", borderRadius: focus === m ? "8px 8px 0 0" : 0 }}>{mo}</th>
                ))}
                <th style={{ padding: "0 10px", minWidth: 56 }}>
                  <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                    <button onClick={addMonth} title="Legg til måned" className="liq-mini">+</button>
                    {M > 1 && <button onClick={delMonth} title="Fjern siste måned" className="liq-mini">−</button>}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {/* opening balance */}
              <tr style={{ background: "var(--cream)" }}>
                <td style={{ ...labelCell, background: "var(--cream)", padding: "11px 14px", fontWeight: 600, fontSize: 13 }}>Inngående beholdning</td>
                {opening.map((o, m) => (
                  <td key={m} className="num" style={{ textAlign: "right", padding: "11px 16px", fontSize: 13, fontWeight: 600,
                    color: o < 0 ? "var(--red)" : "var(--ink-2)" }}>{fmtKr(o)}</td>
                ))}
                <td></td>
              </tr>

              {/* INNBETALINGER */}
              <SectionBand label="Innbetalinger" tone="green" span={M} />
              {d.inflows.map(r => (
                <DataRow key={r.id} row={r} kind="inflows" months={M} colW={COL_W} labelCell={labelCell}
                  onCell={setCell} onName={setName} onDel={delRow} />
              ))}
              <AddRow label="+ Legg til inntektspost" onClick={() => addRow("inflows")} colSpan={M + 2} labelCell={labelCell} />
              <TotalRow label="Sum innbetalinger" vals={inn} months={M} labelCell={labelCell} tone="green" />

              {/* UTBETALINGER */}
              <SectionBand label="Utbetalinger" tone="ink" span={M} />
              {d.outflows.map(r => (
                <DataRow key={r.id} row={r} kind="outflows" months={M} colW={COL_W} labelCell={labelCell}
                  onCell={setCell} onName={setName} onDel={delRow} />
              ))}
              <AddRow label="+ Legg til utgiftspost" onClick={() => addRow("outflows")} colSpan={M + 2} labelCell={labelCell} />
              <TotalRow label="Sum utbetalinger" vals={out} months={M} labelCell={labelCell} tone="ink" />

              {/* net + closing */}
              <tr style={{ background: "var(--green-bg)" }}>
                <td style={{ ...labelCell, background: "var(--green-bg)", padding: "12px 14px", fontWeight: 700, fontSize: 13.5 }}>Netto likviditetsendring</td>
                {net.map((n, m) => (
                  <td key={m} className="num" style={{ textAlign: "right", padding: "12px 16px", fontSize: 13.5, fontWeight: 700,
                    color: n < 0 ? "var(--red)" : "var(--ink)" }}>{n < 0 ? "−" : ""}{fmtKr(Math.abs(n))}</td>
                ))}
                <td style={{ background: "var(--green-bg)" }}></td>
              </tr>
              <tr style={{ background: "var(--ink)" }}>
                <td style={{ ...labelCell, background: "var(--ink)", color: "#fff", padding: "13px 14px", fontWeight: 700, fontSize: 14 }}>Utgående beholdning</td>
                {closing.map((c, m) => (
                  <td key={m} className="num" style={{ textAlign: "right", padding: "13px 16px", fontSize: 14.5, fontWeight: 700,
                    color: c < v.gulv ? "#F2A99E" : "#E8F5D0" }}>{fmtKr(c)}</td>
                ))}
                <td style={{ background: "var(--ink)" }}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <p style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 12, display: "flex", alignItems: "center", gap: 7 }}>
        <Icon name="clock" size={13} /> Lagres automatisk i nettleseren. Klikk i en celle for å redigere. Rød utgående beholdning = under likviditetsgulv.
      </p>
    </div>
  );
}

/* ---- sub-rows ---- */
const SectionBand = ({ label, tone, span }) => (
  <tr>
    <td colSpan={span + 2} style={{ padding: "9px 14px", fontSize: 11.5, fontWeight: 700, letterSpacing: ".06em",
      textTransform: "uppercase", color: tone === "green" ? "var(--green)" : "var(--ink-2)",
      background: tone === "green" ? "var(--green-soft)" : "var(--hairline-2)",
      borderTop: "1px solid var(--hairline)", position: "sticky", left: 0 }}>{label}</td>
  </tr>
);

const DataRow = ({ row, kind, months, colW, labelCell, onCell, onName, onDel }) => (
  <tr className="liq-row" style={{ borderBottom: "1px solid var(--hairline-2)" }}>
    <td style={{ ...labelCell }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button className="liq-del" onClick={() => onDel(kind, row.id)} title="Slett post"><Icon name="trash" size={12} /></button>
        <input className="liq-name" value={row.name} placeholder="Navn på post"
          onChange={(e) => onName(kind, row.id, e.target.value)} />
      </div>
    </td>
    {row.vals.slice(0, months).map((val, m) => (
      <td key={m} style={{ minWidth: colW, padding: 0 }}>
        <Cell value={val} onCommit={(nv) => onCell(kind, row.id, m, nv)} />
      </td>
    ))}
    <td></td>
  </tr>
);

const TotalRow = ({ label, vals, months, labelCell, tone }) => (
  <tr style={{ background: tone === "green" ? "var(--green-soft)" : "var(--hairline-2)", borderTop: "1px solid var(--hairline)" }}>
    <td style={{ ...labelCell, background: tone === "green" ? "var(--green-soft)" : "var(--hairline-2)", padding: "11px 14px", fontWeight: 700, fontSize: 13 }}>{label}</td>
    {vals.slice(0, months).map((s, m) => (
      <td key={m} className="num" style={{ textAlign: "right", padding: "11px 16px", fontSize: 13, fontWeight: 700,
        color: tone === "green" ? "var(--green)" : "var(--ink)" }}>{fmtKr(s)}</td>
    ))}
    <td></td>
  </tr>
);

const AddRow = ({ label, onClick, colSpan, labelCell }) => (
  <tr>
    <td colSpan={colSpan} style={{ padding: "7px 14px", position: "sticky", left: 0, background: "var(--surface)" }}>
      <button onClick={onClick} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--ink-3)",
        fontSize: 12.5, fontWeight: 600, fontFamily: "var(--font)", display: "inline-flex", alignItems: "center", gap: 4 }}>{label}</button>
    </td>
  </tr>
);

/* liquidity summary for the simple front-page card */
function liqSummary() {
  const d = loadLiq();
  const M = d.months.length;
  const sumAt = (rows, m) => rows.reduce((s, r) => s + (r.vals[m] || 0), 0);
  let bal = d.startBalance; const closing = [], net = [];
  for (let m = 0; m < M; m++) { const inn = sumAt(d.inflows, m), out = sumAt(d.outflows, m); net[m] = inn - out; bal += net[m]; closing[m] = bal; }
  const cashNow = closing[M - 1];
  const last3 = net.slice(-3);
  const avgNet = last3.length ? last3.reduce((s, x) => s + x, 0) / last3.length : 0;
  const nextEnd = cashNow + avgNet;
  const floor = d.valuation.gulv;
  const monthsAboveFloor = closing.filter(c => c >= floor).length;
  return { cashNow, nextEnd, avgNet, floor, M, monthsAboveFloor, aboveFloor: cashNow >= floor, building: avgNet > 0 };
}

Object.assign(window, { LiquiditySheet, liqSummary });