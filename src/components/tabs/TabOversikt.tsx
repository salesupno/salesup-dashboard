"use client"

import { useState, useEffect, useMemo } from "react"
import GoalRing from "@/components/ui/GoalRing"
import Icon from "@/components/ui/Icon"
import { GOALS_SEED, REVENUE } from "@/lib/data"
import type { GoalItem } from "@/lib/types"
import {
  MeetingCategory,
  MeetingEvent,
  externalAttendees,
  externalDomains,
  meetingCustomerKey,
  suggestMeetingClassification,
} from "@/lib/meetingClassification"
import {
  SALES_CATEGORY_ORDER,
  SalesCategory,
  salesCategoryLabel,
  salesCategoryTone,
} from "@/lib/salesCategories"
import {
  DEFAULT_PERIOD,
  Period,
  monthKeyFromDate,
  monthShortLabel,
  periodChartKeys,
  periodEndKey,
  periodLabel,
  periodMonthKeys,
  periodQuery,
  serializePeriod,
} from "@/lib/period"

const GOALS_KEY = "su_goals_v5"
const MEETING_TAG_KEY = "su_meeting_tags_v3"
// v2: rows gained owner, contributor and free-form focus areas.
const WEEKLY_BOARD_KEY = "su_weekly_focus_v2"
const CONVERSION_KEY = "su_meeting_conversions_v1"

type MonthlyWins = {
  key: string
  month: string
  wins: number
}

type NewCustomer = {
  id: number
  name: string
  domain: string
  month: string
  firstInvoiceDate: string
}

type InvoiceCategory = {
  id: SalesCategory
  label: string
  count: number
  amount: number
  customers: number
  newCustomers: number
  newAmount: number
  top: Array<{ id: number; name: string; amount: number; count: number; newCustomer: boolean }>
}

type InvoiceSummary = {
  total: { count: number; amount: number }
  newCustomerCount: number
  newCustomerAmount: number
  topCustomers: Array<{
    id: number
    name: string
    amount: number
    count: number
    category: SalesCategory
    newCustomer: boolean
  }>
  categories: InvoiceCategory[]
}

type MonthPoint = { key: string; month: string; meetings: number; wins: number }

type MeetingGroup = {
  key: string
  name: string
  domain: string
  attendees: string[]
  monthCounts: Record<string, number>
  periodMonths: string[]
  inPeriod: number
  inChart: number
  lastDate: string
  lastMonth: string
  tripletexWin: NewCustomer | null
  converted: boolean
  overridden: boolean
}

type WeeklyRow = {
  id: string
  area: string
  owner: string
  contributor: string
  target: string
  input: string
  output: string
  status: "" | "red" | "yellow" | "green"
}

const EMPTY_INVOICES: InvoiceSummary = {
  total: { count: 0, amount: 0 },
  newCustomerCount: 0,
  newCustomerAmount: 0,
  topCustomers: [],
  categories: [],
}

const oFmt = (n: number) => {
  const a = Math.abs(n)
  return a >= 1e6
    ? (n / 1e6).toFixed(2).replace(".", ",") + " mill"
    : Math.round(n / 1000) + "k"
}

// Free-mail domains identify a person, not a company, so they must never be used
// to link a Tripletex customer to a meeting — every gmail lead would match.
const FREEMAIL = new Set(["gmail.com", "outlook.com", "hotmail.com", "live.com", "icloud.com", "yahoo.com", "online.no"])
const companyDomain = (domain: string) => {
  const d = domain.toLowerCase().trim()
  return d && !FREEMAIL.has(d) ? d : ""
}

// "skg.no" -> "Skg" so a customer without a Tripletex match still reads as a name.
const nameFromDomain = (domain: string) => {
  const root = domain.split(".")[0].replace(/[-_]+/g, " ").trim()
  if (!root) return ""
  return root.replace(/\b\w/g, (c) => c.toUpperCase())
}

// Name shown for an external attendee: Google's display name, else the local part.
const attendeeName = (a: { email: string; name: string }) =>
  a.name || a.email.split("@")[0].replace(/[._-]+/g, " ")

const loadGoals = (): GoalItem[] => {
  try {
    const r = localStorage.getItem(GOALS_KEY)
    if (r) {
      const arr = JSON.parse(r) as GoalItem[]
      return GOALS_SEED.map((seed) => {
        const f = arr.find((x) => x.id === seed.id) ?? {}
        return { ...seed, ...f }
      })
    }
  } catch {}
  return JSON.parse(JSON.stringify(GOALS_SEED))
}

// Manual "this meeting became a customer" overrides, keyed by meeting customer key.
// Tripletex drives the number; these only correct it where Tripletex is wrong.
const loadConversions = () => {
  try {
    const raw = localStorage.getItem(CONVERSION_KEY)
    if (!raw) return {} as Record<string, boolean>
    return JSON.parse(raw) as Record<string, boolean>
  } catch {
    return {} as Record<string, boolean>
  }
}

const GOAL_COLORS = ["#4E8A39", "#6BA84F", "#A9D77D"]

