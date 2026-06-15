import { NextResponse } from "next/server"
import { TRIPLETEX_BASE as BASE, createTripletexSession } from "@/lib/tripletex"

type Inv = { amount: number; date: string; customerId: number | null }

// Format a Date as YYYY-MM-DD using LOCAL components (not UTC), so month
// boundaries don't shift a day depending on the server timezone.
const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

// "YYYY-MM" bucket key from a Tripletex invoiceDate ("YYYY-MM-DD").
const monthKey = (iso: string) => iso.slice(0, 7)

// Fetch every invoice in [from, to] (inclusive), paginating so nothing is missed.
async function fetchInvoices(authHeader: string, from: string, to: string): Promise<Inv[]> {
  const out: Inv[] = []
  const pageSize = 1000
  let offset = 0
  // Bounded so a runaway response can never hang the route.
  for (let page = 0; page < 20; page++) {
    const res = await fetch(
      `${BASE}/invoice?invoiceDateFrom=${from}&invoiceDateTo=${to}` +
        `&from=${offset}&count=${pageSize}&fields=amountExcludingVat,amount,invoiceDate,customer(id)`,
      { headers: { Authorization: authHeader } }
    )
    if (!res.ok) break
    const data = await res.json()
    const values: any[] = data.values ?? []
    for (const inv of values) {
      out.push({
        // Omsetning is excl. VAT (real revenue); fall back to amount if missing.
        amount: inv.amountExcludingVat ?? inv.amount ?? 0,
        date: inv.invoiceDate ?? "",
        customerId: inv.customer?.id ?? null,
      })
    }
    if (values.length < pageSize) break
    offset += pageSize
  }
  return out
}

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const months = Math.min(12, Math.max(1, parseInt(searchParams.get("months") ?? "1", 10)))

  try {
    const authHeader = await createTripletexSession()
    const now = new Date()

    // Only count COMPLETE months. The current month is excluded so a half month
    // (e.g. 1.–15. juni) never drags the average down.
    const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastComplete = new Date(firstOfThisMonth.getTime() - 86400000) // last day of prev month

    // Fetch enough history for both the selected period and the 3-month MRR window.
    const span = Math.max(months, 3)
    const spanStart = new Date(now.getFullYear(), now.getMonth() - span, 1)
    const invoices = await fetchInvoices(authHeader, ymd(spanStart), ymd(lastComplete))

    // Build the set of complete-month keys for each window.
    const keysBack = (n: number): string[] => {
      const keys: string[] = []
      for (let i = n; i >= 1; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        keys.push(ymd(d).slice(0, 7))
      }
      return keys
    }
    const periodKeys = keysBack(months)
    const mrrKeys = keysBack(3)
    const periodSet = new Set(periodKeys)

    // Omsetning: total invoiced across the selected complete months ÷ #months.
    const periodTotal = invoices
      .filter((iv) => periodSet.has(monthKey(iv.date)))
      .reduce((s, iv) => s + iv.amount, 0)
    const omsMnd = Math.round(periodTotal / months)

    // MRR — recurring revenue. A customer counts as recurring only when it has
    // been invoiced in EACH of the last 3 complete months. Its MRR contribution
    // is the average of its 3 monthly invoiced amounts.
    const perCust = new Map<number, Map<string, number>>()
    const mrrSet = new Set(mrrKeys)
    for (const iv of invoices) {
      if (iv.customerId == null) continue
      const k = monthKey(iv.date)
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
      periodMonths: periodKeys,
      source: "tripletex",
    })
  } catch (err) {
    console.error("Tripletex error:", err)
    return NextResponse.json({ omsMnd: 312000, omsMndTarget: 500000, mrr: 290000, mrrTarget: 400000, months, source: "mock" })
  }
}
