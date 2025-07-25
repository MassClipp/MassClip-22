import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

export async function GET() {
  try {
    // Test Firestore connection
    const testDoc = adminDb.collection("test").doc("connection-test")

    // Try to write
    await testDoc.set({
      timestamp: new Date(),
      test: "Firebase Admin connection test",
    })

    // Try to read
    const doc = await testDoc.get()
    const data = doc.data()

    // Clean up
    await testDoc.delete()

    return NextResponse.json({
      success: true,
      message: "Firebase Admin connected successfully",
      testData: data,
    })
  } catch (error: any) {
    console.error("Firebase Admin test error:", error)
    return NextResponse.json(
      {
        error: "Firebase Admin connection failed",
        details: error.message,
        stack: error.stack,
      },
      { status: 500 },
    )
  }
}
