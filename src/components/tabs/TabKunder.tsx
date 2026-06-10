"use client"

import { useState, useEffect } from "react"
import ScoreWheel from "@/components/ui/ScoreWheel"
import Icon from "@/components/ui/Icon"
import { CUSTOMERS_SEED } from "@/lib/data"
import type { Customer, HealthBand, CommercialLevel, ProjectFase } from "@/lib/types"

const CUST_KEY = "su_customers_v2"

const TYPE_OPTIONS = ["SEO/Ads", "Utvikling", "Hosting", "Annet"] as const
const FASE_OPTIONS: ProjectFase[] = ["Onboarding", "Aktiv", "Avsluttende", "Pause"]

const FASE_COLOR: Record<ProjectFase, string> = {
  Onboarding:  "var(--green)",
  Aktiv:       "var(--ink-2)",
  Avsluttende: "var(--yellow)",
  Pause:       "var(--ink-3)",
}

const COMM_LEVELS = [
  { label: "Ikke klar",             band: "red"    as HealthBand },
  { label: "Vurderer mer",          band: "yellow" as HealthBand },
  { label: "Klar for oppgradering", band: "green"  as HealthBand },
]

const bandOf = (s: number): HealthBand =>
  s >= 72 ? "green" : s >= 55 ? "yellow" : "red"

const tenureTxt = (m: number) =>
  m >= 12
    ? Math.floor(m / 12) + " år" + (m % 12 ? " " + (m % 12) + " mnd" : "")
    : m + " mnd"

const daysSince = (txt: string) => {
  const m = String(txt ?? "").match(/\d+/)
  return m ? parseInt(m[0], 10) : txt?.toLowerCase().includes("i dag") ? 0 : txt?.toLowerCase().includes("i går") ? 1 : 999
}

const enrich = (c: Customer): Customer & { band: HealthBand; days: number } => ({
  ...c,
  days: daysSince(c.lastContact),
  band: bandOf(c.score),
})

const loadCustomers = (): Customer[] => {
  try {
    const r = localStorage.getItem(CUST_KEY)
    if (r) return JSON.parse(r)
  } catch {}
  return JSON.parse(JSON.stringify(CUSTOMERS_SEED))
}

const ROW: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }
const LABEL_STYLE: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--ink-3)" }

// ── Retainer card ─────────────────────────────────────────────────────────────
function RetainerCard({ c, onUpdate, onDelete }: {
  c: Customer & { band: HealthBand; days: number }
  onUpdate: (id: string, patch: Partial<Customer>) => void
  onDelete: (id: string) => void
}) {
  const { band, days } = c
  const relBand: HealthBand = days > 60 ? "red" : days > 30 ? "yellow" : "green"
  const relTxt = days === 0 ? "Møte i dag" : days === 1 ? "Møte i går" : `${days} dager siden`
  const comm = ([0, 1, 2] as CommercialLevel[]).includes(c.commercial as CommercialLevel) ? c.commercial as CommercialLevel : 1

  return (
    <div className="card bordered" style={{
      padding: "22px 24px", display: "flex", flexDirection: "column", gap: 16,
      background: `var(--${band}-soft)`, border: `1.5px solid var(--${band}-dot)`,
    }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 18 }}>
        <ScoreWheel score={c.score} onChange={(v) => onUpdate(c.id, { score: v })} size={90} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {c.name}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5, flexWrap: "wrap" }}>
            <select className="cs-typemini" value={c.type}
              onChange={(e) => onUpdate(c.id, { type: e.target.value as Customer["type"] })}>
              {TYPE_OPTIONS.map((t) => <option key={t}>{t}</option>)}
            </select>
            <span style={{ fontSize: 13, color: "var(--ink-3)", fontWeight: 600 }}>{c.rev}k kr/år · {c.owner}</span>
          </div>
          <input className="cs-textfield" value={c.email ?? ""} placeholder="kontakt@kunde.no"
            onChange={(e) => onUpdate(c.id, { email: e.target.value })}
            style={{ marginTop: 5, fontSize: 12, color: "var(--ink-3)", padding: "5px 9px" }} />
        </div>
        <button className="cs-del" title="Slett" onClick={() => onDelete(c.id)}
          style={{ background: "rgba(255,255,255,.6)", alignSelf: "flex-start" }}>
          <Icon name="trash" size={15} />
        </button>
      </div>

      {/* Goal */}
      <input className="cs-textfield" value={c.goal ?? ""} placeholder="Kundens mål…"
        onChange={(e) => onUpdate(c.id, { goal: e.target.value })} />

      {/* Tenure — key for retainer */}
      <div style={ROW}>
        <span style={LABEL_STYLE}><span className="dot green" style={{ width: 10, height: 10 }} />På retainer</span>
        <span style={{ fontSize: 14, fontWeight: 800, color: "var(--green)", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Icon name="clock" size={14} />{tenureTxt(c.tenure ?? 0)}
        </span>
      </div>

      {/* Last contact — churn signal */}
      <div style={ROW}>
        <span style={LABEL_STYLE}><span className={`dot ${relBand}`} style={{ width: 10, height: 10 }} />Siste møte</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: `var(--${relBand})`, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Icon name="calendar" size={14} />{relTxt}
        </span>
      </div>

      {/* Commercial */}
      <div style={ROW}>
        <span style={LABEL_STYLE}><span className={`dot ${COMM_LEVELS[comm].band}`} style={{ width: 10, height: 10 }} />Kommersiell</span>
        <select className="cs-select" value={comm}
          onChange={(e) => onUpdate(c.id, { commercial: parseInt(e.target.value, 10) as CommercialLevel })}
          style={{ color: `var(--${COMM_LEVELS[comm].band})`, borderColor: `var(--${COMM_LEVELS[comm].band}-dot)` }}>
          {COMM_LEVELS.map((lv, i) => <option key={i} value={i}>{lv.label}</option>)}
        </select>
      </div>
    </div>
  )
}

