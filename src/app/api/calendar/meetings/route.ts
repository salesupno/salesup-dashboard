import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { monthKey } from "@/lib/period"

export const dynamic = "force-dynamic"

const MONTHS_NO = ["Jan","Feb","Mar","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Des"]

// Calendars always read directly, whether or not the signed-in user added them.
// Override with TEAM_CALENDAR_IDS (comma-separated) as the team changes.
const ORG_DOMAIN = "salesup.no"

// Calendars always read directly, even before anyone shows up as an attendee.
const TEAM_CALENDAR_IDS = (process.env.TEAM_CALENDAR_IDS ?? "tommy@salesup.no")
  .split(",")
  .map((id) => id.trim().toLowerCase())
  .filter(Boolean)

// Cap the colleague discovery pass so a large org can never fan out unbounded.
const MAX_DISCOVERED_CALENDARS = 12

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
  const endParam = searchParams.get("end")
  const end = endParam && /^\d{4}-(0[1-9]|1[0-2])$/.test(endParam) ? endParam : monthKey(new Date())
  let stage = "init"

  try {
    stage = "auth"
    const session = await auth()
    if (session?.error) throw new Error(`Session error: ${session.error}`)
    const accessToken = session?.accessToken
    if (!accessToken) throw new Error("No access token — re-login required for calendar access")

    const now = new Date()
    // The window ends with the selected month (capped at today) and spans `months`
    // months back, so picking "August" still fetches the meetings around it.
    const endOfSelected = new Date(parseInt(end.slice(0, 4), 10), parseInt(end.slice(5, 7), 10), 0, 23, 59, 59)
    const to = new Date(Math.min(endOfSelected.getTime(), now.getTime()))
    const from = new Date(to.getFullYear(), to.getMonth() - (months - 1), 1)

    const params = new URLSearchParams({
      timeMin: from.toISOString(),
      timeMax: to.toISOString(),
      maxResults: "500",
      singleEvents: "true",
      orderBy: "startTime",
    })

    // Fetch all calendars the user has access to (paginated)
    stage = "calendarList"
    const allCals: any[] = await fetchCalendarList(accessToken)

    // Include org/team calendars broadly. If a colleague's calendar is
    // shared/subscribed, it is included even if it was beyond the first page.
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

    // A colleague's calendar only shows up in calendarList once the signed-in user
    // has actually ADDED it. Shared-but-not-added calendars are still readable by
    // id, so team calendars are always requested directly — otherwise meetings the
    // signed-in user was not invited to are invisible.
    const roleById = new Map<string, string>(
      allCals.map((cal: any) => [String(cal.id ?? ""), String(cal.accessRole ?? "")])
    )
    const calendarIds: string[] = []
    for (const id of [...relevantCals.map((c: any) => String(c.id ?? "")), ...TEAM_CALENDAR_IDS]) {
      if (id && !calendarIds.includes(id)) calendarIds.push(id)
    }

    // Fetch events from all relevant calendars in parallel.
    // Important: one forbidden/shared calendar must not kill the whole sync,
    // otherwise a single inaccessible calendar hides all real meetings.
    stage = "events"
    const calResults = await Promise.all(
      calendarIds.map((id) => fetchCalendarEvents(id, accessToken, params))
    )

    // Second pass: every @salesup.no colleague seen as an attendee is a calendar
    // worth trying, whether or not anyone configured their address. This keeps the
    // team list correct on its own as people join, and an unshared calendar simply
    // comes back 403/404 and is reported below.
    stage = "colleagues"
    const colleagues = new Set<string>()
    for (const result of calResults) {
      for (const evt of result.items) {
        for (const attendee of evt.attendees ?? []) {
          const email = String(attendee.email ?? "").toLowerCase().trim()
          if (email.endsWith(`@${ORG_DOMAIN}`) && !calendarIds.includes(email)) colleagues.add(email)
        }
        const organizer = String(evt.organizer?.email ?? "").toLowerCase().trim()
        if (organizer.endsWith(`@${ORG_DOMAIN}`) && !calendarIds.includes(organizer)) colleagues.add(organizer)
      }
    }
    const discoveredIds = Array.from(colleagues).slice(0, MAX_DISCOVERED_CALENDARS)
    const discoveredResults = await Promise.all(
      discoveredIds.map((id) => fetchCalendarEvents(id, accessToken, params))
    )

    const allResults = [...calResults, ...discoveredResults]
    const discovered = new Set(discoveredIds)

    // Merge and deduplicate by event ID. The same invite on two colleagues'
    // calendars carries the same id, so nothing is double counted.
    const seenIds = new Set<string>()
    const events: any[] = []
    const failedCalendars = allResults.filter((r) => !r.ok)
    for (const result of allResults) {
      if (!result.ok) {
        console.warn("Google Calendar skipped calendar:", result.id, result.status, result.body.slice(0, 120))
        continue
      }
      for (const evt of result.items) {
        const key = evt.id ?? evt.iCalUID ?? JSON.stringify(evt)
        if (!seenIds.has(key)) {
          seenIds.add(key)
          events.push({ ...evt, __calendarId: result.id })
        }
      }
    }

    // Per-calendar diagnostics: without this an empty result is indistinguishable
    // from a sharing problem on someone else's calendar.
    const calendars = allResults.map((result) => {
      const role = roleById.get(result.id) ?? ""
      return {
        id: result.id,
        ok: result.ok,
        status: result.status,
        events: result.items.length,
        inCalendarList: roleById.has(result.id),
        discovered: discovered.has(result.id),
        accessRole: role,
        // freeBusyReader hides titles and attendees, so such events can never be classified.
        detailsVisible: role !== "freeBusyReader",
        error: result.ok ? "" : result.body.slice(0, 160),
      }
    })

    // Count meetings per month (events with ≥2 attendees or "møte" in title)
    const monthMap = new Map<string, number>()
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(to.getFullYear(), to.getMonth() - i, 1)
      monthMap.set(MONTHS_NO[d.getMonth()], 0)
    }

    const allEvents: Array<{
      id: string
      summary: string
      date: string
      attendeeEmails: string[]
      attendees: Array<{ email: string; name: string }>
      calendarId: string
    }> = []
    for (const evt of events) {
      const start = evt.start?.dateTime ?? evt.start?.date
      if (!start) continue
      const id = evt.id ?? evt.iCalUID ?? `${evt.summary ?? ""}-${start}`
      const attendees: Array<{ email: string; name: string }> = (evt.attendees ?? [])
        .map((a: any) => ({
          email: String(a.email ?? "").toLowerCase(),
          name: String(a.displayName ?? "").trim(),
        }))
        .filter((a: { email: string }) => a.email && !a.email.endsWith("@resource.calendar.google.com"))
      const attendeeEmails: string[] = attendees.map((a) => a.email)
      // Title keeps its original casing for display; classification lowercases itself.
      allEvents.push({
        id,
        summary: evt.summary ?? "",
        date: start,
        attendeeEmails,
        attendees,
        calendarId: evt.__calendarId ?? "",
      })
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
      window: { from: from.toISOString(), to: to.toISOString(), end, months },
      calendars,
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
