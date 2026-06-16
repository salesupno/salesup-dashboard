"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import Icon from "@/components/ui/Icon"
import { CUSTOMERS_SEED } from "@/lib/data"
import type { Customer, HealthBand } from "@/lib/types"

// Bump key when the data model changes so stale localStorage can't override new fields.
const CUST_KEY = "su_customers_v3"

const TYPE_OPTIONS = ["SEO/Ads", "Hosting", "Utvikling", "Annet"] as const
// "Utvikling" surfaces as "Prosjekt" in the UI.
const TYPE_LABEL: Record<Customer["type"], string> = {
  "SEO/Ads": "SEO / Ads",
  "Hosting": "Hosting",
  "Utvikling": "Prosjekt",
  "Annet": "Annet",
}
const TYPE_TONE: Record<Customer["type"], { bg: string; fg: string }> = {
  "SEO/Ads":   { bg: "var(--green-soft)", fg: "var(--green)" },
  "Hosting":   { bg: "var(--cream)",      fg: "var(--ink-2)" },
  "Utvikling": { bg: "#E6EEF6",           fg: "#3A6491" },
  "Annet":     { bg: "var(--hairline-2)", fg: "var(--ink-2)" },
}

// Status levels for Hosting / Utvikling / Annet (non-retainers).
const PROJECT_STATUS: { label: string; band: HealthBand }[] = [
  { label: "Trenger oppfølging", band: "red" },    // 0
  { label: "Under arbeid",       band: "yellow" }, // 1
  { label: "Levert & fornøyd",   band: "green" },  // 2
  { label: "Klar for mersalg",   band: "green" },  // 3
]

// Score label shown beside the chip for retainers.
const SCORE_TX: Record<HealthBand, string> = {
  green:  "Frisk",
  yellow: "Følg opp",
  red:    "Trenger oppfølging",
}

// Edit fargeterskler her.
const bandOf = (s: number): HealthBand => (s >= 72 ? "green" : s >= 55 ? "yellow" : "red")
const scoreToIdx = (s: number) => (s >= 72 ? 2 : s >= 55 ? 1 : 0)
const healthToIdx = (h?: HealthBand) => (h === "green" ? 2 : h === "yellow" ? 1 : h === "red" ? 0 : -1)

// Dette avgjør om en kunde får score eller status.
const isRetainer = (c: Customer) => c.type === "SEO/Ads"

// Auto-utled e-postdomene fra navnet når kunden mangler et eksplisitt felt.
const emailSlug = (name: string) =>
  name.toLowerCase()
    .replace(/æ/g, "ae").replace(/ø/g, "o").replace(/å/g, "a")
    .replace(/[^a-z0-9]/g, "") + ".no"

// Normaliser det brukeren skriver i e-postfeltet til et rent domene:
// godta "@domene.no", "post@domene.no", "mailto:…", store bokstaver, mellomrom.
const domainOf = (raw: string): string => {
  let s = String(raw ?? "").trim().toLowerCase().replace(/^mailto:/, "")
  if (s.includes("@")) s = s.split("@").pop() ?? ""
  return s.replace(/^@+/, "").trim()
}

const daysSince = (txt: string) => {
  const s = String(txt ?? "").toLowerCase()
  if (s.includes("i dag")) return 0
  if (s.includes("i går")) return 1
  const m = s.match(/\d+/)
  return m ? parseInt(m[0], 10) : 999
}

type CalEvent = { summary: string; date: string; attendeeEmails: string[] }

const customerDomains = (c: Customer): string[] => {
  const primary = domainOf(typeof c.email === "string" && c.email ? c.email : emailSlug(c.name))
  const secondary = domainOf(c.altEmail ?? "")
  return Array.from(new Set([primary, secondary].filter(Boolean))).slice(0, 2)
}

