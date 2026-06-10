"use client"

import { useState, useEffect } from "react"
import GoalRing from "@/components/ui/GoalRing"
import { GOALS_SEED, REVENUE, FUNNEL, PIPELINE, MEETINGS } from "@/lib/data"
import type { GoalItem, MeetingMonth } from "@/lib/types"

const GOALS_KEY = "su_goals_v5"
const oFmt = (n: number) => {
  const a = Math.abs(n)
  return a >= 1e6
    ? (n / 1e6).toFixed(2).replace(".", ",") + " mill"
    : Math.round(n / 1000) + "k"
}

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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
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

// ---- Sales funnel ----
function SalesFunnel() {
  const W = 260, sh = 54, gap = 6, maxW = 244
  const max = FUNNEL[0].value
  const wAt = (v: number) => Math.max(78, (v / max) * maxW)
  const bottoms = [wAt(FUNNEL[1].value), wAt(FUNNEL[2].value), wAt(FUNNEL[2].value) * 0.62]
  const H = FUNNEL.length * sh + (FUNNEL.length - 1) * gap
  const cx = W / 2
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
      {FUNNEL.map((s, i) => {
        const y0 = i * (sh + gap)
        const y1 = y0 + sh
        const topW = wAt(s.value)
        const botW = bottoms[i]
        const pts = `${cx - topW / 2},${y0} ${cx + topW / 2},${y0} ${cx + botW / 2},${y1} ${cx - botW / 2},${y1}`
        return (
          <g key={i}>
            <polygon points={pts} fill={s.color} />
            <text x={cx} y={(y0 + y1) / 2} dominantBaseline="central" textAnchor="middle" className="num" fontSize="30" fontWeight="800" fill="#fff">
              {s.value}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ---- Møter & Wins dual-line chart ----
const MW_MEET_C = "#6BA84F"
const MW_WIN_C  = "#1B1C16"

function TwoLineChart({ data }: { data: MeetingMonth[] }) {
  const months = data.map((m) => m.month)
  const meet   = data.map((m) => m.meetings)
  const win    = data.map((m) => m.wins)
  const W = 720, H = 268, padL = 14, padR = 14, padT = 26, padB = 34
  const n = months.length
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
          <text x={x(i)} y={yW(v) + 22} textAnchor="middle" className="num" fontSize="13" fontWeight="700" fill={MW_WIN_C}>{v}</text>
        </g>
      ))}
      {months.map((m, i) => (
        <text key={"x" + i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="12.5" fontWeight={i === n - 1 ? 700 : 500} fill={i === n - 1 ? "var(--ink-2)" : "var(--ink-3)"}>{m}</text>
      ))}
    </svg>
  )
}

function MeetingsWins({ data }: { data: MeetingMonth[] }) {
  const totalMeet = data.reduce((s, m) => s + m.meetings, 0)
  const totalWin  = data.reduce((s, m) => s + m.wins, 0)
  const rate = totalMeet ? Math.round((totalWin / totalMeet) * 100) : 0

  const Tile = ({ label, value, sub, dot }: { label: string; value: number; sub: string; dot: string }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, letterSpacing: ".03em", textTransform: "uppercase", color: "var(--ink-3)" }}>
        <span style={{ width: 11, height: 11, borderRadius: 4, background: dot, flexShrink: 0 }} />
        {label}
      </span>
      <span className="num" style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-.045em", lineHeight: .85, color: "var(--ink)" }}>
        {value}
      </span>
      <span style={{ fontSize: 12.5, color: "var(--ink-3)", fontWeight: 600 }}>{sub}</span>
    </div>
  )

  return (
    <div className="card" style={{ padding: "18px 26px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--ink-3)" }}>
          Møter &amp; Wins
        </span>
        <span style={{ fontSize: 12.5, color: "var(--ink-3)", fontWeight: 600 }}>per måned · siste 6 mnd</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 28, alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Tile label="Møter" value={totalMeet} sub="avholdt i perioden" dot={MW_MEET_C} />
          <Tile label="Wins"  value={totalWin}  sub={rate + " % av møtene"} dot={MW_WIN_C} />
        </div>
        <TwoLineChart data={data} />
      </div>
    </div>
  )
}

export default function TabOversikt({ period = 3 }: { period?: number }) {
  const [liveRevenue, setLiveRevenue] = useState({ ...REVENUE })
  const [liveMeetings, setLiveMeetings] = useState<MeetingMonth[]>(MEETINGS)
  const [livePipeline, setLivePipeline] = useState({ ...PIPELINE })

  useEffect(() => {
    fetch(`/api/tripletex/revenue?months=${period}`)
      .then(r => r.json())
      .then(d => { if (d.omsMnd) setLiveRevenue({ omsMnd: d.omsMnd, omsMndTarget: d.omsMndTarget, mrr: d.mrr, mrrTarget: d.mrrTarget }) })
      .catch(() => {})
    fetch(`/api/calendar/meetings?months=${period}`)
      .then(r => r.json())
      .then(d => { if (d.monthly?.length) setLiveMeetings(d.monthly) })
      .catch(() => {})
    fetch("/api/copper/pipeline")
      .then(r => r.json())
      .then(d => { if (d.pipeline) setLivePipeline(d.pipeline) })
  }, [period])

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
              { label: period === 1 ? "Omsetning / mnd" : `Snitt / mnd (${period} mnd)`, cur: omsMnd, mal: omsMal, color: "#4E8A39" },
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

      {/* Row 2: Salg + Møter & Wins */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 14, alignItems: "stretch" }}>
        {/* Salg */}
        <div className="card" style={{ padding: "22px 30px", display: "flex", flexDirection: "column", gap: 16 }}>
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--ink-3)" }}>
            Salg
          </span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28, alignItems: "center" }}>
            {/* Funnel */}
            <div>
              <div style={{ fontSize: 13.5, color: "var(--ink-3)", fontWeight: 600, marginBottom: 10 }}>
                Salgstrakt · siste 3 måneder
              </div>
              <SalesFunnel />
              <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
                {FUNNEL.map((s, i) => (
                  <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 700, color: "var(--ink-2)" }}>
                    <span style={{ width: 11, height: 11, borderRadius: 4, background: s.color }} />
                    {s.label}
                  </span>
                ))}
              </div>
            </div>
            {/* Stats */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ background: "var(--ink)", color: "#fff", borderRadius: 18, padding: "16px 20px" }}>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,.6)", fontWeight: 700, letterSpacing: ".03em", textTransform: "uppercase", marginBottom: 7 }}>
                  Pipeline
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span className="num" style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-.04em", lineHeight: .82 }}>
                    {String(livePipeline.valueMill).replace(".", ",")}
                  </span>
                  <span style={{ fontSize: 18, color: "rgba(255,255,255,.65)", fontWeight: 700 }}>mill</span>
                </div>
              </div>
              <div style={{ background: "#4E8A39", color: "#fff", borderRadius: 18, padding: "16px 20px" }}>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,.72)", fontWeight: 700, letterSpacing: ".03em", textTransform: "uppercase", marginBottom: 7 }}>
                  Win rate
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                  <span className="num" style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-.04em", lineHeight: .82 }}>
                    {livePipeline.winRatePct}
                  </span>
                  <span style={{ fontSize: 20, color: "rgba(255,255,255,.72)", fontWeight: 700 }}>%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <MeetingsWins data={liveMeetings} />
      </div>
    </div>
  )
}
