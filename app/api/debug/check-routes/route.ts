import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const routes = [
    "/api/purchase/grant-immediate-access",
    "/api/stripe/create-checkout-session",
    "/api/debug/stripe-mode",
    "/api/auth/session",
  ]

  const results = []

  for (const route of routes) {
    try {
      const url = new URL(route, request.url)
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      results.push({
        route,
        status: response.status,
        exists: response.status !== 404,
        statusText: response.statusText,
      })
    } catch (error: any) {
      results.push({
        route,
        status: "ERROR",
        exists: false,
        error: error.message,
      })
    }
  }

  return NextResponse.json({
    message: "Route check complete",
    timestamp: new Date().toISOString(),
    results,
  })
}