// ---- Editable number inline ----
function NumEdit({
  value,
  onCommit,
  size = 24,
  color,
}: {
  value: number
  onCommit: (v: number) => void
  size?: number
  color?: string
}) {
  const [t, setT] = useState(String(value))
  useEffect(() => setT(String(value)), [value])
  const parse = (s: string) => {
    const n = parseFloat(s.replace(",", "."))
    return isNaN(n) ? 0 : n
  }
  return (
    <input
      className="edit-num num"
      value={t}
      onChange={(e) => setT(e.target.value.replace(/[^0-9]/g, ""))}
      onFocus={(e) => e.target.select()}
      onBlur={() => onCommit(Math.max(0, parse(t)))}
      inputMode="numeric"
      style={{
        width: Math.max(1, t.length) + 0.6 + "ch",
        fontSize: size,
        fontWeight: 700,
        color: color ?? "var(--ink)",
        letterSpacing: "-.02em",
      }}
    />
  )
}

const loadMeetingTags = () => {
  try {
    const raw = localStorage.getItem(MEETING_TAG_KEY)
    if (!raw) return {} as Record<string, MeetingCategory>
    return JSON.parse(raw) as Record<string, MeetingCategory>
  } catch {
    return {} as Record<string, MeetingCategory>
  }
}

