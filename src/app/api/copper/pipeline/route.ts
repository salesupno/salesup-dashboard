import { NextResponse } from "next/server"

const COPPER = "https://api.copper.com/developer_api/v1"

function copperHeaders() {
  return {
    "X-PW-AccessToken": process.env.COPPER_API_KEY!,
    "X-PW-Application": "developer_api",
    "X-PW-UserEmail": process.env.COPPER_USER_EMAIL!,
    "Content-Type": "application/json",
  }
}

async function copperSearch(path: string, body: object): Promise<any[]> {
  const res = await fetch(`${COPPER}/${path}`, {
    method: "POST",
    headers: copperHeaders(),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Copper ${path}: ${res.status}`)
  return res.json()
}

export const revalidate = 300

export async function GET() {
  try {
    const [companies, openOpps, closedOpps] = await Promise.all([
      copperSearch("companies/search", { page_size: 200 }),
      copperSearch("opportunities/search", { page_size: 200, statuses: ["Open"] }),
      copperSearch("opportunities/search", { page_size: 200, statuses: ["Won", "Lost"] }),
    ])

    // Pipeline
    const pipelineKr = openOpps.reduce((s: number, o: any) => s + (o.monetary_value ?? 0), 0)
    const won = closedOpps.filter((o: any) => o.status === "Won").length
    const winRatePct = closedOpps.length ? Math.round((won / closedOpps.length) * 100) : 0

    // Recent activities for last contact per company
    const sixtyDaysAgo = Math.floor((Date.now() - 60 * 86400 * 1000) / 1000)
    let activities: any[] = []
    try {
      activities = await copperSearch("activities/search", {
        minimum_activity_date: sixtyDaysAgo,
        page_size: 200,
      })
    } catch {}

    const lastActivityMap: Record<string, number> = {}
    for (const act of activities) {
      if (act.parent?.type !== "company") continue
      const id = String(act.parent.id)
      const ts: number = act.details?.date_time ?? 0
      if (!lastActivityMap[id] || ts > lastActivityMap[id]) lastActivityMap[id] = ts
    }

    // Map companies → customer format
    const nowSec = Date.now() / 1000
    const customers = companies.map((c: any) => {
      const tenure = c.date_created
        ? Math.max(0, Math.round((nowSec - c.date_created) / (30.44 * 24 * 3600)))
        : 0
      const lastTs = lastActivityMap[String(c.id)]
      let lastContact: string | null = null
      if (lastTs) {
        const days = Math.round((nowSec - lastTs) / 86400)
        lastContact = days === 0 ? "i dag" : days === 1 ? "i går" : `${days} dager siden`
      }
      return {
        id: String(c.id),
        name: c.name as string,
        type: (c.tags?.[0] as string) ?? "Annet",
        tenure,
        lastContact,
      }
    })

    return NextResponse.json({
      pipeline: {
        valueMill: Math.round(pipelineKr / 100000) / 10,
        winRatePct,
      },
      customers,
      source: "copper",
    })
  } catch (err) {
    console.error("Copper error:", err)
    return NextResponse.json({
      pipeline: { valueMill: 4.2, winRatePct: 28 },
      customers: [],
      source: "mock",
    })
  }
}
