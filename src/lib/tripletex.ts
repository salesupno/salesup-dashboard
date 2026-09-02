// Shared Tripletex API helpers.
// Uses the internal-integration JWT flow: one JWT (TRIPLETEX_TOKEN) is exchanged
// for a short-lived session token, then Basic auth with username "0".

export const TRIPLETEX_BASE = "https://tripletex.no/v2"

// Session tokens may live max 28800 seconds (8h) per Tripletex validation.
const SESSION_TTL_SECONDS = 28800

export function fmtDate(d: Date): string {
  return d.toISOString().split("T")[0]
}

export async function createTripletexSession(): Promise<string> {
  const refreshToken = (process.env.TRIPLETEX_TOKEN ?? "").trim()
  if (!refreshToken) throw new Error("Tripletex: missing TRIPLETEX_TOKEN")

  const res = await fetch(`${TRIPLETEX_BASE}/token/session/:createFromRefreshToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken, ttlSeconds: SESSION_TTL_SECONDS }),
  })
  if (!res.ok) throw new Error(`Tripletex session: ${res.status} ${await res.text()}`)
  const body = await res.json()
  const sessionToken = body.value.token
  // Internal integration: username 0, session token as password.
  return "Basic " + Buffer.from(`0:${sessionToken}`).toString("base64")
}

type RawInvoice = {
  amountExcludingVat?: number
  amount?: number
  invoiceDate?: string
  customer?: { id?: number }
}

export type TripletexInvoice = {
  amount: number
  date: string
  customerId: number | null
}

// Every invoice in [from, to] (inclusive), paginated so nothing is missed.
// Bounded page count so a runaway response can never hang a route.
export async function fetchAllInvoices(
  authHeader: string,
  from: string,
  to: string,
  maxPages = 60
): Promise<TripletexInvoice[]> {
  const out: TripletexInvoice[] = []
  const pageSize = 1000
  let offset = 0

  for (let page = 0; page < maxPages; page++) {
    const res = await fetch(
      `${TRIPLETEX_BASE}/invoice?invoiceDateFrom=${from}&invoiceDateTo=${to}` +
        `&from=${offset}&count=${pageSize}&fields=amountExcludingVat,amount,invoiceDate,customer(id)`,
      { headers: { Authorization: authHeader } }
    )
    if (!res.ok) break
    const data = await res.json()
    const values: RawInvoice[] = data.values ?? []
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

export async function fetchCustomerIndex(
  authHeader: string
): Promise<Map<number, { name: string; domain: string }>> {
  const index = new Map<number, { name: string; domain: string }>()
  const res = await fetch(`${TRIPLETEX_BASE}/customer?count=2000&fields=id,name,email`, {
    headers: { Authorization: authHeader },
  })
  if (!res.ok) return index
  const body = await res.json()
  const values: Array<{ id: number; name?: string; email?: string }> = body.values ?? []
  for (const c of values) {
    const email = String(c.email ?? "").trim().toLowerCase()
    index.set(c.id, {
      name: String(c.name ?? "").trim(),
      domain: email.includes("@") ? email.split("@").pop() ?? "" : "",
    })
  }
  return index
}
