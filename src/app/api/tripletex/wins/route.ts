import { NextResponse } from "next/server"
import { TRIPLETEX_BASE as BASE, createTripletexSession } from "@/lib/tripletex"

const MONTHS_NO = ["Jan", "Feb", "Mar", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Des"]

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

const monthKey = (isoDate: string) => isoDate.slice(0, 7)

const monthLabel = (key: string) => {
  const [y, m] = key.split("-")
  const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1)
  return MONTHS_NO[d.getMonth()]
}

async function fetchInvoices(authHeader: string, from: string, to: string): Promise<any[]> {
  const out: any[] = []
  const pageSize = 1000
  let offset = 0

  for (let page = 0; page < 20; page++) {
    const res = await fetch(
      `${BASE}/invoice?invoiceDateFrom=${from}&invoiceDateTo=${to}` +
        `&from=${offset}&count=${pageSize}&fields=invoiceDate,customer(id)`,
      { headers: { Authorization: authHeader } }
    )
    if (!res.ok) break
    const data = await res.json()
    const values: any[] = data.values ?? []
    out.push(...values)
    if (values.length < pageSize) break
    offset += pageSize
  }

  return out
}

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const months = Math.min(12, Math.max(1, parseInt(searchParams.get("months") ?? "6", 10)))

  try {
    const authHeader = await createTripletexSession()
    const now = new Date()

    const keys: string[] = []
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      keys.push(ymd(d).slice(0, 7))
    }
    const from = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1)
    const invoices = await fetchInvoices(authHeader, ymd(from), ymd(now))

    const byMonth = new Map<string, { wins: number; uniqueCustomers: Set<number> }>()
    for (const key of keys) byMonth.set(key, { wins: 0, uniqueCustomers: new Set<number>() })

    for (const inv of invoices) {
      const k = monthKey(inv.invoiceDate ?? "")
      const bucket = byMonth.get(k)
      if (!bucket) continue
      bucket.wins += 1
      const cid = inv.customer?.id
      if (typeof cid === "number") bucket.uniqueCustomers.add(cid)
    }

    const monthly = keys.map((k) => ({
      key: k,
      month: monthLabel(k),
      wins: byMonth.get(k)?.wins ?? 0,
      uniqueCustomers: byMonth.get(k)?.uniqueCustomers.size ?? 0,
    }))

    return NextResponse.json({ monthly, months, source: "tripletex" })
  } catch (err) {
    console.error("Tripletex wins error:", err)
    return NextResponse.json({ monthly: [], months, source: "mock" })
  }
}