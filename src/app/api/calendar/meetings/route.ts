// Google Calendar API — meetings per customer & monthly totals
// Reads calendar events to count meetings and find last meeting per customer
// Setup: https://developers.google.com/calendar/api/quickstart/nodejs

import { NextResponse } from "next/server"

export async function GET() {
  // TODO: Replace with real Google Calendar API call
  // Uses the signed-in user's Google OAuth token (from NextAuth session)
  // const { data: session } = await auth()
  // const calendar = google.calendar({ version: "v3", auth: oauth2Client })
  // const events = await calendar.events.list({ calendarId: "primary", ... })

  return NextResponse.json({
    monthly: [
      { month: "Jan", meetings: 34, wins: 5 },
      { month: "Feb", meetings: 41, wins: 7 },
      { month: "Mar", meetings: 38, wins: 6 },
      { month: "Apr", meetings: 45, wins: 9 },
      { month: "Mai", meetings: 43, wins: 8 },
      { month: "Jun", meetings: 48, wins: 11 },
    ],
    // lastMeetingPerCustomer: { "Kundenavn": "2026-06-07", ... }
    lastMeetingPerCustomer: {},
    source: "mock",
  })
}
