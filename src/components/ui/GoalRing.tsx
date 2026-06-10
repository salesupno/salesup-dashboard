interface GoalRingProps {
  pct: number     // 0–1
  color?: string
  size?: number
}

export default function GoalRing({ pct, color = "var(--c-deep)", size = 130 }: GoalRingProps) {
  const sw = size * 0.1
  const r = (size - sw) / 2
  const c = 2 * Math.PI * r
  const off = c * (1 - Math.min(Math.max(pct, 0), 1))

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="var(--hairline-2)" strokeWidth={sw}
      />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={sw}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={off}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset .8s cubic-bezier(.2,.7,.3,1)" }}
      />
      <text
        x="50%" y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        className="num"
        fontSize={size * 0.27}
        fontWeight="800"
        fill="var(--ink)"
      >
        {Math.round(pct * 100)}
        <tspan fontSize={size * 0.13} fill="var(--ink-3)">%</tspan>
      </text>
    </svg>
  )
}
