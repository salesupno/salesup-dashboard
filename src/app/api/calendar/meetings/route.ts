import { NextResponse } from "next/server"
import { auth } from "@/auth"

export const dynamic = "force-dynamic"

const MONTHS_NO = ["Jan","Feb","Mar","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Des"]

async function fetchCalendarList(accessToken: string): Promise<any[]> {
  const items: any[] = []
  let pageToken = ""

  for (let page = 0; page < 10; page++) {
    const params = new URLSearchParams({ maxResults: "250" })
    if (pageToken) params.set("pageToken", pageToken)

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/users/me/calendarList?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    if (!res.ok) {
      const body = await res.text().catch(() => "")
      throw new Error(`Google Calendar list failed: ${res.status} ${body.slice(0, 240)}`)
    }

    const data = await res.json()
    items.push(...(data.items ?? []))
    pageToken = data.nextPageToken ?? ""
    if (!pageToken) break
  }

  return items
}

async function fetchCalendarEvents(
  calendarId: string,
  accessToken: string,
  baseParams: URLSearchParams
): Promise<{ ok: true; id: string; status: 200; body: string; items: any[] } | { ok: false; id: string; status: number; body: string; items: any[] }> {
  const items: any[] = []
  let pageToken = ""

  for (let page = 0; page < 20; page++) {
    const params = new URLSearchParams(baseParams)
    if (pageToken) params.set("pageToken", pageToken)

    const r = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!r.ok) {
      const text = await r.text().catch(() => "")
      return { ok: false, id: calendarId, status: r.status, body: text, items: [] }
    }

    const d = await r.json()
    items.push(...(d.items ?? []))
    pageToken = d.nextPageToken ?? ""
    if (!pageToken) break
  }

  return { ok: true, id: calendarId, status: 200, body: "", items }
}

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

    // Fetch all calendars the user has access to (paginated)
    stage = "calendarList"
    const allCals: any[] = await fetchCalendarList(accessToken)

    // Include org/team calendars broadly. If Tommy's calendar is shared/subscribed,
    // it should now be included even if it was beyond the first calendarList page.
    const relevantCals = allCals.filter((cal: any) => {
      const id: string = cal.id ?? ""
      const summary: string = (cal.summary ?? "").toLowerCase()
      if (id === "primary") return true
      if (id.endsWith("@salesup.no")) return true
      if (summary.includes("salesup")) return true
      // shared calendars: not gmail, not group.v.calendar.google.com holiday/contact
      if (id.includes("holiday") || id.includes("contact") || id.endsWith("@gmail.com")) return false
      // include calendars the user has explicitly added in any read-capable role
      return cal.accessRole === "owner" || cal.accessRole === "writer" || cal.accessRole === "reader" || cal.accessRole === "freeBusyReader"
    })

    // Fetch events from all relevant calendars in parallel.
    // Important: one forbidden/shared calendar must not kill the whole sync,
    // otherwise a single inaccessible calendar hides all real meetings.
    stage = "events"
    const calEventFetches = relevantCals.map((cal: any) =>
      fetchCalendarEvents(cal.id as string, accessToken, params)
    )
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

    const allEvents: Array<{ id: string; summary: string; date: string; attendeeEmails: string[] }> = []
    for (const evt of events) {
      const start = evt.start?.dateTime ?? evt.start?.date
      if (!start) continue
      const id = evt.id ?? evt.iCalUID ?? `${evt.summary ?? ""}-${start}`
      const attendeeEmails: string[] = (evt.attendees ?? [])
        .map((a: any) => (a.email ?? "").toLowerCase())
        .filter((e: string) => e && !e.endsWith("@resource.calendar.google.com"))
      allEvents.push({ id, summary: (evt.summary ?? "").toLowerCase(), date: start, attendeeEmails })
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
      debug: {
        stage,
        hasSession: !!session,
        hasUser: !!session?.user,
        hasAccessToken: !!session?.accessToken,
        hasError: !!session?.error,
      },
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
      debug: {
        stage,
        hasSession: !!(await auth().catch(() => null)),
      },
    })
  }
}
