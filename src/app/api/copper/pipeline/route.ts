// Copper CRM API — customers, pipeline & win rate
// Docs: https://developer.copper.com/

import { NextResponse } from "next/server"

export async function GET() {
  // TODO: Replace with real Copper CRM API call
  // const apiKey = process.env.COPPER_API_KEY
  // const response = await fetch("https://api.copper.com/developer_api/v1/people/search", {
  //   method: "POST",
  //   headers: {
  //     "X-PW-AccessToken": apiKey,
  //     "X-PW-Application": "developer_api",
  //     "X-PW-UserEmail": process.env.COPPER_USER_EMAIL,
  //     "Content-Type": "application/json",
  //   },
  //   body: JSON.stringify({ page_size: 200 }),
  // })

  return NextResponse.json({
    pipeline: { valueMill: 4.2, winRatePct: 28 },
    customers: [], // will be populated from Copper
    source: "mock",
  })
}
