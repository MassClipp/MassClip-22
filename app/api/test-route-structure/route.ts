import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    message: "API routes are working",
    timestamp: new Date().toISOString(),
    routes: {
      checkout: "/api/creator/product-boxes/[id]/checkout",
      "debug-session": "/api/debug/stripe-session",
      "debug-config": "/api/debug/stripe-config",
      "test-checkout": "/api/debug/test-checkout-creation",
      environment: "/api/debug/environment-info",
    },
  })
}
