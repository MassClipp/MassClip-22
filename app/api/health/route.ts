import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    const healthCheck = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        stripe: { status: "unknown", details: "" },
        firebase: { status: "unknown", details: "" },
        database: { status: "unknown", details: "" },
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        stripeMode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "live" : "test",
        domain: process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || "unknown",
      },
    }

    // Test Stripe
    try {
      const account = await stripe.accounts.retrieve()
      healthCheck.services.stripe.status = "healthy"
      healthCheck.services.stripe.details = `Connected to account: ${account.id}`
    } catch (error: any) {
      healthCheck.services.stripe.status = "unhealthy"
      healthCheck.services.stripe.details = error.message
      healthCheck.status = "degraded"
    }

    // Test Firebase/Firestore
    try {
      const startTime = Date.now()
      await db.collection("_health_check").doc("test").set({
        timestamp: new Date(),
        test: true,
      })
      const responseTime = Date.now() - startTime

      healthCheck.services.firebase.status = "healthy"
      healthCheck.services.firebase.details = `Response time: ${responseTime}ms`
      healthCheck.services.database = healthCheck.services.firebase
    } catch (error: any) {
      healthCheck.services.firebase.status = "unhealthy"
      healthCheck.services.firebase.details = error.message
      healthCheck.services.database = healthCheck.services.firebase
      healthCheck.status = "degraded"
    }

    // Determine overall status
    const allHealthy = Object.values(healthCheck.services).every((service) => service.status === "healthy")
    if (!allHealthy && healthCheck.status === "healthy") {
      healthCheck.status = "degraded"
    }

    const statusCode = healthCheck.status === "healthy" ? 200 : 503

    console.log(`🏥 [Health Check] Overall status: ${healthCheck.status}`)

    return NextResponse.json(healthCheck, { status: statusCode })
  } catch (error: any) {
    console.error("❌ [Health Check] Health check failed:", error)
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error.message,
      },
      { status: 503 },
    )
  }
}
