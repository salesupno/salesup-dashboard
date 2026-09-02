import { NextResponse } from "next/server"
import { TRIPLETEX_BASE as BASE, fmtDate as fmt, createTripletexSession, fetchAllInvoices } from "@/lib/tripletex"

// Revenue per customer over the window. The shared fetch handles Tripletex's
// exclusive end date and caches the result across routes.
async function revenueByCustomer(
  authHeader: string,
  from: string,
  to: string
): Promise<Map<number, number>> {
  const sums = new Map<number, number>()
  for (const inv of await fetchAllInvoices(authHeader, from, to, 20)) {
    if (inv.customerId == null) continue
    sums.set(inv.customerId, (sums.get(inv.customerId) ?? 0) + inv.amount)
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
