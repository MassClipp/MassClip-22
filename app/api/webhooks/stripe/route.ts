import { NextResponse } from "next/server"
import Stripe from "stripe"
import { headers } from "next/headers"
import { adminDb } from "@/lib/firebase-admin"
import {
  processCheckoutSessionCompleted,
  processSubscriptionDeleted,
  processSubscriptionUpdated,
  processContentPackPurchase, // Import content pack processor
} from "@/lib/stripe/webhook-processor"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_LIVE!

async function processBundlePurchase(session: Stripe.Checkout.Session) {
  console.log(`🛒 [Bundle Webhook] Processing bundle purchase: ${session.id}`)

  const metadata = session.metadata || {}
  const { bundleId, productBoxId, buyerUid, creatorId, buyerEmail, buyerName, buyerPlan } = metadata

  const itemId = bundleId || productBoxId
  if (!itemId) {
    throw new Error("Missing bundle/productBox ID in session metadata")
  }

  if (!buyerUid) {
    throw new Error("Missing buyer UID in session metadata")
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
  let creatorData = { name: "Unknown Creator", username: "unknown", email: "" }
  if (creatorId) {
    const creatorDoc = await adminDb.collection("users").doc(creatorId).get()
    if (creatorDoc.exists) {
      const creator = creatorDoc.data()!
      creatorData = {
        name: creator.displayName || creator.name || creator.username || "Unknown Creator",
        username: creator.username || "unknown",
        email: creator.email || "",
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
    buyerEmail: buyerEmail || "",
    buyerName: buyerName || "Anonymous User",
    buyerDisplayName: buyerName || "Anonymous User",
    isAuthenticated: buyerUid !== "anonymous",

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

  // if (creatorId && creatorData.email && finalPrice > 0) {
  //   try {
  //     await NotificationService.createPurchaseNotification(
  //       creatorId,
  //       bundleData.title || "Untitled Bundle",
  //       finalPrice,
  //       buyerUid,
  //     )
  //     console.log(`✅ [Bundle Webhook] Purchase notifications sent to creator: ${creatorData.email}`)
  //   } catch (notificationError) {
  //     console.error(`❌ [Bundle Webhook] Failed to send purchase notifications:`, notificationError)
  //     // Don't fail the entire webhook if notifications fail
  //   }
  // }

  console.log(
    `✅ [Bundle Webhook] Bundle purchase created: ${session.id} for user ${buyerUid} with ${bundleContents.length} content items at $${finalPrice}`,
  )
}

async function processDownloadPurchase(session: Stripe.Checkout.Session) {
  console.log(`💾 [Download Webhook] Processing download purchase: ${session.id}`)

  const metadata = session.metadata || {}
  const { buyerUid, buyerEmail, buyerName, downloadId, downloadCount, downloadPrice } = metadata

  if (!buyerUid || !downloadCount) {
    throw new Error("Missing required download purchase metadata")
  }

  // Create download purchase record
  const purchaseData = {
    id: session.id,
    buyerUid: buyerUid,
    userId: buyerUid,
    buyerEmail: buyerEmail || "",
    buyerName: buyerName || "Anonymous User",

    downloadId: downloadId,
    downloadCount: Number.parseInt(downloadCount),
    downloadPrice: Number.parseFloat(downloadPrice || "0"),

    // Stripe details
    sessionId: session.id,
    paymentIntentId: session.payment_intent,
    stripeCustomerId: session.customer,

    amount: session.amount_total ? session.amount_total / 100 : 0,
    currency: session.currency || "usd",
    status: "completed",

    // Timestamps
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    purchasedAt: new Date().toISOString(),
    timestamp: new Date(),

    // Access control
    accessToken: `download_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    source: "stripe_webhook",
    webhookProcessed: true,
    contentType: "download_purchase",
  }

  // Store in downloadPurchases collection
  await adminDb.collection("downloadPurchases").doc(session.id).set(purchaseData)

  // Update user's download count in their membership/profile
  try {
    const userRef = adminDb.collection("memberships").doc(buyerUid)
    const userDoc = await userRef.get()

    if (userDoc.exists) {
      const currentData = userDoc.data()!
      const currentDownloads = currentData.additionalDownloads || 0
      await userRef.update({
        additionalDownloads: currentDownloads + Number.parseInt(downloadCount),
        updatedAt: new Date().toISOString(),
      })
      console.log(`✅ [Download Webhook] Added ${downloadCount} downloads to user ${buyerUid}`)
    } else {
      // User might be in freeUsers collection
      const freeUserRef = adminDb.collection("freeUsers").doc(buyerUid)
      const freeUserDoc = await freeUserRef.get()

      if (freeUserDoc.exists) {
        const currentData = freeUserDoc.data()!
        const currentDownloads = currentData.additionalDownloads || 0
        await freeUserRef.update({
          additionalDownloads: currentDownloads + Number.parseInt(downloadCount),
          updatedAt: new Date().toISOString(),
        })
        console.log(`✅ [Download Webhook] Added ${downloadCount} downloads to free user ${buyerUid}`)
      }
    }
  } catch (error) {
    console.error(`❌ [Download Webhook] Failed to update user downloads:`, error)
  }

  console.log(
    `✅ [Download Webhook] Download purchase created: ${session.id} for user ${buyerUid} with ${downloadCount} downloads`,
  )
}

async function processEbookPurchase(session: Stripe.Checkout.Session) {
  console.log(`📚 [eBook Webhook] Processing eBook purchase: ${session.id}`)

  const metadata = session.metadata || {}
  const { ebookId, buyerUid, creatorId, buyerEmail, buyerName } = metadata

  if (!ebookId) {
    throw new Error("Missing eBook ID in session metadata")
  }

  let finalBuyerUid = buyerUid
  let finalBuyerEmail = buyerEmail
  let finalBuyerName = buyerName

  if (!buyerUid || buyerUid === "anonymous") {
    console.log(`📚 [eBook Webhook] Guest checkout detected, extracting customer info from session`)

    // Try to get customer info from Stripe session
    const customerId = typeof session.customer === "string" ? session.customer : null

    if (customerId) {
      try {
        const customer = await stripe.customers.retrieve(customerId)
        if (!("deleted" in customer)) {
          finalBuyerEmail = customer.email || session.customer_details?.email || buyerEmail
          finalBuyerName = customer.name || session.customer_details?.name || buyerName || "Guest User"
          finalBuyerUid = `guest_${customerId}` // Create a guest UID based on Stripe customer ID
          console.log(`📚 [eBook Webhook] Guest user info: ${finalBuyerEmail}, ${finalBuyerName}`)
        }
      } catch (error) {
        console.error(`📚 [eBook Webhook] Failed to retrieve customer:`, error)
      }
    }

    // Fallback to session customer details
    if (!finalBuyerEmail) {
      finalBuyerEmail = session.customer_details?.email || "unknown@guest.com"
      finalBuyerName = session.customer_details?.name || "Guest User"
      finalBuyerUid = `guest_${session.id}` // Use session ID as fallback
    }

    console.log(`📚 [eBook Webhook] Final guest info - UID: ${finalBuyerUid}, Email: ${finalBuyerEmail}`)
  }

  // Get eBook details
  const ebookDoc = await adminDb.collection("ebooks").doc(ebookId).get()
  if (!ebookDoc.exists) {
    throw new Error(`eBook not found: ${ebookId}`)
  }

  const ebookData = ebookDoc.data()!
  console.log(`📖 [eBook Webhook] eBook data:`, {
    id: ebookId,
    title: ebookData.title,
    pageCount: ebookData.pageCount,
    price: ebookData.price,
  })

  // Get creator details
  let creatorData = { name: "Unknown Creator", username: "unknown", email: "" }
  if (creatorId) {
    const creatorDoc = await adminDb.collection("users").doc(creatorId).get()
    if (creatorDoc.exists) {
      const creator = creatorDoc.data()!
      creatorData = {
        name: creator.displayName || creator.name || creator.username || "Unknown Creator",
        username: creator.username || "unknown",
        email: creator.email || "",
      }
    }
  }

  const ebookPrice = ebookData.price || 0
  const stripePrice = session.amount_total ? session.amount_total / 100 : 0
  const finalPrice = ebookPrice > 0 ? ebookPrice : stripePrice

  console.log(
    `💰 [eBook Webhook] Price sources - eBook: $${ebookPrice}, Stripe: $${stripePrice}, Final: $${finalPrice}`,
  )

  const purchaseData = {
    id: session.id,
    ebookId: ebookId,
    ebookTitle: ebookData.title || "Untitled eBook",
    ebookDescription: ebookData.description || "",
    ebookCoverUrl: ebookData.coverUrl || "",
    ebookPageCount: ebookData.pageCount || 0,

    // Creator info
    creatorId: creatorId || "unknown",
    creatorName: creatorData.name,
    creatorUsername: creatorData.username,
    creatorDisplayName: creatorData.name,

    buyerUid: finalBuyerUid,
    userId: finalBuyerUid,
    buyerEmail: finalBuyerEmail,
    buyerName: finalBuyerName,
    buyerDisplayName: finalBuyerName,
    isAuthenticated: buyerUid !== "anonymous" && !finalBuyerUid.startsWith("guest_"),

    price: finalPrice,
    amount: finalPrice,
    purchaseAmount: finalPrice * 100,
    currency: session.currency || "usd",
    status: "completed",

    // Stripe details
    sessionId: session.id,
    paymentIntentId: session.payment_intent,
    stripeCustomerId: session.customer,

    // Timestamps
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    purchasedAt: new Date().toISOString(),
    timestamp: new Date(),

    // Access control
    accessToken: `ebook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    source: "stripe_webhook",
    webhookProcessed: true,
    contentType: "ebook",
  }

  // Store in ebookPurchases collection
  await adminDb.collection("ebookPurchases").doc(session.id).set(purchaseData)

  console.log(
    `✅ [eBook Webhook] eBook purchase created: ${session.id} for user ${finalBuyerUid} - "${ebookData.title}" at $${finalPrice}`,
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

  console.log(`\n========== WEBHOOK EVENT RECEIVED ==========`)
  console.log(`[v0] ✅ Event Type: ${event.type}`)
  console.log(`[v0] 📋 Event ID: ${event.id}`)
  console.log(`[v0] ⏰ Timestamp: ${new Date().toISOString()}`)
  if (event.data.object.metadata) {
    console.log(`[v0] 📦 Metadata:`, JSON.stringify(event.data.object.metadata, null, 2))
  }
  console.log(`==========================================\n`)

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

  const debugTrace: string[] = []

  try {
    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object as Stripe.Checkout.Session

        const metadata = session.metadata || {}
        const contentType = metadata.contentType
        const bundleId = metadata.bundleId || metadata.productBoxId
        const ebookId = metadata.ebookId

        if (contentType === "membership" || (!contentType && !bundleId && !ebookId)) {
          console.log(`\n========== MEMBERSHIP CHECKOUT ==========`)
          console.log(`[v0] 📋 Metadata plan: ${metadata.plan || "NOT SPECIFIED"}`)
          console.log(`[v0] 🆔 Session ID: ${session.id}`)
          console.log(`[v0] 💳 Subscription ID: ${session.subscription}`)
          console.log(`[v0] 👤 Buyer UID: ${metadata.buyerUid}`)
          console.log(`[v0] 📧 Buyer Email: ${metadata.buyerEmail}`)
          console.log(`==========================================\n`)
          debugTrace.push(`Processing membership checkout with metadata plan: ${metadata.plan || "not specified"}`)
        }

        if (contentType === "content_pack") {
          await processContentPackPurchase(session)
        } else if (contentType === "download_purchase") {
          await processDownloadPurchase(session)
        } else if (contentType === "ebook" || ebookId) {
          await processEbookPurchase(session)
        } else if (contentType === "bundle" || bundleId) {
          // Handle bundle purchase
          await processBundlePurchase(session)
        } else {
          // Handle subscription (Creator Pro upgrade)
          console.log(`[v0] 🚀 Calling processCheckoutSessionCompleted...`)
          await processCheckoutSessionCompleted(session)
          console.log(`[v0] ✅ processCheckoutSessionCompleted completed`)
          debugTrace.push(`Membership checkout completed`)
        }
        break

      case "customer.subscription.updated":
        const subscription = event.data.object as Stripe.Subscription
        const priceId = subscription.items.data[0]?.price.id

        console.log(`\n========== SUBSCRIPTION UPDATED ==========`)
        console.log(`[v0] 💰 Price ID: ${priceId}`)
        console.log(`[v0] 📊 Status: ${subscription.status}`)
        console.log(`[v0] 🆔 Subscription ID: ${subscription.id}`)
        console.log(`[v0] 👤 Customer ID: ${subscription.customer}`)
        console.log(`[v0] 📋 Metadata:`, JSON.stringify(subscription.metadata, null, 2))
        console.log(`==========================================\n`)
        debugTrace.push(`Updating subscription with price ID: ${priceId}`)

        console.log(`[v0] 🚀 Calling processSubscriptionUpdated...`)
        await processSubscriptionUpdated(subscription)
        console.log(`[v0] ✅ processSubscriptionUpdated completed`)
        debugTrace.push(`Subscription updated successfully`)
        break

      case "customer.subscription.deleted":
        console.log(`\n========== SUBSCRIPTION DELETED ==========`)
        console.log(`[v0] 🗑️ Subscription ID: ${(event.data.object as Stripe.Subscription).id}`)
        console.log(`==========================================\n`)
        await processSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      default:
        console.log(`Unhandled event type ${event.type}`)
    }

    console.log(`\n========== WEBHOOK RESPONSE ==========`)
    console.log(`[v0] ✅ Webhook processed successfully`)
    console.log(`[v0] 📋 Debug trace:`, debugTrace)
    console.log(`==========================================\n`)

    return NextResponse.json({ received: true, debugTrace })
  } catch (error: any) {
    console.error(`\n========== WEBHOOK ERROR ==========`)
    console.error(`[v0] ❌ Event type: ${event.type}`)
    console.error(`[v0] ❌ Error message: ${error.message}`)
    console.error(`[v0] ❌ Stack trace:`, error.stack)
    console.error(`==========================================\n`)
    debugTrace.push(`Error: ${error.message}`)
    return NextResponse.json({ error: "Webhook handler failed", details: error.message, debugTrace }, { status: 500 })
  }
}
