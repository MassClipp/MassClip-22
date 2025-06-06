import { NextResponse } from "next/server"
import { headers } from "next/headers"

export async function GET(request: Request) {
  const headersList = headers()
  const userAgent = headersList.get("user-agent") || "Unknown"

  return NextResponse.json({
    status: "success",
    message: "Security diagnostic information",
    diagnostics: {
      userAgent,
      timestamp: new Date().toISOString(),
      headers: Object.fromEntries(headersList.entries()),
    },
  })
}
