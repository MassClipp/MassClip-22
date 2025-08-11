import { NextResponse } from "next/server"
import { db } from "@/lib/firebase/admin"

export const dynamic = "force-dynamic"

async function checkModuleImport() {
  try {
    await import("@/lib/stripe/webhook-processor")
    return true
  } catch (e) {
    console.error("Failed to import webhook processor:", e)
    return false
  }
}

async function checkFirestoreWrite() {
  if (!db) return false
  try {
    const docRef = db.collection("internal-diagnostics").doc("write-test")
    await docRef.set({ timestamp: new Date().toISOString() })
    await docRef.delete()
    return true
  } catch (e) {
    console.error("Firestore write test failed:", e)
    return false
  }
}

export async function GET() {
  try {
    const stripeWebhookSecret = !!process.env.STRIPE_WEBHOOK_SECRET
    const firebaseProjectId = !!process.env.FIREBASE_PROJECT_ID
    const firebaseClientEmail = !!process.env.FIREBASE_CLIENT_EMAIL
    const firebasePrivateKey = !!process.env.FIREBASE_PRIVATE_KEY

    const dbInstanceAvailable = !!db

    const firestoreWriteTest = await checkFirestoreWrite()
    const moduleImportable = await checkModuleImport()

    return NextResponse.json({
      stripeWebhookSecret,
      firebaseProjectId,
      firebaseClientEmail,
      firebasePrivateKey,
      dbInstanceAvailable,
      firestoreWriteTest,
      moduleImportable,
    })
  } catch (error: any) {
    console.error("Webhook diagnostic API error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
