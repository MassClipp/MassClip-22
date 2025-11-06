import { NextResponse } from "next/server"
import { adminDb, getAuthenticatedUser } from "@/lib/firebase-admin"

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request.headers)

    const { searchParams } = new URL(request.url)
    const ebookId = searchParams.get("ebookId")

    if (!ebookId) {
      return NextResponse.json({ error: "Missing ebookId parameter" }, { status: 400 })
    }

    console.log(`[v0] Checking webhook events for eBook: ${ebookId}`)

    // Query stripeEvents collection for checkout.session.completed events
    const eventsSnapshot = await adminDb
      .collection("stripeEvents")
      .where("type", "==", "checkout.session.completed")
      .orderBy("created", "desc")
      .limit(50)
      .get()

    const relevantEvents = eventsSnapshot.docs
      .map((doc) => {
        const data = doc.data()
        const metadata = data.data?.object?.metadata || {}
        return {
          id: doc.id,
          type: data.type,
          created: data.created?.toDate?.()?.toISOString() || null,
          metadata,
          sessionId: data.data?.object?.id,
          isRelevant: metadata.ebookId === ebookId,
        }
      })
      .filter((event) => event.isRelevant)

    console.log(`[v0] Found ${relevantEvents.length} relevant webhook event(s) for eBook ${ebookId}`)

    return NextResponse.json({
      ebookId,
      eventCount: relevantEvents.length,
      events: relevantEvents,
      hasWebhookEvents: relevantEvents.length > 0,
    })
  } catch (error) {
    console.error("[v0] Error checking webhook events:", error)
    return NextResponse.json(
      {
        error: "Failed to check webhook events",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
