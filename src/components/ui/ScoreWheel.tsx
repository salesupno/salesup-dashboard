"use client"

import { useRef } from "react"

type HealthBand = "green" | "yellow" | "red"

const bandOf = (s: number): HealthBand =>
  s >= 72 ? "green" : s >= 55 ? "yellow" : "red"

const HEALTH_TX: Record<HealthBand, string> = {
  green: "HEALTHY",
  yellow: "FØLG OPP",
  red: "RISKY",
}

const BAND_COLOR: Record<HealthBand, string> = {
  green: "var(--green)",
  yellow: "var(--yellow)",
  red: "var(--red)",
}

interface ScoreWheelProps {
  score: number
  onChange: (v: number) => void
  size?: number
}

export default function ScoreWheel({ score, onChange, size = 150 }: ScoreWheelProps) {
  const ref = useRef<SVGSVGElement>(null)
  const band = bandOf(score)
  const col = BAND_COLOR[band]
  const sw = size * 0.11
  const r = (size - sw) / 2
  const cx = size / 2
  const cy = size / 2
  const startDeg = 135
  const sweep = 270

  const pt = (a: number): [number, number] => [
    cx + r * Math.cos((a * Math.PI) / 180),
    cy + r * Math.sin((a * Math.PI) / 180),
  ]

  const arc = (a0: number, a1: number, color: string) => {
    const [x0, y0] = pt(a0)
    const [x1, y1] = pt(a1)
    const large = a1 - a0 > 180 ? 1 : 0
    return (
      <path
        d={`M${x0} ${y0} A${r} ${r} 0 ${large} 1 ${x1} ${y1}`}
        fill="none"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
      />
    )
  }

  const setFrom = (e: { clientX: number; clientY: number }) => {
    if (!ref.current) return
    const b = ref.current.getBoundingClientRect()
    let a =
      (Math.atan2(
        e.clientY - (b.top + b.height / 2),
        e.clientX - (b.left + b.width / 2)
      ) *
        180) /
      Math.PI
    if (a < 0) a += 360
    if (a < startDeg) a += 360
    const pct = Math.max(0, Math.min(1, (a - startDeg) / sweep))
    onChange(Math.round(pct * 100))
  }

  const down = (e: React.PointerEvent) => {
    e.preventDefault()
    setFrom(e)
    const mv = (ev: PointerEvent) => setFrom(ev)
    const up = () => {
      window.removeEventListener("pointermove", mv)
      window.removeEventListener("pointerup", up)
    }
    window.addEventListener("pointermove", mv)
    window.addEventListener("pointerup", up)
  }

  const a1 = startDeg + sweep * Math.max(0, Math.min(score, 100)) / 100
  const knob = pt(a1)

  return (
    <svg
      ref={ref}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      onPointerDown={down}
      style={{ cursor: "grab", touchAction: "none", display: "block", userSelect: "none", flex: "none" }}
    >
      {arc(startDeg, startDeg + sweep, "rgba(27,28,22,.08)")}
      {score > 0 && arc(startDeg, a1, col)}
      <circle cx={knob[0]} cy={knob[1]} r={sw * 0.6} fill="#fff" stroke={col} strokeWidth="3" />
      <text
        x={cx} y={cy - size * 0.03}
        dominantBaseline="central"
        textAnchor="middle"
        className="num"
        fontSize={size * 0.32}
        fontWeight="800"
        fill="var(--ink)"
      >
        {score}
      </text>
      <text
        x={cx} y={cy + size * 0.2}
        dominantBaseline="central"
        textAnchor="middle"
        fontSize={size * 0.105}
        fontWeight="800"
        fill={col}
        style={{ letterSpacing: ".06em" }}
      >
        {HEALTH_TX[band]}
      </text>
    </svg>
  )
}
