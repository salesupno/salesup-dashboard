"use client"

import { useState, useEffect } from "react"
import ScoreWheel from "@/components/ui/ScoreWheel"
import Icon from "@/components/ui/Icon"
import { CUSTOMERS_SEED } from "@/lib/data"
import type { Customer, HealthBand, CommercialLevel } from "@/lib/types"

const CUST_KEY = "su_customers_v2"

const TYPE_OPTIONS = ["SEO/Ads", "Utvikling", "Hosting", "Annet"] as const

const COMM_LEVELS = [
  { label: "Ikke klar",          band: "red"    as HealthBand },
  { label: "Vurderer mer",       band: "yellow" as HealthBand },
  { label: "Klar for oppgradering", band: "green" as HealthBand },
]

const bandOf = (s: number): HealthBand =>
  s >= 72 ? "green" : s >= 55 ? "yellow" : "red"

const isRetainer = (c: Customer) => c.retainer === true

const tenureTxt = (m: number) =>
  m >= 12
    ? Math.floor(m / 12) + " år" + (m % 12 ? " " + (m % 12) + " mnd" : "")
    : m + " mnd"

const daysSince = (txt: string) => {
  const m = String(txt ?? "").match(/\d+/)
  return m ? parseInt(m[0], 10) : 0
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

function CustomerCard({
  c,
  onUpdate,
  onDelete,
}: {
  c: Customer & { band: HealthBand; days: number }
  onUpdate: (id: string, patch: Partial<Customer>) => void
  onDelete: (id: string) => void
}) {
  const { band, days } = c
  const relBand: HealthBand = days > 60 ? "red" : days > 30 ? "yellow" : "green"
  const relTxt =
    days === 0 ? "Møte i dag" : days === 1 ? "Møte i går" : "Siste møte for " + days + " dager siden"

  const comm = (c.commercial === 0 || c.commercial === 1 || c.commercial === 2)
    ? c.commercial
    : (bandOf(c.score) === "green" ? 2 : bandOf(c.score) === "yellow" ? 1 : 0) as CommercialLevel

  return (
    <div
      className="card bordered"
      style={{
        padding: "26px 28px",
        display: "flex",
        flexDirection: "column",
        gap: 22,
        background: `var(--${band}-soft)`,
        border: `1.5px solid var(--${band}-dot)`,
      }}
    >
      {/* Score wheel + name */}
      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        <ScoreWheel
          score={c.score}
          onChange={(v) => onUpdate(c.id, { score: v })}
          size={100}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.025em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {c.name}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 7, flexWrap: "wrap" }}>
            <select
              className="cs-typemini"
              value={c.type}
              onChange={(e) => onUpdate(c.id, { type: e.target.value as Customer["type"] })}
            >
              {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <span style={{ fontSize: 13.5, color: "var(--ink-3)", fontWeight: 600 }}>
              {c.rev}k kr/år · {c.owner}
            </span>
          </div>
          {/* Customer email for Calendar matching */}
          <input
            className="cs-textfield"
            value={c.email ?? ""}
            onChange={(e) => onUpdate(c.id, { email: e.target.value })}
            placeholder="kontakt@kunde.no — for kalenderkobling"
            style={{ marginTop: 6, fontSize: 12.5, color: "var(--ink-3)", padding: "6px 10px" }}
          />
        </div>
        <button
          className="cs-del"
          title="Slett kunde"
          onClick={() => onDelete(c.id)}
          style={{ background: "rgba(255,255,255,.6)", alignSelf: "flex-start" }}
        >
          <Icon name="trash" size={16} />
        </button>
      </div>

      {/* Goal */}
      <div>
        <label style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--ink-3)", display: "block", marginBottom: 8 }}>
          Mål — hva vil kunden
        </label>
        <input
          className="cs-textfield"
          value={c.goal ?? ""}
          onChange={(e) => onUpdate(c.id, { goal: e.target.value })}
          placeholder="Skriv kundens mål…"
        />
      </div>

      {/* Retainer tenure */}
      {isRetainer(c) && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--ink-3)" }}>
            <span className="dot green" style={{ width: 11, height: 11 }} />På retainer
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14.5, fontWeight: 700, color: "var(--green)", whiteSpace: "nowrap" }}>
            <Icon name="clock" size={15} />{tenureTxt(c.tenure ?? 0)}
          </span>
        </div>
      )}

      {/* Relasjon (from Google Calendar) */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--ink-3)" }}>
          <span className={`dot ${relBand}`} style={{ width: 11, height: 11 }} />Relasjon
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14.5, fontWeight: 700, color: `var(--${relBand})` }}>
          <Icon name="calendar" size={15} />{relTxt}
        </span>
      </div>

      {/* Kommersiell */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--ink-3)" }}>
          <span className={`dot ${COMM_LEVELS[comm].band}`} style={{ width: 11, height: 11 }} />Kommersiell
        </span>
        <select
          className="cs-select"
          value={comm}
          onChange={(e) => onUpdate(c.id, { commercial: parseInt(e.target.value, 10) as CommercialLevel })}
          style={{ color: `var(--${COMM_LEVELS[comm].band})`, borderColor: `var(--${COMM_LEVELS[comm].band}-dot)` }}
        >
          {COMM_LEVELS.map((lv, i) => <option key={i} value={i}>{lv.label}</option>)}
        </select>
      </div>
    </div>
  )
}

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
    <div className="card bordered" style={{ padding: "22px 24px", marginBottom: 16 }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Ny kunde</div>
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.8fr", gap: 18, marginBottom: 16 }}>
        <div>
          <label style={lab}>Kundenavn</label>
          <input style={inp} value={f.name} onChange={(e) => up("name", e.target.value)} placeholder="F.eks. Fjordsol AS" autoFocus />
        </div>
        <div>
          <label style={lab}>Kontaktepost (for kalenderkobling)</label>
          <input style={inp} value={f.email} onChange={(e) => up("email", e.target.value)} placeholder="kontakt@kunde.no" type="email" />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.8fr", gap: 18, marginBottom: 16 }}>
        <div>
          <label style={lab}>Kundetype</label>
          <div style={{ display: "flex", gap: 8 }}>
            {TYPE_OPTIONS.map((t) => (
              <button
                key={t}
                onClick={() => up("type", t)}
                style={{
                  flex: 1, cursor: "pointer", fontFamily: "var(--font)",
                  border: "1.5px solid " + (f.type === t ? "var(--c-deep)" : "var(--hairline)"),
                  background: f.type === t ? "var(--green-soft)" : "var(--surface)",
                  borderRadius: 12, padding: "10px 6px", fontSize: 12.5, fontWeight: 600, color: "var(--ink)", transition: "all .15s ease",
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={lab}>Kundeforhold</label>
          <div style={{ display: "flex", gap: 8 }}>
            {([true, false] as const).map((r) => (
              <button
                key={String(r)}
                onClick={() => up("retainer", r)}
                style={{
                  flex: 1, cursor: "pointer", fontFamily: "var(--font)",
                  border: "1.5px solid " + (f.retainer === r ? "var(--c-deep)" : "var(--hairline)"),
                  background: f.retainer === r ? "var(--green-soft)" : "var(--surface)",
                  borderRadius: 12, padding: "10px 8px", fontSize: 12.5, fontWeight: 600, color: "var(--ink)",
                }}
              >
                {r ? "Retainer" : "Prosjekt"}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
        <div><label style={lab}>Oms. 2026 (k)</label><input style={inp} value={f.rev} onChange={(e) => up("rev", e.target.value.replace(/[^0-9]/g, ""))} placeholder="0" inputMode="numeric" /></div>
        <div><label style={lab}>Ansvarlig</label><input style={inp} value={f.owner} onChange={(e) => up("owner", e.target.value)} placeholder="Ina H." /></div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={lab}>Starthelse</label>
        <div style={{ display: "flex", gap: 8 }}>
          {([["green", "Frisk"], ["yellow", "Følg opp"], ["red", "I faresonen"]] as const).map(([h, l]) => (
            <button
              key={h}
              onClick={() => up("health", h)}
              style={{
                flex: 1, cursor: "pointer", fontFamily: "var(--font)",
                border: "1.5px solid " + (f.health === h ? (h === "green" ? "var(--c-deep)" : `var(--${h}-dot)`) : "var(--hairline)"),
                background: f.health === h ? `var(--${h}-soft)` : "var(--surface)",
                borderRadius: 12, padding: "10px 8px",
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
              }}
            >
              <span className={`dot ${h}`} />
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>{l}</span>
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

export default function TabKunder() {
  const [customers, setCustomers] = useState<Customer[]>(() => CUSTOMERS_SEED)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("Alle typer")
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    setCustomers(loadCustomers())
  }, [])

  useEffect(() => {
    try { localStorage.setItem(CUST_KEY, JSON.stringify(customers)) } catch {}
  }, [customers])

  // Live data: lastContact from Google Calendar, tenure from Copper CRM
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

  // Update lastContact from Google Calendar
  // Primary match: attendee email === customer email
  // Fallback: customer name's first word appears in event title
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

  // Update tenure + lastContact from Copper CRM
  useEffect(() => {
    if (!copperCustomers.length) return
    setCustomers(prev => prev.map(c => {
      const copper = copperCustomers.find(cc => cc.name.toLowerCase() === c.name.toLowerCase())
      if (!copper) return c
      return {
        ...c,
        tenure: copper.tenure > 0 ? copper.tenure : c.tenure,
        lastContact: copper.lastContact ?? c.lastContact,
      }
    }))
  }, [copperCustomers])

  const update = (id: string, patch: Partial<Customer>) =>
    setCustomers((p) => p.map((c) => (c.id === id ? { ...c, ...patch } : c)))

  const del = (id: string) => setCustomers((p) => p.filter((c) => c.id !== id))

  const add = (c: Customer) => {
    setCustomers((p) => [...p, c])
    setAdding(false)
  }

  const enriched = customers
    .map(enrich)
    .filter((c) => {
      const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase())
      const matchType = typeFilter === "Alle typer" || c.type === typeFilter
      return matchSearch && matchType
    })
    .sort((a, b) => a.score - b.score) // risky first

  const countRed    = enriched.filter((c) => c.band === "red").length
  const countYellow = enriched.filter((c) => c.band === "yellow").length
  const countAll    = enriched.length
  const avgTenure   = customers.length
    ? Math.round(customers.reduce((s, c) => s + (c.tenure ?? 0), 0) / customers.length)
    : 0

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {[
          { label: "Kunder",        value: customers.length, sub: "" },
          { label: "Snitt levetid", value: avgTenure, sub: "mnd", color: "var(--green)" },
          { label: "Må gjøres noe", value: countYellow, sub: "følg opp snart", color: countYellow > 0 ? "var(--yellow)" : undefined },
          { label: "Ikke bra",      value: countRed, sub: "trenger handling nå", color: countRed > 0 ? "var(--red)" : undefined },
        ].map((stat, i) => (
          <div key={i} className="card" style={{ padding: "20px 24px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 8 }}>
              {stat.label}
            </div>
            <div className="num" style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-.03em", color: stat.color ?? "var(--ink)", lineHeight: 1 }}>
              {stat.value}
              {stat.sub === "mnd" && <span style={{ fontSize: 20, fontWeight: 600, color: "var(--ink-3)", marginLeft: 4 }}>mnd</span>}
            </div>
            {stat.sub && stat.sub !== "mnd" && (
              <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 5 }}>{stat.sub}</div>
            )}
          </div>
        ))}
      </div>

      {/* Filters + Add */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <select
          className="cs-bigselect"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option>Alle typer · {customers.length}</option>
          {TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>{t} · {customers.filter((c) => c.type === t).length}</option>
          ))}
        </select>

        <div style={{ flex: 1 }} />

        {/* Search */}
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)", display: "flex" }}>
            <Icon name="search" size={15} />
          </span>
          <input
            className="search-input"
            placeholder="Søk kunde…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <button className="pill-btn" onClick={() => setAdding(true)}>
          <Icon name="plus" size={16} /> Ny kunde
        </button>
      </div>

      {/* Add form */}
      {adding && <AddCustomerForm onAdd={add} onCancel={() => setAdding(false)} />}

      {/* Customer grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
        {enriched.map((c) => (
          <CustomerCard key={c.id} c={c} onUpdate={update} onDelete={del} />
        ))}
      </div>

      {enriched.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--ink-3)", fontSize: 15 }}>
          Ingen kunder matcher søket.
        </div>
      )}
    </div>
  )
}
