export type HealthBand = "green" | "yellow" | "red"
export type CommercialLevel = 0 | 1 | 2

export interface Customer {
  id: string
  name: string
  type: "SEO/Ads" | "Utvikling" | "Hosting" | "Annet"
  market: string
  rev: number        // kr/år in thousands
  margin: number     // percent
  owner: string
  tenure: number     // months
  lastContact: string // "X dager siden" — from Google Calendar
  score: number      // 0-100, draggable in UI
  commercial: CommercialLevel
  goal: string
  band?: HealthBand
}

export interface GoalItem {
  id: string
  short: string
  current: number
  target: number
  series: number[]
}

export interface FunnelStage {
  label: string
  value: number
  color: string
}

export interface MeetingMonth {
  month: string
  meetings: number
  wins: number
}

export interface CapProduct {
  id: string
  name: string
  salg: number   // hours to WIN one customer
  drift: number  // hours/month to RUN one customer
  rev: number    // kr/month per customer (k)
  maxA: number
  maxN: number
}
