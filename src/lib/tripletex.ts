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
