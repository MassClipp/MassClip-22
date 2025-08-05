import { type NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  console.log("🧪 TEST WEBHOOK ENDPOINT HIT")
  console.log("Method:", req.method)
  console.log("URL:", req.url)
  console.log("Timestamp:", new Date().toISOString())

  return NextResponse.json({
    message: "Test webhook endpoint working",
    method: req.method,
    timestamp: new Date().toISOString(),
    url: req.url,
  })
}

export async function POST(req: NextRequest) {
  console.log("🧪 TEST WEBHOOK POST ENDPOINT HIT")
  console.log("Method:", req.method)
  console.log("URL:", req.url)
  console.log("Headers:", Object.fromEntries(req.headers.entries()))
  console.log("Timestamp:", new Date().toISOString())

  return NextResponse.json({
    message: "Test webhook POST endpoint working",
    method: req.method,
    timestamp: new Date().toISOString(),
    url: req.url,
  })
}
