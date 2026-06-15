export type HealthBand = "green" | "yellow" | "red"
export type CommercialLevel = 0 | 1 | 2
export type ProjectFase = "Onboarding" | "Aktiv" | "Avsluttende" | "Pause"

export interface Customer {
  id: string
  name: string
  email?: string     // customer contact email — used to match Google Calendar attendees
  type: "SEO/Ads" | "Utvikling" | "Hosting" | "Annet"
  market: string
  rev: number        // kr/år in thousands
  margin: number     // percent
  owner: string
  tenure: number     // months
  lastContact: string // "X dager siden" — from Google Calendar
  score: number      // 0-100, draggable — only relevant for SEO/Ads retainers
  pstatus?: number   // 0-3 PROJECT_STATUS index — for Hosting/Utvikling/Annet
  commercial: CommercialLevel
  goal: string
  retainer: boolean  // true = recurring retainer, false = project
  nextStep?: string  // for project customers: what's next
  fase?: ProjectFase // for project customers: current phase
  band?: HealthBand
  // Field names the user has edited manually. Locked fields are NOT overwritten
  // by automatic feeds (Tripletex/Copper/Calendar), preserving manual corrections.
  locked?: string[]
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