// Match one customer against calendar events → "Møte i dag/går" / "N dager siden", or null.
// Matches if a domain attendee is present, or the customer name / domain base word
// appears in the event title — so it works even when the email is only in the title.
const scanLastMeeting = (c: Customer, events: CalEvent[]): string | null => {
  const domains = customerDomains(c)
  const domainBases = domains.map((d) => d.split(".")[0]).filter((d) => d.length > 2)
  const titleNeedles = Array.from(new Set([
    ...domainBases.map((d) => canon(d)),
    canon(c.name),
    canon(c.name.toLowerCase().split(" ")[0]),
  ].filter((k) => k.length > 2)))
  const matches = events.filter((e) => {
    const byEmail = domains.some((d) =>
      e.attendeeEmails.some((a) => a.toLowerCase().endsWith("@" + d))
    )
    if (byEmail) return true
    const summaryCanon = canon(e.summary)
    if (titleNeedles.some((k) => summaryCanon.includes(k))) return true
    return false
  })
  if (!matches.length) return null
  const latest = matches.reduce((a, b) => (a.date > b.date ? a : b))
  if (!latest.date) return null
  const days = Math.round((Date.now() - new Date(latest.date).getTime()) / 86400000)
  return days === 0 ? "Møte i dag" : days === 1 ? "Møte i går" : `${days} dager siden`
}

const kFmt = (k: number) => Math.round(k).toLocaleString("nb-NO")

// Canonicalize Norwegian text for fuzzy meeting-title matching:
// lowercase, æ→ae ø→o å→aa, strip non-alphanumerics, collapse repeated letters.
// Lets domain "vaardal" match a calendar title containing "Vårdal".
const canon = (s: string) =>
  s.toLowerCase()
    .replace(/æ/g, "ae").replace(/ø/g, "o").replace(/å/g, "aa")
    .replace(/[^a-z0-9]/g, "")
    .replace(/(.)\1+/g, "$1")

// Fields that are filled automatically from external feeds. Editing one of these
// "locks" it so the automatic feed won't overwrite the manual value on reload.
const AUTO_FIELDS = new Set(["rev", "lastContact", "tenure", "email", "altEmail"])

// ── Tripletex revenue matching (shared by auto-merge + "reset to auto") ───────
const TX_SUFFIX = new Set(["as", "asa", "ab", "ans", "da", "sa", "oyj", "aps", "gmbh", "inc", "llc", "ltd", "nuf"])
const txNorm = (s: string) =>
  s.toLowerCase().split(/[^a-z0-9æøå]+/i).filter((w) => w && !TX_SUFFIX.has(w)).join("")
// Display name in dashboard → actual Tripletex customer name (for mismatches).
const TX_ALIAS: Record<string, string> = {
  "Ditt Uterom": "Uteromsgruppen AS",
}
const txPrefix = (a: string, b: string) =>
  a.length > 2 && b.length > 2 && (a === b || a.startsWith(b) || b.startsWith(a))

type TripletexCustomer = { id: string; name: string; rev: number; domain?: string }

const findTripletexMatch = (
  name: string,
  tx: TripletexCustomer[]
): TripletexCustomer | null => {
  const cn = txNorm(TX_ALIAS[name] ?? name)
  // Prefer an exact normalized match before falling back to a prefix match.
  return (
    tx.find((t) => txNorm(t.name) === cn) ?? tx.find((t) => txPrefix(txNorm(t.name), cn)) ?? null
  )
}

type EnrichedCustomer = Customer & {
  days: number
  band: HealthBand
  retainer: boolean
  pstatus: number
  email: string
  altEmail?: string
}

const enrich = (c: Customer): EnrichedCustomer => {
  const days = daysSince(c.lastContact)
  const score = typeof c.score === "number" ? c.score : 60
  const email = typeof c.email === "string" ? c.email : emailSlug(c.name)
  const altEmail = typeof c.altEmail === "string" ? c.altEmail : undefined
  const retainer = isRetainer(c)
  const fromHealth = healthToIdx(c.band)
  const pstatus = c.pstatus !== undefined && c.pstatus >= 0 && c.pstatus <= 3
    ? c.pstatus
    : fromHealth >= 0 ? fromHealth : scoreToIdx(score)
  const band: HealthBand = retainer ? bandOf(score) : PROJECT_STATUS[pstatus].band
  return { ...c, days, score, email, altEmail, retainer, pstatus, band }
}

const loadCustomers = (): Customer[] => {
  try {
    const r = localStorage.getItem(CUST_KEY)
    if (r) return JSON.parse(r)
  } catch {}
  return JSON.parse(JSON.stringify(CUSTOMERS_SEED))
}

