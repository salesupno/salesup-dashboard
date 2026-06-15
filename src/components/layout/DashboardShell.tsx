"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { signOut } from "next-auth/react"
import Icon from "@/components/ui/Icon"
import TabOversikt from "@/components/tabs/TabOversikt"
import TabKunder from "@/components/tabs/TabKunder"
import TabKapasitet from "@/components/tabs/TabKapasitet"
import { META } from "@/lib/data"

const TABS = [
  { id: "oversikt",  label: "Oversikt",  title: "Det viktigste i dag",                sub: "" },
  { id: "kunder",    label: "Kunder",    title: "Customer Success",                   sub: "Oversikt over alle kunder — og hvem som trenger ekstra oppfølging" },
  { id: "kapasitet", label: "Kapasitet", title: "Kapasitet",                          sub: "Hvor fort kan vi vokse før noe sprekker?" },
]

export default function DashboardShell() {
  const [tab, setTab] = useState("oversikt")
  const [period, setPeriod] = useState(3)
  const { data: session } = useSession()
  const t = TABS.find((x) => x.id === tab)!

  const initials =
    session?.user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "SU"

  return (
    <div className="shell">
      {/* ---- Top bar ---- */}
      <div className="topbar">
        <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.03em", color: "var(--ink)", flexShrink: 0 }}>
          SalesUp
        </span>

        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <nav className="nav">
            {TABS.map((x) => (
              <button
                key={x.id}
                className={tab === x.id ? "active" : ""}
                onClick={() => setTab(x.id)}
              >
                {x.label}
              </button>
            ))}
          </nav>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button className="round-btn" aria-label="Søk">
            <Icon name="search" size={18} />
          </button>
          <button
            className="avatar"
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Logg ut"
            style={{ cursor: "pointer", border: "none" }}
          >
            {initials}
          </button>
        </div>
      </div>

      {/* ---- Contextual header ---- */}
      <div className="topbar" style={{ marginBottom: 16, alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-.03em", lineHeight: 1.1, color: "var(--ink)" }}>
            {t.title}
          </h1>
          {t.sub && (
            <div style={{ fontSize: 14.5, color: "var(--ink-2)", marginTop: 5 }}>{t.sub}</div>
          )}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ position: "relative" }}>
            <button className="pill-btn ghost" style={{ padding: "0 14px 0 10px" }}>
              <Icon name="calendar" size={16} />
              <span style={{ display: "flex", flexDirection: "column", lineHeight: 1, alignItems: "flex-start" }}>
                <span style={{ fontSize: 10, color: "var(--ink-3)", fontWeight: 500 }}>Periode</span>
                <span>Siste {period} måneder</span>
              </span>
              <Icon name="chevron-r" size={14} style={{ transform: "rotate(90deg)", color: "var(--ink-3)" }} />
            </button>
            <select
              value={period}
              onChange={e => setPeriod(Number(e.target.value))}
              aria-label="Velg periode"
              style={{
                position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%",
              }}
            >
              {[1, 3, 6, 12].map(m => (
                <option key={m} value={m}>Siste {m} måneder</option>
              ))}
            </select>
          </div>
          <button className="pill-btn">
            <Icon name="download" size={16} /> Eksporter
          </button>
        </div>
      </div>

      {/* ---- Tab content ---- */}
      {tab === "oversikt"  && <TabOversikt period={period} />}
      {tab === "kunder"    && <TabKunder />}
      {tab === "kapasitet" && <TabKapasitet />}

      {/* ---- Footer ---- */}
      <footer style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 36,
        paddingTop: 18,
        borderTop: "1px solid var(--hairline)",
        fontSize: 12,
        color: "var(--ink-3)",
      }}>
        <span>{META.company} · CEO Dashboard · data per {META.asOf}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
          <span className="dot green" />
          Live · Tripletex + Google Calendar + Copper CRM
        </span>
      </footer>
    </div>
  )
}
