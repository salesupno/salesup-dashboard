// Tripletex API — revenue & MRR data
// Replace mock data with live Tripletex calls using your API credentials
// Docs: https://tripletex.no/execute/docViewer?articleId=853&language=0

import { NextResponse } from "next/server"

export async function GET() {
  // TODO: Replace with real Tripletex API call
  // const token = process.env.TRIPLETEX_TOKEN
  // const response = await fetch(`https://tripletex.no/v2/ledger/balance`, {
  //   headers: { Authorization: `Bearer ${token}` },
  // })

  return NextResponse.json({
    omsMnd: 312000,
    omsMndTarget: 500000,
    mrr: 290000,
    mrrTarget: 400000,
    source: "mock",
  })
}
