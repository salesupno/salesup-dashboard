"use client"

import { useEffect, useMemo, useState } from "react"
import {
  MeetingCategory,
  MeetingEvent,
  meetingCategoryLabel,
  meetingCategoryTone,
  meetingCustomerKey,
  suggestMeetingClassification,
  externalDomains,
} from "@/lib/meetingClassification"

type TxCustomer = {
  name: string
  domain?: string
}

const EXCL_KEY = "su_meeting_exclusions_v1"
const TAG_KEY = "su_meeting_tags_v1"

const loadTags = () => {
  try {
    const raw = localStorage.getItem(TAG_KEY)
    if (!raw) return {} as Record<string, MeetingCategory>
    return JSON.parse(raw) as Record<string, MeetingCategory>
  } catch {
    return {} as Record<string, MeetingCategory>
  }
}

const saveTags = (tags: Record<string, MeetingCategory>) => {
  try { localStorage.setItem(TAG_KEY, JSON.stringify(tags)) } catch {}
}

const loadExcluded = () => {
  try {
    const raw = localStorage.getItem(EXCL_KEY)
    if (!raw) return new Set<string>()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set<string>()
  }
}

const effectiveCategory = (
  evt: MeetingEvent,
  tags: Record<string, MeetingCategory>,
  knownDomains: Set<string>
) => tags[evt.id] ?? suggestMeetingClassification(evt, knownDomains).category

const categoryOrder: MeetingCategory[] = ["new_customer", "internal", "existing_customer", "partner", "ignore"]

