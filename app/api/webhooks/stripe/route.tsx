import { NextResponse } from "next/server"
import Stripe from "stripe"
import { headers } from "next/headers"
import { adminDb } from "@/lib/firebase-admin"
import {
  processCheckoutSessionCompleted,
  processSubscriptionDeleted,
  processSubscriptionUpdated,
} from "@/lib/stripe/webhook-processor"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_LIVE!

async function processBundlePurchase(session: Stripe.Checkout.Session) {
  console.log(`🛒 [Bundle Webhook] Processing bundle purchase: ${session.id}`)

  const metadata = session.metadata || {}
  const { bundleId, productBoxId, buyer_user_id, creatorId, is_guest_checkout } = metadata

  const itemId = bundleId || productBoxId
  if (!itemId) {
    throw new Error("Missing bundle/productBox ID in session metadata")
  }

  let buyerUid = buyer_user_id
  let isGuestPurchase = is_guest_checkout === "true"

  if (isGuestPurchase && !buyerUid) {
    console.log(`👤 [Bundle Webhook] Processing guest purchase, creating account...`)

    // Get customer email from Stripe session
    const customerEmail = session.customer_details?.email || session.customer_email
    const customerName = session.customer_details?.name

    if (!customerEmail) {
      throw new Error("No customer email found for guest purchase")
    }

    try {
      // Check if user already exists with this email
      const { getAuth } = await import("firebase-admin/auth")
      const auth = getAuth()

      try {
        const existingUser = await auth.getUserByEmail(customerEmail)
        console.log(`✅ [Bundle Webhook] Found existing user for email: ${customerEmail}`)
        buyerUid = existingUser.uid
        isGuestPurchase = false // Treat as existing user
      } catch (error: any) {
        if (error.code === "auth/user-not-found") {
          // Create new guest account
          const guestAccount = await createGuestAccount(customerEmail, customerName)
          buyerUid = guestAccount.uid
          console.log(`✅ [Bundle Webhook] Created guest account: ${buyerUid}`)
        } else {
          throw error
        }
      }
    } catch (error) {
      console.error(`❌ [Bundle Webhook] Failed to handle guest account:`, error)
      // Continue with purchase but mark as guest
      buyerUid = `guest_${Date.now()}`
    }
  }

  if (!buyerUid) {
    throw new Error("Missing buyer UID and not a guest purchase")
  }

  // Get bundle details
  const bundleDoc = await adminDb.collection("bundles").doc(itemId).get()
  if (!bundleDoc.exists) {
    throw new Error(`Bundle not found: ${itemId}`)
  }

  const bundleData = bundleDoc.data()!
  console.log(`📦 [Bundle Webhook] Bundle data keys:`, Object.keys(bundleData))

  let bundleContents: any[] = []

  if (
    bundleData.detailedContentItems &&
    Array.isArray(bundleData.detailedContentItems) &&
    bundleData.detailedContentItems.length > 0
  ) {
    bundleContents = bundleData.detailedContentItems
    console.log(`✅ [Bundle Webhook] Found ${bundleContents.length} content items in detailedContentItems`)
  }

  if (bundleContents.length === 0 && bundleData.contentItems && bundleData.contentUrls) {
    const contentItems = bundleData.contentItems || []
    const contentUrls = bundleData.contentUrls || []
    const contentTitles = bundleData.contentTitles || []
    const contentThumbnails = bundleData.contentThumbnails || []

    bundleContents = contentItems.map((itemId: string, index: number) => ({
      id: itemId,
      title: contentTitles[index] || `Content ${index + 1}`,
      fileUrl: contentUrls[index] || "",
      downloadUrl: contentUrls[index] || "",
      thumbnailUrl: contentThumbnails[index] || "",
      contentType: "video",
      mimeType: "video/mp4",
      bundleId: itemId,
      createdAt: new Date().toISOString(),
    }))
    console.log(`✅ [Bundle Webhook] Built ${bundleContents.length} content items from contentItems + contentUrls`)
  }

  // Strategy 3: Direct content fields from bundle (fallback)
  if (bundleContents.length === 0) {
    const contentFields = ["contents", "items", "videos", "files", "content", "bundleContent"]
    for (const field of contentFields) {
      if (bundleData[field] && Array.isArray(bundleData[field]) && bundleData[field].length > 0) {
        bundleContents = bundleData[field]
        console.log(`✅ [Bundle Webhook] Found ${bundleContents.length} content items in field: ${field}`)
        break
      }
    }
  }

  // Strategy 4: If no content found, fetch from bundleContent collection
  if (bundleContents.length === 0) {
    console.log(`🔍 [Bundle Webhook] No content in bundle document, checking bundleContent collection...`)
    const contentQuery = await adminDb.collection("bundleContent").where("bundleId", "==", itemId).get()

    if (!contentQuery.empty) {
      bundleContents = contentQuery.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      console.log(`✅ [Bundle Webhook] Found ${bundleContents.length} content items in bundleContent collection`)
    }
  }

  // Strategy 5: If still no content, fetch from productBoxContent collection
  if (bundleContents.length === 0) {
    console.log(`🔍 [Bundle Webhook] Checking productBoxContent collection...`)
    const contentQuery = await adminDb.collection("productBoxContent").where("productBoxId", "==", itemId).get()

    if (!contentQuery.empty) {
      bundleContents = contentQuery.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      console.log(`✅ [Bundle Webhook] Found ${bundleContents.length} content items in productBoxContent collection`)
    }
  }

  console.log(`📊 [Bundle Webhook] Final content count: ${bundleContents.length}`)
  if (bundleContents.length > 0) {
    console.log(`📹 [Bundle Webhook] Sample content item:`, JSON.stringify(bundleContents[0], null, 2))
  }

  // Get creator details
  let creatorData = { name: "Unknown Creator", username: "unknown" }
  if (creatorId) {
    const creatorDoc = await adminDb.collection("users").doc(creatorId).get()
    if (creatorDoc.exists) {
      const creator = creatorDoc.data()!
      creatorData = {
        name: creator.displayName || creator.name || creator.username || "Unknown Creator",
        username: creator.username || "unknown",
      }
    }
  }

  const bundlePrice = bundleData.price || bundleData.amount || 0
  const stripePrice = session.amount_total ? session.amount_total / 100 : 0
  const finalPrice = bundlePrice > 0 ? bundlePrice : stripePrice

  console.log(
    `💰 [Bundle Webhook] Price sources - Bundle: $${bundlePrice}, Stripe: $${stripePrice}, Final: $${finalPrice}`,
  )

  const purchaseData = {
    id: session.id,
    bundleId: itemId,
    productBoxId: itemId,
    bundleTitle: bundleData.title || "Untitled Bundle",
    bundleDescription: bundleData.description || "Premium content bundle",
    bundleThumbnailUrl: bundleData.customPreviewThumbnail || bundleData.thumbnailUrl || "/placeholder.svg",

    // Creator info
    creatorId: creatorId || "unknown",
    creatorName: creatorData.name,
    creatorUsername: creatorData.username,
    creatorDisplayName: creatorData.name,

    // Buyer info
    buyerUid: buyerUid,
    userId: buyerUid,
    buyerEmail: session.customer_details?.email || session.customer_email || "",
    buyerName: session.customer_details?.name || "Anonymous User",
    buyerDisplayName: session.customer_details?.name || "Anonymous User",
    isAuthenticated: !isGuestPurchase,
    isGuestPurchase: isGuestPurchase,

    price: finalPrice,
    amount: finalPrice,
    purchaseAmount: finalPrice * 100, // Store in cents for Stripe compatibility
    bundlePrice: finalPrice, // Store bundle price for unified purchases API
    currency: session.currency || bundleData.currency || "usd",
    status: "completed",

    // Stripe details
    sessionId: session.id,
    paymentIntentId: session.payment_intent,
    stripeCustomerId: session.customer,

    bundleContent: bundleContents,
    contents: bundleContents,

    // Content metadata
    itemNames: bundleContents.map((item: any) => item.title || item.name || item.filename || "Untitled"),
    contentCount: bundleContents.length,
    bundleTotalItems: bundleContents.length,

    // Calculate totals
    bundleTotalSize: bundleContents.reduce((total: number, item: any) => total + (item.fileSize || 0), 0),
    bundleTotalDuration: bundleContents.reduce((total: number, item: any) => total + (item.duration || 0), 0),

    // Timestamps
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    purchasedAt: new Date().toISOString(),
    timestamp: new Date(),

    // Access control
    accessToken: `access_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    source: "stripe_webhook",
    webhookProcessed: true,
  }

  // Store in bundlePurchases collection
  await adminDb.collection("bundlePurchases").doc(session.id).set(purchaseData)

  console.log(
    `✅ [Bundle Webhook] Bundle purchase created: ${session.id} for ${isGuestPurchase ? "guest" : "user"} ${buyerUid} with ${bundleContents.length} content items at $${finalPrice}`,
  )
}

export async function POST(request: Request) {
  const sig = headers().get("stripe-signature") || headers().get("Stripe-Signature")
  const body = await request.text()

  if (!sig) {
    console.error("Webhook Error: Missing signature.")
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
    } else {
      throw new Error("No webhook secret configured")
    }
  } catch (err: any) {
    console.error(`❌ Webhook signature verification failed: ${err.message}`)

    console.error("Signature:", sig)
    console.error("Body length:", body.length)
    console.error("Webhook secret configured:", !!webhookSecret)

    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 })
  }

  console.log(`✅ [Bundle Webhook] Received event: ${event.type} (${event.id})`)
  console.log(`📋 [Bundle Webhook] Event metadata:`, event.data.object.metadata || {})

  try {
    // Test Firebase connection with a simple operation
    await adminDb.collection("_test").limit(1).get()
  } catch (error) {
    console.error("❌ Firebase not accessible in webhook:", error)
    return NextResponse.json({ error: "Database not initialized" }, { status: 500 })
  }

  // Store raw event for diagnostics (non-blocking)
  adminDb
    .collection("stripeEvents")
    .add({
      id: event.id,
      type: event.type,
      object: event.object,
      api_version: event.api_version,
      data: event.data,
      created: new Date(event.created * 1000),
    })
    .catch((error) => {
      console.error("Failed to store raw stripe event", error)
    })

  try {
    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object as Stripe.Checkout.Session

        const metadata = session.metadata || {}
        const contentType = metadata.contentType
        const bundleId = metadata.bundleId || metadata.productBoxId

        if (contentType === "bundle" || bundleId) {
          // Handle bundle purchase
          await processBundlePurchase(session)
        } else {
          // Handle subscription (Creator Pro upgrade)
          await processCheckoutSessionCompleted(session)
        }
        break

      case "customer.subscription.updated":
        await processSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
      case "customer.subscription.deleted":
        await processSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      default:
        console.log(`Unhandled event type ${event.type}`)
    }
  } catch (error: any) {
    console.error(`Webhook handler failed for event ${event.type}.`, error)
    return NextResponse.json({ error: "Webhook handler failed", details: error.message }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

async function createGuestAccount(email: string, name?: string) {
  console.log(`👤 [Guest Account] Creating account for email: ${email}`)

  try {
    // Generate secure password
    const password = generateSecurePassword()

    // Create Firebase Auth user
    const { getAuth } = await import("firebase-admin/auth")
    const auth = getAuth()

    const userRecord = await auth.createUser({
      email: email,
      password: password,
      displayName: name || email.split("@")[0],
      emailVerified: false,
    })

    console.log(`✅ [Guest Account] Created Firebase user: ${userRecord.uid}`)

    // Create user document in Firestore
    const userData = {
      uid: userRecord.uid,
      email: email,
      displayName: name || email.split("@")[0],
      username: `user_${Date.now()}`, // Generate unique username
      createdAt: new Date().toISOString(),
      isGuestCreated: true,
      emailVerified: false,
      plan: "free",
    }

    await adminDb.collection("users").doc(userRecord.uid).set(userData)
    console.log(`✅ [Guest Account] Created user document for: ${userRecord.uid}`)

    // Send welcome email with credentials
    await sendWelcomeEmail(email, password, name || email.split("@")[0])

    return {
      uid: userRecord.uid,
      email: email,
      password: password,
      displayName: userData.displayName,
    }
  } catch (error) {
    console.error(`❌ [Guest Account] Failed to create account for ${email}:`, error)
    throw error
  }
}

function generateSecurePassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*"
  let password = ""
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

async function sendWelcomeEmail(email: string, password: string, name: string) {
  console.log(`📧 [Guest Account] Sending welcome email to: ${email}`)

  try {
    const { Resend } = await import("resend")
    const resend = new Resend(process.env.RESEND_API_KEY)

    await resend.emails.send({
      from: "MassClip <noreply@massclip.pro>",
      to: email,
      subject: "Welcome to MassClip - Your Account & Purchase Details",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to MassClip, ${name}!</h2>
          <p>Thank you for your purchase! We've created an account for you to access your content.</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Your Login Credentials:</h3>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Password:</strong> ${password}</p>
          </div>
          
          <p>You can now log in to access your purchased content at: <a href="https://massclip.pro/dashboard/purchases">https://massclip.pro/dashboard/purchases</a></p>
          
          <p><strong>Important:</strong> Please save these credentials in a secure location. For security reasons, we recommend changing your password after your first login.</p>
          
          <p>If you have any questions, please don't hesitate to contact our support team.</p>
          
          <p>Welcome to the MassClip community!</p>
        </div>
      `,
    })

    console.log(`✅ [Guest Account] Welcome email sent to: ${email}`)
  } catch (error) {
    console.error(`❌ [Guest Account] Failed to send welcome email to ${email}:`, error)
    // Don't throw - account creation should succeed even if email fails
  }
}
