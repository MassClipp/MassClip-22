import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { auth, adminDb, isFirebaseAdminInitialized } from "@/lib/firebase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(request: NextRequest) {
  console.log("🎯 [Download Success] Processing download purchase success...")

  if (!isFirebaseAdminInitialized()) {
    console.error("❌ [Download Success] Firebase Admin SDK not initialized")
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
  }

  try {
    const body = await request.json()
    const { sessionId, idToken } = body

    if (!sessionId || !idToken) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // Authenticate user
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(idToken)
    } catch (error) {
      console.error("❌ [Download Success] Token verification failed:", error)
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 403 })
    }

    const { uid, email } = decodedToken
    console.log("✅ [Download Success] User authenticated:", { uid, email })

    // Get Stripe session details
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 })
    }

    const metadata = session.metadata || {}
    const { downloadCount, downloadId, downloadPrice } = metadata

    if (!downloadCount) {
      return NextResponse.json({ error: "Invalid download purchase data" }, { status: 400 })
    }

    const downloadsToAdd = Number.parseInt(downloadCount)

    // Check if already processed
    const existingPurchase = await adminDb.collection("downloadPurchases").doc(sessionId).get()
    if (existingPurchase.exists) {
      console.log("✅ [Download Success] Purchase already processed")
      return NextResponse.json({
        success: true,
        downloadsAdded: downloadsToAdd,
        message: "Purchase already processed",
      })
    }

    // Create download purchase record
    const purchaseData = {
      id: sessionId,
      buyerUid: uid,
      userId: uid,
      buyerEmail: email || "",

      downloadId: downloadId,
      downloadCount: downloadsToAdd,
      downloadPrice: Number.parseFloat(downloadPrice || "0"),

      sessionId: sessionId,
      paymentIntentId: session.payment_intent,
      stripeCustomerId: session.customer,

      amount: session.amount_total ? session.amount_total / 100 : 0,
      currency: session.currency || "usd",
      status: "completed",

      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      purchasedAt: new Date().toISOString(),
      timestamp: new Date(),

      source: "success_page_processing",
      contentType: "download_purchase",
    }

    // Store purchase record
    await adminDb.collection("downloadPurchases").doc(sessionId).set(purchaseData)

    // Update user's download count
    try {
      const userRef = adminDb.collection("memberships").doc(uid)
      const userDoc = await userRef.get()

      if (userDoc.exists) {
        const currentData = userDoc.data()!
        const currentDownloads = currentData.additionalDownloads || 0
        await userRef.update({
          additionalDownloads: currentDownloads + downloadsToAdd,
          updatedAt: new Date().toISOString(),
        })
        console.log(`✅ [Download Success] Added ${downloadsToAdd} downloads to user ${uid}`)
      } else {
        // Check freeUsers collection
        const freeUserRef = adminDb.collection("freeUsers").doc(uid)
        const freeUserDoc = await freeUserRef.get()

        if (freeUserDoc.exists) {
          const currentData = freeUserDoc.data()!
          const currentDownloads = currentData.additionalDownloads || 0
          await freeUserRef.update({
            additionalDownloads: currentDownloads + downloadsToAdd,
            updatedAt: new Date().toISOString(),
          })
          console.log(`✅ [Download Success] Added ${downloadsToAdd} downloads to free user ${uid}`)
        } else {
          // Create new free user record
          await freeUserRef.set({
            uid: uid,
            email: email || "",
            additionalDownloads: downloadsToAdd,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          console.log(`✅ [Download Success] Created new free user with ${downloadsToAdd} downloads`)
        }
      }
    } catch (error) {
      console.error(`❌ [Download Success] Failed to update user downloads:`, error)
      return NextResponse.json({ error: "Failed to update user account" }, { status: 500 })
    }

    console.log(`✅ [Download Success] Successfully processed download purchase: ${sessionId}`)

    return NextResponse.json({
      success: true,
      downloadsAdded: downloadsToAdd,
      message: `${downloadsToAdd} downloads added to your account`,
    })
  } catch (error: any) {
    console.error("❌ [Download Success] Error processing download success:", error)
    return NextResponse.json({ error: "Failed to process download purchase" }, { status: 500 })
  }
}
