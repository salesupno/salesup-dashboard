import { NextResponse } from "next/server"

const BASE = "https://tripletex.no/v2"

function fmt(d: Date): string {
  return d.toISOString().split("T")[0]
}

async function createSession(): Promise<string> {
  const raw = process.env.TRIPLETEX_TOKEN ?? ""
  let employeeToken = raw
  try {
    const decoded = JSON.parse(Buffer.from(raw, "base64").toString("utf-8"))
    if (decoded.token) employeeToken = decoded.token
  } catch {}

  const consumerToken = process.env.TRIPLETEX_CONSUMER_TOKEN ?? "0"
  const exp = fmt(new Date(Date.now() + 86400000))

  const res = await fetch(
    `${BASE}/token/session/:create?consumerToken=${encodeURIComponent(consumerToken)}&employeeToken=${encodeURIComponent(employeeToken)}&expirationDate=${exp}`,
    { method: "PUT" }
  )
  if (!res.ok) throw new Error(`Tripletex session: ${res.status}`)
  const body = await res.json()
  const { id, token } = body.value
  return "Basic " + Buffer.from(`${id}:${token}`).toString("base64")
}

async function sumInvoices(authHeader: string, from: string, to: string): Promise<number> {
  const res = await fetch(
    `${BASE}/invoice?invoiceDateFrom=${from}&invoiceDateTo=${to}&count=200&fields=amount`,
    { headers: { Authorization: authHeader } }
  )
  if (!res.ok) return 0
  const data = await res.json()
  const values: any[] = data.values ?? []
  return values.reduce((s, inv) => s + (inv.amount ?? 0), 0)
}

export const revalidate = 300

export async function GET() {
  try {
    const authHeader = await createSession()
    const now = new Date()

    // Current month revenue
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const omsMnd = Math.round(await sumInvoices(authHeader, fmt(firstOfMonth), fmt(now)))

    // MRR approximation: average of last 3 months
    const threeMonthsAgo = new Date(now)
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    const total3m = await sumInvoices(authHeader, fmt(threeMonthsAgo), fmt(now))
    const mrr = Math.round(total3m / 3)

    return NextResponse.json({ omsMnd, omsMndTarget: 500000, mrr, mrrTarget: 400000, source: "tripletex" })
  } catch (err) {
    console.error("Tripletex error:", err)
    return NextResponse.json({ omsMnd: 312000, omsMndTarget: 500000, mrr: 290000, mrrTarget: 400000, source: "mock" })
  }
}
