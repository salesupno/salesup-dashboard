import { NextResponse } from "next/server"
import { auth } from "@/auth"

export const dynamic = "force-dynamic"

const MONTHS_NO = ["Jan","Feb","Mar","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Des"]

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const months = Math.min(12, Math.max(1, parseInt(searchParams.get("months") ?? "6", 10)))
  let stage = "init"

  try {
    stage = "auth"
    const session = await auth()
    if (session?.error) throw new Error(`Session error: ${session.error}`)
    const accessToken = session?.accessToken
    if (!accessToken) throw new Error("No access token — re-login required for calendar access")

    const now = new Date()
    const from = new Date(now)
    from.setMonth(from.getMonth() - months)

    const params = new URLSearchParams({
      timeMin: from.toISOString(),
      timeMax: now.toISOString(),
      maxResults: "500",
      singleEvents: "true",
      orderBy: "startTime",
    })

    // Fetch all calendars the user has access to
    stage = "calendarList"
    const calListRes = await fetch(
      "https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=50",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!calListRes.ok) {
      throw new Error(`Google Calendar list failed: ${calListRes.status}`)
    }
    const calList = calListRes.ok ? await calListRes.json() : { items: [] }
    const allCals: any[] = calList.items ?? []

    // Include: own @salesup.no calendars, shared/team calendars (not gmail/holiday/etc)
    const relevantCals = allCals.filter((cal: any) => {
      const id: string = cal.id ?? ""
      if (id === "primary") return true
      if (id.endsWith("@salesup.no")) return true
      // shared calendars: not gmail, not group.v.calendar.google.com holiday/contact
      if (id.includes("holiday") || id.includes("contact") || id.endsWith("@gmail.com")) return false
      // include other calendars the user has explicitly added (shared team calendars)
      return cal.accessRole === "owner" || cal.accessRole === "writer" || cal.accessRole === "reader"
    })

    // Fetch events from all relevant calendars in parallel.
    // Important: one forbidden/shared calendar must not kill the whole sync,
    // otherwise a single inaccessible calendar hides all real meetings.
    stage = "events"
    const calEventFetches = relevantCals.map(async (cal: any) => {
      const r = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?${params}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      if (!r.ok) {
        const text = await r.text().catch(() => "")
        return { ok: false as const, id: cal.id as string, status: r.status, body: text, items: [] as any[] }
      }
      const d = await r.json()
      return { ok: true as const, id: cal.id as string, status: 200, body: "", items: d.items ?? [] }
    })
    const calResults = await Promise.all(calEventFetches)

    // Merge and deduplicate by event ID
    const seenIds = new Set<string>()
    const events: any[] = []
    const failedCalendars = calResults.filter((r) => !r.ok)
    for (const result of calResults) {
      if (!result.ok) {
        console.warn("Google Calendar skipped calendar:", result.id, result.status, result.body.slice(0, 120))
        continue
      }
      for (const evt of result.items) {
        const key = evt.id ?? evt.iCalUID ?? JSON.stringify(evt)
        if (!seenIds.has(key)) {
          seenIds.add(key)
          events.push(evt)
        }
      }
    }

    // Count meetings per month (events with ≥2 attendees or "møte" in title)
    const monthMap = new Map<string, number>()
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setMonth(d.getMonth() - i)
      monthMap.set(MONTHS_NO[d.getMonth()], 0)
    }

    const allEvents: Array<{ summary: string; date: string; attendeeEmails: string[] }> = []
    for (const evt of events) {
      const start = evt.start?.dateTime ?? evt.start?.date
      if (!start) continue
      const attendeeEmails: string[] = (evt.attendees ?? [])
        .map((a: any) => (a.email ?? "").toLowerCase())
        .filter((e: string) => e && !e.endsWith("@resource.calendar.google.com"))
      allEvents.push({ summary: (evt.summary ?? "").toLowerCase(), date: start, attendeeEmails })
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

    return NextResponse.json({
      monthly,
      allEvents,
      source: "google_calendar",
      warnings: failedCalendars.map((r) => ({ id: r.id, status: r.status, body: r.body.slice(0, 200) })),
    })
  } catch (err) {
    const reason = err instanceof Error ? err.message : "Unknown calendar error"
    console.error("Calendar error:", reason)
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
      reason,
      stage,
    })
  }
}
