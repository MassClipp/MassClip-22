import Stripe from "stripe"
import { getFirestore } from "firebase-admin/firestore"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import { setCreatorPro, setFree, setCreatorProStatus, type MembershipStatus } from "@/lib/memberships-service"

// Initialize Firebase Admin
if (!getApps().length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!)
    initializeApp({
      credential: cert(serviceAccount),
    })
  } catch (error) {
    console.error("Failed to initialize Firebase Admin SDK:", error)
    // Fallback for Vercel env vars if parsing fails
    if (!getApps().length && process.env.FIREBASE_PROJECT_ID) {
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
  }
}

const db = getFirestore()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

// --- Helper Functions from original file ---

interface ContentItem {
  id: string
  title: string
  filename: string
  fileUrl: string
  downloadUrl: string
  publicUrl: string
  thumbnailUrl: string
  previewUrl: string
  mimeType: string
  fileType: string
  fileSize: number
  fileSizeFormatted: string
  displaySize: string
  duration: number
  durationFormatted: string
  displayDuration: string
  contentType: "video" | "audio" | "image" | "document"
  quality: string
  format: string
  resolution: string
  description: string
  tags: string[]
  createdAt: any
  uploadedAt: any
  isPublic: boolean
  downloadCount: number
  viewCount: number
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0:00"
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
  } else {
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }
}

function getContentType(mimeType: string): "video" | "audio" | "image" | "document" {
  if (mimeType.startsWith("video/")) return "video"
  if (mimeType.startsWith("audio/")) return "audio"
  if (mimeType.startsWith("image/")) return "image"
  return "document"
}

function cleanObject(obj: any): any {
  if (obj === null || obj === undefined) return null
  if (Array.isArray(obj)) return obj.map((item) => cleanObject(item))
  if (typeof obj === "object") {
    const cleaned: any = {}
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanObject(value)
      }
    }
    return cleaned
  }
  return obj
}

function createCleanContentItem(item: any): ContentItem {
  return {
    id: item.id || `content_${Date.now()}`,
    title: item.title || item.displayTitle || item.filename || "Untitled",
    filename: item.filename || item.title || "unknown.file",
    fileUrl: item.fileUrl || "",
    downloadUrl: item.downloadUrl || item.fileUrl || "",
    publicUrl: item.publicUrl || item.fileUrl || "",
    thumbnailUrl: item.thumbnailUrl || "",
    previewUrl: item.previewUrl || item.thumbnailUrl || "",
    mimeType: item.mimeType || "application/octet-stream",
    fileType: item.fileType || item.mimeType || "application/octet-stream",
    fileSize: item.fileSize || 0,
    fileSizeFormatted: item.fileSizeFormatted || formatFileSize(item.fileSize || 0),
    displaySize: item.displaySize || formatFileSize(item.fileSize || 0),
    duration: item.duration || 0,
    durationFormatted: item.durationFormatted || formatDuration(item.duration || 0),
    displayDuration: item.displayDuration || formatDuration(item.duration || 0),
    contentType: item.contentType || getContentType(item.mimeType || ""),
    quality: item.quality || "HD",
    format: item.format || (item.mimeType ? item.mimeType.split("/")[1] : "unknown"),
    resolution: item.resolution || "",
    description: item.description || "",
    tags: item.tags || [],
    createdAt: item.createdAt || new Date(),
    uploadedAt: item.uploadedAt || new Date(),
    isPublic: item.isPublic !== false,
    downloadCount: item.downloadCount || 0,
    viewCount: item.viewCount || 0,
  }
}

