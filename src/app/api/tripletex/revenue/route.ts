import { NextResponse } from "next/server"
import { createTripletexSession, fetchAllInvoices } from "@/lib/tripletex"
import { monthKey, monthKeyFromDate, resolvePeriodParams, serializePeriod } from "@/lib/period"

// Format a Date as YYYY-MM-DD using LOCAL components (not UTC), so month
// boundaries don't shift a day depending on the server timezone.
const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

const endOfMonth = (key: string) =>
  new Date(parseInt(key.slice(0, 4), 10), parseInt(key.slice(5, 7), 10), 0)

const startOfMonth = (key: string) =>
  new Date(parseInt(key.slice(0, 4), 10), parseInt(key.slice(5, 7), 10) - 1, 1)

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const period = resolvePeriodParams(searchParams, 1)

  try {
    const authHeader = await createTripletexSession()
    const now = new Date()

    // Trailing windows only count COMPLETE months, so a half month (e.g. 1.–15.
    // juni) never drags the average down. A month picked explicitly is always
    // shown as-is, even when it is the current, still-running month.
    const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastComplete = new Date(firstOfThisMonth.getTime() - 86400000)

    const keysBack = (n: number, endExclusiveOffset = 1): string[] => {
      const keys: string[] = []
      for (let i = n + endExclusiveOffset - 1; i >= endExclusiveOffset; i--) {
        keys.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)))
      }
      return keys
    }

    const periodKeys = period.kind === "month" ? [period.key] : keysBack(period.months)
    const months = periodKeys.length
    // MRR always reads the last 3 complete months — it describes the business
    // today, not the month you happen to be looking at.
    const mrrKeys = keysBack(3)

    const rangeStart = startOfMonth([...periodKeys, ...mrrKeys].sort()[0])
    const rangeEnd = new Date(
      Math.min(
        Math.max(endOfMonth(periodKeys[periodKeys.length - 1]).getTime(), lastComplete.getTime()),
        now.getTime()
      )
    )
    const invoices = await fetchAllInvoices(authHeader, ymd(rangeStart), ymd(rangeEnd), 20)

    // Omsetning: total invoiced across the selected months ÷ #months.
    const periodSet = new Set(periodKeys)
    const periodTotal = invoices
      .filter((iv) => iv.date && periodSet.has(monthKeyFromDate(iv.date)))
      .reduce((s, iv) => s + iv.amount, 0)
    const omsMnd = Math.round(periodTotal / months)

    // MRR — recurring revenue. A customer counts as recurring only when it has
    // been invoiced in EACH of the last 3 complete months. Its MRR contribution
    // is the average of its 3 monthly invoiced amounts.
    const perCust = new Map<number, Map<string, number>>()
    const mrrSet = new Set(mrrKeys)
    for (const iv of invoices) {
      if (iv.customerId == null || !iv.date) continue
      const k = monthKeyFromDate(iv.date)
      if (!mrrSet.has(k)) continue
      let m = perCust.get(iv.customerId)
      if (!m) { m = new Map(); perCust.set(iv.customerId, m) }
      m.set(k, (m.get(k) ?? 0) + iv.amount)
    }
    let mrr = 0
    for (const byMonth of perCust.values()) {
      const monthsBilled = mrrKeys.filter((k) => (byMonth.get(k) ?? 0) > 0).length
      if (monthsBilled === mrrKeys.length) {
        const sum = mrrKeys.reduce((s, k) => s + (byMonth.get(k) ?? 0), 0)
        mrr += sum / mrrKeys.length
      }
    }
    mrr = Math.round(mrr)

    return NextResponse.json({
      omsMnd,
      omsMndTarget: 500000,
      mrr,
      mrrTarget: 400000,
      months,
      period: serializePeriod(period),
      periodMonths: periodKeys,
      source: "tripletex",
    })
  } catch (err) {
    console.error("Tripletex error:", err)
    return NextResponse.json({
      omsMnd: 312000,
      omsMndTarget: 500000,
      mrr: 290000,
      mrrTarget: 400000,
      months: period.kind === "month" ? 1 : period.months,
      period: serializePeriod(period),
      source: "mock",
    })
  }
}
