import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

export async function POST(request: Request) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 })
    }

    // Generate test state
    const testState = `test_${userId}_${Date.now()}_${Math.random().toString(36).substring(7)}`

    // Store state
    await adminDb
      .collection("stripe_oauth_states")
      .doc(testState)
      .set({
        userId,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        test: true,
      })

    // Retrieve state
    const stateDoc = await adminDb.collection("stripe_oauth_states").doc(testState).get()
    const stateData = stateDoc.data()

    // Clean up
    await adminDb.collection("stripe_oauth_states").doc(testState).delete()

    return NextResponse.json({
      success: true,
      message: "State storage/retrieval working",
      testState,
      retrievedData: stateData,
    })
  } catch (error: any) {
    console.error("State storage test error:", error)
    return NextResponse.json(
      {
        error: "State storage test failed",
        details: error.message,
        stack: error.stack,
      },
      { status: 500 },
    )
  }
}