// ── Segments ────────────────────────────────────────────────────────────────
const SEGMENTS: { key: string; label: string; match: (c: Customer) => boolean }[] = [
  { key: "all",       label: "Alle kunder", match: () => true },
  { key: "SEO/Ads",   label: "SEO / Ads",   match: (c) => c.type === "SEO/Ads" },
  { key: "Hosting",   label: "Hosting",     match: (c) => c.type === "Hosting" },
  { key: "Utvikling", label: "Prosjekt",    match: (c) => c.type === "Utvikling" },
]

// ── Sorting (frozen) ──────────────────────────────────────────────────────────
const SORTS: [string, string][] = [
  ["attention",  "Trenger oppfølging først"],
  ["score-desc", "Score høy → lav"],
  ["score-asc",  "Score lav → høy"],
  ["value-desc", "Verdi høy → lav"],
  ["name",       "Navn A→Å"],
]
const BAND_RANK: Record<HealthBand, number> = { red: 0, yellow: 1, green: 2 }

const sortIds = (data: EnrichedCustomer[], by: string): string[] => {
  const arr = [...data]
  switch (by) {
    case "attention":
      arr.sort((a, b) => BAND_RANK[a.band] - BAND_RANK[b.band] || a.score - b.score)
      break
    case "score-desc": arr.sort((a, b) => b.score - a.score); break
    case "score-asc":  arr.sort((a, b) => a.score - b.score); break
    case "value-desc": arr.sort((a, b) => b.rev - a.rev); break
    case "name":       arr.sort((a, b) => a.name.localeCompare(b.name, "nb")); break
  }
  return arr.map((c) => c.id)
}

// ── Score scrubber ──────────────────────────────────────────────────────────
function ScoreScrubber({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")
  const drag = useRef({ y: 0, v: value, moved: false })
  const band = bandOf(value)
  const chipStyle: React.CSSProperties = {
    background: `var(--${band}-soft)`,
    borderColor: `var(--${band}-dot)`,
    color: `var(--${band})`,
  }

  const down = (e: React.PointerEvent) => {
    e.preventDefault()
    drag.current = { y: e.clientY, v: value, moved: false }
    const mv = (ev: PointerEvent) => {
      const dy = drag.current.y - ev.clientY
      if (Math.abs(dy) > 2) drag.current.moved = true
      const nv = Math.max(0, Math.min(100, Math.round(drag.current.v + dy / 2)))
      onChange(nv)
    }
    const up = () => {
      window.removeEventListener("pointermove", mv)
      window.removeEventListener("pointerup", up)
      if (!drag.current.moved) {
        setDraft(String(drag.current.v))
        setEditing(true)
      }
    }
    window.addEventListener("pointermove", mv)
    window.addEventListener("pointerup", up)
  }

  const commit = () => {
    const n = parseInt(draft, 10)
    if (!Number.isNaN(n)) onChange(Math.max(0, Math.min(100, n)))
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        className="score-chip"
        style={chipStyle}
        autoFocus
        value={draft}
        inputMode="numeric"
        onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit()
          if (e.key === "Escape") setEditing(false)
        }}
      />
    )
  }

  return (
    <div
      className="score-chip scrub num"
      style={chipStyle}
      onPointerDown={down}
      title="Dra opp/ned for å endre · klikk for å taste inn"
    >
      {value}
    </div>
  )
}

