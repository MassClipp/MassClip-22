import { NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { collection, limit, getDocs, query } from "firebase/firestore"

export async function GET() {
  try {
    console.log("🔍 [Health Check] Starting health check")

    const healthStatus = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        firebase: "unknown",
        stripe: "unknown",
        server: "healthy",
      },
      version: process.env.npm_package_version || "unknown",
    }

    // Test Firebase connection
    try {
      console.log("🔍 [Health Check] Testing Firebase connection")
      const testQuery = query(collection(db, "users"), limit(1))
      await getDocs(testQuery)
      healthStatus.services.firebase = "healthy"
      console.log("✅ [Health Check] Firebase connection successful")
    } catch (firebaseError) {
      console.error("❌ [Health Check] Firebase connection failed:", firebaseError)
      healthStatus.services.firebase = "unhealthy"
      healthStatus.status = "degraded"
    }

    // Test Stripe connection (if available)
    try {
      if (process.env.STRIPE_SECRET_KEY) {
        console.log("🔍 [Health Check] Testing Stripe connection")
        const Stripe = require("stripe")
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
          apiVersion: "2024-06-20",
        })
        await stripe.accounts.list({ limit: 1 })
        healthStatus.services.stripe = "healthy"
        console.log("✅ [Health Check] Stripe connection successful")
      } else {
        healthStatus.services.stripe = "not_configured"
      }
    } catch (stripeError) {
      console.error("❌ [Health Check] Stripe connection failed:", stripeError)
      healthStatus.services.stripe = "unhealthy"
      healthStatus.status = "degraded"
    }

    console.log("✅ [Health Check] Health check completed:", healthStatus)

    return NextResponse.json(healthStatus, {
      status: healthStatus.status === "healthy" ? 200 : 503,
    })
  } catch (error) {
    console.error("❌ [Health Check] Health check failed:", error)

    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 },
    )
  }
}
