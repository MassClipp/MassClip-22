import { NextResponse } from "next/server"
import { db } from "@/lib/firebase/admin" // Import the db instance

export async function GET() {
  const results = {
    envVars: {
      stripeWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      firebaseProjectId: !!process.env.FIREBASE_PROJECT_ID,
      firebaseClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
      firebasePrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
    },
    firebase: {
      dbInstanceAvailable: false,
      firestoreWriteSuccess: false,
      errorMessage: "",
    },
    webhookProcessor: {
      canImport: false,
      errorMessage: "",
    },
  }

  // Test Firebase Initialization and Write
  if (db) {
    results.firebase.dbInstanceAvailable = true
    try {
      const docRef = db.collection("webhook-debug-logs").doc(new Date().toISOString())
      await docRef.set({ status: "ok", timestamp: new Date() })
      results.firebase.firestoreWriteSuccess = true
    } catch (e: any) {
      results.firebase.errorMessage = e.message
    }
  } else {
    results.firebase.errorMessage =
      "Firebase DB instance is not available. Check server logs and environment variables."
  }

  // Test importing from the webhook processor
  try {
    const processor = await import("@/lib/stripe/webhook-processor")
    if (
      processor.processCheckoutSessionCompleted &&
      processor.processSubscriptionDeleted &&
      processor.processSubscriptionUpdated
    ) {
      results.webhookProcessor.canImport = true
    } else {
      results.webhookProcessor.errorMessage = "One or more required functions are not exported from the module."
    }
  } catch (e: any) {
    results.webhookProcessor.errorMessage = e.message
  }

  return NextResponse.json(results)
}