// ---- 2026 Goals board ----
function GoalBoard() {
  const [goals, setGoals] = useState<GoalItem[]>(() => GOALS_SEED)

  useEffect(() => {
    setGoals(loadGoals())
  }, [])

  useEffect(() => {
    try { localStorage.setItem(GOALS_KEY, JSON.stringify(goals)) } catch {}
  }, [goals])

  const setGoal = (id: string, k: "current" | "target", v: number) =>
    setGoals((p) => p.map((g) => (g.id === id ? { ...g, [k]: v } : g)))

  return (
    <div
      className="card"
      style={{ padding: "22px 30px", display: "flex", flexDirection: "column", gap: 16 }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--ink-3)" }}>
          2026-MÅL
        </span>
        <span className="spill green" style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: ".06em" }}>GRØNN</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: `repeat(${goals.length}, 1fr)`, gap: 16 }}>
        {goals.map((g, i) => {
          const pct = g.target ? g.current / g.target : 0
          return (
            <div
              key={g.id}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center", padding: "2px 0" }}
            >
              <GoalRing pct={pct} color={GOAL_COLORS[i % 3]} size={86} />
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: "-.01em" }}>{g.short}</div>
                <div className="num" style={{ fontSize: 13, color: "var(--ink-3)", fontWeight: 600, marginTop: 3, display: "inline-flex", alignItems: "baseline", justifyContent: "center", gap: 3 }}>
                  <NumEdit value={g.current} onCommit={(v) => setGoal(g.id, "current", v)} size={13} color="var(--ink-3)" />
                  <span>/</span>
                  <NumEdit value={g.target} onCommit={(v) => setGoal(g.id, "target", Math.max(1, v))} size={13} color="var(--ink-3)" />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---- Ukentlig veksttavle ----
// ISO week keys ("2026-W36") so a board belongs to a week, not a date range.
const isoWeekKey = (date: Date) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 3) // Thursday decides the year
  const firstThursday = new Date(d.getFullYear(), 0, 4)
  firstThursday.setDate(firstThursday.getDate() - ((firstThursday.getDay() + 6) % 7) + 3)
  const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 86400000))
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`
}

const mondayOfWeek = (key: string) => {
  const [year, week] = key.split("-W").map(Number)
  const jan4 = new Date(year, 0, 4)
  const week1Monday = new Date(year, 0, 4 - ((jan4.getDay() + 6) % 7))
  return new Date(week1Monday.getFullYear(), week1Monday.getMonth(), week1Monday.getDate() + (week - 1) * 7)
}

const shiftWeek = (key: string, delta: number) => {
  const monday = mondayOfWeek(key)
  monday.setDate(monday.getDate() + delta * 7)
  return isoWeekKey(monday)
}

const weekTitle = (key: string) => {
  const [year, week] = key.split("-W")
  return `Uke ${parseInt(week, 10)}, ${year}`
}

const weekRange = (key: string) => {
  const monday = mondayOfWeek(key)
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString("nb-NO", { day: "numeric", month: "short" })
  return `${fmt(monday)} – ${fmt(sunday)}`
}

const PEOPLE = ["Erlend", "Tommy", "Emman"]

// Person colours come from the existing palette so the board reads as one system.
const PERSON_TONES = [
  { bg: "#E7EFF7", fg: "#3A6491" },
  { bg: "var(--green-soft)", fg: "var(--green)" },
  { bg: "var(--yellow-soft)", fg: "var(--yellow)" },
  { bg: "#F0EAF7", fg: "#6A4E8C" },
]

const personTone = (name: string) => {
  const i = PEOPLE.indexOf(name)
  return i >= 0 ? PERSON_TONES[i % PERSON_TONES.length] : { bg: "var(--hairline-2)", fg: "var(--ink-3)" }
}

const WEEKLY_SEED: WeeklyRow[] = [
  { id: "seo",  area: "SEO / Ads",           owner: "Erlend", contributor: "",       target: "10 samtaler",         input: "", output: "", status: "" },
  { id: "proj", area: "Prosjekter",          owner: "Tommy",  contributor: "Emman",  target: "5 tilbud sendt",      input: "", output: "", status: "" },
  { id: "up",   area: "Mersalg & fornyelse", owner: "Tommy",  contributor: "",       target: "1 mersalgssamtale",   input: "", output: "", status: "" },
  { id: "mynk", area: "Mynk",                owner: "Erlend", contributor: "Emman",  target: "50 e-poster sendt",   input: "", output: "", status: "" },
  { id: "dev",  area: "Mynk utvikling",      owner: "Erlend", contributor: "Emman",  target: "Ukens feature fikset", input: "", output: "", status: "" },
]

type WeeklyStore = Record<string, WeeklyRow[]>

const readStore = (): WeeklyStore => {
  try {
    return JSON.parse(localStorage.getItem(WEEKLY_BOARD_KEY) ?? "{}") as WeeklyStore
  } catch {
    return {}
  }
}

// An unopened week inherits last week's plan — the areas, owners and targets carry
// over, while what actually happened starts blank.
const loadWeek = (week: string, store = readStore()): WeeklyRow[] => {
  if (store[week]) return store[week]
  const previous = Object.keys(store).filter((k) => k < week).sort().pop()
  const base = previous ? store[previous] : WEEKLY_SEED
  return base.map((row) => ({ ...row, input: "", output: "", status: "" }))
}

const STATUS_LABEL: Record<WeeklyRow["status"], string> = {
  "": "—",
  red: "Rød",
  yellow: "Gul",
  green: "Grønn",
}

function WeeklyFocusBoard() {
  const [week, setWeek] = useState(() => isoWeekKey(new Date()))
  const [rows, setRows] = useState<WeeklyRow[]>(WEEKLY_SEED)

  useEffect(() => {
    setRows(loadWeek(week))
  }, [week])

  const commit = (next: WeeklyRow[]) => {
    setRows(next)
    try {
      localStorage.setItem(WEEKLY_BOARD_KEY, JSON.stringify({ ...readStore(), [week]: next }))
    } catch {}
  }

  const update = (id: string, field: keyof Omit<WeeklyRow, "id">, value: string) =>
    commit(rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)))

  const addRow = () =>
    commit([
      ...rows,
      { id: `row-${Date.now()}`, area: "", owner: "", contributor: "", target: "", input: "", output: "", status: "" },
    ])

  const removeRow = (id: string) => commit(rows.filter((row) => row.id !== id))

  const cols = "minmax(150px,1.15fr) 116px 116px minmax(150px,1fr) minmax(150px,1fr) minmax(150px,1fr) 116px 34px"

  const head: React.CSSProperties = {
    fontSize: 11.5,
    fontWeight: 700,
    color: "var(--ink-3)",
    textTransform: "uppercase",
    letterSpacing: ".05em",
    display: "flex",
    alignItems: "center",
    gap: 7,
    paddingBottom: 2,
  }

  const field = (bg: string): React.CSSProperties => ({
    height: 42,
    border: "1.5px solid var(--hairline)",
    borderRadius: 11,
    background: bg,
    padding: "0 12px",
    font: "inherit",
    fontSize: 13.5,
    fontWeight: 700,
    color: "var(--ink)",
    width: "100%",
    outline: "none",
  })

  const PersonSelect = ({ row, field: key }: { row: WeeklyRow; field: "owner" | "contributor" }) => {
    const tone = personTone(row[key])
    return (
      <select
        value={row[key]}
        onChange={(e) => update(row.id, key, e.target.value)}
        aria-label={`${row.area || "Fokusområde"}: ${key === "owner" ? "eier" : "bidragsyter"}`}
        className="cs-typemini"
        style={{
          width: "100%",
          height: 34,
          borderRadius: 999,
          border: "none",
          background: tone.bg,
          color: tone.fg,
          fontSize: 13,
          fontWeight: 800,
          textAlign: "center",
          padding: "0 18px 0 10px",
          backgroundImage: "none",
        }}
      >
        <option value="">—</option>
        {PEOPLE.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>
    )
  }

  return (
    <section className="card" style={{ padding: "22px 30px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--ink-3)" }}>
            Ukentlig veksttavle
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-3)", fontWeight: 600, marginTop: 3 }}>
            Planlagt innsats <b style={{ color: "var(--ink-2)" }}>→ faktisk input → output</b>, per fokusområde
          </div>
        </div>

        <div className="pill-btn ghost" style={{ padding: "0 6px", gap: 4 }}>
          <button
            onClick={() => setWeek(shiftWeek(week, -1))}
            aria-label="Forrige uke"
            style={{ border: "none", background: "none", cursor: "pointer", color: "var(--ink-3)", display: "grid", placeItems: "center", padding: "0 6px" }}
          >
            <Icon name="chevron-r" size={15} style={{ transform: "rotate(180deg)" }} />
          </button>
          <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.15, alignItems: "center", minWidth: 104 }}>
            <span style={{ fontWeight: 800 }}>{weekTitle(week)}</span>
            <span style={{ fontSize: 10.5, color: "var(--ink-3)", fontWeight: 600 }}>{weekRange(week)}</span>
          </span>
          <button
            onClick={() => setWeek(shiftWeek(week, 1))}
            aria-label="Neste uke"
            style={{ border: "none", background: "none", cursor: "pointer", color: "var(--ink-3)", display: "grid", placeItems: "center", padding: "0 6px" }}
          >
            <Icon name="chevron-r" size={15} />
          </button>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: cols, gap: "0 10px", alignItems: "center", minWidth: 980 }}>
          <div style={head}>Fokusområde</div>
          <div style={head}>Eier</div>
          <div style={head}>Bidrar</div>
          <div style={head}><span className="dot green" />Ukens mål</div>
          <div style={head}><span className="dot" style={{ background: "#7B9CC4" }} />Faktisk input</div>
          <div style={head}><span className="dot yellow" />Output</div>
          <div style={head}>Suksess</div>
          <div />

          {rows.map((row) => (
            <div key={row.id} style={{ display: "contents" }}>
              <div style={{ gridColumn: "1 / -1", height: 1, background: "var(--hairline)", margin: "10px 0" }} />

              <input
                value={row.area}
                onChange={(e) => update(row.id, "area", e.target.value)}
                placeholder="Nytt fokusområde"
                aria-label="Fokusområde"
                style={{ ...field("transparent"), border: "1.5px solid transparent", fontSize: 14.5, fontWeight: 800, padding: "0 4px" }}
              />
              <PersonSelect row={row} field="owner" />
              <PersonSelect row={row} field="contributor" />
              <input
                value={row.target}
                onChange={(e) => update(row.id, "target", e.target.value)}
                placeholder="F.eks. 10 samtaler"
                aria-label={`${row.area || "Fokusområde"}: ukens mål`}
                style={field("var(--green-soft)")}
              />
              <input
                value={row.input}
                onChange={(e) => update(row.id, "input", e.target.value)}
                placeholder="Registrer her"
                aria-label={`${row.area || "Fokusområde"}: faktisk input`}
                style={field("#EEF3F9")}
              />
              <input
                value={row.output}
                onChange={(e) => update(row.id, "output", e.target.value)}
                placeholder="F.eks. 2 nye kunder"
                aria-label={`${row.area || "Fokusområde"}: output`}
                style={field("var(--yellow-soft)")}
              />
              <select
                value={row.status}
                onChange={(e) => update(row.id, "status", e.target.value)}
                aria-label={`${row.area || "Fokusområde"}: suksess`}
                className="cs-typemini"
                style={{
                  height: 42,
                  borderRadius: 11,
                  fontSize: 13.5,
                  fontWeight: 800,
                  padding: "0 26px 0 12px",
                  color: row.status ? `var(--${row.status})` : "var(--ink-3)",
                  background: row.status ? `var(--${row.status}-soft)` : "var(--surface)",
                  borderColor: row.status ? `var(--${row.status}-soft)` : "var(--hairline)",
                }}
              >
                {(["", "red", "yellow", "green"] as const).map((s) => (
                  <option key={s || "none"} value={s}>{STATUS_LABEL[s]}</option>
                ))}
              </select>
              <button className="cs-del" onClick={() => removeRow(row.id)} aria-label={`Slett ${row.area || "fokusområde"}`}>
                <Icon name="trash" size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <button className="pill-btn ghost" style={{ padding: "0 16px" }} onClick={addRow}>
          <Icon name="plus" size={15} /> Nytt fokusområde
        </button>
      </div>
    </section>
  )
}

// ---- Salg: how much, where from, and who ----
function SalesCard({
  data,
  error,
  label,
  newCustomers,
  closeRate,
}: {
  data: InvoiceSummary
  error: string
  label: string
  newCustomers: number
  closeRate: number
}) {
  const maxAmount = Math.max(1, ...data.categories.map((c) => c.amount))
  const present = SALES_CATEGORY_ORDER
    .map((id) => data.categories.find((c) => c.id === id))
    .filter((c): c is InvoiceCategory => !!c && c.count > 0)
  const newShare = data.total.amount ? Math.round((data.newCustomerAmount / data.total.amount) * 100) : 0

  const Tile = ({ tone, label: tileLabel, value, unit, sub }: {
    tone: "dark" | "green" | "plain"
    label: string
    value: string | number
    unit?: string
    sub: string
  }) => {
    const bg = tone === "dark" ? "var(--ink)" : tone === "green" ? "#4E8A39" : "var(--hairline-2)"
    const fg = tone === "plain" ? "var(--ink)" : "#fff"
    const muted = tone === "plain" ? "var(--ink-3)" : "rgba(255,255,255,.68)"
    return (
      <div style={{ background: bg, color: fg, borderRadius: 18, padding: "15px 18px" }}>
        <div style={{ fontSize: 12, color: muted, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", marginBottom: 8 }}>
          {tileLabel}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
          <span className="num" style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-.04em", lineHeight: .85 }}>{value}</span>
          {unit && <span style={{ fontSize: 16, color: muted, fontWeight: 700 }}>{unit}</span>}
        </div>
        <div style={{ fontSize: 11.5, color: muted, fontWeight: 600, marginTop: 8 }}>{sub}</div>
      </div>
    )
  }

  return (
    <div className="card" style={{ padding: "22px 30px", display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--ink-3)" }}>
          Salg
        </span>
        <span style={{ fontSize: 12.5, color: "var(--ink-3)", fontWeight: 600 }}>{label}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        <Tile
          tone="dark"
          label="Fakturert"
          value={oFmt(data.total.amount)}
          sub={`${data.total.count} faktura${data.total.count === 1 ? "" : "er"}`}
        />
        <Tile
          tone="green"
          label="Nye kunder"
          value={newCustomers}
          sub={data.newCustomerCount > 0 ? `${oFmt(data.newCustomerAmount)} · ${newShare} % av omsetning` : "ingen fakturert ennå"}
        />
        <Tile
          tone="plain"
          label="Close rate"
          value={closeRate}
          unit="%"
          sub="av møtene ble kunde"
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <span style={{ fontSize: 13.5, fontWeight: 800, color: "var(--ink)" }}>Hvor kom omsetningen fra</span>

        {error ? (
          <div style={{ fontSize: 13, color: "var(--red)", fontWeight: 700, background: "var(--red-soft)", borderRadius: 12, padding: "10px 13px" }}>
            Kunne ikke hente fakturaer fra Tripletex — {error}
          </div>
        ) : present.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--ink-3)", fontWeight: 600 }}>Ingen fakturaer i perioden.</div>
        ) : (
          present.map((c) => {
            const share = data.total.amount ? Math.round((c.amount / data.total.amount) * 100) : 0
            return (
              <div key={c.id} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 800, color: "var(--ink)" }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: salesCategoryTone[c.id], flexShrink: 0 }} />
                    {salesCategoryLabel[c.id]}
                  </span>
                  <span className="num" style={{ fontSize: 13.5, fontWeight: 800 }}>
                    {oFmt(c.amount)} <span style={{ color: "var(--ink-3)", fontWeight: 700 }}>{share} %</span>
                  </span>
                </div>
                <div style={{ height: 7, borderRadius: 999, background: "var(--hairline-2)", overflow: "hidden" }}>
                  <div style={{ width: `${(c.amount / maxAmount) * 100}%`, height: "100%", background: salesCategoryTone[c.id], borderRadius: 999 }} />
                </div>
                <div style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 600 }}>
                  {c.count} faktura{c.count === 1 ? "" : "er"} · {c.customers} kunde{c.customers === 1 ? "" : "r"}
                  {c.newCustomers > 0 && <> · <span style={{ color: "#4E8A39", fontWeight: 800 }}>{c.newCustomers} ny{c.newCustomers === 1 ? "" : "e"}</span></>}
                </div>
              </div>
            )
          })
        )}
      </div>

      {data.topCustomers.length > 0 && (
        <div style={{ borderTop: "1px solid var(--hairline)", paddingTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 13.5, fontWeight: 800, color: "var(--ink)" }}>Største kunder i perioden</span>
          {data.topCustomers.map((c) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "var(--ink-2)", minWidth: 0 }}>
                <span style={{ width: 8, height: 8, borderRadius: 3, background: salesCategoryTone[c.category], flexShrink: 0 }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                {c.newCustomer && (
                  <span style={{ flexShrink: 0, borderRadius: 999, padding: "1px 8px", fontSize: 10.5, fontWeight: 800, background: "var(--green-soft)", color: "var(--green)" }}>
                    NY
                  </span>
                )}
              </span>
              <span className="num" style={{ fontSize: 13, fontWeight: 800, flexShrink: 0 }}>{oFmt(c.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---- Marked: meetings vs wins over time ----
const MW_MEET_C = "#6BA84F"
const MW_WIN_C  = "#1B1C16"

function TwoLineChart({ data }: { data: MonthPoint[] }) {
  const months = data.map((m) => m.month)
  const meet   = data.map((m) => m.meetings)
  const win    = data.map((m) => m.wins)
  const W = 720, H = 268, padL = 14, padR = 14, padT = 26, padB = 34
  const n = months.length
  if (n === 0) return null
  const maxM = Math.max(...meet) * 1.18 || 1
  const maxW = Math.max(...win) * 1.4 || 1
  const x = (i: number) => padL + (W - padL - padR) * (n === 1 ? 0.5 : i / (n - 1))
  const yM = (v: number) => H - padB - (H - padT - padB) * (v / maxM)
  const yW = (v: number) => H - padB - (H - padT - padB) * (v / maxW)
  const path = (vals: number[], y: (v: number) => number) =>
    vals.map((v, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1)).join(" ")
  const meetPts = meet.map((v, i) => [x(i), yM(v)] as [number, number])
  const lastM = meetPts[meetPts.length - 1]
  const area =
    "M" + x(0).toFixed(1) + " " + yM(0).toFixed(1) +
    " " + meetPts.map((p) => "L" + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ") +
    " L" + lastM[0].toFixed(1) + " " + yM(0).toFixed(1) + " Z"
  const grid = [0, 0.25, 0.5, 0.75, 1]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id="mwArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={MW_MEET_C} stopOpacity="0.20" />
          <stop offset="1" stopColor={MW_MEET_C} stopOpacity="0" />
        </linearGradient>
      </defs>
      {grid.map((g, i) => {
        const yy = padT + (H - padT - padB) * g
        return <line key={i} x1={padL} y1={yy} x2={W - padR} y2={yy} stroke="var(--hairline-2)" strokeWidth="1" />
      })}
      <path d={area} fill="url(#mwArea)" />
      <path d={path(meet, yM)} fill="none" stroke={MW_MEET_C} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d={path(win, yW)} fill="none" stroke={MW_WIN_C} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      {meet.map((v, i) => (
        <g key={"m" + i}>
          <circle cx={x(i)} cy={yM(v)} r="4.5" fill={MW_MEET_C} stroke="var(--surface)" strokeWidth="2.5" />
          <text x={x(i)} y={yM(v) - 12} textAnchor="middle" className="num" fontSize="13" fontWeight="700" fill={MW_MEET_C}>{v}</text>
        </g>
      ))}
      {win.map((v, i) => (
        <g key={"w" + i}>
          <circle cx={x(i)} cy={yW(v)} r="4.2" fill={MW_WIN_C} stroke="var(--surface)" strokeWidth="2.5" />
          {/* Near the baseline the label would land on the month name — flip it above. */}
          <text x={x(i)} y={yW(v) > H - padB - 16 ? yW(v) - 13 : yW(v) + 22} textAnchor="middle" className="num" fontSize="13" fontWeight="700" fill={MW_WIN_C}>{v}</text>
        </g>
      ))}
      {months.map((m, i) => (
        <text key={"x" + i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="12.5" fontWeight={i === n - 1 ? 700 : 500} fill={i === n - 1 ? "var(--ink-2)" : "var(--ink-3)"}>{m}</text>
      ))}
    </svg>
  )
}

function MarketCard({
  chart,
  groups,
  periodMeetings,
  periodWins,
  label,
  onToggle,
}: {
  chart: MonthPoint[]
  groups: MeetingGroup[]
  periodMeetings: number
  periodWins: number
  label: string
  onToggle: (group: MeetingGroup) => void
}) {
  const rate = periodMeetings ? Math.round((periodWins / periodMeetings) * 100) : 0

  const Tile = ({ label: tileLabel, value, sub, dot }: { label: string; value: number; sub: string; dot: string }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, letterSpacing: ".03em", textTransform: "uppercase", color: "var(--ink-3)" }}>
        <span style={{ width: 11, height: 11, borderRadius: 4, background: dot, flexShrink: 0 }} />
        {tileLabel}
      </span>
      <span className="num" style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-.045em", lineHeight: .85, color: "var(--ink)" }}>
        {value}
      </span>
      <span style={{ fontSize: 12.5, color: "var(--ink-3)", fontWeight: 600 }}>{sub}</span>
    </div>
  )

  const th: React.CSSProperties = {
    textAlign: "left",
    padding: "8px 10px",
    fontSize: 11,
    letterSpacing: ".05em",
    textTransform: "uppercase",
    color: "var(--ink-3)",
    fontWeight: 700,
    whiteSpace: "nowrap",
  }

  return (
    <div className="card" style={{ padding: "18px 26px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--ink-3)" }}>
          Marked
        </span>
        <span style={{ fontSize: 12.5, color: "var(--ink-3)", fontWeight: 600 }}>{label} · trend siste {chart.length} mnd</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 28, alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Tile label="Møter" value={periodMeetings} sub="avholdt i perioden" dot={MW_MEET_C} />
          <Tile label="Wins"  value={periodWins}  sub={rate + " % av møtene"} dot={MW_WIN_C} />
        </div>
        <TwoLineChart data={chart} />
      </div>

      <div style={{ borderTop: "1px solid var(--hairline)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13.5, fontWeight: 800, color: "var(--ink)" }}>Hvem vi har møtt</span>
          <span style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 600 }}>
            Huk av for møter som ble kunde — overstyrer Tripletex
          </span>
        </div>

        {groups.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--ink-3)", fontWeight: 600, padding: "6px 0" }}>
            Ingen nye kundemøter eller nye kunder i perioden.
          </div>
        ) : (
          <div style={{ maxHeight: 268, overflowY: "auto", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Kunde</th>
                  <th style={th}>Møtt med</th>
                  <th style={th}>Måned</th>
                  <th style={{ ...th, textAlign: "right" }}>Møter</th>
                  <th style={{ ...th, textAlign: "center" }}>Ble kunde</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <tr key={g.key} style={{ borderTop: "1px solid var(--hairline)" }}>
                    <td style={{ padding: "9px 10px", fontWeight: 800, fontSize: 13.5 }}>
                      {g.name}
                      {g.domain && g.domain.toLowerCase() !== g.name.toLowerCase() && (
                        <div style={{ fontSize: 11.5, color: "var(--ink-3)", fontWeight: 600 }}>{g.domain}</div>
                      )}
                    </td>
                    <td style={{ padding: "9px 10px", fontSize: 12.5, color: "var(--ink-2)", fontWeight: 600 }}>
                      {g.attendees.length ? g.attendees.slice(0, 3).join(", ") : "—"}
                      {g.attendees.length > 3 && ` +${g.attendees.length - 3}`}
                    </td>
                    <td style={{ padding: "9px 10px", whiteSpace: "nowrap" }}>
                      {g.periodMonths.length > 0 ? (
                        <span style={{ display: "inline-flex", gap: 5, flexWrap: "wrap" }}>
                          {g.periodMonths.map((m) => (
                            <span
                              key={m}
                              style={{
                                borderRadius: 999, padding: "2px 9px", fontSize: 11.5, fontWeight: 800,
                                background: "#EEF6EA", color: "#4E8A39", border: "1px solid #DCEBD3",
                              }}
                            >
                              {monthShortLabel(m)}
                            </span>
                          ))}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11.5, color: "var(--ink-3)", fontWeight: 700 }}>
                          {g.tripletexWin ? `faktura ${monthShortLabel(g.tripletexWin.month)}` : "—"}
                        </span>
                      )}
                    </td>
                    <td className="num" style={{ padding: "9px 10px", textAlign: "right", fontWeight: 800, fontSize: 14, color: g.inPeriod ? "var(--ink)" : "var(--ink-3)" }}>
                      {g.inPeriod || "–"}
                    </td>
                    <td style={{ padding: "9px 10px", textAlign: "center", whiteSpace: "nowrap" }}>
                      <input
                        type="checkbox"
                        checked={g.converted}
                        onChange={() => onToggle(g)}
                        aria-label={`${g.name} ble kunde`}
                        style={{ width: 17, height: 17, accentColor: "#4E8A39", cursor: "pointer" }}
                      />
                      <div style={{ fontSize: 10.5, color: g.overridden ? "#9A6A00" : "var(--ink-3)", fontWeight: 700, marginTop: 2 }}>
                        {g.overridden ? "manuelt" : g.tripletexWin ? "faktura" : "auto"}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default function TabOversikt({ period = DEFAULT_PERIOD }: { period?: Period }) {
  const periodId = serializePeriod(period)
  const periodKeys = periodMonthKeys(period)
  const chartKeys = periodChartKeys(period)
  const endKey = periodEndKey(period)

  const [liveRevenue, setLiveRevenue] = useState({ ...REVENUE })
  const [calendarEvents, setCalendarEvents] = useState<MeetingEvent[]>([])
  const [tripletexCustomers, setTripletexCustomers] = useState<Array<{ name?: string; domain?: string }>>([])
  const [winsByMonth, setWinsByMonth] = useState<MonthlyWins[]>([])
  const [newCustomers, setNewCustomers] = useState<NewCustomer[]>([])
  const [meetingTags, setMeetingTags] = useState<Record<string, MeetingCategory>>({})
  const [conversions, setConversions] = useState<Record<string, boolean>>({})
  const [invoices, setInvoices] = useState<InvoiceSummary>(EMPTY_INVOICES)
  const [salesError, setSalesError] = useState("")

  useEffect(() => {
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === MEETING_TAG_KEY) setMeetingTags(loadMeetingTags())
      if (ev.key === CONVERSION_KEY) setConversions(loadConversions())
    }
    window.addEventListener("storage", onStorage)
    setMeetingTags(loadMeetingTags())
    setConversions(loadConversions())
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  useEffect(() => {
    // One Tripletex call for revenue, invoices, wins and customers: separate
    // routes are separate serverless instances, and Tripletex rejects concurrent
    // session creation with 409, which used to blank out the Salg card.
    setSalesError("")
    fetch(`/api/tripletex/summary?${periodQuery(period)}&chartMonths=${chartKeys.length}`)
      .then(r => r.json())
      .then(d => {
        if (d.source !== "tripletex") {
          setSalesError(d.reason || "Kunne ikke hente tall fra Tripletex")
          return
        }
        setLiveRevenue({
          omsMnd: d.revenue.omsMnd,
          omsMndTarget: d.revenue.omsMndTarget,
          mrr: d.revenue.mrr,
          mrrTarget: d.revenue.mrrTarget,
        })
        setInvoices(d.invoices as InvoiceSummary)
        setWinsByMonth(d.wins)
        setNewCustomers(d.newCustomers)
        setTripletexCustomers(d.customers)
      })
      .catch((err) => setSalesError(err instanceof Error ? err.message : "Nettverksfeil"))

    fetch(`/api/calendar/meetings?months=${chartKeys.length}&end=${endKey}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.allEvents)) setCalendarEvents(d.allEvents) })
      .catch(() => {})
    // periodId captures both the window and the selected months.
  }, [periodId, chartKeys.length, endKey])

  const knownDomains = useMemo(
    () => new Set(tripletexCustomers.map((c) => String(c.domain ?? "").toLowerCase().trim()).filter(Boolean)),
    [tripletexCustomers]
  )

  const customerNameByDomain = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of tripletexCustomers) {
      const domain = String(c.domain ?? "").toLowerCase().trim()
      if (domain && c.name && !map.has(domain)) map.set(domain, c.name)
    }
    return map
  }, [tripletexCustomers])

  // New-customer meetings only, grouped per customer across the chart window.
  const groups = useMemo(() => {
    const allowed = new Set(chartKeys)
    const periodSet = new Set(periodKeys)
    const byKey = new Map<string, MeetingGroup>()
    const attendeeSeen = new Map<string, Set<string>>()

    const sorted = [...calendarEvents].sort((a, b) => a.date.localeCompare(b.date))

    for (const evt of sorted) {
      const suggestion = suggestMeetingClassification(evt, knownDomains)
      if ((meetingTags[evt.id] ?? suggestion.category) !== "new_customer") continue
      const month = monthKeyFromDate(evt.date)
      if (!allowed.has(month)) continue

      const key = meetingCustomerKey(evt)
      const domain = externalDomains(evt)[0] ?? ""
      let group = byKey.get(key)
      if (!group) {
        group = {
          key,
          name: customerNameByDomain.get(domain) || nameFromDomain(domain) || evt.summary || "Ukjent",
          domain,
          attendees: [],
          monthCounts: {},
          periodMonths: [],
          inPeriod: 0,
          inChart: 0,
          lastDate: evt.date,
          lastMonth: month,
          tripletexWin: null,
          converted: false,
          overridden: false,
        }
        byKey.set(key, group)
        attendeeSeen.set(key, new Set())
      }

      const seen = attendeeSeen.get(key)!
      for (const a of externalAttendees(evt)) {
        if (seen.has(a.email)) continue
        seen.add(a.email)
        group.attendees.push(attendeeName(a))
      }

      // One customer meeting per month per customer — three calls in March is one
      // customer conversation, not three funnel entries.
      if (!group.monthCounts[month]) {
        group.monthCounts[month] = 1
        group.inChart += 1
        if (periodSet.has(month)) {
          group.inPeriod += 1
          group.periodMonths.push(month)
        }
      }
      if (evt.date >= group.lastDate) {
        group.lastDate = evt.date
        group.lastMonth = month
      }
    }

    const matchedWins = new Set<number>()
    for (const group of byKey.values()) {
      const groupDomain = companyDomain(group.domain)
      const win = groupDomain
        ? newCustomers.find((c) => companyDomain(c.domain) === groupDomain && allowed.has(c.month)) ?? null
        : null
      group.tripletexWin = win
      if (win) {
        matchedWins.add(win.id)
        if (!group.name) group.name = win.name
      }
      const override = conversions[group.key]
      group.overridden = override !== undefined && override !== !!win
      group.converted = override !== undefined ? override : !!win
    }

    // Customers Tripletex counted as won without a matching meeting still need a
    // row — otherwise a false win can never be corrected and close rate stays >100%.
    for (const win of newCustomers) {
      if (matchedWins.has(win.id) || !allowed.has(win.month)) continue
      const winDomain = companyDomain(win.domain)
      const key = winDomain ? `d:${winDomain}` : `tx:${win.id}`
      if (byKey.has(key)) continue
      const override = conversions[key]
      byKey.set(key, {
        key,
        name: win.name,
        domain: win.domain,
        attendees: [],
        monthCounts: {},
        periodMonths: [],
        inPeriod: 0,
        inChart: 0,
        lastDate: win.firstInvoiceDate,
        lastMonth: win.month,
        tripletexWin: win,
        converted: override !== undefined ? override : true,
        overridden: override !== undefined && override !== true,
      })
    }

    return Array.from(byKey.values())
  }, [calendarEvents, chartKeys, periodKeys, knownDomains, meetingTags, customerNameByDomain, newCustomers, conversions])

  // Tripletex drives wins; manual overrides only add or remove single months.
  const chart: MonthPoint[] = useMemo(() => {
    const meetings = new Map(chartKeys.map((k) => [k, 0]))
    const wins = new Map(chartKeys.map((k) => [k, winsByMonth.find((w) => w.key === k)?.wins ?? 0]))

    for (const group of groups) {
      for (const [month, count] of Object.entries(group.monthCounts)) {
        if (meetings.has(month)) meetings.set(month, (meetings.get(month) ?? 0) + count)
      }
      if (!group.overridden) continue
      if (group.converted && !group.tripletexWin) {
        wins.set(group.lastMonth, (wins.get(group.lastMonth) ?? 0) + 1)
      }
      if (!group.converted && group.tripletexWin) {
        const month = group.tripletexWin.month
        wins.set(month, Math.max(0, (wins.get(month) ?? 0) - 1))
      }
    }

    return chartKeys.map((k) => ({
      key: k,
      month: monthShortLabel(k),
      meetings: meetings.get(k) ?? 0,
      wins: wins.get(k) ?? 0,
    }))
  }, [chartKeys, winsByMonth, groups])

  const periodSet = useMemo(() => new Set(periodKeys), [periodKeys])
  const periodMeetings = chart.filter((p) => periodSet.has(p.key)).reduce((s, p) => s + p.meetings, 0)
  const periodWins = chart.filter((p) => periodSet.has(p.key)).reduce((s, p) => s + p.wins, 0)
  const closeRate = periodMeetings ? Math.round((periodWins / periodMeetings) * 100) : 0

  const periodGroups = useMemo(
    () => groups
      .filter((g) => g.inPeriod > 0 || (g.tripletexWin != null && periodSet.has(g.tripletexWin.month)))
      .sort((a, b) => b.inPeriod - a.inPeriod || b.lastDate.localeCompare(a.lastDate)),
    [groups, periodSet]
  )

  const toggleConverted = (group: MeetingGroup) => {
    setConversions((prev) => {
      const next = { ...prev }
      const value = !group.converted
      // Matching Tripletex again means "stop overriding", not "store the same answer".
      if (value === !!group.tripletexWin) delete next[group.key]
      else next[group.key] = value
      try { localStorage.setItem(CONVERSION_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }

  const label = periodLabel(period)
  const omsMnd = liveRevenue.omsMnd
  const omsMal = liveRevenue.omsMndTarget
  const mrr    = liveRevenue.mrr
  const mrrMal = liveRevenue.mrrTarget

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Row 1: 2026-mål + Omsetning & MRR */}
      <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: 14, alignItems: "stretch" }}>
        <GoalBoard />

        {/* Omsetning & MRR */}
        <div className="card" style={{ padding: "22px 30px", display: "flex", flexDirection: "column", gap: 16 }}>
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--ink-3)" }}>
            Omsetning &amp; MRR
          </span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "center" }}>
            {[
              { label: periodKeys.length === 1 ? `Omsetning · ${label}` : `Snitt / mnd (${periodKeys.length} mnd)`, cur: omsMnd, mal: omsMal, color: "#4E8A39" },
              { label: "MRR (gjentakende)", cur: mrr, mal: mrrMal, color: "#6BA84F" },
            ].map((w, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center", padding: "2px 0" }}>
                <GoalRing pct={w.cur / w.mal} color={w.color} size={104} />
                <div>
                  <div style={{ fontSize: 15.5, fontWeight: 800, letterSpacing: "-.01em" }}>{w.label}</div>
                  <div className="num" style={{ fontSize: 13.5, color: "var(--ink-3)", fontWeight: 700, marginTop: 5 }}>
                    {oFmt(w.cur)} av {oFmt(w.mal)} <span style={{ fontWeight: 600 }}>mål 2026</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <WeeklyFocusBoard />

      {/* Row 2: Salg + Marked */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 14, alignItems: "stretch" }}>
        <SalesCard
          data={invoices}
          error={salesError}
          label={label}
          newCustomers={periodWins}
          closeRate={closeRate}
        />

        <MarketCard
          chart={chart}
          groups={periodGroups}
          periodMeetings={periodMeetings}
          periodWins={periodWins}
          label={label}
          onToggle={toggleConverted}
        />
      </div>
    </div>
  )
}
