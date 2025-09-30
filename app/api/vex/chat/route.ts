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
    let bundleLimitsContext = ""
    let folderContext = ""
    let userId = null
    const authHeader = request.headers.get("authorization")

    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const tokenParts = authHeader.split("Bearer ")
        if (tokenParts.length !== 2 || !tokenParts[1] || !tokenParts[1].trim()) {
          console.error("[v0] Invalid authorization header format")
        } else {
          const token = tokenParts[1].trim()

          // Validate token format (JWT should have 3 parts separated by dots)
          if (token.split(".").length === 3) {
            const decodedToken = await getAuth().verifyIdToken(token)
            userId = decodedToken.uid
            console.log("[v0] User authenticated:", userId)

            const tierInfo = await getUserTierInfo(userId)
            bundleLimitsContext = `

BUNDLE LIMITS:
Current bundles: ${tierInfo.bundlesCreated || 0}
Bundle limit: ${tierInfo.bundlesLimit === null ? "unlimited" : tierInfo.bundlesLimit || 2}
Can create bundles: ${!tierInfo.reachedBundleLimit ? "YES" : "NO"}
User tier: ${tierInfo.tier || "free"}
Max videos per bundle: ${tierInfo.maxVideosPerBundle === null ? "unlimited" : tierInfo.maxVideosPerBundle || 10}

${tierInfo.reachedBundleLimit ? `⚠️ BUNDLE LIMIT REACHED: User has reached their limit of ${tierInfo.bundlesLimit || 2} bundles. ${(tierInfo.tier || "free") === "free" ? "They need to upgrade to Creator Pro for unlimited bundles or purchase extra bundle slots." : "They should contact support."}` : ""}
`

            try {
              const foldersSnapshot = await db.collection("folders").where("uid", "==", userId).orderBy("name").get()

              if (!foldersSnapshot.empty) {
                const folders = foldersSnapshot.docs.map((doc) => ({
                  id: doc.id,
                  name: doc.data().name,
                  fileCount: doc.data().fileCount || 0,
                }))

                folderContext = `

USER'S CONTENT FOLDERS:
${folders.map((folder) => `- "${folder.name}" (${folder.fileCount} files) [ID: ${folder.id}]`).join("\n")}

FOLDER ORGANIZATION CAPABILITIES:
You can help organize content into these folders by:
1. Moving files to appropriate folders based on content analysis
2. Suggesting which folder new uploads should go into
3. Creating new folders when needed for better organization

When organizing files, use the folder names exactly as shown above.
`
                console.log("[v0] Folder context loaded:", folders.length, "folders")
              }
            } catch (error) {
              console.log("[v0] Failed to load folder context:", error)
            }

            const analysisDoc = await db.collection("vex_content_analysis").doc(userId).get()
            if (analysisDoc.exists) {
              const analysisData = analysisDoc.data()
              userContentContext = `

USER'S CONTENT LIBRARY:
Total Uploads: ${analysisData?.totalUploads || 0}
Categories: ${(analysisData?.categories || []).join(", ")}
User Folders: ${(analysisData?.userFolders || []).map((f: any) => f.name).join(", ")}

Recent uploads: ${(analysisData?.uploads || [])
                .slice(0, 10)
                .map(
                  (upload: any) =>
                    `- ${upload.title} (${upload.contentType}) ${upload.folderName ? `[in "${upload.folderName}"]` : "[no folder]"}`,
                )
                .join("\n")}

Available content IDs for bundling: ${(analysisData?.uploads || []).map((upload: any) => upload.id).join(", ")}
`
              console.log("[v0] User context loaded")
            }
          } else {
            console.error("[v0] Invalid token format")
          }
        }
      } catch (error) {
        console.log("[v0] Auth failed, continuing without user context:", error)
      }
    }

    const systemPrompt = `You are Vex, a friendly AI assistant who helps content creators on MassClip turn their uploads into profitable bundles and organize their content efficiently.

ABOUT MASSCLIP:
MassClip is a platform where creators upload and organize their digital content (videos, images, audio, templates, etc.) and package them into bundles to sell. You can navigate around using the dashboard, view uploads, create bundles, check analytics, and manage their storefront.

YOUR PERSONALITY:
- Conversational and enthusiastic about helping creators succeed
- Never mention technical processes, APIs, or backend operations
- Ask natural follow-up questions to understand what they want
- Be spontaneous and helpful, not rigid or robotic
- Speak directly to them, never refer to "the user"

WHAT YOU DO:

**FOLDER CREATION:**
When someone asks you to create a folder (like "create a folder for my fitness videos" or "make a motivation folder"):
1. Create the folder immediately with a clear, descriptive name
2. Respond with "Let me create that folder for you!" then add this instruction:

CREATE_FOLDER: {"name": "Folder Name", "description": "Brief description"}

Replace with the actual folder details. This will automatically create the folder.

**CONTENT ORGANIZATION:**
When someone asks you to organize their content or move files to folders:
1. Check if the target folder exists in their folder structure
2. If the folder doesn't exist, CREATE IT FIRST using CREATE_FOLDER
3. Then organize the files using ORGANIZE_FILES
4. You can do both in one response - create folder, then organize files into it

To organize files, respond with "Let me organize those files for you!" then add:

ORGANIZE_FILES: {"targetFolder": "folder_name", "fileIds": ["file1", "file2"], "reason": "explanation"}

**BUNDLE CREATION:**
When someone asks you to create a bundle (like "make me a motivation bundle" or "create a photography pack"):

1. **FIRST CHECK BUNDLE LIMITS** - If they've reached their bundle limit, politely explain they need to upgrade or purchase extra slots
2. **CHECK VIDEO COUNT LIMITS** - If they're on free tier and want more than 10 videos in a bundle, explain the limit and suggest upgrading
3. Look at their content library and get excited about what you see
4. Suggest a specific bundle idea with a catchy name and fair price
5. **ONLY CREATE IF WITHIN ALL LIMITS** - Don't ask for permission, just do it!
6. When creating, respond with "Perfect! Let me create that bundle for you right now..." then IMMEDIATELY add this special instruction:

CREATE_BUNDLE: {"title": "Bundle Name", "description": "Bundle description", "price": 15, "contentIds": ["id1", "id2", "id3"], "category": "Video Pack", "tags": ["tag1", "tag2"]}

Replace the values with the actual bundle details. This will automatically create the bundle in their account.

FOLDER CREATION RULES:
- Use clear, descriptive folder names (e.g., "Fitness Videos", "Motivation Clips", "Product Photos")
- Keep folder names concise (2-4 words max)
- Add helpful descriptions that explain what content belongs in the folder
- If they ask to organize content into a folder that doesn't exist, CREATE IT FIRST
- You can create multiple folders in one response if needed

FOLDER ORGANIZATION RULES:
- Always check if the folder exists first
- If it doesn't exist, use CREATE_FOLDER before ORGANIZE_FILES
- Use exact folder names from their folder structure
- Group similar content types together
- Be proactive about organization - suggest improvements
- Always explain why you're putting content in specific folders

BUNDLE CREATION RULES:
- **ALWAYS check bundle limits first** - Never create if they've reached their limit
- **ALWAYS check video count limits for free users** - Max 10 videos per bundle for free tier
- **ALWAYS use real content IDs from their library** - never make up fake IDs
- Group similar content that works well together
- Price fairly: $5-15 for starter packs, $15-35 for bigger collections, $35+ for premium bundles
- Create compelling names like "Ultimate Motivation Starter Kit" not just "Video Bundle"
- Include 3-8 items for good value (max 10 for free users)
- Categories: Video Pack, Audio Collection, Mixed Media, Beginner Kit, Pro Bundle, etc.
- **If they don't have enough content, suggest they upload more first**

BUNDLE LIMIT RESPONSES:
- If they can create bundles, be enthusiastic and helpful
- If they've reached their bundle limit, be understanding and suggest upgrading: "I can see you've reached your bundle limit (X/X bundles). To create more amazing bundles, you can upgrade to Creator Pro for unlimited bundles or purchase extra bundle slots in your settings!"
- If they're free tier and want more than 10 videos: "Free users can include up to 10 videos per bundle. For unlimited videos per bundle, upgrade to Creator Pro! Would you like me to create a bundle with your top 10 videos instead?"
- Always mention their current bundle count when relevant

${userContentContext}${bundleLimitsContext}${folderContext}

Be helpful, natural, and focus on their success. When creating folders, use CREATE_FOLDER. When organizing files, use ORGANIZE_FILES (create the folder first if needed). When creating bundles, use CREATE_BUNDLE with REAL content IDs only.`

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

    if (assistantMessage.includes("ORGANIZE_FILES:") && userId) {
      try {
        console.log("[v0] Vex wants to organize files...")

        // Extract organization data
        const organizeMatch = assistantMessage.match(/ORGANIZE_FILES:\s*({.*?})/s)
        if (!organizeMatch) {
          throw new Error("No valid organization data found")
        }

        const organizeData = JSON.parse(organizeMatch[1])
        console.log("[v0] Parsed organization data:", organizeData)

        // Show progress message
        assistantMessage = assistantMessage.replace(
          /ORGANIZE_FILES:\s*{.*?}/s,
          "🗂️ **Organizing your files now...** Moving them to the right folder!",
        )

        // Call the organize files API
        const organizeResult = await organizeFilesDirectly(userId, organizeData)

        if (organizeResult.success) {
          assistantMessage = assistantMessage.replace(
            "🗂️ **Organizing your files now...** Moving them to the right folder!",
            `✅ **Files organized successfully!** I've moved ${organizeResult.movedCount} files to your "${organizeData.targetFolder}" folder. ${organizeData.reason}`,
          )
        } else {
          assistantMessage = assistantMessage.replace(
            "🗂️ **Organizing your files now...** Moving them to the right folder!",
            `❌ ${organizeResult.error || "I encountered an issue organizing your files. Please try again."}`,
          )
        }
      } catch (error) {
        console.error("[v0] File organization failed:", error)
        assistantMessage = assistantMessage.replace(
          /🗂️ \*\*Organizing your files now\.\.\.\*\* Moving them to the right folder!/,
          "❌ I encountered an error while organizing your files. Please try again.",
        )
      }
    }

    if (assistantMessage.includes("CREATE_FOLDER:") && userId) {
      try {
        console.log("[v0] Vex wants to create a folder...")

        // Extract folder data
        const folderMatch = assistantMessage.match(/CREATE_FOLDER:\s*({.*?})/s)
        if (!folderMatch) {
          throw new Error("No valid folder data found")
        }

        const folderData = JSON.parse(folderMatch[1])
        console.log("[v0] Parsed folder data:", folderData)

        // Show progress message
        assistantMessage = assistantMessage.replace(
          /CREATE_FOLDER:\s*{.*?}/s,
          "📁 **Creating folder now...** Setting up your new folder!",
        )

        // Create the folder
        const folderResult = await createFolderDirectly(userId, folderData)

        if (folderResult.success) {
          assistantMessage = assistantMessage.replace(
            "📁 **Creating folder now...** Setting up your new folder!",
            `✅ **Folder created successfully!** Your "${folderResult.folderName}" folder is ready to use.`,
          )
        } else {
          assistantMessage = assistantMessage.replace(
            "📁 **Creating folder now...** Setting up your new folder!",
            `❌ ${folderResult.error || "I encountered an issue creating the folder. Please try again."}`,
          )
        }
      } catch (error) {
        console.error("[v0] Folder creation failed:", error)
        assistantMessage = assistantMessage.replace(
          /📁 \*\*Creating folder now\.\.\.\*\* Setting up your new folder!/,
          "❌ I encountered an error while creating the folder. Please try again.",
        )
      }
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
        error: `You've reached your limit of ${tierInfo.bundlesLimit || 2} bundles. Please upgrade your plan to create more bundles.`,
      }
    }

    const maxVideosPerBundle = tierInfo.maxVideosPerBundle || (tierInfo.tier === "free" ? 10 : null)
    if (tierInfo.tier === "free" && maxVideosPerBundle && contentIds.length > maxVideosPerBundle) {
      return {
        success: false,
        error: `Free users can only include up to ${maxVideosPerBundle} videos per bundle. This bundle has ${contentIds.length} items. Please upgrade to Creator Pro for unlimited videos per bundle.`,
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

    console.log("[v0] Getting user's content analysis...")
    const analysisDoc = await db.collection("vex_content_analysis").doc(userId).get()
    if (!analysisDoc.exists) {
      return { success: false, error: "Please run content analysis first before creating bundles." }
    }

    const analysisData = analysisDoc.data()!
    const availableUploads = analysisData.uploads || []

    console.log("[v0] Processing content items with proper ID mapping...")
    const contentItems = []
    for (const contentIdentifier of contentIds) {
      try {
        // First, try to find by exact document ID
        let matchedUpload = availableUploads.find((upload: any) => upload.id === contentIdentifier)

        // If not found by ID, try to match by title or filename
        if (!matchedUpload) {
          matchedUpload = availableUploads.find(
            (upload: any) =>
              upload.title === contentIdentifier ||
              upload.filename === contentIdentifier ||
              upload.title.toLowerCase().includes(contentIdentifier.toLowerCase()) ||
              contentIdentifier.toLowerCase().includes(upload.title.toLowerCase()),
          )
        }

        if (matchedUpload) {
          // Fetch the actual document from the correct collection
          const contentDoc = await db.collection(matchedUpload.collection).doc(matchedUpload.id).get()
          if (contentDoc.exists) {
            const contentData = contentDoc.data()!

            // Verify this content belongs to the user
            if (contentData.uid === userId || contentData.userId === userId) {
              contentItems.push({
                id: matchedUpload.id,
                title: contentData.title || contentData.filename || `Content ${contentItems.length + 1}`,
                description: contentData.description || "",
                fileUrl: contentData.url || contentData.downloadUrl || contentData.downloadURL || "",
                downloadUrl: contentData.downloadUrl || contentData.url || contentData.downloadURL || "",
                publicUrl: contentData.publicUrl || contentData.url || contentData.downloadURL || "",
                thumbnailUrl: contentData.thumbnailUrl || "",
                fileSize: contentData.fileSize || contentData.size || 0,
                fileSizeFormatted: formatFileSize(contentData.fileSize || contentData.size || 0),
                duration: contentData.duration || 0,
                durationFormatted: formatDuration(contentData.duration || 0),
                mimeType: contentData.mimeType || contentData.type || "video/mp4",
                format: contentData.format || getFormatFromMimeType(contentData.mimeType || contentData.type),
                quality: contentData.quality || "HD",
                tags: contentData.tags || [],
                contentType: getContentTypeFromMimeType(contentData.mimeType || contentData.type),
                createdAt: contentData.createdAt || contentData.addedAt || new Date().toISOString(),
                uploadedAt:
                  contentData.uploadedAt || contentData.createdAt || contentData.addedAt || new Date().toISOString(),
                collection: matchedUpload.collection,
              })
              console.log(
                `[v0] Successfully mapped "${contentIdentifier}" to document ${matchedUpload.id} from ${matchedUpload.collection}`,
              )
            }
          }
        } else {
          console.warn(`[v0] Could not find content for identifier: "${contentIdentifier}"`)
        }
      } catch (error) {
        console.warn(`[v0] Failed to process content "${contentIdentifier}":`, error)
      }
    }

    if (contentItems.length === 0) {
      return {
        success: false,
        error:
          "No valid content items found. The content you referenced may not exist or may not belong to your account.",
      }
    }

    console.log(`[v0] Successfully processed ${contentItems.length} content items`)

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

async function organizeFilesDirectly(userId: string, organizeData: any) {
  try {
    const { targetFolder, fileIds, reason } = organizeData

    if (!targetFolder || !fileIds || !Array.isArray(fileIds)) {
      return { success: false, error: "Missing required organization information." }
    }

    // Find the target folder
    let foldersSnapshot = await db
      .collection("folders")
      .where("userId", "==", userId)
      .where("name", "==", targetFolder)
      .where("isDeleted", "==", false)
      .limit(1)
      .get()

    // Try with uid field if userId didn't work
    if (foldersSnapshot.empty) {
      foldersSnapshot = await db
        .collection("folders")
        .where("uid", "==", userId)
        .where("name", "==", targetFolder)
        .where("isDeleted", "==", false)
        .limit(1)
        .get()
    }

    if (foldersSnapshot.empty) {
      return {
        success: false,
        error: `Folder "${targetFolder}" not found. Please create it first using CREATE_FOLDER.`,
      }
    }

    const targetFolderId = foldersSnapshot.docs[0].id
    console.log("[v0] Found target folder:", targetFolderId)

    // Get user's content analysis to find the files
    const analysisDoc = await db.collection("vex_content_analysis").doc(userId).get()
    if (!analysisDoc.exists) {
      return { success: false, error: "Content analysis not found. Please analyze your content first." }
    }

    const analysisData = analysisDoc.data()!
    const availableUploads = analysisData.uploads || []

    let movedCount = 0
    const batch = db.batch()

    for (const fileId of fileIds) {
      // Find the file in the analysis data
      const upload = availableUploads.find((u: any) => u.id === fileId)
      if (upload) {
        // Update the file's folder reference
        const fileRef = db.collection(upload.collection).doc(fileId)
        batch.update(fileRef, {
          folderId: targetFolderId,
          folderName: targetFolder,
          updatedAt: FieldValue.serverTimestamp(),
        })
        movedCount++
      }
    }

    if (movedCount > 0) {
      await batch.commit()
      console.log(`[v0] Successfully moved ${movedCount} files to folder "${targetFolder}"`)
    }

    return {
      success: true,
      movedCount,
      targetFolder,
    }
  } catch (error) {
    console.error("[v0] File organization error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred while organizing files.",
    }
  }
}

async function createFolderDirectly(userId: string, folderData: any) {
  try {
    const { name, description, parentId } = folderData

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return { success: false, error: "Folder name is required." }
    }

    if (name.trim().length > 100) {
      return { success: false, error: "Folder name is too long (max 100 characters)." }
    }

    console.log(`[v0] Creating folder "${name}" for user ${userId}`)

    // Check for duplicate folder names
    const duplicateQuery = db
      .collection("folders")
      .where("userId", "==", userId)
      .where("name", "==", name.trim())
      .where("isDeleted", "==", false)

    const duplicateSnapshot = await duplicateQuery.get()
    if (!duplicateSnapshot.empty) {
      return {
        success: false,
        error: `A folder named "${name}" already exists. Please choose a different name.`,
      }
    }

    // Build folder path
    let parentPath = ""
    if (parentId && parentId !== "root") {
      const parentDoc = await db.collection("folders").doc(parentId).get()
      if (parentDoc.exists) {
        const parentData = parentDoc.data()
        parentPath = parentData?.path || ""
      }
    }

    const folderPath = parentPath ? `${parentPath}/${name.trim()}` : `/${name.trim()}`

    // Create folder
    const timestamp = new Date()
    const newFolder = {
      name: name.trim(),
      userId,
      uid: userId, // Add uid for compatibility with existing queries
      parentId: parentId && parentId !== "root" ? parentId : null,
      path: folderPath,
      description: description?.trim() || null,
      isDeleted: false,
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: "vex-ai",
    }

    const folderRef = await db.collection("folders").add(newFolder)

    console.log(`[v0] Successfully created folder: ${folderRef.id} (${name})`)

    return {
      success: true,
      folderId: folderRef.id,
      folderName: name.trim(),
    }
  } catch (error) {
    console.error("[v0] Folder creation error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred while creating the folder.",
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
