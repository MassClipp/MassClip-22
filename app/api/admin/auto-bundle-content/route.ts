import { type NextRequest, NextResponse } from "next/server"
import { getFirestore } from "firebase-admin/firestore"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import Groq from "groq-sdk"
import Stripe from "stripe"

// Initialize Firebase Admin
if (!getApps().length) {
  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
  }
  initializeApp({ credential: cert(serviceAccount as any) })
}

const db = getFirestore()
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" })

// System creator ID for marketplace bundles
const SYSTEM_CREATOR_ID = "marketplace_system"

export async function POST(request: NextRequest) {
  try {
    const { useExistingContent, targetBundleCount } = await request.json()

    console.log("[Auto-Bundle] Starting content bundling process...")

    // Step 1: Fetch all content from the pool
    const contentPool: any[] = []

    // Get imported content
    const poolSnapshot = await db.collection("marketplace_content_pool").get()
    poolSnapshot.forEach((doc) => {
      contentPool.push({ id: doc.id, ...doc.data() })
    })

    // Get existing user uploads if enabled
    if (useExistingContent) {
      const uploadsSnapshot = await db.collection("uploads").limit(100).get()
      uploadsSnapshot.forEach((doc) => {
        const data = doc.data()
        contentPool.push({
          id: doc.id,
          title: data.title || data.fileName || "Untitled",
          description: data.description || "",
          fileUrl: data.publicUrl || data.downloadUrl || "",
          downloadUrl: data.downloadUrl || data.publicUrl || "",
          thumbnailUrl: data.thumbnailUrl || "",
          fileSize: data.fileSize || 0,
          duration: data.duration || 0,
          mimeType: data.mimeType || "video/mp4",
          contentType: data.contentType || "video",
          format: data.format || "mp4",
          quality: data.quality || "hd",
          tags: data.tags || [],
          source: "user_upload",
          createdAt: data.createdAt || new Date(),
        })
      })
    }

    console.log(`[Auto-Bundle] Found ${contentPool.length} content items`)

    if (contentPool.length === 0) {
      return NextResponse.json({ error: "No content available to bundle" }, { status: 400 })
    }

    // Step 2: Use AI to analyze and group content
    const contentSummary = contentPool.map((item) => ({
      id: item.id,
      title: item.title,
      tags: item.tags,
      type: item.contentType,
    }))

    const aiResponse = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are an expert content curator. Group the provided content items into themed bundles of 5-15 items each. Create ${targetBundleCount} bundles with varied themes. For each bundle, provide:
- title: Catchy bundle name
- description: 2-3 sentence description
- price: Price between $9-$49 based on content quantity/quality
- contentIds: Array of content IDs to include
- category: One of: video, audio, image, mixed
- creatorName: Realistic creator name
- creatorBio: Short creator bio

Return ONLY valid JSON array of bundles.`,
        },
        {
          role: "user",
          content: `Create ${targetBundleCount} themed bundles from this content:\n${JSON.stringify(contentSummary, null, 2)}`,
        },
      ],
      temperature: 0.8,
      max_tokens: 8000,
    })

    const bundlesData = JSON.parse(aiResponse.choices[0]?.message?.content || "[]")
    console.log(`[Auto-Bundle] AI generated ${bundlesData.length} bundle plans`)

    // Step 3: Create actual bundles in Firebase and Stripe
    let bundlesCreated = 0

    for (const bundlePlan of bundlesData) {
      try {
        // Get content items for this bundle
        const bundleContent = contentPool.filter((item) => bundlePlan.contentIds.includes(item.id))

        if (bundleContent.length === 0) continue

        // Create Stripe product
        const product = await stripe.products.create({
          name: bundlePlan.title,
          description: bundlePlan.description,
          metadata: {
            bundleType: "marketplace",
            category: bundlePlan.category,
            creatorName: bundlePlan.creatorName,
          },
        })

        // Create Stripe price
        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: Math.round(bundlePlan.price * 100),
          currency: "usd",
        })

        // Calculate metadata
        const totalSize = bundleContent.reduce((sum, item) => sum + (item.fileSize || 0), 0)
        const totalDuration = bundleContent.reduce((sum, item) => sum + (item.duration || 0), 0)

        // Create bundle document
        const bundleId = db.collection("bundles").doc().id
        await db
          .collection("bundles")
          .doc(bundleId)
          .set({
            id: bundleId,
            title: bundlePlan.title,
            description: bundlePlan.description,
            price: bundlePlan.price,
            currency: "usd",
            type: "one_time",
            billingType: "one_time",

            // Marketplace-specific
            isMarketplace: true,
            category: bundlePlan.category,
            creatorName: bundlePlan.creatorName,
            creatorBio: bundlePlan.creatorBio,
            creatorId: SYSTEM_CREATOR_ID,

            // Stripe
            stripeProductId: product.id,
            stripePriceId: price.id,
            productId: product.id,
            priceId: price.id,

            // Content
            detailedContentItems: bundleContent,
            contentItems: bundleContent.map((item) => item.id),
            contentMetadata: {
              totalItems: bundleContent.length,
              totalSize,
              totalSizeFormatted: formatFileSize(totalSize),
              totalDuration,
              totalDurationFormatted: formatDuration(totalDuration),
            },

            // Visual
            thumbnailUrl: bundleContent[0]?.thumbnailUrl || "",
            coverImage: bundleContent[0]?.thumbnailUrl || "",

            // Status
            status: "active",
            active: true,
            isPublic: true,

            // Timestamps
            createdAt: new Date(),
            updatedAt: new Date(),
          })

        bundlesCreated++
        console.log(`[Auto-Bundle] Created bundle: ${bundlePlan.title}`)
      } catch (error) {
        console.error(`[Auto-Bundle] Failed to create bundle:`, error)
      }
    }

    console.log(`[Auto-Bundle] Successfully created ${bundlesCreated} bundles`)

    return NextResponse.json({
      success: true,
      bundlesCreated,
      totalContent: contentPool.length,
    })
  } catch (error: any) {
    console.error("[Auto-Bundle] Error:", error)
    return NextResponse.json({ error: "Failed to auto-bundle content", details: error.message }, { status: 500 })
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 MB"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`
}
