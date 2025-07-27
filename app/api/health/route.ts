import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    console.log("🏥 [Health Check] Starting health check...")

    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        stripe: false,
        firebase: false,
        database: false,
      },
      version: process.env.npm_package_version || "unknown",
      environment: process.env.NODE_ENV || "unknown",
      uptime: process.uptime(),
      errors: [] as string[],
    }

    // Check Stripe
    try {
      await stripe.accounts.retrieve()
      health.services.stripe = true
      console.log("✅ [Health Check] Stripe OK")
    } catch (error: any) {
      health.services.stripe = false
      health.errors.push(`Stripe: ${error.message}`)
      console.error("❌ [Health Check] Stripe failed:", error.message)
    }

    // Check Firebase
    try {
      await db.collection("health").limit(1).get()
      health.services.firebase = true
      health.services.database = true
      console.log("✅ [Health Check] Firebase OK")
    } catch (error: any) {
      health.services.firebase = false
      health.services.database = false
      health.errors.push(`Firebase: ${error.message}`)
      console.error("❌ [Health Check] Firebase failed:", error.message)
    }

    // Determine overall status
    const allServicesHealthy = Object.values(health.services).every((service) => service === true)
    health.status = allServicesHealthy ? "healthy" : "degraded"

    const statusCode = health.status === "healthy" ? 200 : 503

    console.log(`${health.status === "healthy" ? "✅" : "⚠️"} [Health Check] Overall status: ${health.status}`)

    return NextResponse.json(health, { status: statusCode })
  } catch (error: any) {
    console.error("❌ [Health Check] Health check failed:", error)
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error.message,
        services: {
          stripe: false,
          firebase: false,
          database: false,
        },
      },
      { status: 503 },
    )
  }
}
