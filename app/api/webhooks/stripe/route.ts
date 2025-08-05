import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { testSecret } from "path-to-test-secret" // Declare testSecret here

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  })
}

const db = getFirestore()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
})

export async function POST(req: NextRequest) {
  // FIRST LOG - This should appear if the handler is being hit at all
  console.log("🚨 WEBHOOK HANDLER HIT - TIMESTAMP:", new Date().toISOString())
  console.log("🚨 REQUEST METHOD:", req.method)
  console.log("🚨 REQUEST URL:", req.url)

  // Log to Vercel's function logs
  console.log("🔥 VERCEL FUNCTION INVOKED - Webhook handler starting")

  let body: string
  let sig: string | null

  try {
    console.log("📥 Reading request body...")
    body = await req.text()
    sig = req.headers.get("stripe-signature")

    console.log("📊 Request details:")
    console.log("- Body length:", body.length)
    console.log("- Body type:", typeof body)
    console.log("- Has signature:", !!sig)
    console.log("- Signature length:", sig?.length || 0)
    console.log("- Content-Type:", req.headers.get("content-type"))
    console.log("- User-Agent:", req.headers.get("user-agent"))

    if (!sig) {
      console.error("❌ No stripe-signature header found")
      const headers = Array.from(req.headers.entries())
      console.error("Available headers:", headers)
      return NextResponse.json({ error: "No signature header", headers }, { status: 400 })
    }

    if (!body || body.length === 0) {
      console.error("❌ Empty request body")
      return NextResponse.json({ error: "Empty body" }, { status: 400 })
    }
  } catch (error: any) {
    console.error("❌ Error reading request:", error)
    console.error("Error stack:", error.stack)
    return NextResponse.json({ error: "Error reading request", details: error.message }, { status: 400 })
  }

  let event: Stripe.Event
  let webhookSecret: string | null = null

  try {
    console.log("🔍 Starting signature verification...")

    // Check environment variables
    const liveSecret = process.env.STRIPE_WEBHOOK_SECRET_LIVE
    const testSecret = process.env.STRIPE_WEBHOOK_SECRET_TEST
    const defaultSecret = process.env.STRIPE_WEBHOOK_SECRET

    console.log("🔑 Environment check:")
    console.log("- Has STRIPE_WEBHOOK_SECRET_LIVE:", !!liveSecret)
    console.log("- Has STRIPE_WEBHOOK_SECRET_TEST:", !!testSecret)
    console.log("- Has STRIPE_WEBHOOK_SECRET:", !!defaultSecret)
    console.log("- Live secret length:", liveSecret?.length || 0)
    console.log("- Test secret length:", testSecret?.length || 0)
    console.log("- Default secret length:", defaultSecret?.length || 0)

    // Try live secret first
    webhookSecret = liveSecret || defaultSecret
    if (!webhookSecret) {
      console.error("❌ No webhook secret found in environment")
      return NextResponse.json({ error: "No webhook secret configured" }, { status: 500 })
    }

    console.log("🔍 Using webhook secret (first 10 chars):", webhookSecret.substring(0, 10))
    console.log("🔍 Signature (first 50 chars):", sig.substring(0, 50))

    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)

    console.log("✅ Signature verification successful!")
    console.log("📋 Event details:")
    console.log("- Event type:", event.type)
    console.log("- Event ID:", event.id)
    console.log("- Account:", event.account)
    console.log("- Livemode:", event.livemode)
    console.log("- Created:", new Date(event.created * 1000).toISOString())
  } catch (err: any) {
    console.error("❌ Signature verification failed with live/default secret:")
    console.error("- Error message:", err.message)
    console.error("- Error type:", err.type)
    console.error("- Error code:", err.code)

    // Try test secret as fallback
    if (testSecret && testSecret !== webhookSecret) {
      try {
        console.log("🔍 Trying with test webhook secret...")
        event = stripe.webhooks.constructEvent(body, sig, testSecret)
        console.log("✅ Test webhook secret worked!")
      } catch (testErr: any) {
        console.error("❌ Test webhook secret also failed:", testErr.message)
        console.error("❌ All signature verification attempts failed")
        return NextResponse.json(
          {
            error: "Webhook signature verification failed",
            liveError: err.message,
            testError: testErr.message,
            timestamp: new Date().toISOString(),
          },
          { status: 400 },
        )
      }
    } else {
      console.error("❌ No test secret to try as fallback")
      return NextResponse.json(
        {
          error: "Webhook signature verification failed",
          details: err.message,
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      )
    }
  }

  // Process the event
  try {
    console.log("🔄 Processing event:", event.type)

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        console.log("💳 Processing checkout session:", session.id)
        console.log("💰 Payment status:", session.payment_status)
        console.log("💰 Amount:", session.amount_total, session.currency)
        console.log("📋 Metadata:", JSON.stringify(session.metadata, null, 2))

        // Extract metadata
        const metadata = session.metadata
        if (!metadata) {
          console.error("❌ No metadata in session")
          return NextResponse.json({ error: "No metadata in session" }, { status: 400 })
        }

        const {
          buyerUid,
          bundleId,
          productBoxId,
          contentType,
          creatorId,
          itemTitle,
          buyerEmail,
          buyerName,
          stripeAccountId,
        } = metadata

        console.log("👤 Extracted data:")
        console.log("- Buyer UID:", buyerUid)
        console.log("- Content Type:", contentType)
        console.log("- Bundle ID:", bundleId)
        console.log("- Product Box ID:", productBoxId)
        console.log("- Creator ID:", creatorId)
        console.log("- Item Title:", itemTitle)
        console.log("- Buyer Email:", buyerEmail)
        console.log("- Buyer Name:", buyerName)

        if (!buyerUid) {
          console.error("❌ No buyerUid in metadata")
          return NextResponse.json({ error: "No buyerUid in metadata" }, { status: 400 })
        }

        if (!creatorId) {
          console.error("❌ No creatorId in metadata")
          return NextResponse.json({ error: "No creatorId in metadata" }, { status: 400 })
        }

        const itemId = bundleId || productBoxId
        if (!itemId) {
          console.error("❌ No bundleId or productBoxId in metadata")
          return NextResponse.json({ error: "No item ID in metadata" }, { status: 400 })
        }

        console.log("💾 Creating purchase record...")

        // Create comprehensive purchase record
        const purchaseData = {
          userId: buyerUid,
          sessionId: session.id,
          paymentIntentId: session.payment_intent,
          amount: session.amount_total,
          currency: session.currency,
          status: session.payment_status,
          type: contentType,
          itemId: itemId,
          bundleId: bundleId || null,
          productBoxId: productBoxId || null,
          creatorId: creatorId,
          itemTitle: itemTitle,
          buyerEmail: buyerEmail,
          buyerName: buyerName,
          stripeAccountId: stripeAccountId,
          metadata: session.metadata,
          createdAt: new Date(),
          processedAt: new Date(),
          stripeCustomerId: session.customer,
          webhookEventId: event.id,
          webhookProcessed: true,
        }

        // Save purchase record
        await db.collection("purchases").doc(session.id).set(purchaseData)
        console.log("✅ Purchase record created:", session.id)

        // Grant access based on content type
        if (contentType === "bundle" && bundleId) {
          console.log("🔓 Granting bundle access...")
          await db.collection("users").doc(buyerUid).collection("bundles").doc(bundleId).set({
            purchasedAt: new Date(),
            sessionId: session.id,
            access: true,
            amount: session.amount_total,
            currency: session.currency,
            creatorId: creatorId,
            itemTitle: itemTitle,
            paymentIntentId: session.payment_intent,
          })
          console.log("✅ Bundle access granted:", bundleId)

          // Also create a bundlePurchases record for easier querying
          await db
            .collection("bundlePurchases")
            .doc(session.id)
            .set({
              ...purchaseData,
              bundleContent: [], // Will be populated by another process if needed
            })
          console.log("✅ Bundle purchase record created")
        }

        if ((contentType === "product_box" || contentType === "productBox") && productBoxId) {
          console.log("🔓 Granting product box access...")
          await db.collection("users").doc(buyerUid).collection("product_boxes").doc(productBoxId).set({
            purchasedAt: new Date(),
            sessionId: session.id,
            access: true,
            amount: session.amount_total,
            currency: session.currency,
            creatorId: creatorId,
            itemTitle: itemTitle,
            paymentIntentId: session.payment_intent,
          })
          console.log("✅ Product box access granted:", productBoxId)
        }

        // Update creator earnings
        console.log("💰 Updating creator earnings...")
        try {
          const creatorRef = db.collection("users").doc(creatorId)
          const creatorDoc = await creatorRef.get()

          if (creatorDoc.exists) {
            const currentEarnings = creatorDoc.data()?.totalEarnings || 0
            const newEarnings = currentEarnings + (session.amount_total || 0)

            await creatorRef.update({
              totalEarnings: newEarnings,
              lastSaleAt: new Date(),
              lastSaleAmount: session.amount_total,
              lastSaleSessionId: session.id,
            })
            console.log("✅ Creator earnings updated:", creatorId, "New total:", newEarnings)
          } else {
            console.error("❌ Creator not found:", creatorId)
          }
        } catch (earningsError: any) {
          console.error("❌ Error updating creator earnings:", earningsError.message)
          // Don't fail the webhook for this
        }

        console.log("🎉 Checkout session processing completed successfully!")
        break
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        console.log("🔄 Processing subscription event:", subscription.id, subscription.status)

        // Find user by subscription ID
        const usersQuery = await db.collection("users").where("subscriptionId", "==", subscription.id).limit(1).get()

        if (!usersQuery.empty) {
          const userDoc = usersQuery.docs[0]
          const updateData: any = {
            subscriptionStatus: subscription.status,
            updatedAt: new Date(),
          }

          if (subscription.status === "canceled" || subscription.status === "unpaid") {
            updateData.plan = "free"
          } else if (subscription.status === "active") {
            updateData.plan = "premium"
          }

          await userDoc.ref.update(updateData)
          console.log("✅ User subscription updated:", userDoc.id, subscription.status)
        } else {
          console.log("⚠️ No user found for subscription:", subscription.id)
        }

        break
      }

      default:
        console.log("ℹ️ Unhandled event type:", event.type)
        console.log("ℹ️ Event data:", JSON.stringify(event.data, null, 2))
    }

    console.log("✅ Webhook processed successfully at", new Date().toISOString())
    return NextResponse.json({
      received: true,
      eventId: event.id,
      eventType: event.type,
      processed: true,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("❌ Error processing webhook:", error)
    console.error("❌ Error stack:", error.stack)
    console.error("❌ Error details:", {
      message: error.message,
      name: error.name,
      code: error.code,
    })

    return NextResponse.json(
      {
        error: "Processing failed",
        details: error.message,
        eventId: event?.id,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

// Handle other HTTP methods
export async function GET() {
  return NextResponse.json({
    message: "Webhook endpoint is working",
    timestamp: new Date().toISOString(),
  })
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 })
}
