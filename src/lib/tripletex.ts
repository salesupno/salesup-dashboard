// Shared Tripletex API helpers.
// Uses the internal-integration JWT flow: one JWT (TRIPLETEX_TOKEN) is exchanged
// for a short-lived session token, then Basic auth with username "0".

export const TRIPLETEX_BASE = "https://tripletex.no/v2"

// Session tokens may live max 28800 seconds (8h) per Tripletex validation.
const SESSION_TTL_SECONDS = 28800

export function fmtDate(d: Date): string {
  return d.toISOString().split("T")[0]
}

// Tripletex answers 409 RevisionException when sessions are created concurrently,
// and the dashboard loads four routes at once. One cached session is shared, and
// callers that arrive while a session is being created await the same request.
const SESSION_CACHE_MS = 30 * 60 * 1000
let cachedSession: { header: string; expires: number } | null = null
let sessionInFlight: Promise<string> | null = null

async function requestSession(): Promise<string> {
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

export async function createTripletexSession(): Promise<string> {
  if (cachedSession && Date.now() < cachedSession.expires) return cachedSession.header
  if (sessionInFlight) return sessionInFlight

  const pending = requestSession()
    .then((header) => {
      cachedSession = { header, expires: Date.now() + SESSION_CACHE_MS }
      return header
    })
    .finally(() => {
      if (sessionInFlight === pending) sessionInFlight = null
    })

  sessionInFlight = pending
  return pending
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
const INVOICE_CACHE_MS = 3 * 60 * 1000
const invoiceCache = new Map<string, { at: number; data: TripletexInvoice[] }>()
const invoiceInFlight = new Map<string, Promise<TripletexInvoice[]>>()

// Wins and invoices both need the same full history. Fetching it twice per page
// load doubles a slow, many-page call for no gain, so results are shared briefly.
export async function fetchAllInvoices(
  authHeader: string,
  from: string,
  to: string,
  maxPages = 60
): Promise<TripletexInvoice[]> {
  const key = `${from}|${to}|${maxPages}`
  const hit = invoiceCache.get(key)
  if (hit && Date.now() - hit.at < INVOICE_CACHE_MS) return hit.data
  const inFlight = invoiceInFlight.get(key)
  if (inFlight) return inFlight

  const pending = fetchInvoicePages(authHeader, from, to, maxPages)
    .then((data) => {
      invoiceCache.set(key, { at: Date.now(), data })
      return data
    })
    .finally(() => { invoiceInFlight.delete(key) })

  invoiceInFlight.set(key, pending)
  return pending
}

async function fetchInvoicePages(
  authHeader: string,
  from: string,
  to: string,
  maxPages: number
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
