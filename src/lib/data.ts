// Mock data — mirrors the design handoff's data.js
// Revenue & meetings will be replaced with live Tripletex + Google Calendar API calls
// Customer list & pipeline will be replaced with Copper CRM API calls

import type { Customer, GoalItem, FunnelStage, MeetingMonth, CapProduct } from "./types"

export const META = {
  company: "SalesUp Norway AS",
  asOf: "2. juni 2026",
}

// ---- 2026 goals (Oversikt) ----
export const GOALS_SEED: GoalItem[] = [
  { id: "seo",  short: "SEO/ADS-retainere", current: 7,  target: 15, series: [3, 4, 5, 5, 6, 7] },
  { id: "proj", short: "Prosjekter 2026",   current: 23, target: 60, series: [8, 13, 17, 20, 22, 23] },
  { id: "mynk", short: "Mynk-kunder",       current: 0,  target: 100, series: [0, 0, 0, 0, 0, 0] },
]

// ---- Revenue (from Tripletex) ----
export const REVENUE = {
  omsMnd: 312000,      // monthly revenue (kr)
  omsMndTarget: 500000, // 2026 target
  mrr: 290000,          // MRR (kr)
  mrrTarget: 400000,    // 2026 MRR target
}

// ---- Sales funnel (from Copper CRM) ----
export const FUNNEL: FunnelStage[] = [
  { label: "Møter avholdt", value: 48, color: "#6BA84F" },
  { label: "Tilbud sendt",  value: 22, color: "#4E8A39" },
  { label: "Closed",        value: 8,  color: "#2E5E22" },
]

export const PIPELINE = {
  valueMill: 4.2,
  winRatePct: 28,
}

// ---- Meetings & wins (from Google Calendar) ----
export const MEETINGS: MeetingMonth[] = [
  { month: "Jan", meetings: 34, wins: 5 },
  { month: "Feb", meetings: 41, wins: 7 },
  { month: "Mar", meetings: 38, wins: 6 },
  { month: "Apr", meetings: 45, wins: 9 },
  { month: "Mai", meetings: 43, wins: 8 },
  { month: "Jun", meetings: 48, wins: 11 },
]

