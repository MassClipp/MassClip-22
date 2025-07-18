import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

async function getParams(request: NextRequest): Promise<{ limit: number }> {
  const { searchParams } = new URL(request.url)
  const limitParam = searchParams.get("limit")
  const limit = limitParam ? Number.parseInt(limitParam, 10) : 10 // Default limit
  return { limit }
}

export async function GET(request: NextRequest) {
  try {
    const { limit } = await getParams(request)

    console.log(`🔍 [Webhook Logs] Fetching recent webhook logs (limit: ${limit})`)

    const snapshot = await db.collection("stripeWebhooks").orderBy("timestamp", "desc").limit(limit).get()

    const logs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return NextResponse.json({
      success: true,
      logs,
      count: logs.length,
    })
  } catch (error) {
    console.error("❌ [Webhook Logs] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch webhook logs",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
