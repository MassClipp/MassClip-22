import { db } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function processCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log(`💳 Processing checkout session: ${session.id}`)
  console.log(`📋 Session metadata:`, session.metadata)

  const creatorId = session.metadata?.creatorId
  const bundleId = session.metadata?.bundleId
  const buyerUid = session.metadata?.buyerUid || session.client_reference_id || ""

  if (!creatorId || !bundleId) {
    throw new Error(`Missing required metadata: creatorId=${creatorId}, bundleId=${bundleId}`)
  }

  // Check for duplicate processing
  const existingPurchase = await db.collection("bundlePurchases").doc(session.id).get()
  if (existingPurchase.exists) {
    console.log(`⚠️ Purchase already processed: ${session.id}`)
    return { alreadyProcessed: true, sessionId: session.id }
  }

  // Get creator info
  const creatorDoc = await db.collection("users").doc(creatorId).get()
  if (!creatorDoc.exists) {
    throw new Error(`Creator not found: ${creatorId}`)
  }

  const creatorData = creatorDoc.data()!
  const creatorStripeAccountId = creatorData.stripeAccountId

  if (!creatorStripeAccountId) {
    throw new Error(`Creator missing Stripe account: ${creatorId}`)
  }

  // Verify session through connected account
  let verifiedSession: Stripe.Checkout.Session
  try {
    verifiedSession = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ["line_items", "payment_intent"],
      stripeAccount: creatorStripeAccountId,
    })
    console.log(`✅ Session verified through connected account`)
  } catch (error: any) {
    throw new Error(`Session verification failed: ${error.message}`)
  }

  // GET ALL BUNDLE INFORMATION FROM BUNDLES COLLECTION (PRIMARY SOURCE)
  const bundleDoc = await db.collection("bundles").doc(bundleId).get()
  if (!bundleDoc.exists) {
    throw new Error(`Bundle not found in bundles collection: ${bundleId}`)
  }

  const bundleData = bundleDoc.data()!
  console.log(`📦 Bundle data retrieved from bundles collection:`, {
    id: bundleId,
    title: bundleData.title,
    contentCount: bundleData.content?.length || 0,
  })

  // Extract content from bundles collection (PRIMARY SOURCE)
  const bundleContent = bundleData.content || bundleData.contentItems || bundleData.videos || []

  if (!Array.isArray(bundleContent) || bundleContent.length === 0) {
    throw new Error(`No content found in bundle: ${bundleId}`)
  }

  // Format content with ALL data from bundles collection
  const formattedBundleContent = bundleContent.map((item: any, index: number) => {
    console.log(`📄 Processing content item ${index}:`, {
      id: item.id || item.videoId,
      title: item.title || item.displayTitle,
      hasFileUrl: !!(item.fileUrl || item.videoUrl || item.url),
      fileSize: item.fileSize,
    })

    return {
      id: item.id || item.videoId || `content_${index}`,
      fileUrl: item.fileUrl || item.videoUrl || item.url || "",
      fileSize: item.fileSize || 0,
      displayTitle: item.title || item.displayTitle || `Video ${index + 1}`,
      displaySize: item.displaySize || formatFileSize(item.fileSize || 0),
      duration: item.duration || 0,
      filename: item.filename || item.title || `video_${index + 1}`,
      mimeType: item.mimeType || "video/mp4",
      // Include any additional metadata from bundles collection
      thumbnailUrl: item.thumbnailUrl || item.thumbnail || "",
      description: item.description || "",
      tags: item.tags || [],
      quality: item.quality || "HD",
    }
  })

  console.log(`✅ Formatted ${formattedBundleContent.length} content items from bundles collection`)

  // Create comprehensive purchase record with ALL bundle data
  const purchaseData = {
    // Session info
    sessionId: session.id,
    paymentIntentId:
      typeof verifiedSession.payment_intent === "string"
        ? verifiedSession.payment_intent
        : verifiedSession.payment_intent?.id || "",

    // Purchase details
    creatorId: creatorId,
    creatorStripeAccountId: creatorStripeAccountId,
    bundleId: bundleId,
    buyerUid: buyerUid,
    status: "completed",
    webhookProcessed: true,
    timestamp: FieldValue.serverTimestamp(),

    // Bundle information from bundles collection (PRIMARY SOURCE)
    bundleTitle: bundleData.title || "Untitled Bundle",
    bundleDescription: bundleData.description || "",
    bundlePrice: bundleData.price || 0,
    bundleThumbnail: bundleData.thumbnail || bundleData.thumbnailUrl || "",
    bundleTags: bundleData.tags || [],
    bundleCreatedAt: bundleData.createdAt || null,

    // Content from bundles collection (PRIMARY SOURCE)
    bundleContent: formattedBundleContent,
    contentCount: formattedBundleContent.length,

    // Creator info
    creatorUsername: creatorData.username || creatorData.displayName || "Unknown Creator",
    creatorDisplayName: creatorData.displayName || creatorData.username || "Unknown Creator",

    // Purchase metadata
    purchaseAmount: session.amount_total || 0,
    currency: session.currency || "usd",
    paymentStatus: session.payment_status || "paid",
  }

  // Save purchase record
  await db.collection("bundlePurchases").doc(session.id).set(purchaseData)

  console.log(`✅ Purchase processed successfully with complete bundle data:`, {
    sessionId: session.id,
    bundleId: bundleId,
    bundleTitle: bundleData.title,
    creatorId: creatorId,
    contentItems: formattedBundleContent.length,
    totalFileSize: formattedBundleContent.reduce((sum, item) => sum + (item.fileSize || 0), 0),
  })

  return {
    success: true,
    sessionId: session.id,
    bundleId: bundleId,
    bundleTitle: bundleData.title,
    contentItems: formattedBundleContent.length,
    purchaseAmount: session.amount_total || 0,
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 MB"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}
