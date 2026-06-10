/* ============================================================
   UI primitives for the airy / focus layout
   (reuses Icon, Sparkline from components.jsx)
   ============================================================ */
const { useState: useS, useEffect: useE, useRef: useR } = React;

/* ---- big focus stat card ---- */
const BigStat = ({ icon, iconKind = "", label, value, unit, delta, sub, onClick, big = true }) => (
  <div className={"card" + (onClick ? " lift" : "")} onClick={onClick}
    style={{ padding: "26px 28px", display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span className={"badge-ico " + iconKind}><Icon name={icon} size={20} /></span>
      {delta && (
        <span className={"spill " + (delta.dir === "up" ? "green" : "red")}>
          <Icon name={delta.dir === "up" ? "arrow-up" : "arrow-down"} size={12} />{delta.txt}
        </span>
      )}
    </div>
    <div>
      <div style={{ fontSize: 14, color: "var(--ink-3)", fontWeight: 500, marginBottom: 8 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span className="num" style={{ fontSize: big ? 50 : 34, fontWeight: 700, letterSpacing: "-.035em", lineHeight: .95 }}>{value}</span>
        {unit && <span style={{ fontSize: big ? 17 : 14, color: "var(--ink-3)", fontWeight: 500 }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 9 }}>{sub}</div>}
    </div>
  </div>
);

/* ---- bar chart (airy) ---- */
const BarChart = ({ data, height = 220, hiIndex }) => {
  const max = Math.max(...data.map(d => d.value));
  const ticks = 4;
  const fmt = (v) => max >= 1e6 ? (v / 1e6).toFixed(1).replace(".", ",") + "M" : Math.round(v / 1000) + "k";
  return (
    <div>
      <div style={{ display: "flex", gap: 14 }}>
        {/* y labels */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height, paddingBottom: 26 }}>
          {Array.from({ length: ticks + 1 }).map((_, i) => {
            const v = (max * (ticks - i) / ticks);
            return <span key={i} className="num" style={{ fontSize: 10.5, color: "var(--ink-3)" }}>{fmt(v)}</span>;
          })}
        </div>
        {/* bars */}
        <div style={{ flex: 1, position: "relative" }}>
          {/* gridlines */}
          <div style={{ position: "absolute", inset: `0 0 26px 0`, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            {Array.from({ length: ticks + 1 }).map((_, i) => <div key={i} style={{ height: 1, background: "var(--hairline-2)" }} />)}
          </div>
          <div style={{ position: "relative", height, display: "flex", alignItems: "flex-end", gap: "min(3%,18px)", paddingBottom: 26 }}>
            {data.map((d, i) => {
              const hi = i === hiIndex;
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
                  <div title={d.value.toLocaleString("nb-NO")} style={{ width: "100%", maxWidth: 46,
                    height: `${(d.value / max) * 100}%`, minHeight: 6,
                    background: hi ? "var(--c-deep)" : "var(--c-light)", borderRadius: 12,
                    transition: "height .7s cubic-bezier(.2,.7,.3,1)" }} />
                  <span style={{ position: "absolute", bottom: 0, fontSize: 11, color: "var(--ink-3)" }}>{d.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---- stacked bar chart (MRR + projects) ---- */
const StackedBarChart = ({ data, height = 220, series }) => {
  const totals = data.map(d => series.reduce((s, sr) => s + (d[sr.key] || 0), 0));
  const max = Math.max(...totals);
  const ticks = 4;
  const fmt = (v) => max >= 1e6 ? (v / 1e6).toFixed(1).replace(".", ",") + "M" : Math.round(v / 1000) + "k";
  return (
    <div>
      <div style={{ display: "flex", gap: 18, marginBottom: 14 }}>
        {series.map(sr => (
          <span key={sr.key} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--ink-2)" }}>
            <span style={{ width: 11, height: 11, borderRadius: 3, background: sr.color }} />{sr.label}
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height, paddingBottom: 26 }}>
          {Array.from({ length: ticks + 1 }).map((_, i) => (
            <span key={i} className="num" style={{ fontSize: 10.5, color: "var(--ink-3)" }}>{fmt(max * (ticks - i) / ticks)}</span>
          ))}
        </div>
        <div style={{ flex: 1, position: "relative" }}>
          <div style={{ position: "absolute", inset: "0 0 26px 0", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            {Array.from({ length: ticks + 1 }).map((_, i) => <div key={i} style={{ height: 1, background: "var(--hairline-2)" }} />)}
          </div>
          <div style={{ position: "relative", height, display: "flex", alignItems: "flex-end", gap: "min(3%,18px)", paddingBottom: 26 }}>
            {data.map((d, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
                <div style={{ width: "100%", maxWidth: 46, display: "flex", flexDirection: "column", justifyContent: "flex-end",
                  height: `${(totals[i] / max) * 100}%` }} title={fmt(totals[i])}>
                  {series.map((sr, si) => (
                    <div key={sr.key} style={{ height: `${(d[sr.key] / totals[i]) * 100}%`, background: sr.color,
                      borderTopLeftRadius: si === 0 ? 8 : 0, borderTopRightRadius: si === 0 ? 8 : 0,
                      borderBottomLeftRadius: si === series.length - 1 ? 8 : 0, borderBottomRightRadius: si === series.length - 1 ? 8 : 0,
                      transition: "height .7s cubic-bezier(.2,.7,.3,1)" }} />
                  ))}
                </div>
                <span style={{ position: "absolute", bottom: 0, fontSize: 11, color: "var(--ink-3)" }}>{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---- half donut gauge ---- */
const Donut = ({ pct, center, sub, color = "var(--c-deep)", size = 200 }) => {
  const R = size * 0.4, cx = size / 2, cy = size * 0.46, w = size * 0.085;
  const pt = (a) => [cx + R * Math.cos(a * Math.PI / 180), cy + R * Math.sin(a * Math.PI / 180)];
  const arc = (a0, a1, col) => {
    const [x0, y0] = pt(a0), [x1, y1] = pt(a1);
    const large = a1 - a0 > 180 ? 1 : 0;
    return <path d={`M${x0} ${y0} A${R} ${R} 0 ${large} 1 ${x1} ${y1}`} fill="none" stroke={col} strokeWidth={w} strokeLinecap="round" />;
  };
  return (
    <svg width={size} height={size * 0.62} viewBox={`0 0 ${size} ${size * 0.62}`} style={{ display: "block" }}>
      {arc(135, 405, "var(--hairline)")}
      {arc(135, 135 + pct * 270, color)}
      <text x={cx} y={cy + 2} textAnchor="middle" fontSize={size * 0.16} fontWeight="700" fill="var(--ink)" className="num" style={{ letterSpacing: "-.02em" }}>{center}</text>
      {sub && <text x={cx} y={cy + size * 0.13} textAnchor="middle" fontSize={size * 0.062} fill="var(--ink-3)">{sub}</text>}
    </svg>
  );
};

/* ---- goal progress row ---- */
const GoalRow = ({ g }) => (
  <div style={{ padding: "4px 0" }}>
    <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 9 }}>
      <span style={{ fontSize: 14.5, fontWeight: 600, flex: 1 }}>{g.label}</span>
      <span className="num" style={{ fontSize: 14.5, fontWeight: 700, color: "var(--" + (g.status) + ")" }}>{Math.round(g.progress * 100)} %</span>
    </div>
    <div style={{ height: 10, borderRadius: 999, background: "var(--hairline-2)", overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.min(g.progress,1)*100}%`, borderRadius: 999,
        background: g.status === "green" ? "var(--c-deep)" : (g.status === "yellow" ? "var(--yellow-dot)" : "var(--red-dot)"),
        transition: "width .8s cubic-bezier(.2,.7,.3,1)" }} />
    </div>
    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12, color: "var(--ink-3)" }}>
      <span className="num">{String(g.current).replace(".", ",")}{g.unit ? " " + g.unit : ""} / {g.target}{g.unit ? " " + g.unit : ""}</span>
      <span>{g.eta}</span>
    </div>
  </div>
);

/* ---- concrete goal card (front page) ---- */
const GoalCard = ({ g }) => {
  const col = g.status === "green" ? "var(--c-deep)" : (g.status === "yellow" ? "var(--yellow-dot)" : "var(--red-dot)");
  const remain = g.target - g.current;
  const remainTxt = g.unit === "mill"
    ? remain.toLocaleString("nb-NO", { maximumFractionDigits: 1 }) + " mill igjen"
    : Math.round(remain) + " igjen";
  const curDisp = String(g.current).replace(".", ",");
  return (
    <div className="card bordered" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13, color: "var(--ink-2)", fontWeight: 600 }}>{g.short}</span>
        <span className="num" style={{ fontSize: 13, fontWeight: 700, color: col }}>{Math.round(g.progress * 100)} %</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span className="num" style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-.03em", lineHeight: .95 }}>{curDisp}</span>
        <span className="num" style={{ fontSize: 15, color: "var(--ink-3)", fontWeight: 500 }}>/ {g.target}{g.unit ? " " + g.unit : ""}</span>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: "var(--hairline-2)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${Math.min(g.progress, 1) * 100}%`, background: col, borderRadius: 999, transition: "width .8s cubic-bezier(.2,.7,.3,1)" }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, color: "var(--ink-3)" }}>
        <span style={{ fontWeight: 600, color: "var(--ink-2)" }}>{remainTxt}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="clock" size={12} />{g.eta}</span>
      </div>
    </div>
  );
};

/* ---- section header ---- */
const SecHead = ({ title, right }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
    <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-.02em" }}>{title}</h2>
    {right}
  </div>
);

Object.assign(window, { BigStat, BarChart, StackedBarChart, Donut, GoalRow, GoalCard, SecHead });
