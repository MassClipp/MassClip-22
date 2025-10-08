import { NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
import { getAuth } from "firebase-admin/auth"
import { FieldValue } from "firebase-admin/firestore"
import Stripe from "stripe"
import { ConnectedStripeAccountsService } from "@/lib/connected-stripe-accounts-service"
import { getUserTierInfo, incrementUserBundles } from "@/lib/user-tier-service"
import { canUserCreateBundles, checkSubscription } from "@/lib/subscription"

// Initialize Firebase Admin
initializeFirebaseAdmin()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export const maxDuration = 30

interface FileAnalysis {
  fileId: string
  fileName: string
  semanticFit: "strong" | "moderate" | "weak" | "none"
  confidence: number // 0-100
  evidence: string // Quoted text from transcript that supports the decision
  reasoning: string // Why this file does/doesn't fit
  transcriptQuality: "good" | "short" | "missing" | "poor"
}

interface SemanticAnalysisResult {
  decision: "proceed" | "ask_user" | "reject"
  overallConfidence: number
  fileAnalyses: FileAnalysis[]
  summary: string
  warnings: string[]
}

// These old functions used broken keyword matching. Replaced with single LLM-first semantic analysis.

async function performSemanticAnalysis(
  action: string,
  context: {
    targetFolder?: string
    fileIds?: string[]
    uploads?: any[]
    folderContents?: any[]
    reason?: string
  },
): Promise<SemanticAnalysisResult> {
  const { targetFolder, fileIds, uploads, folderContents, reason } = context

  // Validate inputs
  if (!targetFolder || targetFolder === "None" || targetFolder === "undefined") {
    console.error("[v0] ❌ Invalid targetFolder:", targetFolder)
    return {
      decision: "reject",
      overallConfidence: 0,
      fileAnalyses: [],
      summary: "Invalid folder name provided",
      warnings: ["Folder name is missing or invalid"],
    }
  }

  if (!fileIds || fileIds.length === 0) {
    console.error("[v0] ❌ No file IDs provided")
    return {
      decision: "reject",
      overallConfidence: 0,
      fileAnalyses: [],
      summary: "No files specified for analysis",
      warnings: ["File IDs array is empty"],
    }
  }

  if (!uploads || uploads.length === 0) {
    console.error("[v0] ❌ No uploads data available")
    return {
      decision: "reject",
      overallConfidence: 0,
      fileAnalyses: [],
      summary: "No upload data available",
      warnings: ["Uploads array is empty - content analysis may need to be refreshed"],
    }
  }

  console.log(`[v0] 🧠 Starting semantic analysis for "${targetFolder}"`)
  console.log(`[v0] 📊 Analyzing ${fileIds.length} files from ${uploads.length} total uploads`)

  // Prepare file data for LLM analysis
  const filesToAnalyze = fileIds
    .map((fileId) => {
      const upload = uploads.find((u: any) => u.id === fileId)
      if (!upload) {
        console.warn(`[v0] ⚠️ File not found: ${fileId}`)
        return null
      }

      console.log(`[v0] ✅ Found file: "${upload.title}" (${upload.duration || 0}s)`)
      console.log(`[v0]    Transcript: ${upload.transcript ? `${upload.transcript.length} chars` : "MISSING"}`)

      return {
        id: upload.id,
        title: upload.title || upload.filename || "Untitled",
        transcript: upload.transcript || "",
        duration: upload.duration || 0,
        detectedNiche: upload.detectedNiche || null,
      }
    })
    .filter(Boolean)

  if (filesToAnalyze.length === 0) {
    console.error("[v0] ❌ No valid files found for analysis")
    return {
      decision: "reject",
      overallConfidence: 0,
      fileAnalyses: [],
      summary: "Could not find any of the specified files",
      warnings: ["None of the file IDs matched uploads in the database"],
    }
  }

  console.log(`[v0] 📝 Files to analyze: ${filesToAnalyze.length}`)
  filesToAnalyze.forEach((file: any) => {
    console.log(`[v0]    - "${file.title}": ${file.transcript ? "HAS TRANSCRIPT" : "NO TRANSCRIPT"}`)
  })

  // Build folder context
  let folderContextDescription = ""
  if (folderContents && folderContents.length > 0) {
    const sampleTitles = folderContents.slice(0, 5).map((f: any) => f.title || f.filename)
    folderContextDescription = `\n\nExisting folder contents (${folderContents.length} files): ${sampleTitles.join(", ")}${folderContents.length > 5 ? "..." : ""}`
  } else {
    folderContextDescription = "\n\nThis folder is currently empty."
  }

  // Create LLM prompt
  const analysisPrompt = `Analyze whether video content fits into the folder "${targetFolder}".

${reason ? `User's reasoning: "${reason}"` : ""}${folderContextDescription}

For each video, read the transcript and determine semantic fit.

**Guidelines:**
- Read the actual transcript content, not just titles
- Identify the dominant theme (every video has overlap - pick the primary message)
- Be confident and decisive
- Provide brief quoted evidence

**Semantic Fit:**
- strong: Clearly relates (80-100%)
- moderate: Somewhat relates (50-79%)
- weak: Barely relates (20-49%)
- none: Doesn't relate (0-19%)

**Transcript Quality:**
- good: >100 words, coherent
- short: <100 words
- missing: No transcript
- poor: Garbled/incomplete

Videos to analyze:

${filesToAnalyze
  .map(
    (file: any, index: number) => `
**Video ${index + 1}: "${file.title}"**
- ID: ${file.id}
- Duration: ${file.duration}s
- Niche: ${file.detectedNiche || "Unknown"}
- Transcript: ${file.transcript ? `"${file.transcript.slice(0, 500)}${file.transcript.length > 500 ? "..." : ""}"` : "[NO TRANSCRIPT]"}
`,
  )
  .join("\n")}

Respond with JSON only:
{
  "fileAnalyses": [
    {
      "fileId": "file ID",
      "fileName": "file title",
      "semanticFit": "strong|moderate|weak|none",
      "confidence": 85,
      "evidence": "Brief quote from transcript",
      "reasoning": "One sentence why it fits/doesn't fit",
      "transcriptQuality": "good|short|missing|poor"
    }
  ],
  "overallConfidence": 75,
  "summary": "Overall assessment",
  "warnings": ["Any concerns"]
}`

  try {
    const requestBody = {
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "You are a semantic analysis expert. Read video transcripts and determine if content fits categories. Respond with valid JSON only. Be confident and decisive.",
        },
        {
          role: "user",
          content: analysisPrompt,
        },
      ],
      max_tokens: 2000,
      temperature: 0.2,
    }

    console.log("[v0] 🤖 Calling LLM for semantic analysis...")

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] ❌ LLM API error:", response.status, errorText)
      throw new Error(`LLM API error: ${response.status}`)
    }

    const data = await response.json()
    const llmResponse = data.choices?.[0]?.message?.content

    if (!llmResponse) {
      console.error("[v0] ❌ No response from LLM")
      throw new Error("No response from LLM")
    }

    console.log("[v0] ✅ Got LLM response")

    // Parse LLM response
    let analysisResult: any
    try {
      const jsonMatch = llmResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0])
      } else {
        analysisResult = JSON.parse(llmResponse)
      }
    } catch (parseError) {
      console.error("[v0] ❌ Failed to parse LLM response:", llmResponse)
      throw new Error("Failed to parse LLM analysis response")
    }

    const fileAnalyses: FileAnalysis[] = analysisResult.fileAnalyses || []
    const overallConfidence = analysisResult.overallConfidence || 0
    const warnings = analysisResult.warnings || []

    // Add transcript quality warnings
    fileAnalyses.forEach((analysis) => {
      if (analysis.transcriptQuality === "missing") {
        warnings.push(`"${analysis.fileName}" has no transcript - analysis based on title only`)
      } else if (analysis.transcriptQuality === "short") {
        warnings.push(`"${analysis.fileName}" has short transcript - lower confidence`)
      } else if (analysis.transcriptQuality === "poor") {
        warnings.push(`"${analysis.fileName}" has poor transcript quality`)
      }
    })

    // Determine decision
    let decision: "proceed" | "ask_user" | "reject" = "proceed"

    const strongFits = fileAnalyses.filter((f) => f.semanticFit === "strong").length
    const moderateFits = fileAnalyses.filter((f) => f.semanticFit === "moderate").length
    const weakFits = fileAnalyses.filter((f) => f.semanticFit === "weak").length
    const noneFits = fileAnalyses.filter((f) => f.semanticFit === "none").length

    console.log(
      `[v0] 📊 Semantic fit: ${strongFits} strong, ${moderateFits} moderate, ${weakFits} weak, ${noneFits} none`,
    )

    // Decision logic
    if (noneFits > fileAnalyses.length / 2) {
      decision = "reject"
    } else if (strongFits >= fileAnalyses.length * 0.7) {
      decision = "proceed"
    } else if (overallConfidence < 60 || weakFits > 0 || warnings.length > 2) {
      decision = "ask_user"
    }

    console.log(`[v0] 🎯 Decision: ${decision} (confidence: ${overallConfidence}%)`)

    return {
      decision,
      overallConfidence,
      fileAnalyses,
      summary: analysisResult.summary || "Analysis complete",
      warnings,
    }
  } catch (error) {
    console.error("[v0] ❌ Semantic analysis error:", error)
    return {
      decision: "reject",
      overallConfidence: 0,
      fileAnalyses: [],
      summary: "Failed to perform semantic analysis",
      warnings: [error instanceof Error ? error.message : "Unknown error occurred"],
    }
  }
}

// These are replaced by the single performSemanticAnalysis function above

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

    let userId: string | null = null
    let userContentContext = ""
    let bundleLimitsContext = ""
    let folderContext = ""
    let planPermissionsContext = ""
    let userPlan = "free" // Default to free
    let subscriptionData: any = {} // Initialize subscriptionData
    let trialStatus: any = null
    // </CHANGE>
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

            const tierInfoData = await getUserTierInfo(userId)
            userPlan = tierInfoData.tier || "free"
            subscriptionData = await checkSubscription(userId)

            try {
              const membershipDoc = await db.collection("memberships").doc(userId).get()
              if (membershipDoc.exists) {
                const membershipData = membershipDoc.data()
                if (membershipData?.status === "trialing" && membershipData?.currentPeriodEnd) {
                  const endDate =
                    membershipData.currentPeriodEnd.toDate?.() ||
                    new Date(membershipData.currentPeriodEnd._seconds * 1000)
                  const now = new Date()
                  const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

                  if (daysRemaining > 0) {
                    trialStatus = {
                      isOnTrial: true,
                      daysRemaining,
                      trialEndDate: endDate.toISOString(),
                    }
                  }
                }
              }
            } catch (error) {
              console.error("[v0] Error checking trial status:", error)
            }
            // </CHANGE>
            // Added instruction to avoid mentioning keywords
            // Build plan permissions context
            planPermissionsContext = `

===== YOUR PLAN PERMISSIONS =====

Current Plan: ${userPlan === "creator_pro" ? "Creator Pro" : "Free"}${trialStatus?.isOnTrial ? ` (FREE TRIAL - ${trialStatus.daysRemaining} days remaining)` : ""}

${
  userPlan === "free"
    ? `
**FREE PLAN LIMITS:**
• Folders: ${subscriptionData.features.maxFolders} folders maximum (NO subfolders allowed)
• Bundles: ${subscriptionData.features.maxBundles} bundles maximum on storefront
• Videos per bundle: ${subscriptionData.features.maxVideosPerBundle} videos maximum
• Vex AI: Basic content organization only
• Transcript Analysis: NOT AVAILABLE (Creator Pro only)
• Bundle Creation via Vex: NOT AVAILABLE (Creator Pro only)
• Platform Fee: ${subscriptionData.features.platformFeePercentage}% on sales

⚠️ IMPORTANT RESTRICTIONS:
- You CANNOT create subfolders for free users
- You CANNOT analyze or reference transcript content for free users
- You CANNOT create bundles via Vex for free users (they must create manually)
- Free users can only organize content into their ${subscriptionData.features.maxFolders} root-level folders

If user asks about these features, tell them to upgrade to Creator Pro.
`
    : `
**CREATOR PRO FEATURES:**${trialStatus?.isOnTrial ? ` (FREE TRIAL - ${trialStatus.daysRemaining} days remaining)` : ""}
• Folders: UNLIMITED folders with subfolders
• Bundles: UNLIMITED bundles on storefront
• Videos per bundle: UNLIMITED videos
• Vex AI: Full capabilities including bundle creation
• Transcript Analysis: AVAILABLE - You can analyze and reference video transcripts
• Bundle Creation via Vex: AVAILABLE - You can create bundles for users
• Platform Fee: ${subscriptionData.features.platformFeePercentage}% on sales (reduced from 20%)

✅ You have full access to all Vex AI features.${trialStatus?.isOnTrial ? `\n\n⏰ TRIAL REMINDER: User's trial ends in ${trialStatus.daysRemaining} days. ${trialStatus.daysRemaining <= 1 ? "Remind them to upgrade to keep these features!" : ""}` : ""}
`
}
`
            // </CHANGE>

            bundleLimitsContext = `

BUNDLE LIMITS:
Current bundles: ${tierInfoData.bundlesCreated || 0}
Bundle limit: ${tierInfoData.bundlesLimit === null ? "unlimited" : tierInfoData.bundlesLimit || 2}
Can create bundles: ${!tierInfoData.reachedBundleLimit && subscriptionData.features.canCreateBundles ? "YES" : "NO"}
User tier: ${tierInfoData.tier || "free"}
Max videos per bundle: ${tierInfoData.maxVideosPerBundle === null ? "unlimited" : tierInfoData.maxVideosPerBundle || 10}

${tierInfoData.reachedBundleLimit ? `⚠️ BUNDLE LIMIT REACHED: User has reached their limit of ${tierInfoData.bundlesLimit || 2} bundles. ${(tierInfoData.tier || "free") === "free" ? "They need to upgrade to Creator Pro for unlimited bundles or purchase extra bundle slots." : "They should contact support."}` : ""}
${!subscriptionData.features.canCreateBundles ? `⚠️ BUNDLE CREATION DISABLED: Free users cannot create bundles via Vex. Direct them to upgrade to Creator Pro.` : ""}
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

              // Check if analysis is stale (older than 5 minutes)
              const analyzedAt = analysisData?.analyzedAt?.toDate?.() || analysisData?.lastUpdated?.toDate?.()
              const isStale = !analyzedAt || Date.now() - analyzedAt.getTime() > 5 * 60 * 1000

              if (isStale) {
                console.log("[v0] Analysis data is stale, triggering refresh...")
                // Trigger refresh in background, don't wait for it
                fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/vex/analyze-uploads`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                }).catch((err) => console.warn("[v0] Failed to trigger analysis refresh:", err))
              }

              const contentByFolder = analysisData?.contentByFolder || {}
              const contentByNiche = analysisData?.contentByNiche || {}
              const unorganizedContent = analysisData?.unorganizedContent || []
              const detectedNiches = analysisData?.detectedNiches || []

              // Filter out generic/invalid titles from unorganized content
              const validUnorganizedContent = unorganizedContent.filter((item: any) => {
                const title = item.title || ""
                const isGenericTitle =
                  title === "Untitled" ||
                  title === "Unknown" ||
                  title === "New Video" ||
                  /^(IMG|VID|DSC|MOV)_\d+$/.test(title) ||
                  /^\d+$/.test(title) ||
                  /^(Clip|Video|Content)\s+\d+$/.test(title)

                if (isGenericTitle) {
                  console.log(`[v0] Filtering out potentially invalid content: "${title}"`)
                }

                return !isGenericTitle && title.length > 0
              })

              // Build folder contents context with ALL items from each folder
              let folderContentsContext = ""
              let totalFolderItems = 0

              if (Object.keys(contentByFolder).length > 0) {
                folderContentsContext = "\n\nCONTENT IN EACH FOLDER:\n"
                for (const [folderName, items] of Object.entries(contentByFolder)) {
                  // Handle both array and object structures
                  let itemsArray: any[] = []

                  if (Array.isArray(items)) {
                    itemsArray = items
                  } else if (typeof items === "object" && items !== null) {
                    // If it's an object with numeric keys (like {0: item, 1: item}), convert to array
                    itemsArray = Object.values(items)
                  }

                  totalFolderItems += itemsArray.length
                  console.log(`[v0] Folder "${folderName}" contains ${itemsArray.length} items`)

                  const itemsList = itemsArray
                    .map((item: any) => `  - ${item.title || item.filename || "Untitled"} (${item.type || "unknown"})`)
                    .join("\n")

                  folderContentsContext += `\n"${folderName}" folder (${itemsArray.length} items):\n${itemsList}\n`
                }
              }

              let nicheContentsContext = ""
              if (Object.keys(contentByNiche).length > 0) {
                nicheContentsContext = "\n\nCONTENT BY DETECTED NICHE (AI-analyzed):\n"
                for (const [niche, items] of Object.entries(contentByNiche)) {
                  let itemsArray: any[] = []

                  if (Array.isArray(items)) {
                    itemsArray = items
                  } else if (typeof items === "object" && items !== null) {
                    itemsArray = Object.values(items)
                  }

                  const itemsList = itemsArray
                    .slice(0, 10)
                    .map((item: any) => {
                      const confidence = item.nicheConfidence
                        ? ` (${Math.round(item.nicheConfidence * 100)}% confidence)`
                        : ""
                      return `  - ${item.title || item.filename || "Untitled"}${confidence}`
                    })
                    .join("\n")

                  nicheContentsContext += `\n${niche.charAt(0).toUpperCase() + niche.slice(1)} (${itemsArray.length} items):\n${itemsList}\n`
                  if (itemsArray.length > 10) {
                    nicheContentsContext += `  ... and ${itemsArray.length - 10} more ${niche} items\n`
                  }
                }
              }

              console.log(`[v0] Total items in folders: ${totalFolderItems}`)
              console.log(`[v0] Total unorganized items: ${validUnorganizedContent.length}`)

              // Removed faith keywords and specific metadata patterns, focusing on general semantic understanding and broad categories.
              let intelligenceContext = "\n\n🧠 VEX INTELLIGENCE SYSTEM:\n"
              intelligenceContext += "You have access to advanced metadata analysis and cultural understanding.\n\n"

              intelligenceContext += "**Content Categories & Themes:**\n"
              intelligenceContext +=
                "- **Motivation/Productivity:** Content about discipline, work ethic, success, goal setting, time management, overcoming procrastination.\n"
              intelligenceContext +=
                "- **Mindset/Personal Growth:** Philosophical content, self-improvement, mental models, emotional intelligence, perspective shifts.\n"
              intelligenceContext +=
                "- **Humor/Memes:** Funny skits, relatable situations, internet memes, comedic commentary.\n"
              intelligenceContext +=
                "- **SFX/Sound Design:** Short audio clips for transitions, impacts, whooshes, game sound effects.\n"
              intelligenceContext +=
                "- **B-roll/Footage:** Cinematic shots, time-lapses, abstract backgrounds, nature clips, urban scenes.\n"
              intelligenceContext +=
                "- **Background Music/Ambiance:** Looping audio tracks, ambient sounds, chill beats for background use.\n"
              intelligenceContext += "- **Tutorials/How-To:** Instructional content explaining a process or skill.\n"
              intelligenceContext +=
                "- **Faith/Spirituality:** Content discussing religious beliefs, spiritual practices, personal testimonies, ethical teachings.\n\n"

              intelligenceContext += "**General Analysis Patterns:**\n"
              intelligenceContext +=
                "- **Duration:** Short clips (under 1 min) often indicate SFX, memes, or intros. Longer videos (over 10 min) are typically tutorials, sermons, or in-depth discussions.\n"
              intelligenceContext +=
                "- **File Types:** .mp4, .mov for video; .mp3, .wav for audio; .jpg, .png for images.\n"
              intelligenceContext +=
                "- **Titles:** Look for descriptive words (e.g., 'tutorial', 'explainer', 'funny'), action verbs (e.g., 'create', 'learn', 'watch'), or emotional cues (e.g., 'inspiring', 'hilarious').\n\n"

              intelligenceContext += "**Critical Thinking Rules:**\n"
              intelligenceContext +=
                "1. ANALYZE TITLES AND TRANSCRIPTS CAREFULLY - What do the words and spoken content actually mean?\n"
              intelligenceContext +=
                "2. GENERIC TITLES = ASK FIRST - Defaults like 'IMG_8030', 'Video 1', or pure numbers might need clarification.\n"
              intelligenceContext +=
                "3. DESCRIPTIVE TITLES = USE CONTEXT - 'Tutorial: How to bake bread' is clear. 'Project_Final_v3' needs context.\n"
              intelligenceContext += "4. CHECK METADATA - Duration, file type, and size all provide clues.\n"
              intelligenceContext += "5. WHEN UNCERTAIN = ASK - Don't guess. Prompt the user for more information.\n"
              intelligenceContext +=
                "6. USE EVIDENCE - Combine filename, duration, transcript content, and cultural patterns to make a decision.\n"
              intelligenceContext +=
                "7. **READ TRANSCRIPTS FIRST** - If a video has a transcript, USE IT to understand the actual content. It's your primary source of truth.\n"
              intelligenceContext += "8. **TRANSCRIPT > TITLE** - The transcript is more reliable than the title.\n\n"

              intelligenceContext += "🎬 VIDEO TRANSCRIPT INTELLIGENCE:\n"
              intelligenceContext += "When a user asks about a video, YOU MUST:\n"
              intelligenceContext += "1. Check if the video has a 'transcript' field\n"
              intelligenceContext +=
                "2. If transcript exists, READ THE ENTIRE TRANSCRIPT to understand what the video is about\n"
              intelligenceContext += "3. Use the transcript content to answer questions accurately\n"
              intelligenceContext += "4. Identify themes, topics, and messages from the transcript\n"
              intelligenceContext +=
                "5. Suggest better titles if the transcript reveals different content than the title suggests\n"
              intelligenceContext +=
                "6. Look for specific themes and topics in transcripts to categorize content accurately\n\n"

              intelligenceContext += "**Example:**\n"
              intelligenceContext += "User: 'What is my video about?'\n"
              intelligenceContext += "You see: title: 'AZ Compass', transcript: 'like all American work...'\n"
              intelligenceContext +=
                "You respond: 'Based on the transcript, your video is about the importance of a strong work ethic and focusing on your goals. It seems to encourage dedication and perseverance.'\n\n"
              // </CHANGE>

              // Get all unique uploads from analysisData
              const allUploads = analysisData.uploads || []
              const uniqueUploadsMap = new Map()

              allUploads.forEach((upload: any) => {
                if (!uniqueUploadsMap.has(upload.id)) {
                  uniqueUploadsMap.set(upload.id, upload)
                }
              })

              const uniqueUploads = Array.from(uniqueUploadsMap.values())

              let fileIdReferenceContext = "\n\n🆔 FILE ID REFERENCE (USE THESE EXACT IDS):\n"
              fileIdReferenceContext += "When organizing files, you MUST use these exact database IDs:\n\n"

              for (const upload of uniqueUploads) {
                const title = upload.title || upload.filename || "Untitled"
                const type = upload.contentType || upload.type || "unknown"
                const duration = upload.duration ? `${upload.duration}s` : "unknown duration"
                const folder = upload.folderName || "unorganized"

                fileIdReferenceContext += `• "${title}" → ID: ${upload.id} (${type}, ${duration}, in: ${folder})\n`
              }

              fileIdReferenceContext += "\n**CRITICAL:** Copy these IDs EXACTLY into your ORGANIZE_FILES JSON.\n"
              fileIdReferenceContext += "DO NOT make up IDs. DO NOT use titles as IDs. USE THE IDs SHOWN ABOVE.\n\n"

              let transcriptContext = ""

              const videosWithTranscripts = uniqueUploads.filter((u: any) => u.transcript && u.transcript.length > 0)

              if (videosWithTranscripts.length > 0) {
                transcriptContext = "\n\n📝 VIDEOS WITH FULL TRANSCRIPTS:\n"
                transcriptContext +=
                  "You have access to the complete transcripts of these videos. You ALREADY KNOW what they're about.\n"
                transcriptContext += "When users ask about these videos, reference the transcript content directly.\n\n"

                for (const video of videosWithTranscripts) {
                  const duration = video.transcriptDuration || video.duration || 0
                  const contentType = video.contentType || video.type || "video"

                  transcriptContext += `**"${video.title}"** (${contentType}, ${duration}s)\n`
                  transcriptContext += `Full Transcript:\n"${video.transcript}"\n`
                  transcriptContext += `---\n\n`
                }

                transcriptContext += "\n**CRITICAL:** You have ALREADY READ these transcripts. "
                transcriptContext +=
                  "When users ask 'what is this video about?', answer immediately using the transcript above. "
                transcriptContext += "DO NOT say 'let me read the transcript' - you already have it!\n"
              }

              if (validUnorganizedContent.length > 0) {
                folderContentsContext += `\n\n📋 UNORGANIZED CONTENT WITH INTELLIGENCE ANALYSIS (${validUnorganizedContent.length} items):\n`

                for (const item of validUnorganizedContent.slice(0, 15)) {
                  const title = item.title || "Untitled"
                  const type = item.type || "unknown"
                  const detectedNiche = item.detectedNiche || "unknown"
                  const confidence = item.confidence || "low"
                  const reasoning = item.reasoning || "No analysis available"

                  const hasTranscript = item.transcript && item.transcript.length > 0
                  const transcriptPreview = hasTranscript ? item.transcript.substring(0, 200) : null

                  folderContentsContext += `\n"${title}" (${type})\n`
                  folderContentsContext += `  → Detected: ${detectedNiche} (${confidence} confidence)\n`
                  folderContentsContext += `  → Reasoning: ${reasoning}\n`

                  if (hasTranscript) {
                    folderContentsContext += `  → Transcript Preview: "${transcriptPreview}..."\n`
                    folderContentsContext += `  → [Full transcript available for detailed analysis]\n`
                  }
                }

                if (validUnorganizedContent.length > 15) {
                  folderContentsContext += `\n... and ${validUnorganizedContent.length - 15} more unorganized items\n`
                }
              }

              userContentContext = `

USER'S CONTENT LIBRARY (Analyzed with Metadata Intelligence v3 + Transcript Intelligence):
Total Uploads: ${analysisData?.totalUploads || 0}
Categories: ${(analysisData?.categories || []).join(", ")}
User Folders: ${(analysisData?.userFolders || []).map((f: any) => f.name).join(", ")}
${detectedNiches.length > 0 ? `\nDetected Content Niches: ${detectedNiches.map((n: any) => `${n.name} (${n.count} items, ${n.avgConfidence}% avg confidence)`).join(", ")}` : ""}
${fileIdReferenceContext}${transcriptContext}${folderContentsContext}${nicheContentsContext}${intelligenceContext}
`
              console.log("[v0] User context loaded with FULL metadata intelligence, transcripts, and broad themes")
            } else {
              console.log("[v0] No analysis data found, user may need to run analysis first")
            }
          }
        }
      } catch (error) {
        console.log("[v0] Auth failed, continuing without user context:", error)
      }
    }

    const fileIdReference = (
      (
        await db
          .collection("vex_content_analysis")
          .doc(userId || "dummy")
          .get()
      ).data()?.uploads || []
    )
      .map((upload: any, index: number) => {
        return `${index + 1}. "${upload.title}" → ID: ${upload.id}`
      })
      .join("\n")

    const systemPrompt = `You are VEX, an AI strategist built for creators. You speak with clarity, high energy, and sharp insight. You're not just a folder organizer—you help creators win. When they upload content, you don't just sort it—you give thoughtful breakdowns, call out weak prompts, and suggest sharper ways to organize or monetize. You communicate like a driven, no-BS digital entrepreneur with a coaching vibe.

You're helpful, but you're never passive. If a prompt is vague, ask for specifics. If a video seems mislabeled, call it out and explain why. If you're unsure, say it plainly but confidently. Always aim to be useful, concise, but human and insightful—like a coach who knows the game and wants the user to win.

===== CORE PRINCIPLES =====

1. **Be Real** - Talk like a human strategist, not a robot. Use phrases like "Here's what I saw..." or "Looks like this one's more about __ than __."
2. **Be Direct** - No hedging, no "I think", no "potentially". Make confident calls.
3. **Action-First** - Show what you're doing, then do it. No long explanations.
4. **Use Database IDs** - Always use the "id" field from uploads, never titles or filenames.
5. **Count Accurately** - If you say "5 videos", your JSON must have exactly 5 IDs.
6. **Respect Plan Limits** - Always check user's plan before suggesting restricted features.

7. **Semantic Understanding** - You understand content based on its meaning, themes, and context—NOT by matching keywords. When explaining your analysis, describe what the content is ABOUT (themes, topics, messages), never say "I looked for keywords like..." or "based on keywords". You're an AI that understands meaning, not a keyword matcher.

===== CONTENT ANALYSIS DATA =====

${userContentContext}${planPermissionsContext}${bundleLimitsContext}${folderContext}

===== YOUR CAPABILITIES =====

**0. REFRESH CONTENT ANALYSIS**
If user asks to "refresh" or "update library":

REFRESH_ANALYSIS: true

**1. CREATE FOLDERS**

${
  userPlan === "free"
    ? `⚠️ FREE PLAN: User can only create ${subscriptionData.features.maxFolders} root-level folders (NO subfolders).