async function getComprehensiveContentMetadata(bundleId: string): Promise<ContentItem[]> {
  // This function implementation is preserved from the original file.
  try {
    console.log(`[Webhook] Fetching comprehensive content for bundle: ${bundleId}`)
    const contentItems: ContentItem[] = []
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()
    if (bundleDoc.exists) {
      const bundleData = bundleDoc.data()!
      if (bundleData.detailedContentItems && Array.isArray(bundleData.detailedContentItems)) {
        bundleData.detailedContentItems.forEach((item: any) => {
          if (item.fileUrl && item.fileUrl.startsWith("http")) {
            contentItems.push(createCleanContentItem(item))
          }
        })
      }
      if (contentItems.length === 0 && bundleData.contentItems && Array.isArray(bundleData.contentItems)) {
        for (const contentId of bundleData.contentItems) {
          const uploadDoc = await db.collection("uploads").doc(contentId).get()
          if (uploadDoc.exists) {
            const uploadData = uploadDoc.data()!
            if (uploadData.fileUrl && uploadData.fileUrl.startsWith("http")) {
              contentItems.push(createCleanContentItem({ id: contentId, ...uploadData }))
            }
          }
        }
      }
    }
    console.log(`[Webhook] Found ${contentItems.length} content items for bundle ${bundleId}`)
    return contentItems
  } catch (error) {
    console.error(`[Webhook] Error fetching content for bundle ${bundleId}:`, error)
    return []
  }
}

// --- Purchase Processing Logic ---

async function processBundlePurchase(session: Stripe.Checkout.Session) {
  console.log(`[Webhook] Executing processBundlePurchase for session: ${session.id}`)
  const bundleId = session.metadata?.bundleId || session.metadata?.productBoxId
  if (!bundleId) {
    throw new Error("processBundlePurchase: No bundle ID found in session metadata")
  }

  const existingPurchase = await db.collection("bundlePurchases").where("sessionId", "==", session.id).limit(1).get()
  if (!existingPurchase.empty) {
    console.log(`[Webhook] Bundle purchase already processed: ${session.id}`)
    return
  }

  const bundleDoc = await db.collection("bundles").doc(bundleId).get()
  const bundleData = bundleDoc.exists ? bundleDoc.data()! : null

  const contentItems = await getComprehensiveContentMetadata(bundleId)
  const totalSize = contentItems.reduce((sum, item) => sum + item.fileSize, 0)
  const totalDuration = contentItems.reduce((sum, item) => sum + (item.duration || 0), 0)
  const videoCount = contentItems.filter((item) => item.contentType === "video").length
  const audioCount = contentItems.filter((item) => item.contentType === "audio").length
  const imageCount = contentItems.filter((item) => item.contentType === "image").length
  const documentCount = contentItems.filter((item) => item.contentType === "document").length

  const totalAmountCents = session.amount_total || 0
  const platformFeePercentage = 20
  const platformFeeCents = Math.round(totalAmountCents * (platformFeePercentage / 100))
  const creatorEarningsCents = totalAmountCents - platformFeeCents

  const purchaseData = cleanObject({
    sessionId: session.id,
    paymentIntentId:
      typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || "",
    bundleId: bundleId,
    bundleTitle: bundleData?.title || `Bundle ${bundleId}`,
    bundleDescription: bundleData?.description || "",
    bundlePrice: bundleData?.price || totalAmountCents / 100,
    bundleCurrency: bundleData?.currency || session.currency || "usd",
    bundleThumbnail: bundleData?.coverImage || bundleData?.thumbnailUrl || "",
    bundleContent: contentItems,
    bundleContentMetadata: {
      totalItems: contentItems.length,
      totalSize,
      totalSizeFormatted: formatFileSize(totalSize),
      totalDuration,
      totalDurationFormatted: formatDuration(totalDuration),
      contentBreakdown: { videos: videoCount, audio: audioCount, images: imageCount, documents: documentCount },
    },
    creatorId: bundleData?.creatorId || session.metadata?.creatorId || "",
    creatorUsername: session.metadata?.creatorUsername || "",
    creatorStripeAccountId: bundleData?.stripeAccountId || session.metadata?.stripeAccountId || "",
    buyerUid: session.metadata?.buyerUid || session.client_reference_id || "",
    purchaseAmount: totalAmountCents,
    purchaseAmountDollars: totalAmountCents / 100,
    currency: session.currency || "usd",
    paymentStatus: session.payment_status || "paid",
    platformFeePercentage,
    platformFeeCents,
    platformFeeDollars: platformFeeCents / 100,
    creatorEarningsCents,
    creatorEarningsDollars: creatorEarningsCents / 100,
    status: "completed",
    timestamp: new Date(),
    webhookProcessed: true,
  })

  await db.collection("bundlePurchases").add(purchaseData)
  console.log(`[Webhook] Bundle purchase record created for bundle: ${bundleData?.title || bundleId}`)
}

