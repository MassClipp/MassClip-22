import { NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
import { getAuth } from "firebase-admin/auth"
import { FieldValue } from "firebase-admin/firestore"
import Stripe from "stripe"
import { ConnectedStripeAccountsService } from "@/lib/connected-stripe-accounts-service"
import { getUserTierInfo, incrementUserBundles } from "@/lib/user-tier-service"

// Initialize Firebase Admin
initializeFirebaseAdmin()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export const maxDuration = 30

export async function POST(request: Request) {
  try {
    console.log("[v0] Chat API called")
    const { messages } = await request.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.log("[v0] No messages provided")
      return NextResponse.json({ error: "No messages provided" }, { status: 400 })
    }

    if (!process.env.GROQ_API) {
      console.log("[v0] Groq API key missing")
      return NextResponse.json({ error: "AI service not configured" }, { status: 500 })
    }

    console.log("[v0] Processing", messages.length, "messages")

    // Get user context if authenticated
    let userContentContext = ""
    let userId = null
    const authHeader = request.headers.get("authorization")

    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split("Bearer ")[1]
        const decodedToken = await getAuth().verifyIdToken(token)
        userId = decodedToken.uid
        console.log("[v0] User authenticated:", userId)

        const analysisDoc = await db.collection("vex_content_analysis").doc(userId).get()
        if (analysisDoc.exists) {
          const analysisData = analysisDoc.data()
          userContentContext = `

USER'S CONTENT LIBRARY:
Total Uploads: ${analysisData?.totalUploads || 0}
Categories: ${(analysisData?.categories || []).join(", ")}

Recent uploads: ${(analysisData?.uploads || [])
            .slice(0, 10)
            .map((upload: any) => `- ${upload.title} (${upload.contentType})`)
            .join("\n")}

Available content IDs for bundling: ${(analysisData?.uploads || []).map((upload: any) => upload.id).join(", ")}
`
          console.log("[v0] User context loaded")
        }
      } catch (error) {
        console.log("[v0] Auth failed, continuing without user context:", error)
      }
    }

    const systemPrompt = `You are Vex, a friendly AI assistant who helps content creators on MassClip turn their uploads into profitable bundles.

ABOUT MASSCLIP:
MassClip is a platform where creators upload and organize their digital content (videos, images, audio, templates, etc.) and package them into bundles to sell. You can navigate around using the dashboard, view uploads, create bundles, check analytics, and manage their storefront.

YOUR PERSONALITY:
- Conversational and enthusiastic about helping creators succeed
- Never mention technical processes, APIs, or backend operations
- Ask natural follow-up questions to understand what they want
- Be spontaneous and helpful, not rigid or robotic
- Speak directly to them, never refer to "the user"

WHAT YOU DO:
When someone asks you to create a bundle (like "make me a motivation bundle" or "create a photography pack"):

1. Look at their content library and get excited about what you see
2. Suggest a specific bundle idea with a catchy name and fair price
3. **IMMEDIATELY CREATE THE BUNDLE** - Don't ask for permission, just do it!
4. When creating, respond with "Perfect! Let me create that bundle for you right now..." then IMMEDIATELY add this special instruction:

CREATE_BUNDLE: {"title": "Bundle Name", "description": "Bundle description", "price": 15, "contentIds": ["id1", "id2", "id3"], "category": "Video Pack", "tags": ["tag1", "tag2"]}

Replace the values with the actual bundle details. This will automatically create the bundle in their account.

BUNDLE CREATION RULES:
- **ALWAYS use real content IDs from their library** - never make up fake IDs
- Group similar content that works well together
- Price fairly: $5-15 for starter packs, $15-35 for bigger collections, $35+ for premium bundles
- Create compelling names like "Ultimate Motivation Starter Kit" not just "Video Bundle"
- Include 3-8 items for good value
- Categories: Video Pack, Audio Collection, Mixed Media, Beginner Kit, Pro Bundle, etc.
- **If they don't have enough content, suggest they upload more first**

${userContentContext}

Be helpful, natural, and focus on their success. When creating bundles, use the CREATE_BUNDLE instruction format exactly as shown above with REAL content IDs only.`

    // Ensure messages have proper format
    const formattedMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((msg: any) => ({
        role: msg.role || "user",
        content: String(msg.content || msg.message || ""),
      })),
    ]

    console.log("[v0] Calling Groq API with", formattedMessages.length, "messages")

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: formattedMessages,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    })

    console.log("[v0] Groq API response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] Groq API error:", response.status, errorText)

      return NextResponse.json(
        { error: "Failed to process chat message", details: `AI service error: ${response.status}` },
        { status: 500 },
      )
    }

    const data = await response.json()
    console.log("[v0] Groq API success, got response")

    let assistantMessage = data.choices?.[0]?.message?.content

    if (!assistantMessage) {
      console.log("[v0] No assistant message in response")
      return NextResponse.json({ error: "No response from AI" }, { status: 500 })
    }

    if (assistantMessage.includes("CREATE_BUNDLE:") && userId) {
      try {
        console.log("[v0] Vex wants to create a bundle, starting direct creation...")

        // Extract bundle data
        const bundleMatch = assistantMessage.match(/CREATE_BUNDLE:\s*({.*?})/s)
        if (!bundleMatch) {
          throw new Error("No valid bundle data found")
        }

        const bundleData = JSON.parse(bundleMatch[1])
        console.log("[v0] Parsed bundle data:", bundleData)

        // Show progress message
        assistantMessage = assistantMessage.replace(
          /CREATE_BUNDLE:\s*{.*?}/s,
          "🚀 **Creating your bundle now...** This will just take a moment!",
        )

        // Direct bundle creation with detailed progress
        const result = await createBundleDirectly(userId, bundleData)

        if (result.success) {
          // Replace with success message
          assistantMessage = assistantMessage.replace(
            "🚀 **Creating your bundle now...** This will just take a moment!",
            `✅ **Bundle created successfully!** Your "${result.bundle.title}" bundle is now live in your dashboard. You can view it at your storefront or share it with customers right away!`,
          )
        } else {
          // Replace with specific error message
          assistantMessage = assistantMessage.replace(
            "🚀 **Creating your bundle now...** This will just take a moment!",
            `❌ ${result.error || "I encountered an issue creating your bundle. Please try again or create it manually in your dashboard."}`,
          )
        }
      } catch (error) {
        console.error("[v0] Bundle creation failed:", error)
        assistantMessage = assistantMessage.replace(
          /🚀 \*\*Creating your bundle now\.\.\.\*\* This will just take a moment!/,
          "❌ I encountered an error while creating your bundle. Please try again or create it manually in your dashboard.",
        )
      }
    }

    console.log("[v0] Returning successful response")
    return NextResponse.json({
      message: {
        role: "assistant",
        content: assistantMessage,
      },
    })
  } catch (error) {
    console.error("[v0] Chat API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function createBundleDirectly(userId: string, bundleData: any) {
  try {
    const { title, description, price, contentIds, category, tags } = bundleData

    if (!title || !description || !price || !contentIds || !Array.isArray(contentIds)) {
      return { success: false, error: "Missing required bundle information. Please try again." }
    }

    console.log("[v0] Checking bundle limits...")
    // Check bundle limits
    const tierInfo = await getUserTierInfo(userId)
    if (tierInfo.reachedBundleLimit) {
      return {
        success: false,
        error: `You've reached your limit of ${tierInfo.bundlesLimit} bundles. Please upgrade your plan to create more bundles.`,
      }
    }

    console.log("[v0] Checking Stripe account...")
    // Get connected Stripe account
    const connectedAccount = await ConnectedStripeAccountsService.getAccount(userId)
    if (!connectedAccount || !ConnectedStripeAccountsService.isAccountFullySetup(connectedAccount)) {
      return {
        success: false,
        error: "Please connect your Stripe account in Settings before creating bundles.",
      }
    }

    const stripeAccountId = connectedAccount.stripe_user_id || connectedAccount.stripeAccountId

    console.log("[v0] Processing content items...")
    // Process content items
    const contentItems = []
    for (const contentId of contentIds) {
      try {
        const contentDoc = await db.collection("uploads").doc(contentId).get()
        if (contentDoc.exists && contentDoc.data()?.userId === userId) {
          const contentData = contentDoc.data()!
          contentItems.push({
            id: contentId,
            title: contentData.title || contentData.filename || `Content ${contentItems.length + 1}`,
            description: contentData.description || "",
            fileUrl: contentData.url || contentData.downloadUrl || "",
            downloadUrl: contentData.downloadUrl || contentData.url || "",
            publicUrl: contentData.publicUrl || contentData.url || "",
            thumbnailUrl: contentData.thumbnailUrl || "",
            fileSize: contentData.size || 0,
            fileSizeFormatted: formatFileSize(contentData.size || 0),
            duration: contentData.duration || 0,
            durationFormatted: formatDuration(contentData.duration || 0),
            mimeType: contentData.mimeType || contentData.fileType || "video/mp4",
            format: contentData.format || getFormatFromMimeType(contentData.mimeType || contentData.fileType),
            quality: contentData.quality || "HD",
            tags: contentData.tags || [],
            contentType: getContentTypeFromMimeType(contentData.mimeType || contentData.fileType),
            createdAt: contentData.createdAt || contentData.uploadedAt || new Date().toISOString(),
            uploadedAt: contentData.uploadedAt || contentData.createdAt || new Date().toISOString(),
          })
        }
      } catch (error) {
        console.warn(`Failed to fetch content ${contentId}:`, error)
      }
    }

    if (contentItems.length === 0) {
      return { success: false, error: "No valid content items found. Please check your content library." }
    }

    console.log("[v0] Creating Stripe product...")
    // Create Stripe product
    const product = await stripe.products.create(
      {
        name: title,
        description: description.trim(),
        metadata: {
          bundleType: "content_bundle",
          creatorId: userId,
          contentCount: contentItems.length.toString(),
          createdBy: "vex-ai",
        },
      },
      {
        stripeAccount: stripeAccountId,
      },
    )

    console.log("[v0] Creating Stripe price...")
    // Create Stripe price
    const stripePrice = await stripe.prices.create(
      {
        product: product.id,
        unit_amount: Math.round(price * 100),
        currency: "usd",
        metadata: {
          bundleType: "content_bundle",
          creatorId: userId,
          createdBy: "vex-ai",
        },
      },
      {
        stripeAccount: stripeAccountId,
      },
    )

    console.log("[v0] Saving bundle to database...")
    // Create bundle metadata
    const totalSize = contentItems.reduce((sum, item) => sum + (item.fileSize || 0), 0)
    const totalDuration = contentItems.reduce((sum, item) => sum + (item.duration || 0), 0)

    const contentMetadata = {
      totalItems: contentItems.length,
      totalSize: totalSize,
      totalSizeFormatted: formatFileSize(totalSize),
      totalDuration: totalDuration,
      totalDurationFormatted: formatDuration(totalDuration),
      formats: [...new Set(contentItems.map((item) => item.format))],
      qualities: [...new Set(contentItems.map((item) => item.quality))],
      contentBreakdown: {
        videos: contentItems.filter((item) => item.contentType === "video").length,
        audios: contentItems.filter((item) => item.contentType === "audio").length,
        images: contentItems.filter((item) => item.contentType === "image").length,
        documents: contentItems.filter((item) => item.contentType === "document").length,
      },
    }

    // Save bundle to database
    const bundleRef = db.collection("bundles").doc()
    const bundleId = bundleRef.id

    const bundleDoc = {
      id: bundleId,
      title,
      description: description || "",
      price: Number(price),
      comparePrice: null,
      currency: "usd",
      billingType: "one_time",
      type: "one_time",

      // Creator info
      creatorId: userId,
      stripeAccountId: stripeAccountId,

      // Stripe product info
      stripeProductId: product.id,
      productId: product.id,
      stripePriceId: stripePrice.id,
      priceId: stripePrice.id,

      // Content
      detailedContentItems: contentItems,
      contentItems: contentItems.map((item) => item.id),
      contentMetadata,

      // Quick access arrays
      contentTitles: contentItems.map((item) => item.title),
      contentDescriptions: contentItems.map((item) => item.description),
      contentTags: contentItems.flatMap((item) => item.tags || []),
      contentThumbnails: contentItems.map((item) => item.thumbnailUrl).filter(Boolean),
      contentUrls: contentItems.map((item) => item.fileUrl).filter(Boolean),

      // Visual
      thumbnailUrl: contentItems[0]?.thumbnailUrl || "",
      coverImage: contentItems[0]?.thumbnailUrl || "",
      coverImageUrl: contentItems[0]?.thumbnailUrl || "",
      customPreviewThumbnail: contentItems[0]?.thumbnailUrl || "",

      // Status
      status: "active",
      active: true,
      isPublic: true,

      // Timestamps
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      contentLastUpdated: FieldValue.serverTimestamp(),

      // Vex specific
      createdBy: "vex-ai",
      category: category || "Mixed Media",
      tags: tags || [],
      totalSales: 0,
      totalRevenue: 0,
    }

    await bundleRef.set(bundleDoc)

    console.log("[v0] Updating user bundle count...")
    // Update user bundle count
    await incrementUserBundles(userId)

    console.log("[v0] Bundle created successfully:", bundleId)
    return {
      success: true,
      bundle: {
        id: bundleId,
        title,
        description,
        price,
        stripeProductId: product.id,
        stripePriceId: stripePrice.id,
        contentItems: contentItems.length,
        totalSize: contentMetadata.totalSizeFormatted,
        thumbnailUrl: bundleDoc.thumbnailUrl,
      },
    }
  } catch (error) {
    console.error("[v0] Bundle creation error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred while creating your bundle.",
    }
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

function getFormatFromMimeType(mimeType: string): string {
  if (!mimeType) return "mp4"
  if (mimeType.includes("video")) return mimeType.split("/")[1] || "mp4"
  if (mimeType.includes("audio")) return mimeType.split("/")[1] || "mp3"
  if (mimeType.includes("image")) return mimeType.split("/")[1] || "jpg"
  return "file"
}

function getContentTypeFromMimeType(mimeType: string): string {
  if (!mimeType) return "video"
  if (mimeType.startsWith("video/")) return "video"
  if (mimeType.startsWith("audio/")) return "audio"
  if (mimeType.startsWith("image/")) return "image"
  return "document"
}