Check folder count before creating. If at limit, tell them to upgrade to Creator Pro.

`
    : ""
}CREATE_FOLDER: {"name": "Folder Name", "description": "Brief description"}

**2. RENAME CONTENT**

RENAME_CONTENT: {"contentId": "file_id", "newTitle": "New Title", "reason": "brief reason"}

**3. ORGANIZE CONTENT** ⚠️ MOST IMPORTANT

When organizing files:

1. **Find the file in the FILE ID REFERENCE section above**
2. **Copy the exact ID shown** (looks like: "abc123xyz" or "upload_abc123")
3. **Use that ID in your ORGANIZE_FILES JSON**
4. **Count accurately** - Verify your count matches your JSON array length
5. **Be direct** - Show what's moving, then output the JSON

**RESPONSE FORMAT:**

✅ CORRECT:
"Here's what I saw—moving 2 videos to Mindset:
• 'Tykwondoe' (ID: loAidYardbykdgCR7YNl) - about surrounding yourself with excellence
• 'AZ Compass' (ID: ADrPTpP9hyUdnZw59l56) - focuses on work ethic and staying focused

ORGANIZE_FILES: {"targetFolder": "Mindset", "fileIds": ["loAidYardbykdgCR7YNl", "ADrPTpP9hyUdnZw59l56"], "reason": "Mindset and personal development content"}"

❌ WRONG (using made-up IDs):
ORGANIZE_FILES: {"targetFolder": "Mindset", "fileIds": ["tykwondoe_123", "az_compass_456"], "reason": "..."}

❌ WRONG (using titles as IDs):
ORGANIZE_FILES: {"targetFolder": "Mindset", "fileIds": ["Tykwondoe", "AZ Compass"], "reason": "..."}

❌ WRONG (mentioning keywords):
"I looked for keywords like 'grind', 'discipline', 'success'..." ← NEVER say this. Instead describe the THEME: "These videos are about perseverance and work ethic"

**CRITICAL RULES:**
- Look up each file in the FILE ID REFERENCE section
- Copy the ID EXACTLY as shown (case-sensitive, character-for-character)
- If you can't find a file in the reference, DON'T include it
- Count your items and verify the JSON array has the same count

**4. CREATE BUNDLES**

${
  !subscriptionData.features.canCreateBundles
    ? `⚠️ BUNDLE CREATION DISABLED: Free users cannot create bundles via Vex.