async function processMembershipPurchase(session: Stripe.Checkout.Session) {
  console.log(`[Webhook] Executing processMembershipPurchase for session: ${session.id}`)
  const uid = session.client_reference_id || session.metadata?.userId || session.metadata?.buyerUid
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id
  const email = session.customer_details?.email

  if (!uid || !customerId || !subscriptionId || !email) {
    console.error("[Webhook] processMembershipPurchase: Missing required data in session.", {
      uid,
      customerId,
      subscriptionId,
      email,
    })
    throw new Error("Missing required data to process membership purchase.")
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000)

  await setCreatorPro(uid, {
    email,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    priceId: subscription.items.data[0]?.price.id,
    currentPeriodEnd,
    status: "active",
  })

  console.log(
    `[Webhook] User ${uid} successfully upgraded. Membership record created/updated in 'memberships' collection.`,
  )
}

// --- EXPORTED ROUTER FUNCTION ---

export async function processCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log(`[Webhook] Processing checkout.session.completed: ${session.id}`)
  try {
    if (session.subscription) {
      console.log(`[Webhook] Detected Membership Subscription purchase.`)
      await processMembershipPurchase(session)
    } else if (session.metadata?.bundleId || session.metadata?.productBoxId) {
      console.log(`[Webhook] Detected Bundle purchase.`)
      await processBundlePurchase(session)
    } else {
      console.warn(
        `[Webhook] checkout.session.completed for session ${session.id} was not a membership or a known bundle purchase. Ignoring.`,
      )
    }
  } catch (error) {
    console.error(`[Webhook] Error in processCheckoutSessionCompleted for session ${session.id}:`, error)
    // Optionally, re-throw or handle the error appropriately
  }
}

// --- OTHER EXPORTED FUNCTIONS ---

export async function processPaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    console.log(
      `[Webhook] Processing payment.intent.succeeded: ${paymentIntent.id}. No action taken as checkout.session.completed is primary.`,
    )
    return { success: true, paymentIntentId: paymentIntent.id }
  } catch (error) {
    console.error(`[Webhook] Error processing payment.intent.succeeded:`, error)
    throw error
  }
}

export async function processSubscriptionUpdated(subscription: Stripe.Subscription) {
  const uid = subscription.metadata?.userId || subscription.metadata?.buyerUid
  if (!uid) {
    console.error(
      `[Webhook] processSubscriptionUpdated: Missing user ID in subscription metadata for sub ID: ${subscription.id}`,
    )
    return
  }
  const status = subscription.status as MembershipStatus
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000)
  const priceId = subscription.items.data[0]?.price.id
  console.log(`[Webhook] Updating membership for user ${uid} to status: ${status}`)
  await setCreatorProStatus(uid, status, { currentPeriodEnd, priceId })
}

export async function processSubscriptionDeleted(subscription: Stripe.Subscription) {
  const uid = subscription.metadata?.userId || subscription.metadata?.buyerUid
  if (!uid) {
    console.error(
      `[Webhook] processSubscriptionDeleted: Missing user ID in subscription metadata for sub ID: ${subscription.id}`,
    )
    return
  }
  console.log(`[Webhook] Downgrading membership for user ${uid} due to subscription deletion.`)
  await setFree(uid, {})
}
