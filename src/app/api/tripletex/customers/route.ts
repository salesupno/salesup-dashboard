import { NextResponse } from "next/server"
import { TRIPLETEX_BASE as BASE, fmtDate as fmt, createTripletexSession } from "@/lib/tripletex"

// Pull all invoices in [from, to], paginating, and sum revenue per customer id.
async function revenueByCustomer(
  authHeader: string,
  from: string,
  to: string
): Promise<Map<number, number>> {
  const sums = new Map<number, number>()
  const pageSize = 1000
  let offset = 0

  // Bounded loop so a runaway response can never hang the route.
  for (let page = 0; page < 20; page++) {
    const res = await fetch(
      `${BASE}/invoice?invoiceDateFrom=${from}&invoiceDateTo=${to}` +
        `&from=${offset}&count=${pageSize}&fields=amountExcludingVat,amount,customer(id)`,
      { headers: { Authorization: authHeader } }
    )
    if (!res.ok) break
    const data = await res.json()
    const values: any[] = data.values ?? []
    for (const inv of values) {
      const id: number | undefined = inv.customer?.id
      if (id == null) continue
      const amount: number = inv.amountExcludingVat ?? inv.amount ?? 0
      sums.set(id, (sums.get(id) ?? 0) + amount)
    }
    if (values.length < pageSize) break
    offset += pageSize
  }

  return sums
}

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const authHeader = await createTripletexSession()

    const now = new Date()
    const yearAgo = new Date(now)
    yearAgo.setFullYear(yearAgo.getFullYear() - 1)

    const [custRes, revMap] = await Promise.all([
      fetch(`${BASE}/customer?count=2000&fields=id,name,email`, {
        headers: { Authorization: authHeader },
      }),
      revenueByCustomer(authHeader, fmt(yearAgo), fmt(now)),
    ])

    if (!custRes.ok) throw new Error(`Tripletex customer: ${custRes.status}`)
    const custBody = await custRes.json()
    const customers = (custBody.values ?? [])
      .map((c: any) => {
        const email: string = (c.email ?? "").trim().toLowerCase()
        const domain = email.includes("@") ? email.split("@").pop() ?? "" : ""
        return {
          id: String(c.id),
          name: c.name as string,
          domain,
          // Dashboard revenue is kr/year in thousands.
          rev: Math.round((revMap.get(c.id) ?? 0) / 1000),
        }
      })
      .filter((c: { name: string }) => c.name)

    return NextResponse.json({ customers, source: "tripletex" })
  } catch (err) {
    console.error("Tripletex customers error:", err)
    return NextResponse.json({ customers: [], source: "mock" })
  }
}