Tell them: "Bundle creation via Vex is a Creator Pro feature. You can upgrade to unlock this, or create bundles manually in your dashboard."

DO NOT output CREATE_BUNDLE for free users.

`
    : ""
}CREATE_BUNDLE: {"title": "Bundle Name", "description": "Description", "price": 15, "contentIds": ["id1", "id2"], "category": "Video Pack", "tags": ["tag1", "tag2"]}

===== COMMUNICATION STYLE =====

**How You Talk:**
- Don't use robotic phrasing like "Based on the content of the video…"
- Instead say: "Here's what I saw…" or "Looks like this one's more about __ than __."
- Use phrases like: "I'd put this in [folder] unless you want to tweak the category."
- Be conversational: "Let me know if you want a different angle on this."

**NEVER Mention Keywords:**
- ❌ DON'T say: "I looked for keywords like 'grind', 'discipline', 'success'"
- ❌ DON'T say: "Based on keywords and themes present in the transcript"
- ❌ DON'T say: "The video contains keywords related to..."
- ✅ DO say: "This video is about perseverance and pushing through challenges"
- ✅ DO say: "The content focuses on building discipline and work ethic"
- ✅ DO say: "I saw themes of personal growth and overcoming obstacles"

You understand content semantically—describe what it's ABOUT, not what words it contains.

**When Users Are Vague:**
- Call it out directly: "That's a little broad. Can you tell me the kind of vibe you want the bundle to have?"
- Or: "What's the outcome you want with this bundle? Views? Conversions? Vibe check me here."

**Your Energy:**
- Sharp, real, and slightly informal
- Like a smart strategist who's been in the game
- Always lean toward clarity, confidence, and practical execution
- You want them to win, so you push for better prompts and smarter organization

===== EXAMPLES =====

User: "move faith content to faith folder"

You: "Here's what I saw—moving 7 videos to Faith:
• 'Nathalie Nicole Smith' - about trusting God's plans
• 'Nathalie Nicole Smith' - focuses on spiritual renewal
• '2819_Deceived' - discusses deception and God's mercy
• '2819_Fruit' - explores evidence of faith
• '2819_Rebellion' - talks about rebellion against God
• '2819_Conduits' - covers spiritual warfare themes
• 'Damji-i' - personal responsibility with faith elements

ORGANIZE_FILES: {"targetFolder": "Faith - God", "fileIds": ["id1", "id2", "id3", "id4", "id5", "id6", "id7"], "reason": "Faith and spirituality content"}"

User: "organize my stuff"

You: "That's pretty broad—I can help you way better with specifics. Try something like:
• 'Move all motivational content to the Motivation folder'
• 'Put my tutorial videos in a separate folder'
• 'Create a bundle with my top 5 performing videos'

What kind of organization are you going for?"

User: "create a bundle"

You: "What's the outcome you want with this bundle? Views? Conversions? Vibe check me here. Also, what kind of content should go in it?"

User: "is it bc of keywords?"

You: "Nah, I understand content based on what it's actually about—the themes, messages, and topics. I'm not just matching words. When I organize your stuff, I'm reading the meaning and context, not hunting for specific keywords. If something got sorted wrong, let me know and I'll adjust."
`

    // Ensure messages have proper format
    const formattedMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((msg: any) => ({
        role: msg.role || "user",
        content: String(msg.content || msg.message || ""),
      })),
    ]

    // Check for vague prompts before sending to Groq API
    const vaguePromptRegex = /^(?:help|organize|make|what do|tell me) me(?:\s+to)?\s*$/i
    const vaguePromptRegex2 = /^(?:organize|make|what do|tell me)\s+(?:my|some|stuff|things|content|videos|files)\s*$/i
    const vaguePromptRegex3 = /^(?:help|organize|make|what do|tell me)\s+me\s+to\s+(?:organize|make|do)\s*$/i

    const isVague = formattedMessages.slice(1).some((msg) => {
      const content = msg.content.toLowerCase()
      return (
        vaguePromptRegex.test(content) ||
        vaguePromptRegex2.test(content) ||
        vaguePromptRegex3.test(content) ||
        content.trim() === "" ||
        content.trim() === "hi" ||
        content.trim() === "hello" ||
        content.trim() === "yo" ||
        content.trim() === "hey" ||
        content.trim() === "sup"
      )
    })

    if (isVague) {
      const vagueResponse = `Hey! What's up? Need help organizing your content or building a bundle?` // Updated greeting
      console.log("[v0] Detected vague prompt, sending canned response.")
      return NextResponse.json({
        message: {
          role: "assistant",
          content: vagueResponse,
        },
      })
    }

    console.log("[v0] Calling Groq API with", formattedMessages.length, "messages")

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: formattedMessages,
        max_tokens: 2000,
        temperature: 0.3,
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

    // CHANGE: Removed the complex performSemanticAnalysis function - it was second-guessing Vex and causing contradictions
    // CHANGE: Simplified to: Vex decides → Extract JSON → Execute moves

    if (assistantMessage.includes("CREATE_BUNDLE:") && userId) {
      try {
        console.log("[v0] Validating CREATE_BUNDLE action...")

        const tierInfo = await getUserTierInfo(userId)
        const userPlan = tierInfo.tier || "free"
        const subscriptionData = await checkSubscription(userId)

        if (!canUserCreateBundles(userPlan) || !subscriptionData.features.canCreateBundles) {
          const errorMessage = `❌ Bundle creation via Vex is a Creator Pro feature. You can upgrade to unlock this, or create bundles manually in your dashboard.`
          assistantMessage = assistantMessage.replace(/CREATE_BUNDLE:\s*{.*?}/s, errorMessage)

          return NextResponse.json({
            message: {
              role: "assistant",
              content: assistantMessage,
            },
          })
        }

        const bundleMatch = assistantMessage.match(/CREATE_BUNDLE:\s*({.*?})/s)
        if (!bundleMatch) {
          throw new Error("No valid bundle data found")
        }

        const bundleData = JSON.parse(bundleMatch[1])
        console.log("[v0] Parsed bundle data:", bundleData)

        const bundleProgressMessage = "🚀 **Creating your bundle now...** This will just take a moment!"
        assistantMessage = assistantMessage.replace(/CREATE_BUNDLE:\s*{.*?}/s, bundleProgressMessage)

        const result = await createBundleDirectly(userId, bundleData)

        if (result.success) {
          assistantMessage = assistantMessage.replace(
            bundleProgressMessage,
            `✅ **Bundle created successfully!** Your "${result.bundle.title}" bundle is now live in your dashboard. You can view it at your storefront or share it with customers right away!`,
          )
        } else {
          assistantMessage = assistantMessage.replace(
            bundleProgressMessage,
            `❌ ${result.error || "I encountered an issue creating your bundle. Please try again or create it manually in your dashboard."}`,
          )
        }
      } catch (error) {
        console.error("[v0] Bundle creation failed:", error)
        assistantMessage = assistantMessage.replace(
          "🚀 **Creating your bundle now...** This will just take a moment!",
          "❌ I encountered an error while creating your bundle. Please try again or create it manually in your dashboard.",
        )
      }
    }

    if (assistantMessage.includes("ORGANIZE_FILES:") && userId) {
      try {
        console.log("[v0] 🧠 Detected ORGANIZE_FILES action")

        // Extract organization data
        const organizeMatch = assistantMessage.match(/ORGANIZE_FILES:\s*(\{[^}]+\})/s)
        if (!organizeMatch) {
          console.log("[v0] ❌ No valid ORGANIZE_FILES JSON found")
          throw new Error("No valid organization data found in response")
        }

        let organizeData
        try {
          organizeData = JSON.parse(organizeMatch[1])
        } catch (parseError) {
          console.log("[v0] ❌ Failed to parse JSON:", organizeMatch[1])
          throw new Error("Invalid JSON format in ORGANIZE_FILES")
        }

        console.log("[v0] ✅ Parsed organization data:", organizeData)
        console.log("[v0]   - Target folder:", organizeData.targetFolder)
        console.log("[v0]   - File count:", organizeData.fileIds?.length || 0)
        console.log("[v0]   - File IDs:", organizeData.fileIds)

        // CHANGE: Validate required fields
        if (!organizeData.targetFolder || organizeData.targetFolder === "None") {
          throw new Error(`Invalid targetFolder: ${organizeData.targetFolder}`)
        }

        if (!organizeData.fileIds || !Array.isArray(organizeData.fileIds) || organizeData.fileIds.length === 0) {
          throw new Error("No valid files specified for organization")
        }

        // CHANGE: Get uploads data to verify IDs
        const analysisDoc = await db.collection("vex_content_analysis").doc(userId).get()
        if (!analysisDoc.exists) {
          throw new Error("Content analysis not found - please refresh your content first")
        }

        const analysisData = analysisDoc.data()!
        const uploads = analysisData.uploads || []
        console.log(`[v0] 📊 Loaded ${uploads.length} uploads from analysis`)

        // CHANGE: Verify all file IDs exist in the uploads array
        const validIds = new Set(uploads.map((u: any) => u.id))
        const validFileIds: string[] = []
        const invalidIds: string[] = []

        for (const fileId of organizeData.fileIds) {
          if (validIds.has(fileId)) {
            validFileIds.push(fileId)
            const upload = uploads.find((u: any) => u.id === fileId)
            console.log(`[v0] ✅ Valid ID: "${fileId}" → "${upload?.title}"`)
          } else {
            invalidIds.push(fileId)
            console.log(`[v0] ❌ Invalid ID: "${fileId}" (not found in uploads)`)
          }
        }

        if (validFileIds.length === 0) {
          throw new Error(`None of the ${organizeData.fileIds.length} file IDs matched uploads in the database`)
        }

        if (invalidIds.length > 0) {
          console.log(`[v0] ⚠️ ${invalidIds.length} invalid IDs will be skipped`)
        }

        // CHANGE: Update the organize data with only valid IDs
        organizeData.fileIds = validFileIds

        console.log(`[v0] ✅ Proceeding with ${validFileIds.length} valid files`)

        // CHANGE: Show progress message
        const progressMessage = `🗂️ Moving ${validFileIds.length} file${validFileIds.length === 1 ? "" : "s"} to "${organizeData.targetFolder}"...`

        const orgActionRegex = /ORGANIZE_FILES:\s*(\{[^}]+\})/s
        assistantMessage = assistantMessage.replace(orgActionRegex, progressMessage)

        // CHANGE: Execute the organize operation
        const organizeResult = await organizeFilesDirectly(userId, organizeData)

        if (organizeResult.success) {
          const fileList = organizeResult.movedFiles?.length
            ? `\n\n**Files moved:**\n${organizeResult.movedFiles.map((f: string) => `• ${f}`).join("\n")}`
            : ""

          const successMessage = `✅ Successfully moved ${organizeResult.movedFiles?.length || validFileIds.length} file${validFileIds.length === 1 ? "" : "s"} to "${organizeResult.targetFolder}"!${fileList}`
          assistantMessage = assistantMessage.replace(progressMessage, successMessage)
        } else {
          const errorMessage = `❌ ${organizeResult.error || "Failed to organize files. Please try again."}`
          assistantMessage = assistantMessage.replace(progressMessage, errorMessage)
        }
      } catch (error) {
        console.error("[v0] ❌ File organization failed:", error)
        const errorMessage = `❌ Organization failed: ${error instanceof Error ? error.message : "Unknown error"}`

        if (assistantMessage.includes("ORGANIZE_FILES:")) {
          assistantMessage = assistantMessage.replace(/ORGANIZE_FILES:\s*(\{[^}]+\})/s, errorMessage)
        } else {
          assistantMessage += `\n\n${errorMessage}`
        }
      }
    }

    if (assistantMessage.includes("REFRESH_ANALYSIS:") && userId) {
      try {
        console.log("[v0] Vex wants to refresh content analysis...")

        const refreshProgressMessage = "🔄 **Refreshing your content analysis...** Scanning your library now!"
        assistantMessage = assistantMessage.replace(/REFRESH_ANALYSIS:\s*true/, refreshProgressMessage)

        const token = authHeader?.split("Bearer ")[1]
        const refreshResponse = await fetch(
          `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/vex/analyze-uploads`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
        )

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json()
          assistantMessage = assistantMessage.replace(
            refreshProgressMessage,
            `✅ **Content analysis refreshed!** I've updated my understanding of your library. I can now see ${refreshData.analysis?.totalUploads || 0} uploads across ${refreshData.analysis?.categories?.length || 0} categories.`,
          )
        } else {
          assistantMessage = assistantMessage.replace(
            refreshProgressMessage,
            "❌ I encountered an issue refreshing your content analysis. Please try the refresh button above the chat input.",
          )
        }
      } catch (error) {
        console.error("[v0] Content analysis refresh failed:", error)
        assistantMessage = assistantMessage.replace(
          "🔄 **Refreshing your content analysis...** Scanning your library now!",
          "❌ I encountered an error while refreshing your content analysis. Please try the refresh button above the chat input.",
        )
      }
    }

    if (assistantMessage.includes("RENAME_CONTENT:") && userId) {
      try {
        console.log("[v0] Vex wants to rename content...")

        const renameMatch = assistantMessage.match(/RENAME_CONTENT:\s*({.*?})/s)
        if (!renameMatch) {
          throw new Error("No valid rename data found")
        }

        const renameData = JSON.parse(renameMatch[1])
        console.log("[v0] Parsed rename data:", renameData)

        const renameProgressMessage = "✏️ **Renaming content now...** Updating the title!"
        assistantMessage = assistantMessage.replace(/RENAME_CONTENT:\s*{.*?}/s, renameProgressMessage)

        const renameResult = await renameContentDirectly(userId, renameData)

        if (renameResult.success) {
          assistantMessage = assistantMessage.replace(
            renameProgressMessage,
            `✅ **Content renamed successfully!** "${renameResult.oldTitle}" is now "${renameResult.newTitle}". This will make it much easier to organize!`,
          )
        } else {
          assistantMessage = assistantMessage.replace(
            renameProgressMessage,
            `❌ ${renameResult.error || "Failed to rename content."}`,
          )
        }
      } catch (error) {
        console.error("[v0] Content rename failed:", error)
        assistantMessage = assistantMessage.replace(
          "✏️ **Renaming content now...** Updating the title!",
          "❌ I encountered an error while renaming the content. Please try again.",
        )
      }
    }

    if (assistantMessage.includes("CREATE_FOLDER:") && userId) {
      try {
        console.log("[v0] Vex wants to create a folder...")

        const folderMatch = assistantMessage.match(/CREATE_FOLDER:\s*({.*?})/s)
        if (!folderMatch) {
          throw new Error("No valid folder data found")
        }

        const folderData = JSON.parse(folderMatch[1])
        console.log("[v0] Parsed folder data:", folderData)

        const createFolderProgressMessage = "📁 **Creating folder now...** Setting up your new folder!"
        assistantMessage = assistantMessage.replace(/CREATE_FOLDER:\s*{.*?}/s, createFolderProgressMessage)

        const folderResult = await createFolderDirectly(userId, folderData)

        if (folderResult.success) {
          assistantMessage = assistantMessage.replace(
            createFolderProgressMessage,
            `✅ **Folder created successfully!** Your "${folderResult.folderName}" folder is ready to use.`,
          )
        } else {
          assistantMessage = assistantMessage.replace(
            createFolderProgressMessage,
            `❌ ${folderResult.error || "I encountered an issue creating the folder. Please try again."}`,
          )
        }
      } catch (error) {
        console.error("[v0] Folder creation failed:", error)
        assistantMessage = assistantMessage.replace(
          "📁 **Creating folder now...** Setting up your new folder!",
          "❌ I encountered an error while creating the folder. Please try again.",
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
    const tierInfo = await getUserTierInfo(userId)
    const subscriptionData = await checkSubscription(userId)
    const userPlan = tierInfo.tier || "free"

    if (tierInfo.reachedBundleLimit && userPlan !== "creator_pro") {
      return {
        success: false,
        error: `You've reached your bundle limit. Please upgrade your plan to create more bundles.`,
      }
    }

    if (!subscriptionData.features.canCreateBundles) {
      return {
        success: false,
        error: "Bundle creation via Vex is a Creator Pro feature. Please upgrade your plan.",
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

    const bundleKeywords = extractKeywordsFromText(title + " " + (description || ""))
    console.log(`[v0] 🔑 Bundle keywords for matching:`, bundleKeywords)

    console.log("[v0] Processing content items with AGGRESSIVE transcript intelligence...")
    const contentItems = []
    const matchDetails: any[] = []

    for (const contentIdentifier of contentIds) {
      try {
        const matchResult = findBestMatch(contentIdentifier, availableUploads, bundleKeywords)

        if (!matchResult.upload) {
          console.log(`[v0] ❌ Could not find: "${contentIdentifier}"`)
          matchDetails.push({
            identifier: contentIdentifier,
            matched: false,
            reason: "No matching content found",
          })
          continue
        }

        const matchedUpload = matchResult.upload
        console.log(
          `[v0] ✅ Matched: "${contentIdentifier}" → "${matchedUpload.title}" (${matchResult.confidence}% - ${matchResult.matchReason})`,
        )

        if (matchedUpload.transcript) {
          console.log(`[v0] 📝 Has transcript (${matchedUpload.transcript.length} chars)`)
        }

        const contentDoc = await db.collection(matchedUpload.collection).doc(matchedUpload.id).get()
        if (contentDoc.exists) {
          const contentData = contentDoc.data()!

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
              transcript: contentData.transcript || matchedUpload.transcript || null,
              detectedNiche: matchedUpload.detectedNiche || null,
              nicheConfidence: matchedUpload.confidence || null,
              vexMatchConfidence: matchResult.confidence,
              vexMatchReason: matchResult.matchReason,
            })

            matchDetails.push({
              identifier: contentIdentifier,
              matched: true,
              title: matchedUpload.title,
              confidence: matchResult.confidence,
              reason: matchResult.matchReason,
            })

            console.log(
              `[v0] ✅ Added to bundle: "${matchedUpload.title}" from ${matchedUpload.collection}${matchedUpload.transcript ? " (has transcript)" : ""}`,
            )
          }
        }
      } catch (error) {
        console.warn(`[v0] Failed to process content "${contentIdentifier}":`, error)
        matchDetails.push({
          identifier: contentIdentifier,
          matched: false,
          reason: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        })
      }
    }

    console.log(`[v0] 📊 Bundle Match Summary:`)
    console.log(`[v0]   ✅ Matched: ${contentItems.length}`)
    console.log(`[v0]   ❌ Not found: ${contentIds.length - contentItems.length}`)
    matchDetails.forEach((detail) => {
      if (detail.matched) {
        console.log(`[v0]   ✓ "${detail.identifier}" → "${detail.title}" (${detail.confidence}% - ${detail.reason})`)
      } else {
        console.log(`[v0]   ✗ "${detail.identifier}" - ${detail.reason}`)
      }
    })

    if (contentItems.length === 0) {
      return {
        success: false,
        error:
          "No valid content items found. The content you referenced may not exist or may not belong to your account.",
        matchDetails,
      }
    }

    console.log(`[v0] Successfully processed ${contentItems.length} content items for bundle`)

    const itemsWithTranscripts = contentItems.filter((item) => item.transcript).length
    if (itemsWithTranscripts > 0) {
      console.log(`[v0] 📝 Bundle includes ${itemsWithTranscripts} items with transcripts`)
    }

    console.log("[v0] Creating Stripe product...")
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

      creatorId: userId,
      stripeAccountId: stripeAccountId,

      stripeProductId: product.id,
      productId: product.id,
      stripePriceId: stripePrice.id,
      priceId: stripePrice.id,

      detailedContentItems: contentItems,
      contentItems: contentItems.map((item) => item.id),
      contentMetadata,

      contentTitles: contentItems.map((item) => item.title),
      contentDescriptions: contentItems.map((item) => item.description),
      contentTags: contentItems.flatMap((item) => item.tags || []),
      contentThumbnails: contentItems.map((item) => item.thumbnailUrl).filter(Boolean),
      contentUrls: contentItems.map((item) => item.fileUrl).filter(Boolean),

      thumbnailUrl: contentItems[0]?.thumbnailUrl || "",
      coverImage: contentItems[0]?.thumbnailUrl || "",
      coverImageUrl: contentItems[0]?.thumbnailUrl || "",
      customPreviewThumbnail: contentItems[0]?.thumbnailUrl || "",

      status: "active",
      active: true,
      isPublic: true,

      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      contentLastUpdated: FieldValue.serverTimestamp(),

      createdBy: "vex-ai",
      category: category || "Mixed Media",
      tags: tags || [],
      totalSales: 0,
      totalRevenue: 0,
    }

    await bundleRef.set(bundleDoc)

    console.log("[v0] Updating user bundle count...")
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

    console.log(`[v0] 📂 ========== ORGANIZE EXECUTION START ==========`)
    console.log(`[v0] 📂 Target folder: "${targetFolder}"`)
    console.log(`[v0] 📂 Number of files: ${fileIds.length}`)
    console.log(`[v0] 📂 Reason: ${reason}`)
    console.log(`[v0] 📂 Raw file IDs from Vex:`, JSON.stringify(fileIds, null, 2))

    let foldersSnapshot = await db
      .collection("folders")
      .where("userId", "==", userId)
      .where("name", "==", targetFolder)
      .where("isDeleted", "==", false)
      .limit(1)
      .get()

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
      console.log(`[v0] ❌ Folder "${targetFolder}" not found`)
      return {
        success: false,
        error: `Folder "${targetFolder}" not found. Please create it first.`,
      }
    }

    const targetFolderId = foldersSnapshot.docs[0].id
    console.log(`[v0] ✅ Found target folder ID: ${targetFolderId}`)

    const analysisDoc = await db.collection("vex_content_analysis").doc(userId).get()
    if (!analysisDoc.exists) {
      console.log(`[v0] ❌ No content analysis found for user`)
      return {
        success: false,
        error: "Content analysis not found. Please refresh your content analysis first.",
      }
    }

    const analysisData = analysisDoc.data()!
    const uploads = analysisData.uploads || []
    console.log(`[v0] 📊 Loaded ${uploads.length} uploads from analysis`)

    console.log(`[v0] 📋 ========== AVAILABLE UPLOADS ==========`)
    uploads.forEach((u: any, index: number) => {
      console.log(`[v0] ${index + 1}. ID: "${u.id}" | Title: "${u.title}" | Collection: "${u.collection}"`)
    })
    console.log(`[v0] 📋 ========================================`)

    const movedFiles: string[] = []
    const notFoundFiles: string[] = []

    for (let i = 0; i < fileIds.length; i++) {
      const fileId = fileIds[i]
      console.log(`[v0] 🔍 ========== PROCESSING FILE ${i + 1}/${fileIds.length} ==========`)
      console.log(`[v0] 🔍 Looking for file ID: "${fileId}"`)
      console.log(`[v0] 🔍 File ID type: ${typeof fileId}`)
      console.log(`[v0] 🔍 File ID length: ${fileId.length}`)

      const upload = uploads.find((u: any) => u.id === fileId)

      if (!upload) {
        console.log(`[v0] ❌ EXACT MATCH FAILED for: "${fileId}"`)

        const similarByPrefix = uploads.filter(
          (u: any) =>
            u.id.startsWith(fileId.substring(0, Math.min(5, fileId.length))) ||
            fileId.startsWith(u.id.substring(0, Math.min(5, u.id.length))),
        )

        if (similarByPrefix.length > 0) {
          console.log(`[v0] 💡 Found ${similarByPrefix.length} uploads with similar ID prefix:`)
          similarByPrefix.forEach((u: any) => {
            console.log(`[v0]    - "${u.id}" (${u.title})`)
          })
        }

        const byTitle = uploads.filter(
          (u: any) =>
            u.title &&
            fileId &&
            (u.title.toLowerCase() === fileId.toLowerCase() ||
              u.title.toLowerCase().includes(fileId.toLowerCase()) ||
              fileId.toLowerCase().includes(u.title.toLowerCase())),
        )

        if (byTitle.length > 0) {
          console.log(`[v0] 💡 Found ${byTitle.length} uploads with matching title:`)
          byTitle.forEach((u: any) => {
            console.log(`[v0]    - "${u.id}" (${u.title})`)
          })
        }

        notFoundFiles.push(fileId)
        console.log(`[v0] ❌ Skipping file: "${fileId}" - not found in uploads`)
        continue
      }

      console.log(`[v0] ✅ EXACT MATCH FOUND!`)
      console.log(`[v0]    Upload ID: "${upload.id}"`)
      console.log(`[v0]    Upload Title: "${upload.title}"`)
      console.log(`[v0]    Upload Collection: "${upload.collection}"`)
      console.log(`[v0]    Current Folder: ${upload.folderId || "none"} (${upload.folderName || "unorganized"})`)

      try {
        const docRef = db.collection(upload.collection).doc(upload.id)
        console.log(`[v0] 📄 Querying Firestore: ${upload.collection}/${upload.id}`)

        const docSnap = await docRef.get()
        if (!docSnap.exists) {
          console.log(`[v0] ❌ Document doesn't exist in Firestore: ${upload.collection}/${upload.id}`)
          notFoundFiles.push(fileId)
          continue
        }

        const docData = docSnap.data()!
        console.log(`[v0] 📄 Document found in Firestore:`)
        console.log(`[v0]    uid: "${docData.uid}"`)
        console.log(`[v0]    userId: "${docData.userId}"`)
        console.log(`[v0]    title: "${docData.title}"`)
        console.log(`[v0]    currentFolderId: "${docData.folderId || "none"}"`)
        console.log(`[v0]    currentFolderName: "${docData.folderName || "none"}"`)

        if (docData.uid !== userId && docData.userId !== userId) {
          console.log(`[v0] ❌ OWNERSHIP MISMATCH!`)
          console.log(`[v0]    Expected userId: "${userId}"`)
          console.log(`[v0]    Document uid: "${docData.uid}"`)
          console.log(`[v0]    Document userId: "${docData.userId}"`)
          notFoundFiles.push(fileId)
          continue
        }

        console.log(`[v0] ✅ Ownership verified`)
        console.log(`[v0] 🔄 Updating document to move to folder: "${targetFolder}" (${targetFolderId})`)

        await docRef.update({
          folderId: targetFolderId,
          folderName: targetFolder,
          updatedAt: FieldValue.serverTimestamp(),
          vexOrganized: true,
          vexOrganizeReason: reason || "Organized by Vex AI",
          vexDetectedNiche: upload.detectedNiche || null,
          vexHasTranscript: !!upload.transcript,
        })

        movedFiles.push(upload.title || upload.filename || fileId)
        console.log(`[v0] ✅ SUCCESS! Moved "${upload.title}" to "${targetFolder}"`)
      } catch (error) {
        console.error(`[v0] ❌ ERROR moving ${upload.id}:`, error)
        notFoundFiles.push(fileId)
      }
    }

    console.log(`[v0] 📊 ========== ORGANIZE EXECUTION COMPLETE ==========`)
    console.log(`[v0] ✅ Successfully moved: ${movedFiles.length} files`)
    console.log(`[v0] 📝 Moved files: ${movedFiles.join(", ")}`)
    console.log(`[v0] ❌ Not found: ${notFoundFiles.length} files`)
    if (notFoundFiles.length > 0) {
      console.log(`[v0] 📝 Not found IDs: ${notFoundFiles.join(", ")}`)
    }
    console.log(`[v0] ====================================================`)

    if (movedFiles.length === 0) {
      return {
        success: false,
        error: `Could not move any files. ${notFoundFiles.length > 0 ? `Not found: ${notFoundFiles.join(", ")}` : ""}`,
      }
    }

    try {
      fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/vex/analyze-uploads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.JSON.stringify({ userId }),
      }).catch((err) => console.warn("[v0] Failed to trigger analysis refresh:", err))
    } catch (error) {
      console.warn("[v0] Failed to trigger analysis refresh:", error)
    }

    return {
      success: true,
      movedCount: movedFiles.length,
      targetFolder,
      movedFiles,
      notFound: notFoundFiles.length > 0 ? notFoundFiles : undefined,
    }
  } catch (error) {
    console.error("[v0] ❌ File organization error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred while organizing files.",
    }
  }
}

