import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Basic health checks
    const checks = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      stripeConfigured: !!process.env.STRIPE_SECRET_KEY,
      webhookConfigured: !!(process.env.STRIPE_WEBHOOK_SECRET_LIVE || process.env.STRIPE_WEBHOOK_SECRET),
      firebaseConfigured: !!process.env.FIREBASE_PROJECT_ID,
    }

    const allHealthy = Object.values(checks).every((check) => (typeof check === "boolean" ? check : true))

    return NextResponse.json(
      {
        status: allHealthy ? "healthy" : "degraded",
        checks,
      },
      {
        status: allHealthy ? 200 : 503,
      },
    )
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        error: "Health check failed",
      },
      { status: 503 },
    )
  }
}