// ── Siste møte (med skann-knapp) ─────────────────────────────────────────────
function SisteMote({ c, onScan }: {
  c: EnrichedCustomer
  onScan: (c: EnrichedCustomer) => Promise<"updated" | "none" | { kind: "no_token" | "forbidden" | "error"; detail?: string }>
}) {
  const [scanning, setScanning] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const relBand = c.days > 60 ? "red" : c.days > 30 ? "yellow" : "green"
  const relTxt = c.days === 0 ? "Møte i dag" : c.days === 1 ? "Møte i går" : `${c.days} dager siden`

  if (!c.email && !c.altEmail) {
    return <span style={{ fontSize: 13.5, color: "var(--ink-3)" }}>Koble e-post</span>
  }

  const scan = async () => {
    setScanning(true)
    setNotFound(false)
    setStatusMsg(null)
    const res = await onScan(c)
    setScanning(false)
    if (typeof res === "object") {
      if (res.kind === "no_token") {
        setStatusMsg(res.detail ? `Google-innlogging mangler (${res.detail})` : "Logg inn med Google på nytt")
        return
      }
      if (res.kind === "forbidden") {
        setStatusMsg(res.detail ? `Mangler Calendar-tilgang (${res.detail})` : "Mangler Calendar-tilgang")
        return
      }
      setStatusMsg(res.detail ? `Kalenderfeil (${res.detail})` : "Kalenderfeil")
      return
    }
    if (res === "none") {
      setNotFound(true)
      setTimeout(() => setNotFound(false), 2600)
    }
  }

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13.5, fontWeight: 600, color: (notFound || statusMsg) ? "var(--ink-3)" : `var(--${relBand})`, minWidth: 92 }}>
        {scanning ? "Skanner…" : statusMsg ? statusMsg : notFound ? "Ingen møte funnet" : (<><span className={`dot ${relBand}`} />{relTxt}</>)}
      </span>
      <button
        className="scan-btn"
        onClick={scan}
        disabled={scanning}
        title="Skann Google Kalender for siste møte"
        aria-label="Skann siste møte"
      >
        <Icon name="refresh" size={13} style={scanning ? { animation: "su-spin .8s linear infinite" } : undefined} />
      </button>
    </div>
  )
}

// ── Verdi (redigerbar, med auto/manuell-balanse) ─────────────────────────────
function VerdiCell({ c, onUpdate, onReset }: {
  c: EnrichedCustomer
  onUpdate: (id: string, patch: Partial<Customer>) => void
  onReset: (id: string, field: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")
  const locked = c.locked?.includes("rev") ?? false

  const commit = () => {
    const n = parseInt(draft || "0", 10)
    onUpdate(c.id, { rev: Number.isNaN(n) ? 0 : n })
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        className="rev-edit num"
        autoFocus
        value={draft}
        inputMode="numeric"
        onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, "").slice(0, 7))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit()
          if (e.key === "Escape") setEditing(false)
        }}
      />
    )
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
      {locked && (
        <button
          className="rev-reset"
          title="Tilbakestill til Tripletex-tall"
          aria-label="Tilbakestill til automatisk"
          onClick={() => onReset(c.id, "rev")}
        >
          <Icon name="refresh" size={12} />
        </button>
      )}
      <button
        className={`rev-val num${locked ? " manual" : ""}`}
        title={locked ? "Manuelt satt · klikk for å endre" : "Fra Tripletex · klikk for å overstyre"}
        onClick={() => { setDraft(String(c.rev)); setEditing(true) }}
      >
        {kFmt(c.rev)}k <span style={{ color: "var(--ink-3)", fontWeight: 600 }}>/år</span>
      </button>
    </span>
  )
}

// ── Slett med bekreftelse (to-trinns) ────────────────────────────────────────
function DeleteButton({ onDelete }: { onDelete: () => void }) {
  const [confirm, setConfirm] = useState(false)

  useEffect(() => {
    if (!confirm) return
    const t = setTimeout(() => setConfirm(false), 3000)
    return () => clearTimeout(t)
  }, [confirm])

  if (confirm) {
    return (
      <div style={{ display: "inline-flex", gap: 5 }}>
        <button className="cs-del confirm" title="Bekreft sletting" onClick={onDelete}>
          <Icon name="check" size={15} />
        </button>
        <button className="cs-del" title="Avbryt" onClick={() => setConfirm(false)}>
          <Icon name="x" size={15} />
        </button>
      </div>
    )
  }

  return (
    <button className="cs-del" title="Slett kunde" onClick={() => setConfirm(true)}>
      <Icon name="trash" size={15} />
    </button>
  )
}

