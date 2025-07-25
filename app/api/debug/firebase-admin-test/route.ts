import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

export async function GET() {
  try {
    // Test Firestore connection
    const testDoc = await adminDb.collection("test").doc("connection-test").set({
      timestamp: new Date(),
      test: "Firebase Admin connection test",
    })

    // Test reading back
    const readTest = await adminDb.collection("test").doc("connection-test").get()

    // Clean up
    await adminDb.collection("test").doc("connection-test").delete()

    return NextResponse.json({
      success: true,
      message: "Firebase Admin connection successful",
      data: readTest.data(),
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Firebase Admin connection failed",
        details: error.message,
        code: error.code,
      },
      { status: 500 },
    )
  }
}
