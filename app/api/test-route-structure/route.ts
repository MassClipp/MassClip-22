import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "API routes are working correctly",
    timestamp: new Date().toISOString(),
    routes: {
      checkout: "/api/creator/product-boxes/[id]/checkout",
      debug: {
        session: "/api/debug/stripe-session",
        testCheckout: "/api/debug/test-checkout-creation",
        environment: "/api/debug/environment-info",
        stripeConfig: "/api/debug/stripe-config",
      },
    },
  })
}

export async function POST() {
  return NextResponse.json({
    success: true,
    message: "POST method working",
    timestamp: new Date().toISOString(),
  })
}