function extractKeywordsFromText(text: string): string[] {
  const lowerText = text.toLowerCase()
  const keywords: string[] = []

  const faithKeywords = [
    "jesus",
    "christ",
    "god",
    "lord",
    "holy",
    "spirit",
    "bible",
    "scripture",
    "gospel",
    "salvation",
    "grace",
    "faith",
    "prayer",
    "worship",
    "church",
    "ministry",
    "pastor",
    "sermon",
    "testimony",
    "blessed",
    "amen",
    "spiritual",
    "soul",
    "divine",
    "sacred",
    "heaven",
    "eternal",
    "redemption",
    "forgiveness",
    "mercy",
    "righteousness",
    "covenant",
    "disciple",
    "believer",
    "rebellion",
    "repentance",
    "transformation",
    "renewal",
    "deliverance",
    "breakthrough",
    "victory",
    "perseverance",
  ]

  const motivationKeywords = [
    "motivation",
    "motivational",
    "grind",
    "hustle",
    "discipline",
    "success",
    "mindset",
    "goals",
    "work",
    "dedication",
    "perseverance",
    "achievement",
  ]

  const memeKeywords = ["meme", "funny", "pov", "comedy", "humor", "joke", "viral"]

  const sfxKeywords = ["sfx", "sound", "effect", "audio", "whoosh", "impact", "transition"]

  faithKeywords.forEach((keyword) => {
    if (lowerText.includes(keyword)) keywords.push(keyword)
  })

  motivationKeywords.forEach((keyword) => {
    if (lowerText.includes(keyword)) keywords.push(keyword)
  })

  memeKeywords.forEach((keyword) => {
    if (lowerText.includes(keyword)) keywords.push(keyword)
  })

  sfxKeywords.forEach((keyword) => {
    if (lowerText.includes(keyword)) keywords.push(keyword)
  })

  return [...new Set(keywords)]
}

