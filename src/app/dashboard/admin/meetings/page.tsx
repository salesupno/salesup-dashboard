"use client"

import { useEffect, useMemo, useState } from "react"

type EventItem = {
  id: string
  summary: string
  date: string
  attendeeEmails: string[]
}

type TxCustomer = {
  name: string
  domain?: string
}

const EXCL_KEY = "su_meeting_exclusions_v1"

const domainFromEmail = (email: string) => {
  const s = String(email ?? "").toLowerCase().trim()
  if (!s.includes("@")) return ""
  return s.split("@").pop() ?? ""
}

const externalDomains = (evt: EventItem) =>
  Array.from(new Set(
    evt.attendeeEmails
      .map(domainFromEmail)
      .filter((d) => d && !d.endsWith("salesup.no") && !d.endsWith("resource.calendar.google.com"))
  ))

const loadExcluded = () => {
  try {
    const raw = localStorage.getItem(EXCL_KEY)
    if (!raw) return new Set<string>()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set<string>()
  }
}

export default function MeetingsAdminPage() {
  const [events, setEvents] = useState<EventItem[]>([])
  const [customers, setCustomers] = useState<TxCustomer[]>([])
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [q, setQ] = useState("")

  useEffect(() => {
    setExcluded(loadExcluded())
    fetch("/api/calendar/meetings?months=12")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.allEvents)) setEvents(d.allEvents) })
      .catch(() => {})
    fetch("/api/tripletex/customers")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.customers)) setCustomers(d.customers) })
      .catch(() => {})
  }, [])

  const knownDomains = useMemo(() =>
    new Set(customers.map((c) => String(c.domain ?? "").toLowerCase().trim()).filter(Boolean)),
    [customers]
  )

  const sorted = useMemo(() =>
    [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [events]
  )

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return sorted
    return sorted.filter((e) =>
      e.summary.toLowerCase().includes(needle) ||
      e.attendeeEmails.join(" ").toLowerCase().includes(needle)
    )
  }, [sorted, q])

  const toggle = (id: string) => {
    setExcluded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      try { localStorage.setItem(EXCL_KEY, JSON.stringify(Array.from(next))) } catch {}
      return next
    })
  }

  const excludeExistingCustomers = () => {
    const ids = filtered
      .filter((e) => externalDomains(e).some((d) => knownDomains.has(d)))
      .map((e) => e.id)
    setExcluded((prev) => {
      const next = new Set(prev)
      for (const id of ids) next.add(id)
      try { localStorage.setItem(EXCL_KEY, JSON.stringify(Array.from(next))) } catch {}
      return next
    })
  }

  const includeAll = () => {
    setExcluded(new Set())
    try { localStorage.setItem(EXCL_KEY, JSON.stringify([])) } catch {}
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "26px 24px 40px", fontFamily: "var(--font)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 28, letterSpacing: "-.02em" }}>Admin · Møter fra Google Calendar</h1>
        <a href="/dashboard" style={{ color: "var(--ink-2)", fontWeight: 700, textDecoration: "none" }}>Til dashboard</a>
      </div>

      <p style={{ color: "var(--ink-3)", marginTop: 0 }}>
        Skjul møter som ikke skal telle i metrikker. Eksempel: eksisterende kunder i oppfølging.
      </p>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Søk i tittel eller deltakere…"
          style={{
            border: "1px solid var(--hairline)",
            borderRadius: 10,
            padding: "10px 12px",
            minWidth: 300,
            fontFamily: "var(--font)",
          }}
        />
        <button onClick={excludeExistingCustomers} style={{ borderRadius: 10, border: "1px solid var(--hairline)", padding: "10px 12px", background: "var(--surface)", fontWeight: 700, cursor: "pointer" }}>
          Ekskluder alle eksisterende kunder
        </button>
        <button onClick={includeAll} style={{ borderRadius: 10, border: "1px solid var(--hairline)", padding: "10px 12px", background: "var(--surface)", fontWeight: 700, cursor: "pointer" }}>
          Nullstill filtrering
        </button>
        <span style={{ color: "var(--ink-3)", fontWeight: 700 }}>{excluded.size} ekskludert</span>
      </div>

      <div style={{ border: "1px solid var(--hairline)", borderRadius: 14, overflow: "hidden", background: "var(--surface)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--hairline-2)" }}>
              <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--ink-3)" }}>Bruk</th>
              <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--ink-3)" }}>Dato</th>
              <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--ink-3)" }}>Møte</th>
              <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--ink-3)" }}>Eksterne domener</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => {
              const domains = externalDomains(e)
              const existing = domains.some((d) => knownDomains.has(d))
              const on = !excluded.has(e.id)
              return (
                <tr key={e.id} style={{ borderTop: "1px solid var(--hairline)" }}>
                  <td style={{ padding: "10px 12px" }}>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", fontWeight: 700 }}>
                      <input type="checkbox" checked={on} onChange={() => toggle(e.id)} />
                      {on ? "Inkludert" : "Ekskludert"}
                    </label>
                  </td>
                  <td style={{ padding: "10px 12px", whiteSpace: "nowrap", color: "var(--ink-2)" }}>
                    {new Date(e.date).toLocaleDateString("nb-NO")}
                  </td>
                  <td style={{ padding: "10px 12px", fontWeight: 700 }}>
                    {e.summary || "(uten tittel)"}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {domains.length === 0 && <span style={{ color: "var(--ink-3)" }}>Ingen eksterne</span>}
                      {domains.map((d) => (
                        <span
                          key={d}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            borderRadius: 999,
                            border: "1px solid var(--hairline)",
                            padding: "2px 8px",
                            fontSize: 12,
                            fontWeight: 700,
                            color: knownDomains.has(d) ? "#9A6A00" : "var(--ink-2)",
                            background: knownDomains.has(d) ? "#FFF7E6" : "var(--surface)",
                          }}
                        >
                          {d}
                        </span>
                      ))}
                      {existing && <span style={{ fontSize: 12, color: "#9A6A00", fontWeight: 700 }}>eksisterende kunde</span>}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}