// ── Row ─────────────────────────────────────────────────────────────────────
function Row({ c, onUpdate, onDelete, onScan, onReset }: {
  c: EnrichedCustomer
  onUpdate: (id: string, patch: Partial<Customer>) => void
  onDelete: (id: string) => void
  onScan: (c: EnrichedCustomer) => Promise<"updated" | "none" | { kind: "no_token" | "forbidden" | "error"; detail?: string }>
  onReset: (id: string, field: string) => void
}) {
  const tone = TYPE_TONE[c.type]

  return (
    <tr>
      {/* Kunde */}
      <td className="cust" style={{ borderLeftColor: `var(--${c.band}-dot)` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
          <span className="cav" style={{ background: tone.bg, color: tone.fg }}>
            {c.name.charAt(0).toUpperCase()}
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.01em", color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {c.name}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Icon name="mail" size={13} style={{ color: "var(--ink-3)", flexShrink: 0 }} />
                <span className="mail-at">@</span>
                <input
                  className="mail-edit"
                  value={c.email}
                  placeholder="domene.no"
                  title="Primærdomene for møteskann"
                  onChange={(e) => onUpdate(c.id, { email: domainOf(e.target.value) })}
                />
              </div>

              {c.altEmail !== undefined ? (
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: 18 }}>
                  <span className="mail-at">@</span>
                  <input
                    className="mail-edit"
                    value={c.altEmail ?? ""}
                    placeholder="ekstra domene"
                    title="Ekstra domene for møteskann (maks 2 domener totalt)"
                    onChange={(e) => onUpdate(c.id, { altEmail: domainOf(e.target.value) })}
                  />
                  <button
                    type="button"
                    className="cs-del"
                    style={{ width: 22, height: 22, borderRadius: 7 }}
                    title="Fjern ekstra domene"
                    onClick={() => onUpdate(c.id, { altEmail: undefined })}
                  >
                    <Icon name="x" size={12} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onUpdate(c.id, { altEmail: "" })}
                  style={{
                    alignSelf: "flex-start",
                    marginLeft: 18,
                    fontFamily: "var(--font)",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--ink-3)",
                    background: "transparent",
                    border: "1px dashed var(--hairline)",
                    borderRadius: 7,
                    padding: "2px 8px",
                    cursor: "pointer",
                  }}
                  title="Legg til ekstra domene for møteskann"
                >
                  + Ekstra domene
                </button>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* Type */}
      <td>
        <select
          className="cs-typemini"
          value={c.type}
          title="Flytt kunde til annen type"
          onChange={(e) => onUpdate(c.id, { type: e.target.value as Customer["type"] })}
        >
          {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
        </select>
      </td>

      {/* Helse / Status */}
      <td>
        {c.retainer ? (
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <ScoreScrubber value={c.score} onChange={(v) => onUpdate(c.id, { score: v })} />
            <span style={{ fontSize: 13.5, fontWeight: 700, color: `var(--${c.band})` }}>
              {SCORE_TX[c.band]}
            </span>
          </div>
        ) : (
          <select
            className="cs-select"
            value={c.pstatus}
            onChange={(e) => onUpdate(c.id, { pstatus: parseInt(e.target.value, 10) })}
            style={{
              color: `var(--${c.band})`,
              borderColor: `var(--${c.band}-dot)`,
              background: `var(--${c.band}-soft)`,
            }}
          >
            {PROJECT_STATUS.map((s, i) => <option key={i} value={i}>{s.label}</option>)}
          </select>
        )}
      </td>

      {/* Siste møte */}
      <td>
        <SisteMote c={c} onScan={onScan} />
      </td>

      {/* Mål */}
      <td>
        <input
          className="goal-edit"
          value={c.goal ?? ""}
          placeholder="Skriv kundens mål…"
          onChange={(e) => onUpdate(c.id, { goal: e.target.value })}
        />
      </td>

      {/* Verdi */}
      <td className="num-col">
        <VerdiCell c={c} onUpdate={onUpdate} onReset={onReset} />
      </td>

      {/* Slett */}
      <td style={{ width: 1 }}>
        <DeleteButton onDelete={() => onDelete(c.id)} />
      </td>
    </tr>
  )
}

