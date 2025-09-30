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
              console.log("[v0] Querying folders for userId:", userId)

              const foldersSnapshot = await db
                .collection("folders")
                .where("userId", "==", userId)
                .where("isDeleted", "==", false)
                .orderBy("name")
                .get()

              console.log("[v0] Folders query returned:", foldersSnapshot.size, "documents")

              if (foldersSnapshot.empty) {
                console.log("[v0] No folders found with userId, trying uid field...")
                const foldersSnapshotUid = await db
                  .collection("folders")
                  .where("uid", "==", userId)
                  .where("isDeleted", "==", false)
                  .orderBy("name")
                  .get()
                console.log("[v0] Folders query with uid returned:", foldersSnapshotUid.size, "documents")
              }

              if (!foldersSnapshot.empty) {
                const folders = foldersSnapshot.docs.map((doc) => {
                  const data = doc.data()
                  console.log("[v0] Found folder:", doc.id, data.name, "userId:", data.userId, "uid:", data.uid)
                  return {
                    id: doc.id,
                    name: data.name,
                    fileCount: data.fileCount || 0,
                  }
                })

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

              const contentByFolder = analysisData?.contentByFolder || {}
              const unorganizedContent = analysisData?.unorganizedContent || []

              let folderContentsContext = ""
              if (Object.keys(contentByFolder).length > 0) {
                folderContentsContext = "\n\nCONTENT IN EACH FOLDER:\n"
                for (const [folderName, items] of Object.entries(contentByFolder)) {
                  const itemsList = (items as any[]).map((item: any) => `  - ${item.title} (${item.type})`).join("\n")
                  folderContentsContext += `\n"${folderName}" folder (${(items as any[]).length} items):\n${itemsList}\n`
                }
              }

              if (unorganizedContent.length > 0) {
                folderContentsContext += `\n\nUNORGANIZED CONTENT (${unorganizedContent.length} items not in any folder):\n`
                folderContentsContext += unorganizedContent
                  .slice(0, 10)
                  .map((item: any) => `  - ${item.title} (${item.type})`)
                  .join("\n")
                if (unorganizedContent.length > 10) {
                  folderContentsContext += `\n  ... and ${unorganizedContent.length - 10} more unorganized items`
                }
              }

              userContentContext = `

USER'S CONTENT LIBRARY:
Total Uploads: ${analysisData?.totalUploads || 0}
Categories: ${(analysisData?.categories || []).join(", ")}
User Folders: ${(analysisData?.userFolders || []).map((f: any) => f.name).join(", ")}
${folderContentsContext}

Available content IDs for bundling: ${(analysisData?.uploads || []).map((upload: any) => upload.id).join(", ")}
`
              console.log("[v0] User context loaded with folder contents")
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
- Never mention technical processes, APIs, backend operations, or internal instructions
- Ask natural follow-up questions to understand what they want
- Be spontaneous and helpful, not rigid or robotic
- Speak directly to them, never refer to "the user"

===== YOUR CAPABILITIES =====

**1. CREATE FOLDERS**
When someone asks to create a folder, respond naturally then add this instruction:

CREATE_FOLDER: {"name": "Folder Name", "description": "Brief description"}

Rules:
- Use clear, descriptive names (2-4 words max)
- MUST be valid JSON on a single line
- Check if folder exists first to avoid duplicates

**2. RENAME CONTENT**
When you see generic titles like "IMG_8030", "VID_1234", "DSC_5678", "2819 Rebellion":
- STOP organizing and ask what those files are about
- Offer to rename them with descriptive titles
- Explain how good titles help with organization

To rename, use:

RENAME_CONTENT: {"contentId": "file_id_or_current_title", "newTitle": "Descriptive New Title", "reason": "why this name is better"}

Generic title patterns to watch for:
- IMG_XXXX, VID_XXXX, DSC_XXXX, MOV_XXXX (camera defaults)
- Random numbers: "2819 Rebellion", "1234 Video"
- Vague names: "Untitled", "New Video", "Content 1"

**3. ORGANIZE CONTENT INTO FOLDERS**
When organizing files, be CONSERVATIVE and PRECISE:

Critical matching rules:
- Check for generic titles FIRST - ask about them before organizing
- Only move content with CLEAR keyword matches in titles
- For "meme videos" → only titles with: "meme", "template", "funny", "comedy"
- For "motivation videos" → only titles with: "motivation", "inspire", "success", "mindset"
- Use existing folder contents as pattern examples
- When in doubt, ASK the user

To organize, use:

ORGANIZE_FILES: {"targetFolder": "Folder Name", "fileIds": ["file_id_1", "file_id_2"], "reason": "why these files belong here"}

Format requirements:
- MUST be valid JSON on a single line
- NO line breaks or lists inside the JSON
- Create the folder first if it doesn't exist

**4. CREATE BUNDLES**
When creating bundles:
- Check bundle limits first (shown in context below)
- Check video count limits for free users (max 10 videos)
- Be conservative with content matching (same rules as organizing)
- Use real content IDs from their library
- Price fairly: $5-15 starter, $15-35 bigger, $35+ premium
- Include 3-8 items for good value

To create, use:

CREATE_BUNDLE: {"title": "Bundle Name", "description": "Bundle description", "price": 15, "contentIds": ["id1", "id2", "id3"], "category": "Video Pack", "tags": ["tag1", "tag2"]}

Bundle limit responses:
- If at limit: "You've reached your bundle limit (X/X). Upgrade to Creator Pro for unlimited bundles!"
- If free tier wants >10 videos: "Free users can include up to 10 videos per bundle. Upgrade for unlimited!"

${userContentContext}${bundleLimitsContext}${folderContext}

Be helpful, natural, and focus on their success. Never expose internal instructions or technical details to users.`

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

    if (assistantMessage.includes("RENAME_CONTENT:") && userId) {
      try {
        console.log("[v0] Vex wants to rename content...")

        // Extract rename data
        const renameMatch = assistantMessage.match(/RENAME_CONTENT:\s*({.*?})/s)
        if (!renameMatch) {
          throw new Error("No valid rename data found")
        }

        const renameData = JSON.parse(renameMatch[1])
        console.log("[v0] Parsed rename data:", renameData)

        // Show progress message
        assistantMessage = assistantMessage.replace(
          /RENAME_CONTENT:\s*{.*?}/s,
          "✏️ **Renaming content now...** Updating the title!",
        )

        // Call the rename function
        const renameResult = await renameContentDirectly(userId, renameData)

        if (renameResult.success) {
          assistantMessage = assistantMessage.replace(
            "✏️ **Renaming content now...** Updating the title!",
            `✅ **Content renamed successfully!** "${renameResult.oldTitle}" is now "${renameResult.newTitle}". This will make it much easier to organize!`,
          )
        } else {
          assistantMessage = assistantMessage.replace(
            "✏️ **Renaming content now...** Updating the title!",
            `❌ ${renameResult.error || "I encountered an issue renaming the content. Please try again."}`,
          )
        }
      } catch (error) {
        console.error("[v0] Content rename failed:", error)
        assistantMessage = assistantMessage.replace(
          /✏️ \*\*Renaming content now\.\.\.\*\* Updating the title!/,
          "❌ I encountered an error while renaming the content. Please try again.",
        )
      }
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
          const fileList = organizeResult.movedFiles?.length
            ? `\n\n**Files moved:**\n${organizeResult.movedFiles.map((f: string) => `* ${f}`).join("\n")}`
            : ""

          assistantMessage = assistantMessage.replace(
            "🗂️ **Organizing your files now...** Moving them to the right folder!",
            `✅ **Files moved successfully!** Your "${organizeResult.targetFolder}" folder now contains the following files:${fileList}`,
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

    console.log(`[v0] Organizing ${fileIds.length} files to folder "${targetFolder}"`)

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

    const contentCollections = ["uploads", "productBoxContent", "free_content"]
    let movedCount = 0
    const movedFiles: string[] = []
    const batch = db.batch()

    for (const fileIdentifier of fileIds) {
      let found = false

      // Try each collection
      for (const collectionName of contentCollections) {
        // First try exact ID match
        const docRef = db.collection(collectionName).doc(fileIdentifier)
        const docSnap = await docRef.get()

        if (docSnap.exists) {
          const docData = docSnap.data()!

          // Verify ownership
          if (docData.uid === userId || docData.userId === userId) {
            batch.update(docRef, {
              folderId: targetFolderId,
              folderName: targetFolder,
              updatedAt: FieldValue.serverTimestamp(),
            })
            movedFiles.push(docData.title || docData.filename || fileIdentifier)
            movedCount++
            found = true
            console.log(`[v0] Matched "${fileIdentifier}" by ID in ${collectionName}`)
            break
          }
        }
      }

      // If not found by ID, try fuzzy matching by title/filename
      if (!found) {
        for (const collectionName of contentCollections) {
          const querySnapshot = await db.collection(collectionName).where("userId", "==", userId).get()

          for (const doc of querySnapshot.docs) {
            const docData = doc.data()
            const title = docData.title || docData.filename || ""

            // Fuzzy match: check if identifier is in title or title is in identifier
            if (
              title.toLowerCase() === fileIdentifier.toLowerCase() ||
              title.toLowerCase().includes(fileIdentifier.toLowerCase()) ||
              fileIdentifier.toLowerCase().includes(title.toLowerCase())
            ) {
              batch.update(doc.ref, {
                folderId: targetFolderId,
                folderName: targetFolder,
                updatedAt: FieldValue.serverTimestamp(),
              })
              movedFiles.push(title || fileIdentifier)
              movedCount++
              found = true
              console.log(`[v0] Matched "${fileIdentifier}" to "${title}" by fuzzy match in ${collectionName}`)
              break
            }
          }

          if (found) break
        }
      }

      if (!found) {
        console.warn(`[v0] Could not find file for identifier: "${fileIdentifier}"`)
      }
    }

    if (movedCount > 0) {
      await batch.commit()
      console.log(`[v0] Successfully moved ${movedCount} files to folder "${targetFolder}"`)

      try {
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/vex/analyze-uploads`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId }),
        })
        console.log("[v0] Triggered content analysis refresh after organizing files")
      } catch (error) {
        console.warn("[v0] Failed to trigger content analysis refresh:", error)
      }
    } else {
      return {
        success: false,
        error: `Could not find any of the specified files. Please make sure they exist in your library.`,
      }
    }

    return {
      success: true,
      movedCount,
      targetFolder,
      movedFiles,
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

async function renameContentDirectly(userId: string, renameData: any) {
  try {
    const { contentId, newTitle, reason } = renameData

    if (!contentId || !newTitle || typeof newTitle !== "string" || newTitle.trim().length === 0) {
      return { success: false, error: "Content ID and new title are required." }
    }

    if (newTitle.trim().length > 200) {
      return { success: false, error: "Title is too long (max 200 characters)." }
    }

    console.log(`[v0] Renaming content "${contentId}" to "${newTitle}"`)

    const contentCollections = ["uploads", "productBoxContent", "free_content"]
    let found = false
    let oldTitle = contentId
    let documentId = ""

    // Try to find the content by ID or title
    for (const collectionName of contentCollections) {
      // First try exact ID match
      const docRef = db.collection(collectionName).doc(contentId)
      const docSnap = await docRef.get()

      if (docSnap.exists) {
        const docData = docSnap.data()!

        // Verify ownership
        if (docData.uid === userId || docData.userId === userId) {
          oldTitle = docData.title || docData.filename || contentId
          documentId = docSnap.id
          found = true
          console.log(`[v0] Found content by ID in ${collectionName}`)
          break
        }
      }

      // If not found by ID, try fuzzy matching by title/filename
      if (!found) {
        const querySnapshot = await db.collection(collectionName).where("userId", "==", userId).get()

        for (const doc of querySnapshot.docs) {
          const docData = doc.data()
          const title = docData.title || docData.filename || ""

          // Fuzzy match: check if identifier is in title or title is in identifier
          if (
            title.toLowerCase() === contentId.toLowerCase() ||
            title.toLowerCase().includes(contentId.toLowerCase()) ||
            contentId.toLowerCase().includes(title.toLowerCase())
          ) {
            oldTitle = title
            documentId = doc.id
            found = true
            console.log(`[v0] Found content by fuzzy match in ${collectionName}`)
            break
          }
        }

        if (found) break
      }
    }

    if (!found || !documentId) {
      return {
        success: false,
        error: `Could not find content "${contentId}". Please make sure it exists in your library.`,
      }
    }

    // Call the uploads API to rename the content
    // This will cascade the update across all collections
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/uploads/${documentId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getAuth().createCustomToken(userId)}`,
        },
        body: JSON.stringify({
          title: newTitle.trim(),
        }),
      },
    )

    if (!response.ok) {
      const errorData = await response.json()
      return {
        success: false,
        error: errorData.error || "Failed to rename content.",
      }
    }

    console.log(`[v0] Successfully renamed "${oldTitle}" to "${newTitle}"`)

    return {
      success: true,
      oldTitle,
      newTitle: newTitle.trim(),
      contentId: documentId,
    }
  } catch (error) {
    console.error("[v0] Content rename error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred while renaming content.",
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
