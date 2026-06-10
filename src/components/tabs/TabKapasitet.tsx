"use client"

import { useState, useEffect } from "react"
import { CAP_PRODUCTS, VAREKOST_PCT } from "@/lib/data"

const CAP2_KEY = "su_cap_simple_v1"
const G6 = 820000

interface CapState {
  eff: number
  ansatte: number
  p: Record<string, { a: number; n: number }>
}

const CAP2_SEED: CapState = {
  eff: 34,
  ansatte: 2,
  p: { seo: { a: 7, n: 1 }, web: { a: 3, n: 3 }, mynk: { a: 14, n: 5 } },
}

const loadCap = (): CapState => {
  try {
    const r = localStorage.getItem(CAP2_KEY)
    if (r) return { ...CAP2_SEED, ...JSON.parse(r) }
  } catch {}
  return JSON.parse(JSON.stringify(CAP2_SEED))
}

const oFmt = (n: number) => {
  const a = Math.abs(n)
  if (a >= 1e6) return (n / 1e6).toFixed(2).replace(".", ",") + " mill"
  if (a >= 1000) return Math.round(n / 1000) + "k"
  return Math.round(n).toString()
}

type Status = "green" | "yellow" | "red"
const COLOR: Record<Status, string> = {
  green: "var(--c-deep)",
  yellow: "var(--yellow-dot)",
  red: "var(--red-dot)",
}
const COLOR_TX: Record<Status, string> = {
  green: "var(--green)",
  yellow: "var(--yellow)",
  red: "var(--red)",
}

function CapSlider({
  value,
  min,
  max,
  step = 1,
  onChange,
  color = "var(--c-deep)",
}: {
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  color?: string
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <input
      type="range"
      className="cap-slider"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      style={{ background: `linear-gradient(90deg, ${color} ${pct}%, var(--hairline-2) ${pct}%)` }}
    />
  )
}

function CapMeter({
  label,
  hint,
  used,
  pot,
}: {
  label: string
  hint: string
  used: number
  pot: number
}) {
  const u = pot > 0 ? used / pot : 0
  const st: Status = u > 1 ? "red" : u > 0.85 ? "yellow" : "green"
  const free = Math.round(pot - used)
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <span style={{ fontSize: 23, fontWeight: 700, letterSpacing: "-.02em" }}>{label}</span>
        <span className="num" style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-.03em", color: COLOR_TX[st] }}>
          {Math.round(used)}
          <span style={{ fontSize: 19, color: "var(--ink-3)", fontWeight: 600 }}> / {pot} t</span>
        </span>
      </div>
      <div style={{ height: 24, borderRadius: 999, background: "var(--hairline-2)", overflow: "hidden", position: "relative" }}>
        <div style={{
          position: "absolute", inset: 0,
          width: Math.min(u, 1) * 100 + "%",
          background: COLOR[st],
          borderRadius: 999,
          transition: "width .6s cubic-bezier(.2,.7,.3,1)",
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14.5, color: "var(--ink-3)" }}>
        <span>{hint}</span>
        <span style={{ fontWeight: 700, color: st === "red" ? "var(--red)" : "var(--ink-2)" }}>
          {free >= 0 ? free + " t ledig" : Math.abs(free) + " t for mye"}
        </span>
      </div>
    </div>
  )
}

