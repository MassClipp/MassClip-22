import { NextResponse } from "next/server"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { getFirestore } from "firebase-admin/firestore"

export async function GET(request: Request) {
  try {
    // Check for required environment variables
    const diagnostics = {
      environment: {
        STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
        STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET,
        STRIPE_PRICE_ID: !!process.env.STRIPE_PRICE_ID,
        NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || "not set",
      },
      firebase: {
        initialized: false,
        firestoreConnected: false,
      },
      timestamp: new Date().toISOString(),
      url: request.url,
    }

    // Test Firebase initialization
    try {
      initializeFirebaseAdmin()
      diagnostics.firebase.initialized = true

      // Test Firestore connection
      const db = getFirestore()
      const testDoc = await db.collection("webhookDiagnostics").add({
        timestamp: new Date(),
        test: "connection",
      })

      if (testDoc.id) {
        diagnostics.firebase.firestoreConnected = true
        // Clean up test document
        await testDoc.delete()
      }
    } catch (error: any) {
      return NextResponse.json({
        diagnostics,
        error: error.message,
      })
    }

    return NextResponse.json({
      diagnostics,
      message: "Webhook diagnostic completed successfully",
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message,
        message: "Webhook diagnostic failed",
      },
      { status: 500 },
    )
  }
}