// ── Add form ──────────────────────────────────────────────────────────────────
function AddCustomerForm({ onAdd, onCancel }: { onAdd: (c: Customer) => void; onCancel: () => void }) {
  const [f, setF] = useState({ name: "", email: "", type: "SEO/Ads" as Customer["type"], rev: "", owner: "", health: "green" as HealthBand })
  const up = <K extends keyof typeof f>(k: K, v: typeof f[K]) => setF((p) => ({ ...p, [k]: v }))
  const inp: React.CSSProperties = { fontFamily: "var(--font)", fontSize: 14, padding: "11px 14px", borderRadius: 12, border: "1px solid var(--hairline)", background: "var(--surface)", color: "var(--ink)", outline: "none", width: "100%" }
  const lab: React.CSSProperties = { fontSize: 12, color: "var(--ink-3)", fontWeight: 600, marginBottom: 7, display: "block" }

  const submit = () => {
    if (!f.name.trim()) return
    const retainer = f.type === "SEO/Ads"
    const score = f.health === "green" ? 85 : f.health === "yellow" ? 63 : 45
    const pstatus = healthToIdx(f.health)
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
      pstatus,
      commercial: pstatus === 2 ? 2 : pstatus === 1 ? 1 : 0,
      goal: "",
      retainer,
    })
  }

  return (
    <div className="card bordered" style={{ padding: "22px 24px", marginBottom: 4 }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Ny kunde</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div><label style={lab}>Kundenavn</label><input style={inp} value={f.name} onChange={(e) => up("name", e.target.value)} placeholder="F.eks. Fjordsol AS" autoFocus /></div>
        <div><label style={lab}>E-postdomene</label><input style={inp} value={f.email} onChange={(e) => up("email", e.target.value)} placeholder="kunde.no" /></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div><label style={lab}>Oms. 2026 (k)</label><input style={inp} value={f.rev} onChange={(e) => up("rev", e.target.value.replace(/[^0-9]/g, ""))} placeholder="0" inputMode="numeric" /></div>
        <div><label style={lab}>Ansvarlig</label><input style={inp} value={f.owner} onChange={(e) => up("owner", e.target.value)} placeholder="Ina H." /></div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={lab}>Kundetype</label>
        <div style={{ display: "flex", gap: 6 }}>
          {TYPE_OPTIONS.map((t) => (
            <button key={t} onClick={() => up("type", t)} style={{ flex: 1, cursor: "pointer", fontFamily: "var(--font)", border: "1.5px solid " + (f.type === t ? "var(--c-deep)" : "var(--hairline)"), background: f.type === t ? "var(--green-soft)" : "var(--surface)", borderRadius: 10, padding: "9px 4px", fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{TYPE_LABEL[t]}</button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 18 }}>
        <label style={lab}>{f.type === "SEO/Ads" ? "Starthelse (score)" : "Startstatus"}</label>
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
        <button className="pill-btn" onClick={submit} style={{ padding: "10px 20px", fontSize: 13, opacity: f.name.trim() ? 1 : 0.5 }}><Icon name="plus" size={15} /> Legg til kunde</button>
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function TabKunder() {
  const [list, setList] = useState<Customer[]>(() => CUSTOMERS_SEED)
  const [seg, setSeg] = useState("all")
  const [q, setQ] = useState("")
  const [adding, setAdding] = useState(false)
  const [sortBy, setSortBy] = useState("attention")
  const [savedFlash, setSavedFlash] = useState(false)

  useEffect(() => { setList(loadCustomers()) }, [])
  // Auto-save: every change is persisted to localStorage so it survives re-login.
  useEffect(() => { try { localStorage.setItem(CUST_KEY, JSON.stringify(list)) } catch {} }, [list])

  // Explicit save — gives clear feedback that everything is stored.
  const saveNow = () => {
    try { localStorage.setItem(CUST_KEY, JSON.stringify(list)) } catch {}
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1800)
  }

  // Live feeds — Google Calendar drives "dager siden sist møte"; Copper drives tenure.
  const [calendarEvents, setCalendarEvents] = useState<CalEvent[]>([])
  const [copperCustomers, setCopperCustomers] = useState<Array<{ id: string; name: string; tenure: number; lastContact: string | null }>>([])
  // Tripletex drives real per-customer revenue ("rev").
  const [tripletexCustomers, setTripletexCustomers] = useState<TripletexCustomer[]>([])

  useEffect(() => {
    fetch("/api/calendar/meetings")
      .then((r) => r.json())
      .then((d) => { if (d.allEvents?.length) setCalendarEvents(d.allEvents) })
      .catch(() => {})
    fetch("/api/copper/pipeline")
      .then((r) => r.json())
      .then((d) => { if (d.customers?.length) setCopperCustomers(d.customers) })
      .catch(() => {})
    fetch("/api/tripletex/customers")
      .then((r) => r.json())
      .then((d) => { if (d.customers?.length) setTripletexCustomers(d.customers) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!calendarEvents.length) return
    setList((prev) => prev.map((c) => {
      if (c.locked?.includes("lastContact")) return c
      const lastContact = scanLastMeeting(c, calendarEvents)
      return lastContact ? { ...c, lastContact } : c
    }))
  }, [calendarEvents])

  useEffect(() => {
    if (!copperCustomers.length) return
    setList((prev) => prev.map((c) => {
      const copper = copperCustomers.find((cc) => cc.name.toLowerCase() === c.name.toLowerCase())
      if (!copper) return c
      const tenure = c.locked?.includes("tenure") || copper.tenure <= 0 ? c.tenure : copper.tenure
      const lastContact = c.locked?.includes("lastContact") ? c.lastContact : (copper.lastContact ?? c.lastContact)
      return { ...c, tenure, lastContact }
    }))
  }, [copperCustomers])

  useEffect(() => {
    if (!tripletexCustomers.length) return
    setList((prev) => prev.map((c) => {
      const match = findTripletexMatch(c.name, tripletexCustomers)
      if (!match) return c
      let next = c
      // Revenue from Tripletex (unless manually overridden).
      if (!c.locked?.includes("rev") && match.rev > 0) next = { ...next, rev: match.rev }
      // Auto-sync e-postdomene from Tripletex unless manually overridden.
      // This keeps domains up-to-date automatically per customer.
      if (match.domain && !c.locked?.includes("email")) {
        const nextDomain = domainOf(match.domain)
        if (nextDomain && nextDomain !== domainOf(c.email ?? "")) {
          next = { ...next, email: nextDomain }
        }
      }
      return next
    }))
  }, [tripletexCustomers])

  const update = (id: string, patch: Partial<Customer>) =>
    setList((p) => p.map((c) => {
      if (c.id !== id) return c
      // Lock any automatic field the user edits, so external feeds won't overwrite it.
      const lockKeys = Object.keys(patch).filter((k) => AUTO_FIELDS.has(k))
      const locked = lockKeys.length
        ? Array.from(new Set([...(c.locked ?? []), ...lockKeys]))
        : c.locked
      return { ...c, ...patch, locked }
    }))
  const del = (id: string) => setList((p) => p.filter((c) => c.id !== id))
  const add = (c: Customer) => { setList((p) => [c, ...p]); setAdding(false) }

  // Return an auto field to its automatic source (unlock it + refill where possible).
  const resetField = (id: string, field: string) =>
    setList((p) => p.map((c) => {
      if (c.id !== id) return c
      const locked = (c.locked ?? []).filter((k) => k !== field)
      let next: Customer = { ...c, locked }
      if (field === "rev") {
        const match = findTripletexMatch(c.name, tripletexCustomers)
        if (match && match.rev > 0) next = { ...next, rev: match.rev }
      }
      if (field === "lastContact") {
        const lastContact = scanLastMeeting(c, calendarEvents)
        if (lastContact) next = { ...next, lastContact }
      }
      return next
    }))

  // Scan Google Calendar (fresh) for one customer and update "Siste møte".
  // This is an explicit auto-refresh, so it keeps the field unlocked.
  const scanMeeting = async (c: EnrichedCustomer): Promise<"updated" | "none" | { kind: "no_token" | "forbidden" | "error"; detail?: string }> => {
    let events = calendarEvents
    try {
      const d = await fetch("/api/calendar/meetings").then((r) => r.json())
      if (d?.source !== "google_calendar") {
        const reason = String(d?.reason ?? "")
        const stage = String(d?.stage ?? "")
        const detail = [stage ? `stage=${stage}` : "", reason ? `reason=${reason}` : ""].filter(Boolean).join("; ")
        if (reason.toLowerCase().includes("no access token") || reason.toLowerCase().includes("refreshaccesstokenerror") || reason.toLowerCase().includes("session error")) return { kind: "no_token", detail }
        if (reason.includes("401") || reason.includes("403")) return { kind: "forbidden", detail }
        return { kind: "error", detail }
      }
      events = Array.isArray(d.allEvents) ? d.allEvents : []
      setCalendarEvents(events)
    } catch {
      return { kind: "error", detail: "fetch failed" }
    }
    const lastContact = scanLastMeeting(c, events)
    if (!lastContact) return "none"
    setList((p) => p.map((x) => x.id === c.id
      ? { ...x, lastContact, locked: (x.locked ?? []).filter((k) => k !== "lastContact") }
      : x))
    return "updated"
  }

  const data = list.map(enrich)

  // Frozen order: recompute ONLY when sort or customer count changes — not on score edits.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const orderedIds = useMemo(() => sortIds(list.map(enrich), sortBy), [sortBy, list.length])

  const total = data.length
  const attention = data.filter((c) => c.band === "red").length
  const segCount = (key: string) => data.filter((c) => SEGMENTS.find((s) => s.key === key)!.match(c)).length

  const segMatch = SEGMENTS.find((s) => s.key === seg)!.match
  let rows = data.filter((c) =>
    segMatch(c) &&
    (q.trim() === "" || c.name.toLowerCase().includes(q.toLowerCase()))
  )
  const idx: Record<string, number> = {}
  orderedIds.forEach((id, i) => { idx[id] = i })
  rows = [...rows].sort((a, b) => (idx[a.id] ?? 1e9) - (idx[b.id] ?? 1e9))

  return (
    <div className="tabview" style={{ display: "flex", flexDirection: "column", gap: 18 }}>

      {/* Segment tabs + controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {SEGMENTS.map((s) => (
          <button
            key={s.key}
            className={`seg${seg === s.key ? " active" : ""}`}
            onClick={() => setSeg(s.key)}
          >
            {s.label}
            <span className="seg-count">{s.key === "all" ? total : segCount(s.key)}</span>
          </button>
        ))}

        <div style={{ flex: 1 }} />

        {attention > 0 && (
          <span className="attn-pill">
            <span className="dot red" />{attention} trenger oppfølging
          </span>
        )}

        <select className="cs-sortselect" value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Sortering">
          {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>

        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)", display: "flex" }}>
            <Icon name="search" size={15} />
          </span>
          <input className="search-input" placeholder="Søk kunde…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        <button
          className={`pill-btn ghost save-btn${savedFlash ? " saved" : ""}`}
          onClick={saveNow}
          title="Alt lagres automatisk — trykk for å lagre nå"
        >
          <Icon name={savedFlash ? "check" : "download"} size={16} />
          {savedFlash ? "Lagret" : "Lagre"}
        </button>

        <button className="pill-btn" onClick={() => setAdding(true)}><Icon name="plus" size={16} /> Ny kunde</button>
      </div>

      {adding && <AddCustomerForm onAdd={add} onCancel={() => setAdding(false)} />}

      {/* Table */}
      <div className="ctable-wrap">
        <div className="ctable-scroll">
          <table className="ctable">
            <thead>
              <tr>
                <th>Kunde</th>
                <th>Type</th>
                <th>Helse / Status</th>
                <th>Siste møte</th>
                <th>Mål — hva vil kunden</th>
                <th className="num-col">Verdi</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => <Row key={c.id} c={c} onUpdate={update} onDelete={del} onScan={scanMeeting} onReset={resetField} />)}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--ink-3)", fontSize: 14, padding: "40px 0" }}>
            Ingen kunder matcher filteret.
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, color: "var(--ink-3)" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Icon name="calendar" size={14} />
          Siste møte hentes fra Google Kalender via e-postdomenet. La til en e-post? Trykk <Icon name="refresh" size={13} style={{ verticalAlign: "-2px" }} /> for å skanne på nytt.
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Icon name="check" size={14} />
          Verdi fylles automatisk fra Tripletex. Klikk for å overstyre — manuelle endringer beholdes ved neste innlogging. Trykk <Icon name="refresh" size={13} style={{ verticalAlign: "-2px" }} /> ved tallet for å gå tilbake til automatisk. Alt lagres automatisk.
        </span>
      </div>
    </div>
  )
}