// ── Prosjekt card ─────────────────────────────────────────────────────────────
function ProsjektCard({ c, onUpdate, onDelete }: {
  c: Customer & { band: HealthBand; days: number }
  onUpdate: (id: string, patch: Partial<Customer>) => void
  onDelete: (id: string) => void
}) {
  const { band, days } = c
  const relBand: HealthBand = days > 30 ? "red" : days > 14 ? "yellow" : "green"
  const relTxt = days === 0 ? "Møte i dag" : days === 1 ? "Møte i går" : `${days} dager siden`
  const fase: ProjectFase = (c.fase as ProjectFase) ?? "Aktiv"

  return (
    <div className="card bordered" style={{
      padding: "22px 24px", display: "flex", flexDirection: "column", gap: 16,
      background: `var(--${band}-soft)`, border: `1.5px solid var(--${band}-dot)`,
    }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 18 }}>
        <ScoreWheel score={c.score} onChange={(v) => onUpdate(c.id, { score: v })} size={90} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
              {c.name}
            </div>
            {/* Fase badge */}
            <select className="cs-typemini" value={fase}
              onChange={(e) => onUpdate(c.id, { fase: e.target.value as ProjectFase })}
              style={{ color: FASE_COLOR[fase], borderColor: FASE_COLOR[fase], fontWeight: 700, flexShrink: 0 }}>
              {FASE_OPTIONS.map((f) => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <select className="cs-typemini" value={c.type}
              onChange={(e) => onUpdate(c.id, { type: e.target.value as Customer["type"] })}>
              {TYPE_OPTIONS.map((t) => <option key={t}>{t}</option>)}
            </select>
            <span style={{ fontSize: 13, color: "var(--ink-3)", fontWeight: 600 }}>{c.rev}k kr/år · {c.owner}</span>
          </div>
          <input className="cs-textfield" value={c.email ?? ""} placeholder="kontakt@kunde.no"
            onChange={(e) => onUpdate(c.id, { email: e.target.value })}
            style={{ marginTop: 5, fontSize: 12, color: "var(--ink-3)", padding: "5px 9px" }} />
        </div>
        <button className="cs-del" title="Slett" onClick={() => onDelete(c.id)}
          style={{ background: "rgba(255,255,255,.6)", alignSelf: "flex-start" }}>
          <Icon name="trash" size={15} />
        </button>
      </div>

      {/* Next step — most important for projects */}
      <div>
        <label style={{ ...LABEL_STYLE, display: "block", marginBottom: 6 }}>
          Neste steg
        </label>
        <input className="cs-textfield" value={c.nextStep ?? ""} placeholder="Hva skjer videre?"
          onChange={(e) => onUpdate(c.id, { nextStep: e.target.value })} />
      </div>

      {/* Kundens mål */}
      <input className="cs-textfield" value={c.goal ?? ""} placeholder="Kundens mål…"
        onChange={(e) => onUpdate(c.id, { goal: e.target.value })} />

      {/* Last contact — follow-up signal */}
      <div style={ROW}>
        <span style={LABEL_STYLE}><span className={`dot ${relBand}`} style={{ width: 10, height: 10 }} />Siste møte</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: `var(--${relBand})`, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Icon name="calendar" size={14} />{relTxt}
        </span>
      </div>
    </div>
  )
}

// ── Add form ──────────────────────────────────────────────────────────────────
function AddCustomerForm({ onAdd, onCancel }: { onAdd: (c: Customer) => void; onCancel: () => void }) {
  const [f, setF] = useState({ name: "", email: "", type: "SEO/Ads" as Customer["type"], rev: "", owner: "", health: "green" as HealthBand, retainer: true })
  const up = <K extends keyof typeof f>(k: K, v: typeof f[K]) => setF((p) => ({ ...p, [k]: v }))
  const inp: React.CSSProperties = { fontFamily: "var(--font)", fontSize: 14, padding: "11px 14px", borderRadius: 12, border: "1px solid var(--hairline)", background: "var(--surface)", color: "var(--ink)", outline: "none", width: "100%" }
  const lab: React.CSSProperties = { fontSize: 12, color: "var(--ink-3)", fontWeight: 600, marginBottom: 7, display: "block" }

  const submit = () => {
    if (!f.name.trim()) return
    const score = f.health === "green" ? 85 : f.health === "yellow" ? 63 : 45
    const commercial: CommercialLevel = f.health === "green" ? 2 : f.health === "yellow" ? 1 : 0
    onAdd({
      id: "k" + Date.now(),
      name: f.name.trim(),
      email: f.email.trim() || undefined,
      type: f.type,
      market: "NO",
      rev: Number(f.rev) || 0,
      margin: 0,
      owner: f.owner.trim() || "—",
      tenure: 0,
      lastContact: "i dag",
      score,
      commercial,
      goal: "",
      retainer: f.retainer,
      fase: f.retainer ? undefined : "Onboarding",
    })
  }

  return (
    <div className="card bordered" style={{ padding: "22px 24px", marginBottom: 4 }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Ny kunde</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div><label style={lab}>Kundenavn</label><input style={inp} value={f.name} onChange={(e) => up("name", e.target.value)} placeholder="F.eks. Fjordsol AS" autoFocus /></div>
        <div><label style={lab}>Kontaktepost</label><input style={inp} value={f.email} onChange={(e) => up("email", e.target.value)} placeholder="kontakt@kunde.no" type="email" /></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div><label style={lab}>Oms. 2026 (k)</label><input style={inp} value={f.rev} onChange={(e) => up("rev", e.target.value.replace(/[^0-9]/g, ""))} placeholder="0" inputMode="numeric" /></div>
        <div><label style={lab}>Ansvarlig</label><input style={inp} value={f.owner} onChange={(e) => up("owner", e.target.value)} placeholder="Ina H." /></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div>
          <label style={lab}>Kundetype</label>
          <div style={{ display: "flex", gap: 6 }}>
            {TYPE_OPTIONS.map((t) => (
              <button key={t} onClick={() => up("type", t)} style={{ flex: 1, cursor: "pointer", fontFamily: "var(--font)", border: "1.5px solid " + (f.type === t ? "var(--c-deep)" : "var(--hairline)"), background: f.type === t ? "var(--green-soft)" : "var(--surface)", borderRadius: 10, padding: "9px 4px", fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{t}</button>
            ))}
          </div>
        </div>
        <div>
          <label style={lab}>Kundeforhold</label>
          <div style={{ display: "flex", gap: 6 }}>
            {([true, false] as const).map((r) => (
              <button key={String(r)} onClick={() => up("retainer", r)} style={{ flex: 1, cursor: "pointer", fontFamily: "var(--font)", border: "1.5px solid " + (f.retainer === r ? "var(--c-deep)" : "var(--hairline)"), background: f.retainer === r ? "var(--green-soft)" : "var(--surface)", borderRadius: 10, padding: "9px 4px", fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>
                {r ? "Retainer" : "Prosjekt"}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ marginBottom: 18 }}>
        <label style={lab}>Starthelse</label>
        <div style={{ display: "flex", gap: 8 }}>
          {([["green", "Frisk"], ["yellow", "Følg opp"], ["red", "I faresonen"]] as const).map(([h, l]) => (
            <button key={h} onClick={() => up("health", h)} style={{ flex: 1, cursor: "pointer", fontFamily: "var(--font)", border: "1.5px solid " + (f.health === h ? (h === "green" ? "var(--c-deep)" : `var(--${h}-dot)`) : "var(--hairline)"), background: f.health === h ? `var(--${h}-soft)` : "var(--surface)", borderRadius: 10, padding: "9px 8px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
              <span className={`dot ${h}`} /><span style={{ fontSize: 12.5, fontWeight: 600 }}>{l}</span>
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button className="pill-btn ghost" onClick={onCancel} style={{ padding: "10px 18px", fontSize: 13 }}>Avbryt</button>
        <button className="pill-btn" onClick={submit} style={{ padding: "10px 20px", fontSize: 13 }}>Legg til</button>
      </div>
    </div>
  )
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ title, count, redCount, yellowCount, sub }: { title: string; count: number; redCount: number; yellowCount: number; sub: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 2 }}>
      <h2 style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-.02em", margin: 0 }}>{title}</h2>
      <span style={{ fontSize: 13, color: "var(--ink-3)", fontWeight: 600 }}>{count} kunder · {sub}</span>
      {redCount > 0 && (
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--red)", background: "var(--red-soft)", border: "1px solid var(--red-dot)", borderRadius: 20, padding: "2px 10px" }}>
          {redCount} i faresonen
        </span>
      )}
      {yellowCount > 0 && (
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--yellow)", background: "var(--yellow-soft)", border: "1px solid var(--yellow-dot)", borderRadius: 20, padding: "2px 10px" }}>
          {yellowCount} følg opp
        </span>
      )}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function TabKunder() {
  const [customers, setCustomers] = useState<Customer[]>(() => CUSTOMERS_SEED)
  const [search, setSearch] = useState("")
  const [adding, setAdding] = useState(false)

  useEffect(() => { setCustomers(loadCustomers()) }, [])
  useEffect(() => {
    try { localStorage.setItem(CUST_KEY, JSON.stringify(customers)) } catch {}
  }, [customers])

  // Live data
  const [calendarEvents, setCalendarEvents] = useState<Array<{ summary: string; date: string; attendeeEmails: string[] }>>([])
  const [copperCustomers, setCopperCustomers] = useState<Array<{ id: string; name: string; tenure: number; lastContact: string | null }>>([])

  useEffect(() => {
    fetch("/api/calendar/meetings")
      .then(r => r.json())
      .then(d => { if (d.allEvents?.length) setCalendarEvents(d.allEvents) })
      .catch(() => {})
    fetch("/api/copper/pipeline")
      .then(r => r.json())
      .then(d => { if (d.customers?.length) setCopperCustomers(d.customers) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!calendarEvents.length) return
    setCustomers(prev => prev.map(c => {
      const custEmail = c.email?.toLowerCase()
      const nameWord = c.name.toLowerCase().split(" ")[0]
      const matches = calendarEvents.filter(e =>
        (custEmail && e.attendeeEmails.includes(custEmail)) ||
        (!custEmail && e.summary.includes(nameWord))
      )
      if (!matches.length) return c
      const latest = matches.reduce((a, b) => a.date > b.date ? a : b)
      if (!latest.date) return c
      const days = Math.round((Date.now() - new Date(latest.date).getTime()) / 86400000)
      const lastContact = days === 0 ? "Møte i dag" : days === 1 ? "Møte i går" : `${days} dager siden`
      return { ...c, lastContact }
    }))
  }, [calendarEvents])

  useEffect(() => {
    if (!copperCustomers.length) return
    setCustomers(prev => prev.map(c => {
      const copper = copperCustomers.find(cc => cc.name.toLowerCase() === c.name.toLowerCase())
      if (!copper) return c
      return { ...c, tenure: copper.tenure > 0 ? copper.tenure : c.tenure, lastContact: copper.lastContact ?? c.lastContact }
    }))
  }, [copperCustomers])

  const update = (id: string, patch: Partial<Customer>) =>
    setCustomers((p) => p.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  const del = (id: string) => setCustomers((p) => p.filter((c) => c.id !== id))
  const add = (c: Customer) => { setCustomers((p) => [...p, c]); setAdding(false) }

  const filtered = customers
    .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()))
    .map(enrich)

  const retainere = filtered.filter(c => c.retainer).sort((a, b) => a.score - b.score)
  const prosjekter = filtered.filter(c => !c.retainer).sort((a, b) => a.score - b.score)

  const rRed = retainere.filter(c => c.band === "red").length
  const rYellow = retainere.filter(c => c.band === "yellow").length
  const pRed = prosjekter.filter(c => c.band === "red").length
  const pYellow = prosjekter.filter(c => c.band === "yellow").length

  const retainerMRR = customers.filter(c => c.retainer).reduce((s, c) => s + (c.rev ?? 0), 0)
  const avgTenure = retainere.length
    ? Math.round(retainere.reduce((s, c) => s + (c.tenure ?? 0), 0) / retainere.length)
    : 0

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {[
          { label: "Retainere",      value: retainere.length, sub: "" },
          { label: "Retainer MRR",   value: retainerMRR,      sub: "k kr/år",    color: "var(--green)" },
          { label: "Snitt levetid",  value: avgTenure,        sub: "mnd retainer", color: "var(--green)" },
          { label: "Prosjekter",     value: prosjekter.length, sub: "aktive" },
        ].map((stat, i) => (
          <div key={i} className="card" style={{ padding: "20px 24px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 8 }}>{stat.label}</div>
            <div className="num" style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-.03em", color: stat.color ?? "var(--ink)", lineHeight: 1 }}>
              {stat.value}
            </div>
            {stat.sub && <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>{stat.sub}</div>}
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)", display: "flex" }}>
            <Icon name="search" size={15} />
          </span>
          <input className="search-input" placeholder="Søk kunde…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div style={{ flex: 1 }} />
        <button className="pill-btn" onClick={() => setAdding(true)}><Icon name="plus" size={16} /> Ny kunde</button>
      </div>

      {adding && <AddCustomerForm onAdd={add} onCancel={() => setAdding(false)} />}

      {/* ── Retainere ── */}
      <div>
        <SectionHeader
          title="Retainere"
          count={retainere.length}
          redCount={rRed}
          yellowCount={rYellow}
          sub="løpende abonnement — ikke mist disse"
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14, marginTop: 14 }}>
          {retainere.map(c => <RetainerCard key={c.id} c={c} onUpdate={update} onDelete={del} />)}
        </div>
        {retainere.length === 0 && (
          <div style={{ color: "var(--ink-3)", fontSize: 14, padding: "20px 0" }}>Ingen retainere matcher søket.</div>
        )}
      </div>

      {/* ── Prosjekter ── */}
      <div style={{ marginTop: 8 }}>
        <SectionHeader
          title="Prosjekter"
          count={prosjekter.length}
          redCount={pRed}
          yellowCount={pYellow}
          sub="kortidsprosjekter — status og neste steg"
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14, marginTop: 14 }}>
          {prosjekter.map(c => <ProsjektCard key={c.id} c={c} onUpdate={update} onDelete={del} />)}
        </div>
        {prosjekter.length === 0 && (
          <div style={{ color: "var(--ink-3)", fontSize: 14, padding: "20px 0" }}>Ingen prosjekter matcher søket.</div>
        )}
      </div>

    </div>
  )
}

