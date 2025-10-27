import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Webhook Diagnostic] Checking recent webhook activity")

    const diagnosticData = {
      timestamp: new Date().toISOString(),
      recentWebhooks: [],
      summary: {
        totalWebhooks: 0,
        successfulWebhooks: 0,
        failedWebhooks: 0,
        checkoutSessionsCompleted: 0,
      },
    }

    // Check recent webhooks (last 24 hours)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    try {
      const webhooksRef = db
        .collection("stripeWebhooks")
        .where("timestamp", ">=", yesterday)
        .orderBy("timestamp", "desc")
        .limit(50)

      const webhooksSnapshot = await webhooksRef.get()

      diagnosticData.recentWebhooks = webhooksSnapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          eventType: data.eventType,
          status: data.status,
          timestamp: data.timestamp,
          sessionId: data.sessionId,
          metadata: data.metadata,
          error: data.error,
        }
      })

      // Calculate summary
      diagnosticData.summary.totalWebhooks = webhooksSnapshot.size
      diagnosticData.summary.successfulWebhooks = webhooksSnapshot.docs.filter(
        (doc) => doc.data().status === "success",
      ).length
      diagnosticData.summary.failedWebhooks = webhooksSnapshot.docs.filter(
        (doc) => doc.data().status === "error",
      ).length
      diagnosticData.summary.checkoutSessionsCompleted = webhooksSnapshot.docs.filter(
        (doc) => doc.data().eventType === "checkout.session.completed",
      ).length
    } catch (error) {
      console.error("Error checking webhooks:", error)
      diagnosticData.recentWebhooks = { error: error.message }
    }

    console.log(`✅ [Webhook Diagnostic] Summary:`, diagnosticData.summary)

    return NextResponse.json(diagnosticData)
  } catch (error) {
    console.error("❌ [Webhook Diagnostic] Error:", error)
    return NextResponse.json(
      {
        error: "Webhook diagnostic failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