// ---- Customers (from Copper CRM + Google Calendar for lastContact) ----
export const CUSTOMERS_SEED: Customer[] = [
  { id: "k1",  name: "First Camp Sverige",       type: "SEO/Ads",   market: "SE",    rev: 284, margin: 54, owner: "Ina H.",     tenure: 22, lastContact: "3 dager siden",  score: 88, commercial: 2, goal: "Bli markedsleder på camping i Sverige." },
  { id: "k2",  name: "Sparmax",                  type: "SEO/Ads",   market: "NO/SE", rev: 215, margin: 49, owner: "Markus T.",  tenure: 28, lastContact: "1 dag siden",    score: 82, commercial: 2, goal: "Doble organisk omsetning i Norden." },
  { id: "k3",  name: "Smart Varme",              type: "SEO/Ads",   market: "NO",    rev: 169, margin: 51, owner: "Sofie L.",   tenure: 19, lastContact: "5 dager siden",  score: 80, commercial: 2, goal: "Flere kvalifiserte leads på varmepumper." },
  { id: "k4",  name: "Ditt Uterom",              type: "SEO/Ads",   market: "NO",    rev: 112, margin: 44, owner: "Ina H.",     tenure: 14, lastContact: "12 dager siden", score: 64, commercial: 1, goal: "Vokse e-handel på hageprodukter." },
  { id: "k5",  name: "Almanakkforlaget",         type: "Hosting",   market: "NO",    rev: 94,  margin: 68, owner: "Markus T.",  tenure: 41, lastContact: "8 dager siden",  score: 79, commercial: 2, goal: "Stabil drift + bedre synlighet på Google." },
  { id: "k6",  name: "Kristiansand Dyrepark",    type: "Utvikling", market: "NO",    rev: 75,  margin: 47, owner: "Sofie L.",   tenure: 11, lastContact: "2 dager siden",  score: 78, commercial: 2, goal: "Flere besøkende booket via nett." },
  { id: "k7",  name: "P. Lindberg",              type: "SEO/Ads",   market: "NO",    rev: 60,  margin: 50, owner: "Ina H.",     tenure: 17, lastContact: "6 dager siden",  score: 77, commercial: 2, goal: "Økt netthandel mot B2B." },
  { id: "k8",  name: "Norweh USA",               type: "SEO/Ads",   market: "US",    rev: 56,  margin: 52, owner: "Markus T.",  tenure: 8,  lastContact: "1 dag siden",    score: 81, commercial: 2, goal: "Etablere merkevaren i USA." },
  { id: "k9",  name: "Norweh Inc.",              type: "SEO/Ads",   market: "CA",    rev: 57,  margin: 46, owner: "Markus T.",  tenure: 8,  lastContact: "9 dager siden",  score: 66, commercial: 1, goal: "Vekst i det kanadiske markedet." },
  { id: "k10", name: "PBS Direct",               type: "Utvikling", market: "US",    rev: 56,  margin: 45, owner: "Sofie L.",   tenure: 6,  lastContact: "4 dager siden",  score: 76, commercial: 2, goal: "Lansere ny e-handelsplattform." },
  { id: "k11", name: "Skinnassistanse",          type: "Hosting",   market: "NO",    rev: 43,  margin: 66, owner: "Ina H.",     tenure: 33, lastContact: "14 dager siden", score: 80, commercial: 2, goal: "Pålitelig drift uten styr." },
  { id: "k12", name: "Slikkepott",               type: "SEO/Ads",   market: "NO",    rev: 38,  margin: 41, owner: "Sofie L.",   tenure: 13, lastContact: "27 dager siden", score: 42, commercial: 0, goal: "Flere salg fra Google." },
  { id: "k13", name: "Biocleaner Rens",          type: "SEO/Ads",   market: "NO",    rev: 28,  margin: 48, owner: "Markus T.",  tenure: 3,  lastContact: "2 dager siden",  score: 75, commercial: 2, goal: "Rask vekst som nyetablert." },
  { id: "k14", name: "Kaffiståvå",               type: "SEO/Ads",   market: "NO",    rev: 28,  margin: 39, owner: "Ina H.",     tenure: 2,  lastContact: "7 dager siden",  score: 60, commercial: 0, goal: "Bygge nettsynlighet fra null." },
  { id: "k15", name: "Eidos Eiendomsutvikling",  type: "Utvikling", market: "NO",    rev: 24,  margin: 43, owner: "Sofie L.",   tenure: 2,  lastContact: "3 dager siden",  score: 74, commercial: 2, goal: "Digital tilstedeværelse for nye prosjekter." },
  { id: "k16", name: "Mukta Magic",              type: "Hosting",   market: "NO",    rev: 22,  margin: 70, owner: "Markus T.",  tenure: 24, lastContact: "18 dager siden", score: 78, commercial: 2, goal: "Enkel og trygg drift." },
  { id: "k17", name: "Flexibo",                  type: "SEO/Ads",   market: "NO",    rev: 20,  margin: 38, owner: "Ina H.",     tenure: 10, lastContact: "21 dager siden", score: 40, commercial: 0, goal: "Lønnsom netthandel." },
]

// ---- Capacity simulator ----
export const CAP_PRODUCTS: CapProduct[] = [
  { id: "seo",  name: "SEO / Ads", salg: 30, drift: 5,    rev: 35,   maxA: 40,  maxN: 15 },
  { id: "web",  name: "Nettside",  salg: 10, drift: 8,    rev: 20,   maxA: 40,  maxN: 15 },
  { id: "mynk", name: "Mynk",      salg: 5,  drift: 0.17, rev: 1.99, maxA: 300, maxN: 40 },
]

export const VAREKOST_PCT = 34
