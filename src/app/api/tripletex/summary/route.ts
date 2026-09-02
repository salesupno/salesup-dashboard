import { NextResponse } from "next/server"
import { createTripletexSession, fetchAllInvoices, fetchCustomerIndex } from "@/lib/tripletex"
import { buildInvoiceSummary, buildRevenue, buildWins } from "@/lib/salesAnalytics"
import { RECURRING_WINDOW_MONTHS } from "@/lib/salesCategories"
import {
  monthKey,
  monthKeysEndingAt,
  monthShortLabel,
  periodEndKey,
  periodMonthKeys,
  resolvePeriodParams,
  serializePeriod,
} from "@/lib/period"

export const dynamic = "force-dynamic"

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

const endOfMonth = (key: string) =>
  new Date(parseInt(key.slice(0, 4), 10), parseInt(key.slice(5, 7), 10), 0)

// Everything the Oversikt tab needs from Tripletex, served from ONE session and
// ONE invoice fetch. Separate routes each opened their own session, and Tripletex
// answers 409 RevisionException to concurrent session creation — on Vercel each
// route is its own instance, so no in-process cache can prevent that.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const period = resolvePeriodParams(searchParams, 3)
  const periodKeys = periodMonthKeys(period)
  const endKey = periodEndKey(period)
  const chartMonths = Math.min(12, Math.max(1, parseInt(searchParams.get("chartMonths") ?? "6", 10)))
  const chartKeys = monthKeysEndingAt(endKey, chartMonths)

  try {
    const authHeader = await createTripletexSession()
    const now = new Date()
    const rangeEnd = new Date(Math.min(endOfMonth(endKey).getTime(), now.getTime()))

    const [invoices, customerIndex] = await Promise.all([
      fetchAllInvoices(authHeader, ymd(new Date(2010, 0, 1)), ymd(rangeEnd)),
      fetchCustomerIndex(authHeader),
    ])

    // Trailing windows use complete months only, so a half month never drags the
    // average down. An explicitly picked month is reported as-is.
    const completeMonthKeys = (n: number) => {
      const keys: string[] = []
      for (let i = n; i >= 1; i--) keys.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)))
      return keys
    }
    const revenueKeys = period.kind === "month" ? periodKeys : completeMonthKeys(period.months)
    const { omsMnd, mrr } = buildRevenue(invoices, revenueKeys, completeMonthKeys(3))

    const wins = buildWins(invoices, customerIndex, chartKeys, monthShortLabel)
    const summary = buildInvoiceSummary(
      invoices,
      customerIndex,
      periodKeys,
      monthKeysEndingAt(endKey, RECURRING_WINDOW_MONTHS)
    )

    const customers = Array.from(customerIndex.entries())
      .map(([id, meta]) => ({ id: String(id), name: meta.name, domain: meta.domain }))
      .filter((c) => c.name)

    return NextResponse.json({
      period: serializePeriod(period),
      periodKeys,
      chartKeys,
      revenue: { omsMnd, omsMndTarget: 500000, mrr, mrrTarget: 400000, months: revenueKeys.length },
      invoices: summary,
      wins: wins.monthly,
      newCustomers: wins.newCustomers,
      customers,
      source: "tripletex",
    })
  } catch (err) {
    const reason = err instanceof Error ? err.message : "Ukjent Tripletex-feil"
    console.error("Tripletex summary error:", reason)
    // Never dress a failure up as an empty period — the client must be able to
    // say "could not load" instead of "no invoices".
    return NextResponse.json({ period: serializePeriod(period), source: "error", reason }, { status: 200 })
  }
}
