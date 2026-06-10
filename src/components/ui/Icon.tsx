interface IconProps {
  name: string
  size?: number
  style?: React.CSSProperties
}

export default function Icon({ name, size = 16, style }: IconProps) {
  const p = {
    width: size,
    height: size,
    viewBox: "0 0 24 24" as const,
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    style,
  }
  switch (name) {
    case "arrow-up":    return <svg {...p}><path d="M12 19V5M5 12l7-7 7 7"/></svg>
    case "arrow-down":  return <svg {...p}><path d="M12 5v14M5 12l7 7 7-7"/></svg>
    case "arrow-ur":    return <svg {...p}><path d="M7 17 17 7M9 7h8v8"/></svg>
    case "alert":       return <svg {...p}><path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>
    case "search":      return <svg {...p}><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
    case "calendar":    return <svg {...p}><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>
    case "download":    return <svg {...p}><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"/></svg>
    case "chevron-r":   return <svg {...p}><path d="m9 6 6 6-6 6"/></svg>
    case "clock":       return <svg {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
    case "user":        return <svg {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
    case "trash":       return <svg {...p}><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6"/></svg>
    case "plus":        return <svg {...p}><path d="M12 5v14M5 12h14"/></svg>
    case "check":       return <svg {...p}><path d="M20 6 9 17l-5-5"/></svg>
    case "x":           return <svg {...p}><path d="M18 6 6 18M6 6l12 12"/></svg>
    case "phone":       return <svg {...p}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/></svg>
    case "spark":       return <svg {...p}><path d="m12 3 1.9 5.8H20l-4.9 3.6 1.9 5.8L12 14.6 7 18.2l1.9-5.8L4 8.8h6.1z"/></svg>
    case "target":      return <svg {...p}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>
    case "dot-grid":    return <svg {...p}><circle cx="5" cy="5" r="1.4"/><circle cx="12" cy="5" r="1.4"/><circle cx="19" cy="5" r="1.4"/><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></svg>
    case "ebitda":      return <svg {...p}><path d="M3 3v18h18"/><path d="M7 14l3-3 3 3 5-6"/></svg>
    case "bell":        return <svg {...p}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/></svg>
    case "refresh":     return <svg {...p}><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/></svg>
    case "invoice":     return <svg {...p}><path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h6M9 17h4"/></svg>
    case "pipeline":    return <svg {...p}><path d="M3 6h18l-7 8v6l-4-2v-4Z"/></svg>
    case "send":        return <svg {...p}><path d="M22 2 11 13M22 2l-7 20-4-9-9-4Z"/></svg>
    case "trend-down":  return <svg {...p}><path d="M3 7l6 6 4-4 8 8M21 17h-5m5 0v-5"/></svg>
    default:            return null
  }
}
