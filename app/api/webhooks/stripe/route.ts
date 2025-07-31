import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { headers } from "next/headers"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"

// Initialize Firebase Admin
if (!getApps().length) {
  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`,
  }

  initializeApp({
    credential: cert(serviceAccount as any),
  })
}

const db = getFirestore()
const auth = getAuth()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const headersList = headers()
    const sig = headersList.get("stripe-signature")!

    console.log("🔔 [Stripe Webhook] Received webhook")

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, sig, endpointSecret)
      console.log("✅ [Stripe Webhook] Event verified:", event.type)
    } catch (err: any) {
      console.error("❌ [Stripe Webhook] Signature verification failed:", err.message)
      return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 })
    }

    // Handle successful payment from connected account
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session
      console.log("💳 [Stripe Webhook] Processing completed checkout session:", session.id)
      console.log("💳 [Stripe Webhook] Connected account:", event.account)
      console.log("💳 [Stripe Webhook] Session metadata:", session.metadata)

      // Extract purchase details from connected account session metadata
      const bundleId = session.metadata?.bundleId
      const buyerUid = session.metadata?.buyerUid || session.client_reference_id
      const buyerEmail = session.metadata?.buyerEmail || session.customer_details?.email
      const buyerName = session.metadata?.buyerName || session.customer_details?.name
      const creatorId = session.metadata?.creatorId
      const connectedAccountId = event.account // This is the creator's Stripe account

      console.log("📊 [Stripe Webhook] Extracted purchase details:", {
        bundleId,
        buyerUid,
        buyerEmail,
        buyerName,
        creatorId,
        connectedAccountId,
        amount: session.amount_total,
        currency: session.currency,
      })

      // CRITICAL: Validate required fields - no anonymous buyers allowed
      if (!bundleId) {
        console.error("❌ [Stripe Webhook] No bundleId found in connected account metadata")
        return NextResponse.json({ error: "Missing bundle information" }, { status: 400 })
      }

      if (!buyerUid) {
        console.error("❌ [Stripe Webhook] No buyerUid found in connected account metadata")
        console.error("❌ [Stripe Webhook] Session metadata:", session.metadata)
        console.error("❌ [Stripe Webhook] Client reference ID:", session.client_reference_id)
        return NextResponse.json({ error: "Missing buyer identification" }, { status: 400 })
      }

      if (!connectedAccountId) {
        console.error("❌ [Stripe Webhook] No connected account ID in webhook event")
        return NextResponse.json({ error: "Missing connected account information" }, { status: 400 })
      }

      // Verify the buyer exists in Firebase
      let buyerExists = false
      let buyerData = null
      try {
        const buyerDoc = await db.collection("users").doc(buyerUid).get()
        buyerExists = buyerDoc.exists
        if (buyerExists) {
          buyerData = buyerDoc.data()
        }
        console.log("👤 [Stripe Webhook] Buyer verification:", {
          buyerUid,
          exists: buyerExists,
          displayName: buyerData?.displayName || buyerData?.name,
        })
      } catch (error) {
        console.error("❌ [Stripe Webhook] Error verifying buyer:", error)
        return NextResponse.json({ error: "Buyer verification failed" }, { status: 500 })
      }

      if (!buyerExists) {
        console.error("❌ [Stripe Webhook] Buyer UID not found in Firebase:", buyerUid)
        return NextResponse.json({ error: "Invalid buyer identification" }, { status: 400 })
      }

      // Get bundle details for validation
      let bundleData = null
      try {
        const bundleDoc = await db.collection("bundles").doc(bundleId).get()
        if (bundleDoc.exists) {
          bundleData = bundleDoc.data()
        }
        console.log("📦 [Stripe Webhook] Bundle verification:", {
          bundleId,
          exists: !!bundleData,
          title: bundleData?.title,
          creatorId: bundleData?.creatorId,
        })
      } catch (error) {
        console.error("❌ [Stripe Webhook] Error fetching bundle:", error)
      }

      // Create comprehensive purchase record
      const purchaseData = {
        buyerUid,
        bundleId,
        creatorId: creatorId || bundleData?.creatorId,
        sessionId: session.id,
        connectedAccountId,
        amount: session.amount_total ? session.amount_total / 100 : 0,
        currency: session.currency || "usd",
        status: "completed",
        purchasedAt: new Date(),
        buyerEmail: buyerEmail || buyerData?.email,
        buyerName: buyerName || buyerData?.displayName || buyerData?.name,
        customerDetails: session.customer_details,
        paymentIntentId: session.payment_intent,
        metadata: {
          ...session.metadata,
          source: "connected_account_webhook",
          webhookProcessedAt: new Date().toISOString(),
          buyerVerified: true,
          bundleVerified: !!bundleData,
        },
      }

      console.log("💾 [Stripe Webhook] Creating purchase record:", {
        buyerUid,
        bundleId,
        amount: purchaseData.amount,
        sessionId: session.id,
      })

      // Store the purchase in main purchases collection
      const purchaseRef = db.collection("purchases").doc()
      await purchaseRef.set(purchaseData)

      console.log("✅ [Stripe Webhook] Purchase record created:", purchaseRef.id)

      // Grant user access - update user's purchases subcollection
      try {
        const userPurchasesRef = db.collection("users").doc(buyerUid).collection("purchases").doc(bundleId)
        await userPurchasesRef.set({
          bundleId,
          purchaseId: purchaseRef.id,
          purchasedAt: new Date(),
          amount: purchaseData.amount,
          currency: purchaseData.currency,
          sessionId: session.id,
          status: "completed",
          bundleTitle: bundleData?.title || "Unknown Bundle",
          creatorId: purchaseData.creatorId,
        })

        // Also update user's main document with bundle access
        await db
          .collection("users")
          .doc(buyerUid)
          .update({
            [`bundleAccess.${bundleId}`]: {
              purchaseId: purchaseRef.id,
              sessionId: session.id,
              grantedAt: new Date(),
              accessType: "purchased",
              amount: purchaseData.amount,
            },
            updatedAt: new Date(),
          })

        console.log("✅ [Stripe Webhook] User access granted successfully")
      } catch (error) {
        console.error("❌ [Stripe Webhook] Error granting user access:", error)
      }

      // Log successful processing
      console.log("🎉 [Stripe Webhook] Purchase completed successfully:", {
        buyerUid,
        bundleId,
        purchaseId: purchaseRef.id,
        connectedAccount: connectedAccountId,
        amount: purchaseData.amount,
        currency: purchaseData.currency,
      })
    }

    // Handle payment intent succeeded (alternative event)
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      console.log("💰 [Stripe Webhook] Payment intent succeeded:", paymentIntent.id)
      console.log("💰 [Stripe Webhook] Connected account:", event.account)
      console.log("💰 [Stripe Webhook] Payment intent metadata:", paymentIntent.metadata)

      // Extract details from payment intent metadata
      const bundleId = paymentIntent.metadata?.bundleId
      const buyerUid = paymentIntent.metadata?.buyerUid
      const buyerEmail = paymentIntent.metadata?.buyerEmail
      const buyerName = paymentIntent.metadata?.buyerName
      const creatorId = paymentIntent.metadata?.creatorId
      const connectedAccountId = event.account

      if (bundleId && buyerUid && connectedAccountId) {
        console.log("📊 [Stripe Webhook] Processing payment intent completion with valid buyer ID")

        // Verify buyer exists
        try {
          const buyerDoc = await db.collection("users").doc(buyerUid).get()
          if (!buyerDoc.exists) {
            console.error("❌ [Stripe Webhook] Buyer not found for payment intent:", buyerUid)
            return NextResponse.json({ received: true }) // Still acknowledge webhook
          }

          // Create purchase record if not already exists
          const existingPurchaseQuery = await db
            .collection("purchases")
            .where("buyerUid", "==", buyerUid)
            .where("bundleId", "==", bundleId)
            .where("paymentIntentId", "==", paymentIntent.id)
            .limit(1)
            .get()

          if (existingPurchaseQuery.empty) {
            const purchaseData = {
              buyerUid,
              bundleId,
              creatorId,
              paymentIntentId: paymentIntent.id,
              connectedAccountId,
              amount: paymentIntent.amount ? paymentIntent.amount / 100 : 0,
              currency: paymentIntent.currency || "usd",
              status: "completed",
              purchasedAt: new Date(),
              buyerEmail,
              buyerName,
              metadata: {
                ...paymentIntent.metadata,
                source: "payment_intent_webhook",
                webhookProcessedAt: new Date().toISOString(),
              },
            }

            const purchaseRef = db.collection("purchases").doc()
            await purchaseRef.set(purchaseData)

            console.log("✅ [Stripe Webhook] Payment intent purchase record created:", purchaseRef.id)
          } else {
            console.log("ℹ️ [Stripe Webhook] Payment intent purchase already exists")
          }
        } catch (error) {
          console.error("❌ [Stripe Webhook] Error processing payment intent:", error)
        }
      } else {
        console.warn("⚠️ [Stripe Webhook] Payment intent missing required metadata:", {
          bundleId: !!bundleId,
          buyerUid: !!buyerUid,
          connectedAccountId: !!connectedAccountId,
        })
      }
    }

    console.log("✅ [Stripe Webhook] Webhook processed successfully")
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("❌ [Stripe Webhook] Webhook processing error:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