export default function TabKapasitet() {
  const [s, setS] = useState<CapState>(() => CAP2_SEED)

  useEffect(() => { setS(loadCap()) }, [])
  useEffect(() => {
    try { localStorage.setItem(CAP2_KEY, JSON.stringify(s)) } catch {}
  }, [s])

  const setEff = (v: number) => setS((p) => ({ ...p, eff: v }))
  const setAns = (v: number) => setS((p) => ({ ...p, ansatte: Math.min(12, Math.max(1, v)) }))
  const setP = (id: string, k: "a" | "n", v: number) =>
    setS((prev) => ({ ...prev, p: { ...prev.p, [id]: { ...prev.p[id], [k]: v } } }))

  const brutto = Math.round(s.ansatte * 37.5 * 4.33)
  const pot = Math.round(brutto * (s.eff / 100))
  const salgUsed = CAP_PRODUCTS.reduce((t, pr) => t + (s.p[pr.id]?.n ?? 0) * pr.salg, 0)
  const levUsed  = CAP_PRODUCTS.reduce((t, pr) => t + (s.p[pr.id]?.a ?? 0) * pr.drift, 0)
  const worstU = Math.max(salgUsed, levUsed) / (pot || 1)
  const st: Status = worstU > 1 ? "red" : worstU > 0.85 ? "yellow" : "green"
  const bottle = salgUsed >= levUsed ? "Salg" : "Leveranse"
  const verdict =
    st === "red"
      ? bottle + " sprekker — dere har lovet bort mer enn dere rekker."
      : st === "yellow"
        ? bottle + " er nesten full — lite plass til flere."
        : "God plass. Dere kan ta inn flere kunder."

  // Economy
  const omsMndK = CAP_PRODUCTS.reduce((t, pr) => t + (s.p[pr.id]?.a ?? 0) * pr.rev, 0)
  const omsAr = omsMndK * 1000 * 12
  const varekostKr = omsAr * VAREKOST_PCT / 100
  const lonnKr = G6 * s.ansatte
  const resultat = omsAr - varekostKr - lonnKr
  const resPct = omsAr > 0 ? Math.round((resultat / omsAr) * 100) : 0
  const utbyttePer = s.ansatte ? resultat / s.ansatte : 0
  const posCol = (v: number) => (v >= 0 ? "var(--c-mid)" : "#E2A92F")

  const CheckIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M20 6 9 17l-5-5" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
  const AlertIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" stroke={st === "red" ? "var(--red)" : "var(--yellow)"} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* THE POT */}
      <div className="card" style={{ padding: "44px 48px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 44, alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 16, color: "var(--ink-3)", fontWeight: 600, marginBottom: 4 }}>
              Timer til kunder i måneden
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <span className="num" style={{ fontSize: 104, fontWeight: 800, letterSpacing: "-.05em", lineHeight: .85 }}>
                {pot}
              </span>
              <span style={{ fontSize: 28, color: "var(--ink-3)", fontWeight: 600 }}>timer</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", fontSize: 15, color: "var(--ink-3)", marginTop: 18 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <button className="cap-step" onClick={() => setAns(s.ansatte - 1)} aria-label="Færre">−</button>
                <b className="num" style={{ fontSize: 17, color: "var(--ink)" }}>{s.ansatte}</b>
                <button className="cap-step" onClick={() => setAns(s.ansatte + 1)} aria-label="Flere">+</button>
              </span>
              <span>personer × 37,5 t/uke = {brutto} t. {s.eff}&nbsp;% er ekte kundetid.</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-.01em", marginBottom: 4 }}>
              Hvor mye er ekte kundetid?
            </div>
            <div style={{ fontSize: 14, color: "var(--ink-3)", marginBottom: 22 }}>
              Resten går til møter, admin og avbrytelser.
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <CapSlider value={s.eff} min={10} max={80} onChange={setEff} />
              <span className="num" style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-.03em", width: 96, textAlign: "right" }}>
                {s.eff}<span style={{ fontSize: 19, color: "var(--ink-3)" }}> %</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* METERS */}
      <div
        className="card"
        style={{ padding: "40px 48px", display: "flex", flexDirection: "column", gap: 32, borderTop: `5px solid ${COLOR[st]}` }}
      >
        <CapMeter label="Salg" hint="Timer for å lande nye kunder" used={salgUsed} pot={pot} />
        <CapMeter label="Leveranse" hint="Timer for å drifte kundene dere har" used={levUsed} pot={pot} />
        <div style={{ display: "flex", alignItems: "center", gap: 16, paddingTop: 4 }}>
          <span style={{
            width: 48, height: 48, borderRadius: 14,
            background: st === "green" ? "var(--green-bg)" : COLOR[st],
            color: st === "green" ? "var(--ink)" : "#fff",
            display: "grid", placeItems: "center", flexShrink: 0,
          }}>
            {st === "green" ? <CheckIcon /> : <AlertIcon />}
          </span>
          <span style={{ fontSize: 25, fontWeight: 700, letterSpacing: "-.02em", color: st === "green" ? "var(--ink)" : COLOR_TX[st], lineHeight: 1.15 }}>
            {verdict}
          </span>
        </div>
      </div>

      {/* SIMULATOR */}
      <div className="card" style={{ padding: "38px 48px" }}>
        <div style={{ fontSize: 16, color: "var(--ink-3)", fontWeight: 600, marginBottom: 26 }}>
          Dra i tallene — se hva som sprekker først
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
          {CAP_PRODUCTS.map((pr) => (
            <div key={pr.id} style={{ display: "grid", gridTemplateColumns: "170px 1fr 1fr", gap: 32, alignItems: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.02em" }}>{pr.name}</div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 9, fontSize: 14.5, color: "var(--ink-2)" }}>
                  <span>Kunder nå</span>
                  <span className="num" style={{ fontWeight: 800, fontSize: 20 }}>{s.p[pr.id]?.a ?? 0}</span>
                </div>
                <CapSlider value={s.p[pr.id]?.a ?? 0} min={0} max={pr.maxA} onChange={(v) => setP(pr.id, "a", v)} />
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 9, fontSize: 14.5, color: "var(--ink-2)" }}>
                  <span>Nye i måneden</span>
                  <span className="num" style={{ fontWeight: 800, fontSize: 20 }}>{s.p[pr.id]?.n ?? 0}</span>
                </div>
                <CapSlider value={s.p[pr.id]?.n ?? 0} min={0} max={pr.maxN} onChange={(v) => setP(pr.id, "n", v)} color="var(--ink)" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ØKONOMI */}
      <div className="card" style={{ background: "var(--ink)", color: "#fff", padding: "42px 48px", display: "flex", flexDirection: "column", gap: 30 }}>
        <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "rgba(255,255,255,.55)" }}>
          Økonomi — slik ser tallene ut
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 36 }}>
          {[
            { label: "Omsetning / år",       value: oFmt(omsAr),        sub: Math.round(omsMndK) + "k / mnd fra kundene", accent: undefined },
            { label: "Resultat / år",         value: oFmt(resultat),     sub: resPct + " % margin",              accent: posCol(resultat) },
            { label: "Bruttolønn / ansatt",   value: oFmt(G6),           sub: "6G — fulle rettigheter",          accent: undefined },
            { label: "Utbytte / ansatt",      value: oFmt(utbyttePer),   sub: "mulig uttak / år",                accent: posCol(utbyttePer) },
          ].map((stat, i) => (
            <div key={i}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,.55)", marginBottom: 10 }}>{stat.label}</div>
              <div className="num" style={{ fontSize: 50, fontWeight: 800, letterSpacing: "-.045em", lineHeight: .9, color: stat.accent ?? "#fff" }}>
                {stat.value}
              </div>
              {stat.sub && <div style={{ fontSize: 13.5, color: "rgba(255,255,255,.5)", marginTop: 10 }}>{stat.sub}</div>}
            </div>
          ))}
        </div>
        <div style={{ height: 1, background: "rgba(255,255,255,.12)" }} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 22px", fontSize: 14.5, color: "rgba(255,255,255,.6)", alignItems: "center" }}>
          <span><b className="num" style={{ color: "#fff" }}>{s.ansatte}</b> ansatte</span>
          <span style={{ color: "rgba(255,255,255,.25)" }}>·</span>
          <span>6G lønn = <b className="num" style={{ color: "#fff" }}>820k</b> / ansatt</span>
          <span style={{ color: "rgba(255,255,255,.25)" }}>·</span>
          <span>varekost <b className="num" style={{ color: "#fff" }}>{VAREKOST_PCT}</b> %</span>
          <span style={{ marginLeft: "auto", fontWeight: 700, color: posCol(resultat) }}>= {resPct} % resultat</span>
        </div>
      </div>

    </div>
  )
}
