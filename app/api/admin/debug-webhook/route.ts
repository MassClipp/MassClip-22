import { NextResponse } from "next/server"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"

export async function GET() {
  const results = {
    envVars: {
      stripeWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      firebaseServiceAccountKey: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
    },
    firebase: {
      sdkInitialized: false,
      firestoreWriteSuccess: false,
      errorMessage: "",
    },
    webhookProcessor: {
      canImport: false,
      errorMessage: "",
    },
  }

  // Test Firebase Initialization and Write
  try {
    if (!getApps().length) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!)
      initializeApp({ credential: cert(serviceAccount) })
    }
    results.firebase.sdkInitialized = true

    const db = getFirestore()
    const docRef = db.collection("webhook-debug-logs").doc(new Date().toISOString())
    await docRef.set({ status: "ok", timestamp: new Date() })
    results.firebase.firestoreWriteSuccess = true
  } catch (e: any) {
    results.firebase.errorMessage = e.message
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