export default function MeetingsAdminPage() {
  const [events, setEvents] = useState<MeetingEvent[]>([])
  const [customers, setCustomers] = useState<TxCustomer[]>([])
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [tags, setTags] = useState<Record<string, MeetingCategory>>({})
  const [q, setQ] = useState("")

  useEffect(() => {
    setExcluded(loadExcluded())
    setTags(loadTags())
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

  const suggestions = useMemo(() => {
    const map = new Map<string, ReturnType<typeof suggestMeetingClassification>>()
    for (const evt of events) {
      map.set(evt.id, suggestMeetingClassification(evt, knownDomains))
    }
    return map
  }, [events, knownDomains])

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

  const classified = useMemo(() => {
    const counts: Record<MeetingCategory, number> = {
      new_customer: 0,
      internal: 0,
      existing_customer: 0,
      partner: 0,
      ignore: 0,
    }
    for (const evt of sorted) {
      const category = effectiveCategory(evt, tags, knownDomains)
      counts[category] += 1
    }
    return counts
  }, [sorted, tags, knownDomains])

  const setTag = (id: string, category: MeetingCategory) => {
    setTags((prev) => {
      const next = { ...prev, [id]: category }
      saveTags(next)
      return next
    })
  }

  const smartSelectNewCustomerMeetings = () => {
    setTags((prev) => {
      const next = { ...prev }
      for (const evt of sorted) {
        const suggestion = suggestions.get(evt.id)?.category ?? "ignore"
        next[evt.id] = suggestion === "new_customer" ? "new_customer" : "ignore"
      }
      saveTags(next)
      return next
    })
  }

  const autoFillSuggestions = () => {
    setTags((prev) => {
      const next = { ...prev }
      for (const evt of sorted) {
        next[evt.id] = suggestions.get(evt.id)?.category ?? "ignore"
      }
      saveTags(next)
      return next
    })
  }

  const clearOverrides = () => {
    setTags({})
    saveTags({})
  }

  const markExistingCustomers = () => {
    setTags((prev) => {
      const next = { ...prev }
      for (const evt of sorted) {
        const suggestion = suggestions.get(evt.id)?.category ?? "ignore"
        if (suggestion === "existing_customer") next[evt.id] = "existing_customer"
      }
      saveTags(next)
      return next
    })
  }

  const totalSelectedNew = sorted.filter((evt) => effectiveCategory(evt, tags, knownDomains) === "new_customer").length

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "26px 24px 40px", fontFamily: "var(--font)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 28, letterSpacing: "-.02em" }}>Admin · Møter fra Google Calendar</h1>
        <a href="/dashboard" style={{ color: "var(--ink-2)", fontWeight: 700, textDecoration: "none" }}>Til dashboard</a>
      </div>

      <p style={{ color: "var(--ink-3)", marginTop: 0 }}>
        Velg kun nye kundemøter. Interne møter, eksisterende kunder og partnere kan klassifiseres bort.
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
        <button onClick={smartSelectNewCustomerMeetings} style={{ borderRadius: 10, border: "1px solid var(--hairline)", padding: "10px 12px", background: "var(--surface)", fontWeight: 700, cursor: "pointer" }}>
          Velg kun nye kundemøter
        </button>
        <button onClick={autoFillSuggestions} style={{ borderRadius: 10, border: "1px solid var(--hairline)", padding: "10px 12px", background: "var(--surface)", fontWeight: 700, cursor: "pointer" }}>
          Fyll inn smarte forslag
        </button>
        <button onClick={markExistingCustomers} style={{ borderRadius: 10, border: "1px solid var(--hairline)", padding: "10px 12px", background: "var(--surface)", fontWeight: 700, cursor: "pointer" }}>
          Merk eksisterende kunder
        </button>
        <button onClick={clearOverrides} style={{ borderRadius: 10, border: "1px solid var(--hairline)", padding: "10px 12px", background: "var(--surface)", fontWeight: 700, cursor: "pointer" }}>
          Nullstill overstyringer
        </button>
        <span style={{ color: "var(--ink-3)", fontWeight: 700 }}>{totalSelectedNew} nye kundemøter</span>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {categoryOrder.map((category) => (
          <span key={category} style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 999, padding: "7px 12px", background: category === "new_customer" ? "#EEF6EA" : "var(--surface)", border: "1px solid var(--hairline)", fontWeight: 700, color: category === "new_customer" ? "#4E8A39" : "var(--ink-2)" }}>
            <span style={{ width: 10, height: 10, borderRadius: 999, background: meetingCategoryTone[category] }} />
            {meetingCategoryLabel[category]} {classified[category]}
          </span>
        ))}
      </div>

      <div style={{ border: "1px solid var(--hairline)", borderRadius: 14, overflow: "hidden", background: "var(--surface)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--hairline-2)" }}>
              <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--ink-3)" }}>Velg</th>
              <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--ink-3)" }}>Dato</th>
              <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--ink-3)" }}>Møte</th>
              <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--ink-3)" }}>Eksterne domener</th>
              <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--ink-3)" }}>Foreslått</th>
              <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--ink-3)" }}>Begrunnelse</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => {
              const domains = externalDomains(e)
              const suggestion = suggestions.get(e.id) ?? suggestMeetingClassification(e, knownDomains)
              const selected = tags[e.id] ?? suggestion.category
              const selectedTone = meetingCategoryTone[selected]
              return (
                <tr key={e.id} style={{ borderTop: "1px solid var(--hairline)" }}>
                  <td style={{ padding: "10px 12px" }}>
                    <select
                      value={selected}
                      onChange={(ev) => setTag(e.id, ev.target.value as MeetingCategory)}
                      style={{
                        border: `1px solid ${selectedTone}`,
                        borderRadius: 10,
                        padding: "8px 10px",
                        fontFamily: "var(--font)",
                        fontWeight: 700,
                        color: selectedTone,
                        background: "var(--surface)",
                      }}
                    >
                      {categoryOrder.map((category) => <option key={category} value={category}>{meetingCategoryLabel[category]}</option>)}
                    </select>
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
                    </div>
                  </td>
                  <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, borderRadius: 999, padding: "5px 10px", background: meetingCategoryTone[suggestion.category] + "18", color: meetingCategoryTone[suggestion.category], fontWeight: 800, fontSize: 12 }}>
                      <span style={{ width: 9, height: 9, borderRadius: 999, background: meetingCategoryTone[suggestion.category] }} />
                      {meetingCategoryLabel[suggestion.category]} · {suggestion.confidence}%
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", color: "var(--ink-3)", fontSize: 13 }}>
                    {suggestion.reason}
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