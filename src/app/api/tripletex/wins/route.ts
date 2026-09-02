import { NextResponse } from "next/server"
import { createTripletexSession, fetchAllInvoices, fetchCustomerIndex } from "@/lib/tripletex"
import { monthKey, monthKeyFromDate, monthKeysEndingAt, monthShortLabel } from "@/lib/period"

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

const endOfMonth = (key: string) =>
  new Date(parseInt(key.slice(0, 4), 10), parseInt(key.slice(5, 7), 10), 0)

const isMonthKey = (v: string | null): v is string => !!v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v)

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const months = Math.min(12, Math.max(1, parseInt(searchParams.get("months") ?? "6", 10)))
  const endParam = searchParams.get("end")
  const now = new Date()
  const end = isMonthKey(endParam) ? endParam : monthKey(now)
  const keys = monthKeysEndingAt(end, months)

  try {
    const authHeader = await createTripletexSession()

    // Pull a wide date window so we can determine each customer's first invoice.
    const historyStart = new Date(2010, 0, 1)
    const rangeEnd = new Date(Math.min(endOfMonth(end).getTime(), now.getTime()))

    const [invoices, customerIndex] = await Promise.all([
      fetchAllInvoices(authHeader, ymd(historyStart), ymd(rangeEnd)),
      fetchCustomerIndex(authHeader),
    ])

    const firstInvoiceByCustomer = new Map<number, string>()
    for (const inv of invoices) {
      if (inv.customerId == null || !inv.date) continue
      const current = firstInvoiceByCustomer.get(inv.customerId)
      if (!current || inv.date < current) firstInvoiceByCustomer.set(inv.customerId, inv.date)
    }

    const allowed = new Set(keys)
    const byMonth = new Map<string, number>(keys.map((k) => [k, 0]))
    const newCustomers: Array<{ id: number; name: string; domain: string; month: string; firstInvoiceDate: string }> = []

    for (const [cid, firstDate] of firstInvoiceByCustomer.entries()) {
      const k = monthKeyFromDate(firstDate)
      if (!allowed.has(k)) continue
      byMonth.set(k, (byMonth.get(k) ?? 0) + 1)
      const meta = customerIndex.get(cid)
      newCustomers.push({
        id: cid,
        name: meta?.name || "Ukjent kunde",
        domain: meta?.domain ?? "",
        month: k,
        firstInvoiceDate: firstDate,
      })
    }

    newCustomers.sort((a, b) => b.firstInvoiceDate.localeCompare(a.firstInvoiceDate))

    const monthly = keys.map((k) => ({
      key: k,
      month: monthShortLabel(k),
      wins: byMonth.get(k) ?? 0,
    }))

    return NextResponse.json({ monthly, newCustomers, months, end, source: "tripletex" })
  } catch (err) {
    console.error("Tripletex wins error:", err)
    return NextResponse.json({ monthly: [], newCustomers: [], months, end, source: "mock" })
  }
}
