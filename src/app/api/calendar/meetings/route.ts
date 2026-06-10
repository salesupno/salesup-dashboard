import { NextResponse } from "next/server"
import { auth } from "@/auth"

export const dynamic = "force-dynamic"

const MONTHS_NO = ["Jan","Feb","Mar","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Des"]

export async function GET() {
  try {
    const session = await auth()
    const accessToken = session?.accessToken
    if (!accessToken) throw new Error("No access token — re-login required for calendar access")

    const now = new Date()
    const sixAgo = new Date(now)
    sixAgo.setMonth(sixAgo.getMonth() - 6)

    const params = new URLSearchParams({
      timeMin: sixAgo.toISOString(),
      timeMax: now.toISOString(),
      maxResults: "500",
      singleEvents: "true",
      orderBy: "startTime",
    })

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!res.ok) throw new Error(`Google Calendar: ${res.status}`)
    const data = await res.json()
    const events: any[] = data.items ?? []

    // Count meetings per month (events with ≥2 attendees or "møte" in title)
    const monthMap = new Map<string, number>()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now)
      d.setMonth(d.getMonth() - i)
      monthMap.set(MONTHS_NO[d.getMonth()], 0)
    }

    const allEvents: Array<{ summary: string; date: string }> = []
    for (const evt of events) {
      const start = evt.start?.dateTime ?? evt.start?.date
      if (!start) continue
      allEvents.push({ summary: (evt.summary ?? "").toLowerCase(), date: start })
      const key = MONTHS_NO[new Date(start).getMonth()]
      if (!monthMap.has(key)) continue
      const isCustomerMeeting =
        (evt.attendees?.length ?? 0) >= 2 ||
        (evt.summary ?? "").toLowerCase().includes("møte")
      if (isCustomerMeeting) monthMap.set(key, monthMap.get(key)! + 1)
    }

    const monthly = Array.from(monthMap.entries()).map(([month, meetings]) => ({
      month,
      meetings,
      wins: 0, // wins come from Copper CRM
    }))

    return NextResponse.json({ monthly, allEvents, source: "google_calendar" })
  } catch (err) {
    console.error("Calendar error:", err)
    return NextResponse.json({
      monthly: [
        { month: "Jan", meetings: 34, wins: 5 },
        { month: "Feb", meetings: 41, wins: 7 },
        { month: "Mar", meetings: 38, wins: 6 },
        { month: "Apr", meetings: 45, wins: 9 },
        { month: "Mai", meetings: 43, wins: 8 },
        { month: "Jun", meetings: 48, wins: 11 },
      ],
      allEvents: [],
      source: "mock",
    })
  }
}
