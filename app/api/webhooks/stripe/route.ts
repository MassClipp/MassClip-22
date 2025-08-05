import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { db } from "@/firebase/config"
import { doc, updateDoc, increment, setDoc, getDoc } from "firebase/firestore"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
})

export async function POST(req: NextRequest) {
  console.log("🚨 WEBHOOK HANDLER HIT - App Router")
  console.log("Timestamp:", new Date().toISOString())

  try {
    const body = await req.text()
    const signature = req.headers.get("stripe-signature")

    console.log("📝 Request details:")
    console.log("- Body length:", body.length)
    console.log("- Signature present:", !!signature)
    console.log("- Body preview:", body.substring(0, 200))

    if (!signature) {
      console.error("❌ No Stripe signature found")
      return NextResponse.json({ error: "No signature" }, { status: 400 })
    }

    // Try multiple webhook secrets
    const secrets = [
      process.env.STRIPE_WEBHOOK_SECRET_LIVE,
      process.env.STRIPE_WEBHOOK_SECRET_TEST,
      process.env.STRIPE_WEBHOOK_SECRET,
    ].filter(Boolean)

    let event: Stripe.Event | null = null
    let usedSecret = ""

    for (const secret of secrets) {
      try {
        console.log(`🔑 Trying webhook secret: ${secret?.substring(0, 10)}...`)
        event = stripe.webhooks.constructEvent(body, signature, secret!)
        usedSecret = secret!
        console.log("✅ Signature verified with secret:", secret?.substring(0, 10))
        break
      } catch (err) {
        console.log(`❌ Failed with secret ${secret?.substring(0, 10)}:`, (err as Error).message)
        continue
      }
    }

    if (!event) {
      console.error("❌ All webhook secrets failed")
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    console.log("🎉 Event verified:", event.type, "ID:", event.id)
    console.log("🏦 Account:", event.account || "none")
    console.log("🔴 Live mode:", event.livemode)

    // Handle checkout.session.completed
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session
      console.log("💳 Processing checkout session:", session.id)
      console.log("💰 Amount:", session.amount_total)
      console.log("📧 Customer email:", session.customer_details?.email)
      console.log("🏷️ Metadata:", JSON.stringify(session.metadata, null, 2))

      const metadata = session.metadata || {}
      const { bundleId, productBoxId, buyerUid, creatorId, buyerEmail, contentType, itemTitle, stripeAccountId } =
        metadata

      console.log("🔍 Extracted metadata:")
      console.log("- Bundle ID:", bundleId)
      console.log("- Product Box ID:", productBoxId)
      console.log("- Buyer UID:", buyerUid)
      console.log("- Creator ID:", creatorId)
      console.log("- Content Type:", contentType)

      if (!buyerUid || !creatorId) {
        console.error("❌ Missing required metadata:", { buyerUid, creatorId })
        return NextResponse.json({ error: "Missing metadata" }, { status: 400 })
      }

      try {
        // Create purchase record
        const purchaseData = {
          sessionId: session.id,
          paymentIntentId: session.payment_intent,
          buyerUid,
          creatorId,
          bundleId: bundleId || productBoxId,
          productBoxId: productBoxId || bundleId,
          contentType: contentType || "bundle",
          itemTitle: itemTitle || "Unknown Item",
          amount: session.amount_total || 0,
          currency: session.currency || "usd",
          buyerEmail: buyerEmail || session.customer_details?.email,
          stripeAccountId: stripeAccountId || event.account,
          status: "completed",
          purchaseDate: new Date().toISOString(),
          metadata: session.metadata,
        }

        console.log("💾 Creating purchase record:", purchaseData)

        // Save to purchases collection
        const purchaseRef = doc(db, "purchases", session.id)
        await setDoc(purchaseRef, purchaseData)
        console.log("✅ Purchase record created")

        // Update creator earnings
        if (creatorId && session.amount_total) {
          const creatorRef = doc(db, "users", creatorId)
          const creatorDoc = await getDoc(creatorRef)

          if (creatorDoc.exists()) {
            const earnings = session.amount_total / 100 // Convert cents to dollars
            await updateDoc(creatorRef, {
              totalEarnings: increment(earnings),
              totalSales: increment(1),
              lastSaleDate: new Date().toISOString(),
            })
            console.log("✅ Creator earnings updated:", earnings)
          } else {
            console.log("⚠️ Creator not found:", creatorId)
          }
        }

        // Grant access to content
        if (buyerUid && (bundleId || productBoxId)) {
          const accessRef = doc(db, "userAccess", buyerUid)
          const accessDoc = await getDoc(accessRef)

          const contentId = bundleId || productBoxId
          const accessData = accessDoc.exists() ? accessDoc.data() : {}

          accessData[contentId] = {
            purchaseDate: new Date().toISOString(),
            sessionId: session.id,
            contentType: contentType || "bundle",
          }

          await setDoc(accessRef, accessData, { merge: true })
          console.log("✅ Access granted for content:", contentId)
        }

        console.log("🎉 Webhook processed successfully")
        return NextResponse.json({ received: true })
      } catch (firebaseError) {
        console.error("❌ Firebase error:", firebaseError)
        return NextResponse.json({ error: "Database error" }, { status: 500 })
      }
    }

    console.log("ℹ️ Event type not handled:", event.type)
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("❌ Webhook error:", error)
    return NextResponse.json(
      {
        error: "Webhook handler failed",
        details: (error as Error).message,
      },
      { status: 400 },
    )
  }
}

export async function GET() {
  console.log("🔍 GET request to webhook endpoint")
  return NextResponse.json({
    message: "Webhook endpoint is working",
    timestamp: new Date().toISOString(),
  })
}