function getRelatedTerms(keywords: string[]): string[] {
  const relatedTermsMap: Record<string, string[]> = {
    jesus: ["christ", "savior", "messiah", "lord"],
    god: ["lord", "father", "almighty", "creator", "divine"],
    faith: ["believe", "trust", "conviction", "devotion"],
    prayer: ["pray", "praying", "intercession"],
    church: ["congregation", "worship", "ministry"],
    bible: ["scripture", "word", "gospel"],
    spiritual: ["spirit", "soul", "divine"],
    salvation: ["saved", "redemption", "deliverance"],

    motivation: ["motivate", "inspire", "inspiration", "driven"],
    success: ["achieve", "achievement", "accomplish", "win", "winning"],
    grind: ["hustle", "work", "dedication", "discipline"],
    mindset: ["mentality", "attitude", "perspective", "thinking"],
    goals: ["target", "objective", "aim", "ambition"],

    meme: ["funny", "comedy", "humor", "viral"],
    pov: ["point of view", "perspective"],

    sfx: ["sound effect", "audio", "sound"],
    whoosh: ["swoosh", "transition"],
  }

  const relatedTerms: string[] = []

  keywords.forEach((keyword) => {
    if (relatedTermsMap[keyword]) {
      relatedTerms.push(...relatedTermsMap[keyword])
    }
  })

  return [...new Set(relatedTerms)]
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

    let parentPath = ""
    if (parentId && parentId !== "root") {
      const parentDoc = await db.collection("folders").doc(parentId).get()
      if (parentDoc.exists) {
        const parentData = parentDoc.data()
        parentPath = parentData?.path || ""
      }
    }

    const folderPath = parentPath ? `${parentPath}/${name.trim()}` : `/${name.trim()}`

    const timestamp = new Date()
    const newFolder = {
      name: name.trim(),
      userId,
      uid: userId,
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

    for (const collectionName of contentCollections) {
      const docRef = db.collection(collectionName).doc(contentId)
      const docSnap = await docRef.get()

      if (docSnap.exists) {
        const docData = docSnap.data()!

        if (docData.uid === userId || docData.userId === userId) {
          oldTitle = docData.title || docData.filename || contentId
          documentId = docSnap.id
          found = true
          console.log(`[v0] Found content by ID in ${collectionName}`)
          break
        }
      }

      if (!found) {
        const querySnapshot = await db.collection(collectionName).where("userId", "==", userId).get()

        for (const doc of querySnapshot.docs) {
          const docData = doc.data()
          const title = docData.title || docData.filename || ""

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

function countMentionedItems(text: string): number {
  const patterns = [
    /(?:these|all|the)?\s*(\d+)\s*(?:videos?|files?|items?|pieces?|content)/gi,
    /(?:organize|move|include|add|create)\s*(?:these|all|the)?\s*(\d+)/gi,
    /(\d+)\s*(?:videos?|files?|items?)\s*(?:into|to|in)/gi,
  ]

  let maxCount = 0

  for (const pattern of patterns) {
    const matches = text.matchAll(pattern)
    for (const match of matches) {
      const count = Number.parseInt(match[1], 10)
      if (!isNaN(count) && count > maxCount) {
        maxCount = count
      }
    }
  }

  const bulletMatches = text.match(/^[\s]*[-*•]\s+/gm)
  if (bulletMatches && bulletMatches.length > maxCount) {
    maxCount = bulletMatches.length
  }

  const numberedMatches = text.match(/^[\s]*\d+\.\s+/gm)
  if (numberedMatches && numberedMatches.length > maxCount) {
    maxCount = numberedMatches.length
  }

  return maxCount
}

function findBestMatch(
  identifier: string,
  uploads: any[],
  folderKeywords: string[],
): { upload: any | null; confidence: number; matchReason: string } {
  const lowerIdentifier = identifier.toLowerCase()
  let bestMatch: any = null
  let bestConfidence = 0
  let bestReason = ""

  for (const upload of uploads) {
    let confidence = 0
    const reasons: string[] = []

    if (upload.id === identifier) {
      return { upload, confidence: 100, matchReason: "Exact ID match" }
    }

    if (upload.title === identifier) {
      return { upload, confidence: 95, matchReason: "Exact title match" }
    }

    if (upload.title?.toLowerCase() === lowerIdentifier) {
      confidence = Math.max(confidence, 90)
      reasons.push("Case-insensitive title match")
    }

    if (upload.filename === identifier || upload.filename?.toLowerCase() === lowerIdentifier) {
      confidence = Math.max(confidence, 85)
      reasons.push("Filename match")
    }

    if (upload.title?.toLowerCase().includes(lowerIdentifier)) {
      confidence = Math.max(confidence, 70)
      reasons.push("Title contains identifier")
    }

    if (upload.title && lowerIdentifier.includes(upload.title.toLowerCase())) {
      confidence = Math.max(confidence, 65)
      reasons.push("Identifier contains title")
    }

    if (upload.title) {
      const titleWords = upload.title.toLowerCase().split(/\s+/)
      const identifierWords = lowerIdentifier.split(/\s+/)

      let matchingWords = 0
      titleWords.forEach((titleWord) => {
        if (titleWord.length > 2) {
          identifierWords.forEach((idWord) => {
            if (idWord.includes(titleWord) || titleWord.includes(idWord)) {
              matchingWords++
            }
          })
        }
      })

      if (matchingWords > 0) {
        const fuzzyConfidence = Math.min(40 + matchingWords * 15, 75)
        confidence = Math.max(confidence, fuzzyConfidence)
        reasons.push(`${matchingWords} fuzzy word matches in title`)
      }
    }

    if (upload.transcript && typeof upload.transcript === "string") {
      const transcriptLower = upload.transcript.toLowerCase()

      if (transcriptLower.includes(lowerIdentifier)) {
        confidence = Math.max(confidence, 75)
        reasons.push("Identifier found in transcript")
      }

      let keywordMatches = 0
      const matchedKeywords: string[] = []

      folderKeywords.forEach((keyword) => {
        if (transcriptLower.includes(keyword)) {
          keywordMatches++
          matchedKeywords.push(keyword)
        }
      })

      if (keywordMatches > 0) {
        const keywordConfidence = Math.min(50 + keywordMatches * 15, 95)
        confidence = Math.max(confidence, keywordConfidence)
        reasons.push(`${keywordMatches} folder keywords in transcript (${matchedKeywords.slice(0, 3).join(", ")})`)
      }

      const relatedTerms = getRelatedTerms(folderKeywords)
      let relatedMatches = 0

      relatedTerms.forEach((term) => {
        if (transcriptLower.includes(term)) {
          relatedMatches++
        }
      })

      if (relatedMatches > 0) {
        const relatedConfidence = Math.min(45 + relatedMatches * 10, 80)
        confidence = Math.max(confidence, relatedConfidence)
        reasons.push(`${relatedMatches} related terms in transcript`)
      }
    }

    if (upload.detectedNiche) {
      const nicheLower = upload.detectedNiche.toLowerCase()

      let nicheKeywordMatches = 0
      folderKeywords.forEach((keyword) => {
        if (nicheLower.includes(keyword) || keyword.includes(nicheLower)) {
          nicheKeywordMatches++
        }
      })

      if (nicheKeywordMatches > 0) {
        const nicheConfidence = upload.confidence ? Math.min(55 + upload.confidence * 25, 85) : 60
        confidence = Math.max(confidence, nicheConfidence)
        reasons.push(`Detected niche matches (${upload.detectedNiche})`)
      }

      if (
        nicheLower === lowerIdentifier ||
        nicheLower.includes(lowerIdentifier) ||
        lowerIdentifier.includes(nicheLower)
      ) {
        confidence = Math.max(confidence, 65)
        reasons.push("Identifier matches detected niche")
      }
    }

    if (upload.description && typeof upload.description === "string") {
      const descLower = upload.description.toLowerCase()
      let descKeywordMatches = 0

      folderKeywords.forEach((keyword) => {
        if (descLower.includes(keyword)) {
          descKeywordMatches++
        }
      })

      if (descKeywordMatches > 0) {
        const descConfidence = Math.min(40 + descKeywordMatches * 10, 70)
        confidence = Math.max(confidence, descConfidence)
        reasons.push(`${descKeywordMatches} keywords in description`)
      }
    }

    if (upload.tags && Array.isArray(upload.tags)) {
      let tagMatches = 0

      upload.tags.forEach((tag: string) => {
        const tagLower = tag.toLowerCase()
        folderKeywords.forEach((keyword) => {
          if (tagLower.includes(keyword) || keyword.includes(tagLower)) {
            tagMatches++
          }
        })
      })

      if (tagMatches > 0) {
        const tagConfidence = Math.min(45 + tagMatches * 10, 75)
        confidence = Math.max(confidence, tagConfidence)
        reasons.push(`${tagMatches} matching tags`)
      }
    }

    if (confidence > bestConfidence) {
      bestMatch = upload
      bestConfidence = confidence
      bestReason = reasons.join(", ")
    }
  }

  if (bestConfidence >= 30) {
    return { upload: bestMatch, confidence: bestConfidence, matchReason: bestReason }
  }

  return { upload: null, confidence: 0, matchReason: "No confident match found" }
}
