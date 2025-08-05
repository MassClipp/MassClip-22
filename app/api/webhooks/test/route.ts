import { NextResponse } from "next/server"

export async function GET() {
  console.log("🧪 Test endpoint hit at:", new Date().toISOString())

  return NextResponse.json({
    status: "working",
    timestamp: new Date().toISOString(),
    message: "Test endpoint is functioning correctly",
  })
}

export async function POST() {
  console.log("🧪 Test POST endpoint hit at:", new Date().toISOString())

  return NextResponse.json({
    status: "working",
    method: "POST",
    timestamp: new Date().toISOString(),
    message: "Test POST endpoint is functioning correctly",
  })
}
