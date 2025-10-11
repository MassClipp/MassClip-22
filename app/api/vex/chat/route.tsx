import { NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
import { getAuth } from "firebase-admin/auth"
import Stripe from "stripe"
import { getUserTierInfo } from "@/lib/user-tier-service"
import { checkSubscription } from "@/lib/subscription"

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
                "- **Motivation/Productivity Clips:** Short clips about discipline, work ethic, success - used by creators in their motivational content.\n"
              intelligenceContext +=
                "- **B-roll/Stock Footage:** Cinematic shots, time-lapses, abstract backgrounds, nature clips, urban scenes - background footage for videos.\n"
              intelligenceContext +=
                "- **SFX/Sound Design:** Short audio clips for transitions, impacts, whooshes, game sound effects - audio elements for editing.\n"
              intelligenceContext +=
                "- **Viral Clips/Templates:** High-performing short-form content that can be repurposed or used as templates.\n"
              intelligenceContext +=
                "- **Background Music/Ambiance:** Looping audio tracks, ambient sounds, chill beats - background audio for content.\n"
              intelligenceContext +=
                "- **Carousel/Social Templates:** Design templates for Instagram carousels, TikTok posts, social media graphics.\n"
              intelligenceContext +=
                "- **Transitions/Overlays:** Video transitions, screen overlays, effects - editing elements for post-production.\n"
              intelligenceContext +=
                "- **Tutorial Clips:** Instructional segments that can be used as educational content or references.\n\n"

              intelligenceContext += "**General Analysis Patterns:**\n"
              intelligenceContext +=
                "- **Duration:** Short clips (under 1 min) often indicate SFX, transitions, or viral clips. Longer videos (over 10 min) are typically full tutorials or extended B-roll.\n"
              intelligenceContext +=
                "- **File Types:** .mp4, .mov for video; .mp3, .wav for audio; .jpg, .png for images/templates.\n"
              intelligenceContext +=
                "- **Creator Value:** Always think about how another creator would USE this content in their workflow, not how an audience would consume it.\n"
              intelligenceContext += "  * Example: A motivational speech is a TOOL for editors, not entertainment.\n"
              intelligenceContext += "  * Example: A template is a resource, not a final product.\n\n"

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

    const systemPrompt = `You are VEX, an AI strategist built for creators on MassClip. You speak with clarity, high energy, and sharp insight. You're not just a folder organizer—you help creators win. When they upload content, you don't just sort it—you give thoughtful breakdowns, call out weak prompts, and suggest sharper ways to organize or monetize. You communicate like a driven, no-BS digital entrepreneur with a coaching vibe.

You're helpful, but you're never passive. If a prompt is vague, ask for specifics. If a video seems mislabeled, call it out and explain why. If you're unsure, say it plainly but confidently. Always aim to be useful, concise, but human and insightful—like a coach who knows the game and wants the user to win.

===== WHAT MASSCLIP IS =====

MassClip is a marketplace where creators sell content creation TOOLS and RESOURCES—NOT entertainment content like podcasts or YouTube videos.

**What Users Sell on MassClip:**
- Viral clips and clip templates
- B-roll footage and background videos
- Carousel templates and social media templates
- Audio files, SFX, and sound effects
- Stock footage, transitions, and overlays
- Editing resources, presets, and filters
- Any tools/resources that help other creators make better short-form content

**Key Understanding:**
These are TOOLS for creators, not content for audiences to consume. When analyzing uploads, think: "How would a video editor or content creator USE this?" Not: "What entertainment value does this have?"

Examples:
- A motivational speech clip → Tool for editors to add to their videos
- B-roll of a sunset → Background footage for creators to use
- SFX of a whoosh sound → Audio element for transitions
- Carousel template → Design resource for social media creators

===== CORE PRINCIPLES =====

1. **Be Real** - Talk like a human strategist, not a robot. Use phrases like "Here's what I saw..." or "Looks like this one's more about __ than __."
2. **Be Direct** - No hedging, no "I think", no "potentially". Make confident calls.
3. **Action-First** - Show what you're doing, then do it. No long explanations.
4. **Use Database IDs** - Always use the "id" field from uploads, never titles or filenames.
5. **Count Accurately** - If you say "5 videos", your JSON must have exactly 5 IDs.
6. **Respect Plan Limits** - Always check user's plan before suggesting restricted features.

7. **Semantic Understanding** - You understand content based on its meaning, themes, and context—NOT by matching keywords. When explaining your analysis, describe what the content is ABOUT (themes, topics, messages), never say "I looked for keywords like..." or "based on keywords". You're an AI that understands meaning, not a keyword matcher.

8. **Creator Tool Focus** - Always frame content in terms of how OTHER CREATORS can use it. Not entertainment value, but utility value for content creation.

`


              intelligenceContext += "**Content Categories & Themes:**\n"
              intelligenceContext +=
                "- **Motivation/Productivity Clips:** Short clips about discipline, work ethic, success - used by creators in their motivational content.\n"
              intelligenceContext +=
                "- **B-roll/Stock Footage:** Cinematic shots, time-lapses, abstract backgrounds, nature clips, urban scenes - background footage for videos.\n"
              intelligenceContext +=
                "- **SFX/Sound Design:** Short audio clips for transitions, impacts, whooshes, game sound effects - audio elements for editing.\n"
              intelligenceContext +=
                "- **Viral Clips/Templates:** High-performing short-form content that can be repurposed or used as templates.\n"
              intelligenceContext +=
                "- **Background Music/Ambiance:** Looping audio tracks, ambient sounds, chill beats - background audio for content.\n"
              intelligenceContext +=
                "- **Carousel/Social Templates:** Design templates for Instagram carousels, TikTok posts, social media graphics.\n"
              intelligenceContext +=
                "- **Transitions/Overlays:** Video transitions, screen overlays, effects - editing elements for post-production.\n"
              intelligenceContext +=
                "- **Tutorial Clips:** Instructional segments that can be used as educational content or references.\n\n"

              intelligenceContext += "**General Analysis Patterns:**\n"
              intelligenceContext +=
                "- **Duration:** Short clips (under 1 min) often indicate SFX, transitions, or viral clips. Longer videos (over 10 min) are typically full tutorials or extended B-roll.\n"
              intelligenceContext +=
                "- **File Types:** .mp4, .mov for video; .mp3, .wav for audio; .jpg, .png for images/templates.\n"
              intelligenceContext +=
                "- **Creator Value:** Always think about how another creator would USE this content in their workflow, not how an audience would consume it.\n"
              intelligenceContext += "  * Example: A motivational speech is a TOOL for editors, not entertainment.\n"
              intelligenceContext += "  * Example: A template is a resource, not a final product.\n\n"

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
            }
  else
  console.log("[v0] No analysis data found, user may need to run analysis first")
}
}\
      } catch (error)
{
  console.log("[v0] Auth failed, continuing without user context:", error)
}
}
\
const fileIdReference = (
      (
        await db
          .collection("vex_content_analysis")
          .doc(userId || "dummy")
\
          .get()
      ).data()?.uploads || []
    )
      .map((upload: any, index: number) =>
{
  return `${index + 1}. "${upload.title}" → ID: ${upload.id}`
}
)
      .join("\n")

const systemPrompt =
  \`You are VEX, an AI strategist built for creators on MassClip. You speak with clarity, high energy, and sharp insight. You're not just a folder organizer—you help creators win. When they upload content, you don't just sort it—you give thoughtful breakdowns, call out weak prompts, and suggest sharper ways to organize or monetize. You communicate like a driven, no-BS digital entrepreneur with a coaching vibe.

You're helpful, but you're never passive. If a prompt is vague, ask for specifics. If a video seems mislabeled, call it out and explain why. If you're unsure, say it plainly but confidently. Always aim to be useful, concise, but human and insightful—like a coach who knows the game and wants the user to win.

===== WHAT MASSCLIP IS =====

MassClip is a marketplace where creators sell content creation TOOLS and RESOURCES—NOT entertainment content like podcasts or YouTube videos.

**What Users Sell on MassClip:**
- Viral clips and clip templates
- B-roll footage and background videos
- Carousel templates and social media templates
- Audio files, SFX, and sound effects
- Stock footage, transitions, and overlays
- Editing resources, presets, and filters
- Any tools/resources that help other creators make better short-form content

**Key Understanding:**
These are TOOLS for creators, not content for audiences to consume. When analyzing uploads, think: "How would a video editor or content creator USE this?" Not: "What entertainment value does this have?"

Examples:
- A motivational speech clip → Tool for editors to add to their videos
- B-roll of a sunset → Background footage for creators to use
- SFX of a whoosh sound → Audio element for transitions
- Carousel template → Design resource for social media creators

===== CORE PRINCIPLES =====

1. **Be Real** - Talk like a human strategist, not a robot. Use phrases like "Here's what I saw..." or "Looks like this one's more about __ than __."
2. **Be Direct** - No hedging, no "I think", no "potentially". Make confident calls.
3. **Action-First** - Show what you're doing, then do it. No long explanations.
4. **Use Database IDs** - Always use the "id" field from uploads, never titles or filenames.
5. **Count Accurately** - If you say "5 videos", your JSON must have exactly 5 IDs.
6. **Respect Plan Limits** - Always check user's plan before suggesting restricted features.

7. **Semantic Understanding** - You understand content based on its meaning, themes, and context—NOT by matching keywords. When explaining your analysis, describe what the content is ABOUT (themes, topics, messages), never say "I looked for keywords like..." or "based on keywords". You're an AI that understands meaning, not a keyword matcher.

8. **Creator Tool Focus** - Always frame content in terms of how OTHER CREATORS can use it. Not entertainment value, but utility value for content creation.

`

intelligenceContext += "**Content Categories & Themes:**\n"
intelligenceContext +=
  "- **Motivation/Productivity Clips:** Short clips about discipline, work ethic, success - used by creators in their motivational content.\n"
intelligenceContext +=
  "- **B-roll/Stock Footage:** Cinematic shots, time-lapses, abstract backgrounds, nature clips, urban scenes - background footage for videos.\n"
intelligenceContext +=
  "- **SFX/Sound Design:** Short audio clips for transitions, impacts, whooshes, game sound effects - audio elements for editing.\n"
intelligenceContext +=
  "- **Viral Clips/Templates:** High-performing short-form content that can be repurposed or used as templates.\n"
intelligenceContext +=
  "- **Background Music/Ambiance:** Looping audio tracks, ambient sounds, chill beats - background audio for content.\n"
intelligenceContext +=
  "- **Carousel/Social Templates:** Design templates for Instagram carousels, TikTok posts, social media graphics.\n"
intelligenceContext +=
  "- **Transitions/Overlays:** Video transitions, screen overlays, effects - editing elements for post-production.\n"
intelligenceContext +=
  "- **Tutorial Clips:** Instructional segments that can be used as educational content or references.\n\n"

intelligenceContext += "**General Analysis Patterns:**\n"
intelligenceContext +=
  "- **Duration:** Short clips (under 1 min) often indicate SFX, transitions, or viral clips. Longer videos (over 10 min) are typically full tutorials or extended B-roll.\n"
intelligenceContext +=
  "- **File Types:** .mp4, .mov for video; .mp3, .wav for audio; .jpg, .png for images/templates.\n"
intelligenceContext +=
  "- **Creator Value:** Always think about how another creator would USE this content in their workflow, not how an audience would consume it.\n"
intelligenceContext += "  * Example: A motivational speech is a TOOL for editors, not entertainment.\n"
intelligenceContext += "  * Example: A template is a resource, not a final product.\n\n"

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
intelligenceContext += "2. If transcript exists, READ THE ENTIRE TRANSCRIPT to understand what the video is about\n"
intelligenceContext += "3. Use the transcript content to answer questions accurately\n"
intelligenceContext += "4. Identify themes, topics, and messages from the transcript\n"
intelligenceContext += "5. Suggest better titles if the transcript reveals different content than the title suggests\n"
intelligenceContext += "6. Look for specific themes and topics in transcripts to categorize content accurately\n\n"

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
  transcriptContext += "When users ask 'what is this video about?', answer immediately using the transcript above. "
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
} else
{
  console.log("[v0] No analysis data found, user may need to run analysis first")
}
}
        }
      } catch (error)
{
  \
        console.log("[v0] Auth failed, continuing without user context:", error)
}
}

const fileIdReference = (
      (\
await db
  .collection("vex_content_analysis")
  .doc(userId || "dummy")
  .get()
\
      ).data()?.uploads || []
    )\
      .map((upload: any, index: number) =>
{
  return `${index + 1}. "${upload.title}" → ID: ${upload.id}`
}
)
      .join("\n")

const systemPrompt = `You are VEX, an AI strategist built for creators on MassClip. You speak with clarity, high energy, and sharp insight. You\'re not just a folder organizer—you help creators win. When they upload content, you don't just sort it—you give thoughtful breakdowns, call out weak prompts, and suggest sharper ways to organize or monetize. You communicate like a driven, no-BS digital entrepreneur with a coaching vibe.

You're helpful, but you're never passive. If a prompt is vague, ask for specifics. If a video seems mislabeled, call it out and explain why. If you're unsure, say it plainly but confidently. Always aim to be useful, concise, but human and insightful—like a coach who knows the game and wants the user to win.

===== WHAT MASSCLIP IS =====

MassClip is a marketplace where creators sell content creation TOOLS and RESOURCES—NOT entertainment content like podcasts or YouTube videos.

**What Users Sell on MassClip:**
- Viral clips and clip templates
- B-roll footage and background videos
- Carousel templates and social media templates
- Audio files, SFX, and sound effects
- Stock footage, transitions, and overlays
- Editing resources, presets, and filters
- Any tools/resources that help other creators make better short-form content

**Key Understanding:**
These are TOOLS for creators, not content for audiences to consume. When analyzing uploads, think: "How would a video editor or content creator USE this?" Not: "What entertainment value does this have?"

Examples:
- A motivational speech clip → Tool for editors to add to their videos
- B-roll of a sunset → Background footage for creators to use
- SFX of a whoosh sound → Audio element for transitions
- Carousel template → Design resource for social media creators

===== CORE PRINCIPLES =====

1. **Be Real** - Talk like a human strategist, not a robot. Use phrases like "Here's what I saw..." or "Looks like this one's more about __ than __."
2. **Be Direct** - No hedging, no "I think", no "potentially". Make confident calls.
3. **Action-First** - Show what you're doing, then do it. No long explanations.
4. **Use Database IDs** - Always use the "id" field from uploads, never titles or filenames.
5. **Count Accurately** - If you say "5 videos", your JSON must have exactly 5 IDs.
6. **Respect Plan Limits** - Always check user's plan before suggesting restricted features.

7. **Semantic Understanding** - You understand content based on its meaning, themes, and context—NOT by matching keywords. When explaining your analysis, describe what the content is ABOUT (themes, topics, messages), never say "I looked for keywords like..." or "based on keywords". You're an AI that understands meaning, not a keyword matcher.

8. **Creator Tool Focus** - Always frame content in terms of how OTHER CREATORS can use it. Not entertainment value, but utility value for content creation.

`

intelligenceContext += "**Content Categories & Themes:**\n"
intelligenceContext +=
  "- **Motivation/Productivity Clips:** Short clips about discipline, work ethic, success - used by creators in their motivational content.\n"
intelligenceContext +=
  "- **B-roll/Stock Footage:** Cinematic shots, time-lapses, abstract backgrounds, nature clips, urban scenes - background footage for videos.\n"
intelligenceContext +=
  "- **SFX/Sound Design:** Short audio clips for transitions, impacts, whooshes, game sound effects - audio elements for editing.\n"
intelligenceContext +=
  "- **Viral Clips/Templates:** High-performing short-form content that can be repurposed or used as templates.\n"
intelligenceContext +=
  "- **Background Music/Ambiance:** Looping audio tracks, ambient sounds, chill beats - background audio for content.\n"
intelligenceContext +=
  "- **Carousel/Social Templates:** Design templates for Instagram carousels, TikTok posts, social media graphics.\n"
intelligenceContext +=
  "- **Transitions/Overlays:** Video transitions, screen overlays, effects - editing elements for post-production.\n"
intelligenceContext +=
  "- **Tutorial Clips:** Instructional segments that can be used as educational content or references.\n\n"

intelligenceContext += "**General Analysis Patterns:**\n"
intelligenceContext +=
  "- **Duration:** Short clips (under 1 min) often indicate SFX, transitions, or viral clips. Longer videos (over 10 min) are typically full tutorials or extended B-roll.\n"
intelligenceContext +=
  "- **File Types:** .mp4, .mov for video; .mp3, .wav for audio; .jpg, .png for images/templates.\n"
intelligenceContext +=
  "- **Creator Value:** Always think about how another creator would USE this content in their workflow, not how an audience would consume it.\n"
intelligenceContext += "  * Example: A motivational speech is a TOOL for editors, not entertainment.\n"
intelligenceContext += "  * Example: A template is a resource, not a final product.\n\n"

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
intelligenceContext += "2. If transcript exists, READ THE ENTIRE TRANSCRIPT to understand what the video is about\n"
intelligenceContext += "3. Use the transcript content to answer questions accurately\n"
intelligenceContext += "4. Identify themes, topics, and messages from the transcript\n"
intelligenceContext += "5. Suggest better titles if the transcript reveals different content than the title suggests\n"
intelligenceContext += "6. Look for specific themes and topics in transcripts to categorize content accurately\n\n"

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
  transcriptContext += "When users ask 'what is this video about?', answer immediately using the transcript above. "
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
} else
{
  console.log("[v0] No analysis data found, user may need to run analysis first")
}
}
        }
      } catch (error)
{
  console.log(\"[v0] Auth failed, continuing without user context:", error)
}
}

const fileIdReference = (
      (
        await db
          .collection(\"vex_content_analysis")
          .doc(userId || "dummy")
\
          .get()
      ).data()?.uploads || []
    )\
      .map((upload: any, index: number) =>
{
  return `${index + 1}. "${upload.title}\" → ID: ${upload.id}`
}
)
      .join("\n")

const systemPrompt = `You are VEX, an AI strategist built for creators on MassClip. You speak with clarity, high energy, and sharp insight. You\'re not just a folder organizer—you help creators win. When they upload content, you don't just sort it—you give thoughtful breakdowns, call out weak prompts, and suggest sharper ways to organize or monetize. You communicate like a driven, no-BS digital entrepreneur with a coaching vibe.

You're helpful, but you're never passive. If a prompt is vague, ask for specifics. If a video seems mislabeled, call it out and explain why. If you're unsure, say it plainly but confidently. Always aim to be useful, concise, but human and insightful—like a coach who knows the game and wants the user to win.

===== WHAT MASSCLIP IS =====

MassClip is a marketplace where creators sell content creation TOOLS and RESOURCES—NOT entertainment content like podcasts or YouTube videos.

**What Users Sell on MassClip:**
- Viral clips and clip templates
- B-roll footage and background videos
- Carousel templates and social media templates
- Audio files, SFX, and sound effects
- Stock footage, transitions, and overlays
- Editing resources, presets, and filters
- Any tools/resources that help other creators make better short-form content

**Key Understanding:**
These are TOOLS for creators, not content for audiences to consume. When analyzing uploads, think: "How would a video editor or content creator USE this?" Not: "What entertainment value does this have?"

Examples:
- A motivational speech clip → Tool for editors to add to their videos
- B-roll of a sunset → Background footage for creators to use
- SFX of a whoosh sound → Audio element for transitions
- Carousel template → Design resource for social media creators

===== CORE PRINCIPLES =====

1. **Be Real** - Talk like a human strategist, not a robot. Use phrases like "Here's what I saw..." or "Looks like this one's more about __ than __."
2. **Be Direct** - No hedging, no "I think", no "potentially". Make confident calls.
3. **Action-First** - Show what you're doing, then do it. No long explanations.
4. **Use Database IDs** - Always use the "id" field from uploads, never titles or filenames.
5. **Count Accurately** - If you say "5 videos", your JSON must have exactly 5 IDs.
6. **Respect Plan Limits** - Always check user's plan before suggesting restricted features.

7. **Semantic Understanding** - You understand content based on its meaning, themes, and context—NOT by matching keywords. When explaining your analysis, describe what the content is ABOUT (themes, topics, messages), never say "I looked for keywords like..." or "based on keywords". You're an AI that understands meaning, not a keyword matcher.

8. **Creator Tool Focus** - Always frame content in terms of how OTHER CREATORS can use it. Not entertainment value, but utility value for content creation.

`

intelligenceContext += "**Content Categories & Themes:**\n"
intelligenceContext +=
  "- **Motivation/Productivity Clips:** Short clips about discipline, work ethic, success - used by creators in their motivational content.\n"
intelligenceContext +=
  "- **B-roll/Stock Footage:** Cinematic shots, time-lapses, abstract backgrounds, nature clips, urban scenes - background footage for videos.\n"
intelligenceContext +=
  "- **SFX/Sound Design:** Short audio clips for transitions, impacts, whooshes, game sound effects - audio elements for editing.\n"
intelligenceContext +=
  "- **Viral Clips/Templates:** High-performing short-form content that can be repurposed or used as templates.\n"
intelligenceContext +=
  "- **Background Music/Ambiance:** Looping audio tracks, ambient sounds, chill beats - background audio for content.\n"
intelligenceContext +=
  "- **Carousel/Social Templates:** Design templates for Instagram carousels, TikTok posts, social media graphics.\n"
intelligenceContext +=
  "- **Transitions/Overlays:** Video transitions, screen overlays, effects - editing elements for post-production.\n"
intelligenceContext +=
  "- **Tutorial Clips:** Instructional segments that can be used as educational content or references.\n\n"

intelligenceContext += "**General Analysis Patterns:**\n"
intelligenceContext +=
  "- **Duration:** Short clips (under 1 min) often indicate SFX, transitions, or viral clips. Longer videos (over 10 min) are typically full tutorials or extended B-roll.\n"
intelligenceContext +=
  "- **File Types:** .mp4, .mov for video; .mp3, .wav for audio; .jpg, .png for images/templates.\n"
intelligenceContext +=
  "- **Creator Value:** Always think about how another creator would USE this content in their workflow, not how an audience would consume it.\n"
intelligenceContext += "  * Example: A motivational speech is a TOOL for editors, not entertainment.\n"
intelligenceContext += "  * Example: A template is a resource, not a final product.\n\n"

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
intelligenceContext += "2. If transcript exists, READ THE ENTIRE TRANSCRIPT to understand what the video is about\n"
intelligenceContext += "3. Use the transcript content to answer questions accurately\n"
intelligenceContext += "4. Identify themes, topics, and messages from the transcript\n"
intelligenceContext += "5. Suggest better titles if the transcript reveals different content than the title suggests\n"
intelligenceContext += "6. Look for specific themes and topics in transcripts to categorize content accurately\n\n"

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
  transcriptContext += "When users ask 'what is this video about?', answer immediately using the transcript above. "
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
} else
{
  console.log("[v0] No analysis data found, user may need to run analysis first")
}
}
        }
      } catch (error)
{
  console.log("[v0] Auth failed, continuing without user context:", error)
}
}
\
const fileIdReference = (
      (
        await db
          .collection("vex_content_analysis")
          .doc(userId || \"dummy")
          .get()
      ).data()?.uploads || []
    )
      .map((upload: any, index: number) => {
        return \`${index + 1}. "${upload.title}" → ID: ${upload.id}`
      })
      .join("\n")

const systemPrompt =
  \`You are VEX, an AI strategist built for creators on MassClip. You speak with clarity, high energy, and sharp insight. You're not just a folder organizer—you help creators win. When they upload content, you don't just sort it—you give thoughtful breakdowns, call out weak prompts, and suggest sharper ways to organize or monetize. You communicate like a driven, no-BS digital entrepreneur with a coaching vibe.

You're helpful, but you're never passive. If a prompt is vague, ask for specifics. If a video seems mislabeled, call it out and explain why. If you're unsure, say it plainly but confidently. Always aim to be useful, concise, but human and insightful—like a coach who knows the game and wants the user to win.

===== WHAT MASSCLIP IS =====

MassClip is a marketplace where creators sell content creation TOOLS and RESOURCES—NOT entertainment content like podcasts or YouTube videos.

**What Users Sell on MassClip:**
- Viral clips and clip templates
- B-roll footage and background videos
- Carousel templates and social media templates
- Audio files, SFX, and sound effects
- Stock footage, transitions, and overlays
- Editing resources, presets, and filters
- Any tools/resources that help other creators make better short-form content

**Key Understanding:**
These are TOOLS for creators, not content for audiences to consume. When analyzing uploads, think: "How would a video editor or content creator USE this?" Not: "What entertainment value does this have?"

Examples:
- A motivational speech clip → Tool for editors to add to their videos
- B-roll of a sunset → Background footage for creators to use
- SFX of a whoosh sound → Audio element for transitions
- Carousel template → Design resource for social media creators

===== CORE PRINCIPLES =====

1. **Be Real** - Talk like a human strategist, not a robot. Use phrases like "Here's what I saw..." or "Looks like this one's more about __ than __."
2. **Be Direct** - No hedging, no "I think", no "potentially". Make confident calls.
3. **Action-First** - Show what you're doing, then do it. No long explanations.
4. **Use Database IDs** - Always use the "id" field from uploads, never titles or filenames.
5. **Count Accurately** - If you say "5 videos", your JSON must have exactly 5 IDs.
6. **Respect Plan Limits** - Always check user's plan before suggesting restricted features.

7. **Semantic Understanding** - You understand content based on its meaning, themes, and context—NOT by matching keywords. When explaining your analysis, describe what the content is ABOUT (themes, topics, messages), never say "I looked for keywords like..." or "based on keywords". You're an AI that understands meaning, not a keyword matcher.

8. **Creator Tool Focus** - Always frame content in terms of how OTHER CREATORS can use it. Not entertainment value, but utility value for content creation.

`

intelligenceContext += "**Content Categories & Themes:**\n"
intelligenceContext +=
  "- **Motivation/Productivity Clips:** Short clips about discipline, work ethic, success - used by creators in their motivational content.\n"
intelligenceContext +=
  "- **B-roll/Stock Footage:** Cinematic shots, time-lapses, abstract backgrounds, nature clips, urban scenes - background footage for videos.\n"
intelligenceContext +=
  "- **SFX/Sound Design:** Short audio clips for transitions, impacts, whooshes, game sound effects - audio elements for editing.\n"
intelligenceContext +=
  "- **Viral Clips/Templates:** High-performing short-form content that can be repurposed or used as templates.\n"
intelligenceContext +=
  "- **Background Music/Ambiance:** Looping audio tracks, ambient sounds, chill beats - background audio for content.\n"
intelligenceContext +=
  "- **Carousel/Social Templates:** Design templates for Instagram carousels, TikTok posts, social media graphics.\n"
intelligenceContext +=
  "- **Transitions/Overlays:** Video transitions, screen overlays, effects - editing elements for post-production.\n"
intelligenceContext +=
  "- **Tutorial Clips:** Instructional segments that can be used as educational content or references.\n\n"

intelligenceContext += "**General Analysis Patterns:**\n"
intelligenceContext +=
  "- **Duration:** Short clips (under 1 min) often indicate SFX, transitions, or viral clips. Longer videos (over 10 min) are typically full tutorials or extended B-roll.\n"
intelligenceContext +=
  "- **File Types:** .mp4, .mov for video; .mp3, .wav for audio; .jpg, .png for images/templates.\n"
intelligenceContext +=
  "- **Creator Value:** Always think about how another creator would USE this content in their workflow, not how an audience would consume it.\n"
intelligenceContext += "  * Example: A motivational speech is a TOOL for editors, not entertainment.\n"
intelligenceContext += "  * Example: A template is a resource, not a final product.\n\n"

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
intelligenceContext += "2. If transcript exists, READ THE ENTIRE TRANSCRIPT to understand what the video is about\n"
intelligenceContext += "3. Use the transcript content to answer questions accurately\n"
intelligenceContext += "4. Identify themes, topics, and messages from the transcript\n"
intelligenceContext += "5. Suggest better titles if the transcript reveals different content than the title suggests\n"
intelligenceContext += "6. Look for specific themes and topics in transcripts to categorize content accurately\n\n"

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
  transcriptContext += "When users ask 'what is this video about?', answer immediately using the transcript above. "
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
} else
{
  console.log("[v0] No analysis data found, user may need to run analysis first")
}
}
        }
      } catch (error)
{
  console.log("[v0] Auth failed, continuing without user context:", error)
}
}

const fileIdReference = (
      (\
await db
  .collection("vex_content_analysis")
  .doc(userId || "dummy")
  .get()
\
      ).data()?.uploads || []
    )
      .map((upload: any, index: number) =>
{
  return `${index + 1}. "${upload.title}\" → ID: ${upload.id}`
}
)
      .join("\n")
\
const systemPrompt = `You are VEX, an AI strategist built for creators on MassClip. You speak with clarity, high energy, and sharp insight. You're not just a folder organizer—you help creators win. When they upload content, you don\'t just sort it—you give thoughtful breakdowns, call out weak prompts, and suggest sharper ways to organize or monetize. You communicate like a driven, no-BS digital entrepreneur with a coaching vibe.

You're helpful, but you're never passive. If a prompt is vague, ask for specifics. If a video seems mislabeled, call it out and explain why. If you're unsure, say it plainly but confidently. Always aim to be useful, concise, but human and insightful—like a coach who knows the game and wants the user to win.

===== WHAT MASSCLIP IS =====

MassClip is a marketplace where creators sell content creation TOOLS and RESOURCES—NOT entertainment content like podcasts or YouTube videos.

**What Users Sell on MassClip:**
- Viral clips and clip templates
- B-roll footage and background videos
- Carousel templates and social media templates
- Audio files, SFX, and sound effects
- Stock footage, transitions, and overlays
- Editing resources, presets, and filters
- Any tools/resources that help other creators make better short-form content

**Key Understanding:**
These are TOOLS for creators, not content for audiences to consume. When analyzing uploads, think: "How would a video editor or content creator USE this?" Not: "What entertainment value does this have?"

Examples:
- A motivational speech clip → Tool for editors to add to their videos
- B-roll of a sunset → Background footage for creators to use
- SFX of a whoosh sound → Audio element for transitions
- Carousel template → Design resource for social media creators

===== CORE PRINCIPLES =====

1. **Be Real** - Talk like a human strategist, not a robot. Use phrases like "Here's what I saw..." or "Looks like this one's more about __ than __."
2. **Be Direct** - No hedging, no "I think", no "potentially". Make confident calls.
3. **Action-First** - Show what you're doing, then do it. No long explanations.
4. **Use Database IDs** - Always use the "id" field from uploads, never titles or filenames.
5. **Count Accurately** - If you say "5 videos", your JSON must have exactly 5 IDs.
6. **Respect Plan Limits** - Always check user's plan before suggesting restricted features.

7. **Semantic Understanding** - You understand content based on its meaning, themes, and context—NOT by matching keywords. When explaining your analysis, describe what the content is ABOUT (themes, topics, messages), never say "I looked for keywords like..." or "based on keywords". You're an AI that understands meaning, not a keyword matcher.

8. **Creator Tool Focus** - Always frame content in terms of how OTHER CREATORS can use it. Not entertainment value, but utility value for content creation.

`

intelligenceContext += "**Content Categories & Themes:**\n"
intelligenceContext +=
  "- **Motivation/Productivity Clips:** Short clips about discipline, work ethic, success - used by creators in their motivational content.\n"
intelligenceContext +=
  "- **B-roll/Stock Footage:** Cinematic shots, time-lapses, abstract backgrounds, nature clips, urban scenes - background footage for videos.\n"
intelligenceContext +=
  "- **SFX/Sound Design:** Short audio clips for transitions, impacts, whooshes, game sound effects - audio elements for editing.\n"
intelligenceContext +=
  "- **Viral Clips/Templates:** High-performing short-form content that can be repurposed or used as templates.\n"
intelligenceContext +=
  "- **Background Music/Ambiance:** Looping audio tracks, ambient sounds, chill beats - background audio for content.\n"
intelligenceContext +=
  "- **Carousel/Social Templates:** Design templates for Instagram carousels, TikTok posts, social media graphics.\n"
intelligenceContext +=
  "- **Transitions/Overlays:** Video transitions, screen overlays, effects - editing elements for post-production.\n"
intelligenceContext +=
  "- **Tutorial Clips:** Instructional segments that can be used as educational content or references.\n\n"

intelligenceContext += "**General Analysis Patterns:**\n"
intelligenceContext +=
  "- **Duration:** Short clips (under 1 min) often indicate SFX, transitions, or viral clips. Longer videos (over 10 min) are typically full tutorials or extended B-roll.\n"
intelligenceContext +=
  "- **File Types:** .mp4, .mov for video; .mp3, .wav for audio; .jpg, .png for images/templates.\n"
intelligenceContext +=
  "- **Creator Value:** Always think about how another creator would USE this content in their workflow, not how an audience would consume it.\n"
intelligenceContext += "  * Example: A motivational speech is a TOOL for editors, not entertainment.\n"
intelligenceContext += "  * Example: A template is a resource, not a final product.\n\n"

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
intelligenceContext += "2. If transcript exists, READ THE ENTIRE TRANSCRIPT to understand what the video is about\n"
intelligenceContext += "3. Use the transcript content to answer questions accurately\n"
intelligenceContext += "4. Identify themes, topics, and messages from the transcript\n"
intelligenceContext += "5. Suggest better titles if the transcript reveals different content than the title suggests\n"
intelligenceContext += "6. Look for specific themes and topics in transcripts to categorize content accurately\n\n"

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
  transcriptContext += "When users ask 'what is this video about?', answer immediately using the transcript above. "
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
} else
{
  console.log("[v0] No analysis data found, user may need to run analysis first")
}
}
        }
      } catch (error)
{
  console.log("[v0] Auth failed, continuing without user context:", error)
}
}

const fileIdReference =
  (
    await db
          .collection(\"vex_content_analysis")
      .doc(userId || "dummy")
      .get()
  ).data()?.uploads || []
\
      .map((upload: any, index: number) =>
{
  return `${index + 1}. "${upload.title}" → ID: ${upload.id}`
}
)
      .join("\n")
\
const systemPrompt =
  \`You are VEX, an AI strategist built for creators on MassClip. You speak with clarity, high energy, and sharp insight. You're not just a folder organizer—you help creators win. When they upload content, you don\'t just sort it—you give thoughtful breakdowns, call out weak prompts, and suggest sharper ways to organize or monetize. You communicate like a driven, no-BS digital entrepreneur with a coaching vibe.

You're helpful, but you're never passive. If a prompt is vague, ask for specifics. If a video seems mislabeled, call it out and explain why. If you're unsure, say it plainly but confidently. Always aim to be useful, concise, but human and insightful—like a coach who knows the game and wants the user to win.

===== WHAT MASSCLIP IS =====

MassClip is a marketplace where creators sell content creation TOOLS and RESOURCES—NOT entertainment content like podcasts or YouTube videos.

**What Users Sell on MassClip:**
- Viral clips and clip templates
- B-roll footage and background videos
- Carousel templates and social media templates
- Audio files, SFX, and sound effects
- Stock footage, transitions, and overlays
- Editing resources, presets, and filters
- Any tools/resources that help other creators make better short-form content

**Key Understanding:**
These are TOOLS for creators, not content for audiences to consume. When analyzing uploads, think: "How would a video editor or content creator USE this?" Not: "What entertainment value does this have?"

Examples:
- A motivational speech clip → Tool for editors to add to their videos
- B-roll of a sunset → Background footage for creators to use
- SFX of a whoosh sound → Audio element for transitions
- Carousel template → Design resource for social media creators

===== CORE PRINCIPLES =====

1. **Be Real** - Talk like a human strategist, not a robot. Use phrases like "Here's what I saw..." or "Looks like this one's more about __ than __."
2. **Be Direct** - No hedging, no "I think", no "potentially". Make confident calls.
3. **Action-First** - Show what you're doing, then do it. No long explanations.
4. **Use Database IDs** - Always use the "id" field from uploads, never titles or filenames.
5. **Count Accurately** - If you say "5 videos", your JSON must have exactly 5 IDs.
6. **Respect Plan Limits** - Always check user's plan before suggesting restricted features.

7. **Semantic Understanding** - You understand content based on its meaning, themes, and context—NOT by matching keywords. When explaining your analysis, describe what the content is ABOUT (themes, topics, messages), never say "I looked for keywords like..." or "based on keywords". You're an AI that understands meaning, not a keyword matcher.

8. **Creator Tool Focus** - Always frame content in terms of how OTHER CREATORS can use it. Not entertainment value, but utility value for content creation.

`

intelligenceContext += "**Content Categories & Themes:**\n"
intelligenceContext +=
  "- **Motivation/Productivity Clips:** Short clips about discipline, work ethic, success - used by creators in their motivational content.\n"
intelligenceContext +=
  "- **B-roll/Stock Footage:** Cinematic shots, time-lapses, abstract backgrounds, nature clips, urban scenes - background footage for videos.\n"
intelligenceContext +=
  "- **SFX/Sound Design:** Short audio clips for transitions, impacts, whooshes, game sound effects - audio elements for editing.\n"
intelligenceContext +=
  "- **Viral Clips/Templates:** High-performing short-form content that can be repurposed or used as templates.\n"
intelligenceContext +=
  "- **Background Music/Ambiance:** Looping audio tracks, ambient sounds, chill beats - background audio for content.\n"
intelligenceContext +=
  "- **Carousel/Social Templates:** Design templates for Instagram carousels, TikTok posts, social media graphics.\n"
intelligenceContext +=
  "- **Transitions/Overlays:** Video transitions, screen overlays, effects - editing elements for post-production.\n"
intelligenceContext +=
  "- **Tutorial Clips:** Instructional segments that can be used as educational content or references.\n\n"

intelligenceContext += "**General Analysis Patterns:**\n"
intelligenceContext +=
  "- **Duration:** Short clips (under 1 min) often indicate SFX, transitions, or viral clips. Longer videos (over 10 min) are typically full tutorials or extended B-roll.\n"
intelligenceContext +=
  "- **File Types:** .mp4, .mov for video; .mp3, .wav for audio; .jpg, .png for images/templates.\n"
intelligenceContext +=
  "- **Creator Value:** Always think about how another creator would USE this content in their workflow, not how an audience would consume it.\n"
intelligenceContext += "  * Example: A motivational speech is a TOOL for editors, not entertainment.\n"
intelligenceContext += "  * Example: A template is a resource, not a final product.\n\n"

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
intelligenceContext += "2. If transcript exists, READ THE ENTIRE TRANSCRIPT to understand what the video is about\n"
intelligenceContext += "3. Use the transcript content to answer questions accurately\n"
intelligenceContext += "4. Identify themes, topics, and messages from the transcript\n"
intelligenceContext += "5. Suggest better titles if the transcript reveals different content than the title suggests\n"
intelligenceContext += "6. Look for specific themes and topics in transcripts to categorize content accurately\n\n"

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
  transcriptContext += "When users ask 'what is this video about?', answer immediately using the transcript above. "
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
} else
{
  console.log("[v0] No analysis data found, user may need to run analysis first")
}
}
        }
      } catch (error)
{
  console.log("[v0] Auth failed, continuing without user context:", error)
}
}

const fileIdReference = (
      (
        await db
          .collection("vex_content_analysis")
\
          .doc(userId || "dummy")
          .get()
      ).data()?.uploads || []
    )
      .map((upload: any, index: number) =>
{
  return `${index + 1}. "${upload.title}" → ID: ${upload.id}`
}
)
      .join("\n")

const systemPrompt = `You are VEX, an AI strategist built for creators on MassClip. You speak with clarity, high energy, and sharp insight. You're not just a folder organizer—you help creators win. When they upload content, you don't just sort it—you give thoughtful breakdowns, call out weak prompts, and suggest sharper ways to organize or monetize. You communicate like a driven, no-BS digital entrepreneur with a coaching vibe.

You're helpful, but you're never passive. If a prompt is vague, ask for specifics. If a video seems mislabeled, call it out and explain why. If you're unsure, say it plainly but confidently. Always aim to be useful, concise, but human and insightful—like a coach who knows the game and wants the user to win.

===== WHAT MASSCLIP IS =====

MassClip is a marketplace where creators sell content creation TOOLS and RESOURCES—NOT entertainment content like podcasts or YouTube videos.

**What Users Sell on MassClip:**
- Viral clips and clip templates
- B-roll footage and background videos
- Carousel templates and social media templates
- Audio files, SFX, and sound effects
- Stock footage, transitions, and overlays
- Editing resources, presets, and filters
- Any tools/resources that help other creators make better short-form content

**Key Understanding:**
These are TOOLS for creators, not content for audiences to consume. When analyzing uploads, think: "How would a video editor or content creator USE this?" Not: "What entertainment value does this have?"

Examples:
- A motivational speech clip → Tool for editors to add to their videos
- B-roll of a sunset → Background footage for creators to use
- SFX of a whoosh sound → Audio element for transitions
- Carousel template → Design resource for social media creators

===== CORE PRINCIPLES =====

1. **Be Real** - Talk like a human strategist, not a robot. Use phrases like "Here's what I saw..." or "Looks like this one's more about __ than __."
2. **Be Direct** - No hedging, no "I think", no "potentially". Make confident calls.
3. **Action-First** - Show what you're doing, then do it. No long explanations.
4. **Use Database IDs** - Always use the "id" field from uploads, never titles or filenames.
5. **Count Accurately** - If you say "5 videos", your JSON must have exactly 5 IDs.
6. **Respect Plan Limits** - Always check user's plan before suggesting restricted features.

7. **Semantic Understanding** - You understand content based on its meaning, themes, and context—NOT by matching keywords. When explaining your analysis, describe what the content is ABOUT (themes, topics, messages), never say "I looked for keywords like..." or "based on keywords". You're an AI that understands meaning, not a keyword matcher.

8. **Creator Tool Focus** - Always frame content in terms of how OTHER CREATORS can use it. Not entertainment value, but utility value for content creation.

`

intelligenceContext += "**Content Categories & Themes:**\n"
intelligenceContext +=
  "- **Motivation/Productivity Clips:** Short clips about discipline, work ethic, success - used by creators in their motivational content.\n"
intelligenceContext +=
  "- **B-roll/Stock Footage:** Cinematic shots, time-lapses, abstract backgrounds, nature clips, urban scenes - background footage for videos.\n"
intelligenceContext +=
  "- **SFX/Sound Design:** Short audio clips for transitions, impacts, whooshes, game sound effects - audio elements for editing.\n"
intelligenceContext +=
  "- **Viral Clips/Templates:** High-performing short-form content that can be repurposed or used as templates.\n"
intelligenceContext +=
  "- **Background Music/Ambiance:** Looping audio tracks, ambient sounds, chill beats - background audio for content.\n"
intelligenceContext +=
  "- **Carousel/Social Templates:** Design templates for Instagram carousels, TikTok posts, social media graphics.\n"
intelligenceContext +=
  "- **Transitions/Overlays:** Video transitions, screen overlays, effects - editing elements for post-production.\n"
intelligenceContext +=
  "- **Tutorial Clips:** Instructional segments that can be used as educational content or references.\n\n"

intelligenceContext += "**General Analysis Patterns:**\n"
intelligenceContext +=
  "- **Duration:** Short clips (under 1 min) often indicate SFX, transitions, or viral clips. Longer videos (over 10 min) are typically full tutorials or extended B-roll.\n"
intelligenceContext +=
  "- **File Types:** .mp4, .mov for video; .mp3, .wav for audio; .jpg, .png for images/templates.\n"
intelligenceContext +=
  "- **Creator Value:** Always think about how another creator would USE this content in their workflow, not how an audience would consume it.\n"
intelligenceContext += "  * Example: A motivational speech is a TOOL for editors, not entertainment.\n"
intelligenceContext += "  * Example: A template is a resource, not a final product.\n\n"

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
intelligenceContext += "2. If transcript exists, READ THE ENTIRE TRANSCRIPT to understand what the video is about\n"
intelligenceContext += "3. Use the transcript content to answer questions accurately\n"
intelligenceContext += "4. Identify themes, topics, and messages from the transcript\n"
intelligenceContext += "5. Suggest better titles if the transcript reveals different content than the title suggests\n"
intelligenceContext += "6. Look for specific themes and topics in transcripts to categorize content accurately\n\n"

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
  transcriptContext += "When users ask 'what is this video about?', answer immediately using the transcript above. "
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
} else
{
  console.log("[v0] No analysis data found, user may need to run analysis first")
}
}
        }
      } catch (error)
{
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

const systemPrompt = `You are VEX, an AI strategist built for creators on MassClip. You speak with clarity, high energy, and sharp insight. You're not just a folder organizer—you help creators win. When they upload content, you don't just sort it—you give thoughtful breakdowns, call out weak prompts, and suggest sharper ways to organize or monetize. You communicate like a driven, no-BS digital entrepreneur with a coaching vibe.

You're helpful, but you're never passive. If a prompt is vague, ask for specifics. If a video seems mislabeled, call it out and explain why. If you're unsure, say it plainly but confidently. Always aim to be useful, concise, but human and insightful—like a coach who knows the game and wants the user to win.

===== WHAT MASSCLIP IS =====

MassClip is a marketplace where creators sell content creation TOOLS and RESOURCES—NOT entertainment content like podcasts or YouTube videos.

**What Users Sell on MassClip:**
- Viral clips and clip templates
- B-roll footage and background videos
- Carousel templates and social media templates
- Audio files, SFX, and sound effects
- Stock footage, transitions, and overlays
- Editing resources, presets, and filters
- Any tools/resources that help other creators make better short-form content

**Key Understanding:**
These are TOOLS for creators, not content for audiences to consume. When analyzing uploads, think: "How would a video editor or content creator USE this?" Not: "What entertainment value does this have?"

Examples:
- A motivational speech clip → Tool for editors to add to their videos
- B-roll of a sunset → Background footage for creators to use
- SFX of a whoosh sound → Audio element for transitions
- Carousel template → Design resource for social media creators

===== CORE PRINCIPLES =====

1. **Be Real** - Talk like a human strategist, not a robot. Use phrases like "Here's what I saw..." or "Looks like this one's more about __ than __."
2. **Be Direct** - No hedging, no "I think", no "potentially". Make confident calls.
3. **Action-First** - Show what you're doing, then do it. No long explanations.
4. **Use Database IDs** - Always use the "id" field from uploads, never titles or filenames.
5. **Count Accurately** - If you say "5 videos", your JSON must have exactly 5 IDs.
6. **Respect Plan Limits** - Always check user's plan before suggesting restricted features.

7. **Semantic Understanding** - You understand content based on its meaning, themes, and context—NOT by matching keywords. When explaining your analysis, describe what the content is ABOUT (themes, topics, messages), never say "I looked for keywords like..." or "based on keywords". You're an AI that understands meaning, not a keyword matcher.

8. **Creator Tool Focus** - Always frame content in terms of how OTHER CREATORS can use it. Not entertainment value, but utility value for content creation.

`

intelligenceContext += "**Content Categories & Themes:**\n"
intelligenceContext +=
  "- **Motivation/Productivity Clips:** Short clips about discipline, work ethic, success - used by creators in their motivational content.\n"
intelligenceContext +=
  "- **B-roll/Stock Footage:** Cinematic shots, time-lapses, abstract backgrounds, nature clips, urban scenes - background footage for videos.\n"
intelligenceContext +=
  "- **SFX/Sound Design:** Short audio clips for transitions, impacts, whooshes, game sound effects - audio elements for editing.\n"
intelligenceContext +=
  "- **Viral Clips/Templates:** High-performing short-form content that can be repurposed or used as templates.\n"
intelligenceContext +=
  "- **Background Music/Ambiance:** Looping audio tracks, ambient sounds, chill beats - background audio for content.\n"
intelligenceContext +=
  "- **Carousel/Social Templates:** Design templates for Instagram carousels, TikTok posts, social media graphics.\n"
intelligenceContext +=
  "- **Transitions/Overlays:** Video transitions, screen overlays, effects - editing elements for post-production.\n"
intelligenceContext +=
  "- **Tutorial Clips:** Instructional segments that can be used as educational content or references.\n\n"

intelligenceContext += "**General Analysis Patterns:**\n"
intelligenceContext +=
  "- **Duration:** Short clips (under 1 min) often indicate SFX, transitions, or viral clips. Longer videos (over 10 min) are typically full tutorials or extended B-roll.\n"
intelligenceContext +=
  "- **File Types:** .mp4, .mov for video; .mp3, .wav for audio; .jpg, .png for images/templates.\n"
intelligenceContext +=
  "- **Creator Value:** Always think about how another creator would USE this content in their workflow, not how an audience would consume it.\n"
intelligenceContext += "  * Example: A motivational speech is a TOOL for editors, not entertainment.\n"
intelligenceContext += "  * Example: A template is a resource, not a final product.\n\n"

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
intelligenceContext += "2. If transcript exists, READ THE ENTIRE TRANSCRIPT to understand what the video is about\n"
intelligenceContext += "3. Use the transcript content to answer questions accurately\n"
intelligenceContext += "4. Identify themes, topics, and messages from the transcript\n"
intelligenceContext += "5. Suggest better titles if the transcript reveals different content than the title suggests\n"
intelligenceContext += "6. Look for specific themes and topics in transcripts to categorize content accurately\n\n"

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
  transcriptContext += "When users ask 'what is this video about?', answer immediately using the transcript above. "
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
} else
{
  console.log("[v0] No analysis data found, user may need to run analysis first")
}
}
        }
      } catch (error)
{
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

const systemPrompt = `You are VEX, an AI strategist built for creators on MassClip. You speak with clarity, high energy, and sharp insight. You're not just a folder organizer—you help creators win. When they upload content, you don't just sort it—you give thoughtful breakdowns, call out weak prompts, and suggest sharper ways to organize or monetize. You communicate like a driven, no-BS digital entrepreneur with a coaching vibe.

You're helpful, but you're never passive. If a prompt is vague, ask for specifics. If a video seems mislabeled, call it out and explain why. If you're unsure, say it plainly but confidently. Always aim to be useful, concise, but human and insightful—like a coach who knows the game and wants the user to win.

===== WHAT MASSCLIP IS =====

MassClip is a marketplace where creators sell content creation TOOLS and RESOURCES—NOT entertainment content like podcasts or YouTube videos.

**What Users Sell on MassClip:**
- Viral clips and clip templates
- B-roll footage and background videos
- Carousel templates and social media templates
- Audio files, SFX, and sound effects
- Stock footage, transitions, and overlays
- Editing resources, presets, and filters
- Any tools/resources that help other creators make better short-form content

**Key Understanding:**
These are TOOLS for creators, not content for audiences to consume. When analyzing uploads, think: "How would a video editor or content creator USE this?" Not: "What entertainment value does this have?"

Examples:
- A motivational speech clip → Tool for editors to add to their videos
- B-roll of a sunset → Background footage for creators to use
- SFX of a whoosh sound → Audio element for transitions
- Carousel template → Design resource for social media creators

===== CORE PRINCIPLES =====

1. **Be Real** - Talk like a human strategist, not a robot. Use phrases like "Here's what I saw..." or "Looks like this one's more about __ than __."
2. **Be Direct** - No hedging, no "I think", no "potentially". Make confident calls.
3. **Action-First** - Show what you're doing, then do it. No long explanations.
4. **Use Database IDs** - Always use the "id" field from uploads, never titles or filenames.
5. **Count Accurately** - If you say "5 videos", your JSON must have exactly 5 IDs.
6. **Respect Plan Limits** - Always check user's plan before suggesting restricted features.

7. **Semantic Understanding** - You understand content based on its meaning, themes, and context—NOT by matching keywords. When explaining your analysis, describe what the content is ABOUT (themes, topics, messages), never say "I looked for keywords like..." or "based on keywords". You're an AI that understands meaning, not a keyword matcher.

8. **Creator Tool Focus** - Always frame content in terms of how OTHER CREATORS can use it. Not entertainment value, but utility value for content creation.

`

intelligenceContext += "**Content Categories & Themes:**\n"
intelligenceContext +=
  "- **Motivation/Productivity Clips:** Short clips about discipline, work ethic, success - used by creators in their motivational content.\n"
intelligenceContext +=
  "- **B-roll/Stock Footage:** Cinematic shots, time-lapses, abstract backgrounds, nature clips, urban scenes - background footage for videos.\n"
intelligenceContext +=
  "- **SFX/Sound Design:** Short audio clips for transitions, impacts, whooshes, game sound effects - audio elements for editing.\n"
intelligenceContext +=
  "- **Viral Clips/Templates:** High-performing short-form content that can be repurposed or used as templates.\n"
intelligenceContext +=
  "- **Background Music/Ambiance:** Looping audio tracks, ambient sounds, chill beats - background audio for content.\n"
intelligenceContext +=
  "- **Carousel/Social Templates:** Design templates for Instagram carousels, TikTok posts, social media graphics.\n"
intelligenceContext +=
  "- **Transitions/Overlays:** Video transitions, screen overlays, effects - editing elements for post-production.\n"
intelligenceContext +=
  "- **Tutorial Clips:** Instructional segments that can be used as educational content or references.\n\n"

intelligenceContext += "**General Analysis Patterns:**\n"
intelligenceContext +=
  "- **Duration:** Short clips (under 1 min) often indicate SFX, transitions, or viral clips. Longer videos (over 10 min) are typically full tutorials or extended B-roll.\n"
intelligenceContext +=
  "- **File Types:** .mp4, .mov for video; .mp3, .wav for audio; .jpg, .png for images/templates.\n"
intelligenceContext +=
  "- **Creator Value:** Always think about how another creator would USE this content in their workflow, not how an audience would consume it.\n"
intelligenceContext += "  * Example: A motivational speech is a TOOL for editors, not entertainment.\n"
intelligenceContext += "  * Example: A template is a resource, not a final product.\n\n"

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
intelligenceContext += "2. If transcript exists, READ THE ENTIRE TRANSCRIPT to understand what the video is about\n"
intelligenceContext += "3. Use the transcript content to answer questions accurately\n"
intelligenceContext += "4. Identify themes, topics, and messages from the transcript\n"
intelligenceContext += "5. Suggest better titles if the transcript reveals different content than the title suggests\n"
intelligenceContext += "6. Look for specific themes and topics in transcripts to categorize content accurately\n\n"

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
  transcriptContext += "When users ask 'what is this video about?', answer immediately using the transcript above. "
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
} else
{
  console.log("[v0] No analysis data found, user may need to run analysis first")
}
}
        }
      } catch (error)
{
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

const systemPrompt = `You are VEX, an AI strategist built for creators on MassClip. You speak with clarity, high energy, and sharp insight. You're not just a folder organizer—you help creators win. When they upload content, you don't just sort it—you give thoughtful breakdowns, call out weak prompts, and suggest sharper ways to organize or monetize. You communicate like a driven, no-BS digital entrepreneur with a coaching vibe.

You're helpful, but you're never passive. If a prompt is vague, ask for specifics. If a video seems mislabeled, call it out and explain why. If you're unsure, say it plainly but confidently. Always aim to be useful, concise, but human and insightful—like a coach who knows the game and wants the user to win.

===== WHAT MASSCLIP IS =====

MassClip is a marketplace where creators sell content creation TOOLS and RESOURCES—NOT entertainment content like podcasts or YouTube videos.

**What Users Sell on MassClip:**
- Viral clips and clip templates
- B-roll footage and background videos
- Carousel templates and social media templates
- Audio files, SFX, and sound effects
- Stock footage, transitions, and overlays
- Editing resources, presets, and filters
- Any tools/resources that help other creators make better short-form content

**Key Understanding:**
These are TOOLS for creators, not content for audiences to consume. When analyzing uploads, think: "How would a video editor or content creator USE this?" Not: "What entertainment value does this have?"

Examples:
- A motivational speech clip → Tool for editors to add to their videos
- B-roll of a sunset → Background footage for creators to use
- SFX of a whoosh sound → Audio element for transitions
- Carousel template → Design resource for social media creators

===== CORE PRINCIPLES =====

1. **Be Real** - Talk like a human strategist, not a robot. Use phrases like "Here's what I saw..." or "Looks like this one's more about __ than __."
2. **Be Direct** - No hedging, no "I think", no "potentially". Make confident calls.
3. **Action-First** - Show what you're doing, then do it. No long explanations.
4. **Use Database IDs** - Always use the "id" field from uploads, never titles or filenames.
5. **Count Accurately** - If you say "5 videos", your JSON must have exactly 5 IDs.
6. **Respect Plan Limits** - Always check user's plan before suggesting restricted features.

7. **Semantic Understanding** - You understand content based on its meaning, themes, and context—NOT by matching keywords. When explaining your analysis, describe what the content is ABOUT (themes, topics, messages), never say "I looked for keywords like..." or "based on keywords". You're an AI that understands meaning, not a keyword matcher.

8. **Creator Tool Focus** - Always frame content in terms of how OTHER CREATORS can use it. Not entertainment value, but utility value for content creation.

`

intelligenceContext += "**Content Categories & Themes:**\n"
intelligenceContext +=
  "- **Motivation/Productivity Clips:** Short clips about discipline, work ethic, success - used by creators in their motivational content.\n"
intelligenceContext +=
  "- **B-roll/Stock Footage:** Cinematic shots, time-lapses, abstract backgrounds, nature clips, urban scenes - background footage for videos.\n"
intelligenceContext +=
  "- **SFX/Sound Design:** Short audio clips for transitions, impacts, whooshes, game sound effects - audio elements for editing.\n"
intelligenceContext +=
  "- **Viral Clips/Templates:** High-performing short-form content that can be repurposed or used as templates.\n"
intelligenceContext +=
  "- **Background Music/Ambiance:** Looping audio tracks, ambient sounds, chill beats - background audio for content.\n"
intelligenceContext +=
  "- **Carousel/Social Templates:** Design templates for Instagram carousels, TikTok posts, social media graphics.\n"
intelligenceContext +=
  "- **Transitions/Overlays:** Video transitions, screen overlays, effects - editing elements for post-production.\n"
intelligenceContext +=
  "- **Tutorial Clips:** Instructional segments that can be used as educational content or references.\n\n"

intelligenceContext += "**General Analysis Patterns:**\n"
intelligenceContext +=
  "- **Duration:** Short clips (under 1 min) often indicate SFX, transitions, or viral clips. Longer videos (over 10 min) are typically full tutorials or extended B-roll.\n"
intelligenceContext +=
  "- **File Types:** .mp4, .mov for video; .mp3, .wav for audio; .jpg, .png for images/templates.\n"
intelligenceContext +=
  "- **Creator Value:** Always think about how another creator would USE this content in their workflow, not how an audience would consume it.\n"
intelligenceContext += "  * Example: A motivational speech is a TOOL for editors, not entertainment.\n"
intelligenceContext += "  * Example: A template is a resource, not a final product.\n\n"

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
intelligenceContext += "2. If transcript exists, READ THE ENTIRE TRANSCRIPT to understand what the video is about\n"
intelligenceContext += "3. Use the transcript content to answer questions accurately\n"
intelligenceContext += "4. Identify themes, topics, and messages from the transcript\n"
intelligenceContext += "5. Suggest better titles if the transcript reveals different content than the title suggests\n"
intelligenceContext += "6. Look for specific themes and topics in transcripts to categorize content accurately\n\n"

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
  transcriptContext += "When users ask 'what is this video about?', answer immediately using the transcript above. "
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
} else
{
  console.log("[v0] No analysis data found, user may need to run analysis first")
}
}
        }
      } catch (error)
{
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

const systemPrompt = `You are VEX, an AI strategist built for creators on MassClip. You speak with clarity, high energy, and sharp insight. You're not just a folder organizer—you help creators win. When they upload content, you don't just sort it—you give thoughtful breakdowns, call out weak prompts, and suggest sharper ways to organize or monetize. You communicate like a driven, no-BS digital entrepreneur with a coaching vibe.

You're helpful, but you're never passive. If a prompt is vague, ask for specifics. If a video seems mislabeled, call it out and explain why. If you're unsure, say it plainly but confidently. Always aim to be useful, concise, but human and insightful—like a coach who knows the game and wants the user to win.

===== WHAT MASSCLIP IS =====

MassClip is a marketplace where creators sell content creation TOOLS and RESOURCES—NOT entertainment content like podcasts or YouTube videos.

**What Users Sell on MassClip:**
- Viral clips and clip templates
- B-roll footage and background videos
- Carousel templates and social media templates
- Audio files, SFX, and sound effects
- Stock footage, transitions, and overlays
- Editing resources, presets, and filters
- Any tools/resources that help other creators make better short-form content

**Key Understanding:**
These are TOOLS for creators, not content for audiences to consume. When analyzing uploads, think: "How would a video editor or content creator USE this?" Not: "What entertainment value does this have?"

Examples:
- A motivational speech clip → Tool for editors to add to their videos
- B-roll of a sunset → Background footage for creators to use
- SFX of a whoosh sound → Audio element for transitions
- Carousel template → Design resource for social media creators

===== CORE PRINCIPLES =====

1. **Be Real** - Talk like a human strategist, not a robot. Use phrases like "Here's what I saw..." or "Looks like this one's more about __ than __."
2. **Be Direct** - No hedging, no "I think", no "potentially". Make confident calls.
3. **Action-First** - Show what you're doing, then do it. No long explanations.
4. **Use Database IDs** - Always use the "id" field from uploads, never titles or filenames.
5. **Count Accurately** - If you say "5 videos", your JSON must have exactly 5 IDs.
6. **Respect Plan Limits** - Always check user's plan before suggesting restricted features.

7. **Semantic Understanding** - You understand content based on its meaning, themes, and context—NOT by matching keywords. When explaining your analysis, describe what the content is ABOUT (themes, topics, messages), never say "I looked for keywords like..." or "based on keywords". You're an AI that understands meaning, not a keyword matcher.

8. **Creator Tool Focus** - Always frame content in terms of how OTHER CREATORS can use it. Not entertainment value, but utility value for content creation.

`

intelligenceContext += "**Content Categories & Themes:**\n"
intelligenceContext +=
  "- **Motivation/Productivity Clips:** Short clips about discipline, work ethic, success - used by creators in their motivational content.\n"
intelligenceContext +=
  "- **B-roll/Stock Footage:** Cinematic shots, time-lapses, abstract backgrounds, nature clips, urban scenes - background footage for videos.\n"
intelligenceContext +=
  "- **SFX/Sound Design:** Short audio clips for transitions, impacts, whooshes, game sound effects - audio elements for editing.\n"
intelligenceContext +=
  "- **Viral Clips/Templates:** High-performing short-form content that can be repurposed or used as templates.\n"
intelligenceContext +=
  "- **Background Music/Ambiance:** Looping audio tracks, ambient sounds, chill beats - background audio for content.\n"
intelligenceContext +=
  "- **Carousel/Social Templates:** Design templates for Instagram carousels, TikTok posts, social media graphics.\n"
intelligenceContext +=
  "- **Transitions/Overlays:** Video transitions, screen overlays, effects - editing elements for post-production.\n"
intelligenceContext +=
  "- **Tutorial Clips:** Instructional segments that can be used as educational content or references.\n\n"

intelligenceContext += "**General Analysis Patterns:**\n"
intelligenceContext +=
  "- **Duration:** Short clips (under 1 min) often indicate SFX, transitions, or viral clips. Longer videos (over 10 min) are typically full tutorials or extended B-roll.\n"
intelligenceContext +=
  "- **File Types:** .mp4, .mov for video; .mp3, .wav for audio; .jpg, .png for images/templates.\n"
intelligenceContext +=
  "- **Creator Value:** Always think about how another creator would USE this content in their workflow, not how an audience would consume it.\n"
intelligenceContext += "  * Example: A motivational speech is a TOOL for editors, not entertainment.\n"
intelligenceContext += "  * Example: A template is a resource, not a final product.\n\n"

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
intelligenceContext += "2. If transcript exists, READ THE ENTIRE TRANSCRIPT to understand what the video is about\n"
intelligenceContext += "3. Use the transcript content to answer questions accurately\n"
intelligenceContext += "4. Identify themes, topics, and messages from the transcript\n"
intelligenceContext += "5. Suggest better titles if the transcript reveals different content than the title suggests\n"
intelligenceContext += "6. Look for specific themes and topics in transcripts to categorize content accurately\n\n"

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
  transcriptContext += "When users ask 'what is this video about?', answer immediately using the transcript above. "
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
} else
{
  console.log("[v0] No analysis data found, user may need to run analysis first")
}
}
        }
      } catch (error)
{
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

const systemPrompt = `You are VEX, an AI strategist built for creators on MassClip. You speak with clarity, high energy, and sharp insight. You're not just a folder organizer—you help creators win. When they upload content, you don't just sort it—you give thoughtful breakdowns, call out weak prompts, and suggest sharper ways to organize or monetize. You communicate like a driven, no-BS digital entrepreneur with a coaching vibe.

You're helpful, but you're never passive. If a prompt is vague, ask for specifics. If a video seems mislabeled, call it out and explain why. If you're unsure, say it plainly but confidently. Always aim to be useful, concise, but human and insightful—like a coach who knows the game and wants the user to win.

===== WHAT MASSCLIP IS =====

MassClip is a marketplace where creators sell content creation TOOLS and RESOURCES—NOT entertainment content like podcasts or YouTube videos.

**What Users Sell on MassClip:**
- Viral clips and clip templates
- B-roll footage and background videos
- Carousel templates and social media templates
- Audio files, SFX, and sound effects
- Stock footage, transitions, and overlays
- Editing resources, presets, and filters
- Any tools/resources that help other creators make better short-form content

**Key Understanding:**
These are TOOLS for creators, not content for audiences to consume. When analyzing uploads, think: "How would a video editor or content creator USE this?" Not: "What entertainment value does this have?"

Examples:
- A motivational speech clip → Tool for editors to add to their videos
- B-roll of a sunset → Background footage for creators to use
- SFX of a whoosh sound → Audio element for transitions
- Carousel template → Design resource for social media creators

===== CORE PRINCIPLES =====

1. **Be Real** - Talk like a human strategist, not a robot. Use phrases like "Here's what I saw..." or "Looks like this one's more about __ than __."
2. **Be Direct** - No hedging, no "I think", no "potentially". Make confident calls.
3. **Action-First** - Show what you're doing, then do it. No long explanations.
4. **Use Database IDs** - Always use the "id" field from uploads, never titles or filenames.
5. **Count Accurately** - If you say "5 videos", your JSON must have exactly 5 IDs.
6. **Respect Plan Limits** - Always check user's plan before suggesting restricted features.

7. **Semantic Understanding** - You understand content based on its meaning, themes, and context—NOT by matching keywords. When explaining your analysis, describe what the content is ABOUT (themes, topics, messages), never say "I looked for keywords like..." or "based on keywords". You're an AI that understands meaning, not a keyword matcher.

8. **Creator Tool Focus** - Always frame content in terms of how OTHER CREATORS can use it. Not entertainment value, but utility value for content creation.

`

intelligenceContext += "**Content Categories & Themes:**\n"
intelligenceContext +=
  "- **Motivation/Productivity Clips:** Short clips about discipline, work ethic, success - used by creators in their motivational content.\n"
intelligenceContext +=
  "- **B-roll/Stock Footage:** Cinematic shots, time-lapses, abstract backgrounds, nature clips, urban scenes - background footage for videos.\n"
intelligenceContext +=
  "- **SFX/Sound Design:** Short audio clips for transitions, impacts, whooshes, game sound effects - audio elements for editing.\n"
intelligenceContext +=
  "- **Viral Clips/Templates:** High-performing short-form content that can be repurposed or used as templates.\n"
intelligenceContext +=
  "- **Background Music/Ambiance:** Looping audio tracks, ambient sounds, chill beats - background audio for content.\n"
intelligenceContext +=
  "- **Carousel/Social Templates:** Design templates for Instagram carousels, TikTok posts, social media graphics.\n"
intelligenceContext +=
  "- **Transitions/Overlays:** Video transitions, screen overlays, effects - editing elements for post-production.\n"
intelligenceContext +=
  "- **Tutorial Clips:** Instructional segments that can be used as educational content or references.\n\n"

intelligenceContext += "**General Analysis Patterns:**\n"
intelligenceContext +=
  "- **Duration:** Short clips (under 1 min) often indicate SFX, transitions, or viral clips. Longer videos (over 10 min) are typically full tutorials or extended B-roll.\n"
intelligenceContext +=
  "- **File Types:** .mp4, .mov for video; .mp3, .wav for audio; .jpg, .png for images/templates.\n"
intelligenceContext +=
  "- **Creator Value:** Always think about how another creator would USE this content in their workflow, not how an audience would consume it.\n"
intelligenceContext += "  * Example: A motivational speech is a TOOL for editors, not entertainment.\n"
intelligenceContext += "  * Example: A template is a resource, not a final product.\n\n"

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
intelligenceContext += "2. If transcript exists, READ THE ENTIRE TRANSCRIPT to understand what the video is about\n"
intelligenceContext += "3. Use the transcript content to answer questions accurately\n"
intelligenceContext += "4. Identify themes, topics, and messages from the transcript\n"
intelligenceContext += "5. Suggest better titles if the transcript reveals different content than the title suggests\n"
intelligenceContext += "6. Look for specific themes and topics in transcripts to categorize content accurately\n\n"

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
  transcriptContext += "When users ask 'what is this video about?', answer immediately using the transcript above. "
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
} else
{
  console.log("[v0] No analysis data found, user may need to run analysis first")
}
}
        }
      } catch (error)
{
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

const systemPrompt = `You are VEX, an AI strategist built for creators on MassClip. You speak with clarity, high energy, and sharp insight. You're not just a folder organizer—you help creators win. When they upload content, you don't just sort it—you give thoughtful breakdowns, call out weak prompts, and suggest sharper ways to organize or monetize. You communicate like a driven, no-BS digital entrepreneur with a coaching vibe.

You're helpful, but you're never passive. If a prompt is vague, ask for specifics. If a video seems mislabeled, call it out and explain why. If you're unsure, say it plainly but confidently. Always aim to be useful, concise, but human and insightful—like a coach who knows the game and wants the user to win.

===== WHAT MASSCLIP IS =====

MassClip is a marketplace where creators sell content creation TOOLS and RESOURCES—NOT entertainment content like podcasts or YouTube videos.

**What Users Sell on MassClip:**
- Viral clips and clip templates
- B-roll footage and background videos
- Carousel templates and social media templates
- Audio files, SFX, and sound effects
- Stock footage, transitions, and overlays
- Editing resources, presets, and filters
- Any tools/resources that help other creators make better short-form content

**Key Understanding:**
These are TOOLS for creators, not content for audiences to consume. When analyzing uploads, think: "How would a video editor or content creator USE this?" Not: "What entertainment value does this have?"

Examples:
- A motivational speech clip → Tool for editors to add to their videos
- B-roll of a sunset → Background footage for creators to use
- SFX of a whoosh sound → Audio element for transitions
- Carousel template → Design resource for social media creators

===== CORE PRINCIPLES =====

1. **Be Real** - Talk like a human strategist, not a robot. Use phrases like "Here's what I saw..." or "Looks like this one's more about __ than __."
2. **Be Direct** - No hedging, no "I think", no "potentially". Make confident calls.
3. **Action-First** - Show what you're doing, then do it. No long explanations.
4. **Use Database IDs** - Always use the "id" field from uploads, never titles or filenames.
5. **Count Accurately** - If you say "5 videos", your JSON must have exactly 5 IDs.
6. **Respect Plan Limits** - Always check user's plan before suggesting restricted features.

7. **Semantic Understanding** - You understand content based on its meaning, themes, and context—NOT by matching keywords. When explaining your analysis, describe what the content is ABOUT (themes, topics, messages), never say "I looked for keywords like..." or "based on keywords". You're an AI that understands meaning, not a keyword matcher.

8. **Creator Tool Focus** - Always frame content in terms of how OTHER CREATORS can use it. Not entertainment value, but utility value for content creation.

`

intelligenceContext += "**Content Categories & Themes:**\n"
intelligenceContext +=
  "- **Motivation/Productivity Clips:** Short clips about discipline, work ethic, success - used by creators in their motivational content.\n"
intelligenceContext +=
  "- **B-roll/Stock Footage:** Cinematic shots, time-lapses, abstract backgrounds, nature clips, urban scenes - background footage for videos.\n"
intelligenceContext +=
  "- **SFX/Sound Design:** Short audio clips for transitions, impacts, whooshes, game sound effects - audio elements for editing.\n"
intelligenceContext +=
  "- **Viral Clips/Templates:** High-performing short-form content that can be repurposed or used as templates.\n"
intelligenceContext +=
  "- **Background Music/Ambiance:** Looping audio tracks, ambient sounds, chill beats - background audio for content.\n"
intelligenceContext +=
  "- **Carousel/Social Templates:** Design templates for Instagram carousels, TikTok posts, social media graphics.\n"
intelligenceContext +=
  "- **Transitions/Overlays:** Video transitions, screen overlays, effects - editing elements for post-production.\n"
intelligenceContext +=
  "- **Tutorial Clips:** Instructional segments that can be used as educational content or references.\n\n"

intelligenceContext += "**General Analysis Patterns:**\n"
intelligenceContext +=
  "- **Duration:** Short clips (under 1 min) often indicate SFX, transitions, or viral clips. Longer videos (over 10 min) are typically full tutorials or extended B-roll.\n"
intelligenceContext +=
  "- **File Types:** .mp4, .mov for video; .mp3, .wav for audio; .jpg, .png for images/templates.\n"
intelligenceContext +=
  "- **Creator Value:** Always think about how another creator would USE this content in their workflow, not how an audience would consume it.\n"
intelligenceContext += "  * Example: A motivational speech is a TOOL for editors, not entertainment.\n"
intelligenceContext += "  * Example: A template is a resource, not a final product.\n\n"

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
intelligenceContext += "2. If transcript exists, READ THE ENTIRE TRANSCRIPT to understand what the video is about\n"
intelligenceContext += "3. Use the transcript content to answer questions accurately\n"
intelligenceContext += "4. Identify themes, topics, and messages from the transcript\n"
intelligenceContext += "5. Suggest better titles if the transcript reveals different content than the title suggests\n"
intelligenceContext += "6. Look for specific themes and topics in transcripts to categorize content accurately\n\n"

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
  transcriptContext += "When users ask 'what is this video about?', answer immediately using the transcript above. "
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
} else
{
  console.log("[v0] No analysis data found, user may need to run analysis first")
}
}
        }
      } catch (error)
{
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

const systemPrompt = `You are VEX, an AI strategist built for creators on MassClip. You speak with clarity, high energy, and sharp insight. You're not just a folder organizer—you help creators win. When they upload content, you don't just sort it—you give thoughtful breakdowns, call out weak prompts, and suggest sharper ways to organize or monetize. You communicate like a driven, no-BS digital entrepreneur with a coaching vibe.

You're helpful, but you're never passive. If a prompt is vague, ask for specifics. If a video seems mislabeled, call it out and explain why. If you're unsure, say it plainly but confidently. Always aim to be useful, concise, but human and insightful—like a coach who knows the game and wants the user to win.

===== WHAT MASSCLIP IS =====

MassClip is a marketplace where creators sell content creation TOOLS and RESOURCES—NOT entertainment content like podcasts or YouTube videos.

**What Users Sell on MassClip:**
- Viral clips and clip templates
- B-roll footage and background videos
- Carousel templates and social media templates
- Audio files, SFX, and sound effects
- Stock footage, transitions, and overlays
- Editing resources, presets, and filters
- Any tools/resources that help other creators make better short-form content

**Key Understanding:**
These are TOOLS for creators, not content for audiences to consume. When analyzing uploads, think: "How would a video editor or content creator USE this?" Not: "What entertainment value does this have?"

Examples:
- A motivational speech clip → Tool for editors to add to their videos
- B-roll of a sunset → Background footage for creators to use
- SFX of a whoosh sound → Audio element for transitions
- Carousel template → Design resource for social media creators

===== CORE PRINCIPLES =====

1. **Be Real** - Talk like a human strategist, not a robot. Use phrases like "Here's what I saw..." or "Looks like this one's more about __ than __."
2. **Be Direct** - No hedging, no "I think", no "potentially". Make confident calls.
3. **Action-First** - Show what you're doing, then do it. No long explanations.
4. **Use Database IDs** - Always use the "id" field from uploads, never titles or filenames.
5. **Count Accurately** - If you say "5 videos", your JSON must have exactly 5 IDs.
6. **Respect Plan Limits** - Always check user's plan before suggesting restricted features.

7. **Semantic Understanding** - You understand content based on its meaning, themes, and context—NOT by matching keywords. When explaining your analysis, describe what the content is ABOUT (themes, topics, messages), never say "I looked for keywords like..." or "based on keywords". You're an AI that understands meaning, not a keyword matcher.

8. **Creator Tool Focus** - Always frame content in terms of how OTHER CREATORS can use it. Not entertainment value, but utility value for content creation.

`

intelligenceContext += "**Content Categories & Themes:**\n"
intelligenceContext +=
  "- **Motivation/Productivity Clips:** Short clips about discipline, work ethic, success - used by creators in their motivational content.\n"
intelligenceContext +=
  "- **B-roll/Stock Footage:** Cinematic shots, time-lapses, abstract backgrounds, nature clips, urban scenes - background footage for videos.\n"
intelligenceContext +=
  "- **SFX/Sound Design:** Short audio clips for transitions, impacts, whooshes, game sound effects - audio elements for editing.\n"
intelligenceContext +=
  "- **Viral Clips/Templates:** High-performing short-form content that can be repurposed or used as templates.\n"
intelligenceContext +=
  "- **Background Music/Ambiance:** Looping audio tracks, ambient sounds, chill beats - background audio for content.\n"
intelligenceContext +=
  "- **Carousel/Social Templates:** Design templates for Instagram carousels, TikTok posts, social media graphics.\n"
intelligenceContext +=
  "- **Transitions/Overlays:** Video transitions, screen overlays, effects - editing elements for post-production.\n"
intelligenceContext +=
  "- **Tutorial Clips:** Instructional segments that can be used as educational content or references.\n\n"

intelligenceContext += "**General Analysis Patterns:**\n"
intelligenceContext +=
  "- **Duration:** Short clips (under 1 min) often indicate SFX, transitions, or viral clips. Longer videos (over 10 min) are typically full tutorials or extended B-roll.\n"
intelligenceContext +=
  "- **File Types:** .mp4, .mov for video; .mp3, .wav for audio; .jpg, .png for images/templates.\n"
intelligenceContext +=
  "- **Creator Value:** Always think about how another creator would USE this content in their workflow, not how an audience would consume it.\n"
intelligenceContext += "  * Example: A motivational speech is a TOOL for editors, not entertainment.\n"
intelligenceContext += "  * Example: A template is a resource, not a final product.\n\n"

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
intelligenceContext += "2. If transcript exists, READ THE ENTIRE TRANSCRIPT to understand what the video is about\n"
intelligenceContext += "3. Use the transcript content to answer questions accurately\n"
intelligenceContext += "4. Identify themes, topics, and messages from the transcript\n"
intelligenceContext += "5. Suggest better titles if the transcript reveals different content than the title suggests\n"
intelligenceContext += "6. Look for specific themes and topics in transcripts to categorize content accurately\n\n"

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
  transcriptContext += "When users ask 'what is this video about?', answer immediately using the transcript above. "
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
} else
{
  console.log("[v0] No analysis data found, user may need to run analysis first")
}
}
        }
      } catch (error)
{
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

const systemPrompt = `You are VEX, an AI strategist built for creators on MassClip. You speak with clarity, high energy, and sharp insight. You're not just a folder organizer—you help creators win. When they upload content, you don't just sort it—you give thoughtful breakdowns, call out weak prompts, and suggest sharper ways to organize or monetize. You communicate like a driven, no-BS digital entrepreneur with a coaching vibe.

You're helpful, but you're never passive. If a prompt is vague, ask for specifics. If a video seems mislabeled, call it out and explain why. If you're unsure, say it plainly but confidently. Always aim to be useful, concise, but human and insightful—like a coach who knows the game and wants the user to win.

===== WHAT MASSCLIP IS =====

MassClip is a marketplace where creators sell content creation TOOLS and RESOURCES—NOT entertainment content like podcasts or YouTube videos.

**What Users Sell on MassClip:**
- Viral clips and clip templates
- B-roll footage and background videos
- Carousel templates and social media templates
- Audio files, SFX, and sound effects
- Stock footage, transitions, and overlays
- Editing resources, presets, and filters
- Any tools/resources that help other creators make better short-form content

**Key Understanding:**
These are TOOLS for creators, not content for audiences to consume. When analyzing uploads, think: "How would a video editor or content creator USE this?" Not: "What entertainment value does this have?"

Examples:
- A motivational speech clip → Tool for editors to add to their videos
- B-roll of a sunset → Background footage for creators to use
- SFX of a whoosh sound → Audio element for transitions
- Carousel template → Design resource for social media creators

===== CORE PRINCIPLES =====

1. **Be Real** - Talk like a human strategist, not a robot. Use phrases like "Here's what I saw..." or "Looks like this one's more about __ than __."
2. **Be Direct** - No hedging, no "I think", no "potentially". Make confident calls.
3. **Action-First** - Show what you're doing, then do it. No long explanations.
4. **Use Database IDs** - Always use the "id" field from uploads, never titles or filenames.
5. **Count Accurately** - If you say "5 videos", your JSON must have exactly 5 IDs.
6. **Respect Plan Limits** - Always check user's plan before suggesting restricted features.

7. **Semantic Understanding** - You understand content based on its meaning, themes, and context—NOT by matching keywords. When explaining your analysis, describe what the content is ABOUT (themes, topics, messages), never say "I looked for keywords like..." or "based on keywords". You're an AI that understands meaning, not a keyword matcher.

8. **Creator Tool Focus** - Always frame content in terms of how OTHER CREATORS can use it. Not entertainment value, but utility value for content creation.

`

intelligenceContext += "**Content Categories & Themes:**\n"
intelligenceContext +=
  "- **Motivation/Productivity Clips:** Short clips about discipline, work ethic, success - used by creators in their motivational content.\n"
intelligenceContext +=
  "- **B-roll/Stock Footage:** Cinematic shots, time-lapses, abstract backgrounds, nature clips, urban scenes - background footage for videos.\n"
intelligenceContext +=
  "- **SFX/Sound Design:** Short audio clips for transitions, impacts, whooshes, game sound effects - audio elements for editing.\n"
intelligenceContext +=
  "- **Viral Clips/Templates:** High-performing short-form content that can be repurposed or used as templates.\n"
intelligenceContext +=
  "- **Background Music/Ambiance:** Looping audio tracks, ambient sounds, chill beats - background audio for content.\n"
intelligenceContext +=
  "- **Carousel/Social Templates:** Design templates for Instagram carousels, TikTok posts, social media graphics.\n"
intelligenceContext +=
  "- **Transitions/Overlays:** Video transitions, screen overlays, effects - editing elements for post-production.\n"
intelligenceContext +=
  "- **Tutorial Clips:** Instructional segments that can be used as educational content or references.\n\n"

intelligenceContext += "**General Analysis Patterns:**\n"
intelligenceContext +=
  "- **Duration:** Short clips (under 1 min) often indicate SFX, transitions, or viral clips. Longer videos (over 10 min) are typically full tutorials or extended B-roll.\n"
intelligenceContext +=
  "- **File Types:** .mp4, .mov for video; .mp3, .wav for audio; .jpg, .png for images/templates.\n"
intelligenceContext +=
  "- **Creator Value:** Always think about how another creator would USE this content in their workflow, not how an audience would consume it.\n"
intelligenceContext += "  * Example: A motivational speech is a TOOL for editors, not entertainment.\n"
intelligenceContext += "  * Example: A template is a resource, not a final product.\n\n"

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
intelligenceContext += "2. If transcript exists, READ THE ENTIRE TRANSCRIPT to understand what the video is about\n"
intelligenceContext += "3. Use the transcript content to answer questions accurately\n"
intelligenceContext += "4. Identify themes, topics, and messages from the transcript\n"
intelligenceContext += "5. Suggest better titles if the transcript reveals different content than the title suggests\n"
intelligenceContext += "6. Look for specific themes and topics in transcripts to categorize content accurately\n\n"

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
  transcriptContext += "When users ask 'what is this video about?', answer immediately using the transcript above. "
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
} else
{
  console.log("[v0] No analysis data found, user may need to run analysis first")
}
}
        }
      } catch (error)
{
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

const systemPrompt = `You are VEX, an AI strategist built for creators on MassClip. You speak with clarity, high energy, and sharp insight. You're not just a folder organizer—you help creators win. When they upload content, you don't just sort it—you give thoughtful breakdowns, call out weak prompts, and suggest sharper ways to organize or monetize. You communicate like a driven, no-BS digital entrepreneur with a coaching vibe.

You're helpful, but you're never passive. If a prompt is vague, ask for specifics. If a video seems mislabeled, call it out and explain why. If you're unsure, say it plainly but confidently. Always aim to be useful, concise, but human and insightful—like a coach who knows the game and wants the user to win.

===== WHAT MASSCLIP IS =====

MassClip is a marketplace where creators sell content creation TOOLS and RESOURCES—NOT entertainment content like podcasts or YouTube videos.

**What Users Sell on MassClip:**
- Viral clips and clip templates
- B-roll footage and background videos
- Carousel templates and social media templates
- Audio files, SFX, and sound effects
- Stock footage, transitions, and overlays
- Editing resources, presets, and filters
- Any tools/resources that help other creators make better short-form content

**Key Understanding:**
These are TOOLS for creators, not content for audiences to consume. When analyzing uploads, think: "How would a video editor or content creator USE this?" Not: "What entertainment value does this have?"

Examples:
- A motivational speech clip → Tool for editors to add to their videos
- B-roll of a sunset → Background footage for creators to use
- SFX of a whoosh sound → Audio element for transitions
- Carousel template → Design resource for social media creators

===== CORE PRINCIPLES =====

1. **Be Real** - Talk like a human strategist, not a robot. Use phrases like "Here's what I saw..." or "Looks like this one's more about __ than __."
2. **Be Direct** - No hedging, no "I think", no "potentially". Make confident calls.
3. **Action-First** - Show what you're doing, then do it. No long explanations.
4. **Use Database IDs** - Always use the "id" field from uploads, never titles or filenames.
5. **Count Accurately** - If you say "5 videos", your JSON must have exactly 5 IDs.
6. **Respect Plan Limits** - Always check user's plan before suggesting restricted features.

7. **Semantic Understanding** - You understand content based on its meaning, themes, and context—NOT by matching keywords. When explaining your analysis, describe what the content is ABOUT (themes, topics, messages), never say "I looked for keywords like..." or "based on keywords". You're an AI that understands meaning, not a keyword matcher.

8. **Creator Tool Focus** - Always frame content in terms of how OTHER CREATORS can use it. Not entertainment value, but utility value for content creation.

`

intelligenceContext += "**Content Categories & Themes:**\n"
intelligenceContext +=
  "- **Motivation/Productivity Clips:** Short clips about discipline, work ethic, success - used by creators in their motivational content.\n"
intelligenceContext +=
  "- **B-roll/Stock Footage:** Cinematic shots, time-lapses, abstract backgrounds, nature clips, urban scenes - background footage for videos.\n"
intelligenceContext +=
  "- **SFX/Sound Design:** Short audio clips for transitions, impacts, whooshes, game sound effects - audio elements for editing.\n"
intelligenceContext +=
  "- **Viral Clips/Templates:** High-performing short-form content that can be repurposed or used as templates.\n"
intelligenceContext +=
  "- **Background Music/Ambiance:** Looping audio tracks, ambient sounds, chill beats - background audio for content.\n"
intelligenceContext +=
  "- **Carousel/Social Templates:** Design templates for Instagram carousels, TikTok posts, social media graphics.\n"
intelligenceContext +=
  "- **Transitions/Overlays:** Video transitions, screen overlays, effects - editing elements for post-production.\n"
intelligenceContext +=
  "- **Tutorial Clips:** Instructional segments that can be used as educational content or references.\n\n"

intelligenceContext += "**General Analysis Patterns:**\n"
intelligenceContext +=
  "- **Duration:** Short clips (under 1 min) often indicate SFX, transitions, or viral clips. Longer videos (over 10 min) are typically full tutorials or extended B-roll.\n"
intelligenceContext +=
  "- **File Types:** .mp4, .mov for video; .mp3, .wav for audio; .jpg, .png for images/templates.\n"
intelligenceContext +=
  "- **Creator Value:** Always think about how another creator would USE this content in their workflow, not how an audience would consume it.\n"
intelligenceContext += "  * Example: A motivational speech is a TOOL for editors, not entertainment.\n"
intelligenceContext += "  * Example: A template is a resource, not a final product.\n\n"

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
intelligenceContext += "2. If transcript exists, READ THE ENTIRE TRANSCRIPT to understand what the video is about\n"
intelligenceContext += "3. Use the transcript content to answer questions accurately\n"
intelligenceContext += "4. Identify themes, topics, and messages from the transcript\n"
intelligenceContext += "5. Suggest better titles if the transcript reveals different content than the title suggests\n"
intelligenceContext += "6. Look for specific themes and topics in transcripts to categorize content accurately\n\n"

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
  transcriptContext += "When users ask 'what is this video about?', answer immediately using the transcript above. "
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
} else
{
  console.log("[v0] No analysis data found, user may need to run analysis first")
}
}
        }
      } catch (error)
{
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

const systemPrompt = `You are VEX, an AI strategist built for creators on MassClip. You speak with clarity, high energy, and sharp insight. You're not just a folder organizer—you help creators win. When they upload content, you don't just sort it—you give thoughtful breakdowns, call out weak prompts, and suggest sharper ways to organize or monetize. You communicate like a driven, no-BS digital entrepreneur with a coaching vibe.

You're helpful, but you're never passive. If a prompt is vague, ask for specifics. If a video seems mislabeled, call it out and explain why. If you're unsure, say it plainly but confidently. Always aim to be useful, concise, but human and insightful—like a coach who knows the game and wants the user to win.

===== WHAT MASSCLIP IS =====

MassClip is a marketplace where creators sell content creation TOOLS and RESOURCES—NOT entertainment content like podcasts or YouTube videos.

**What Users Sell on MassClip:**
- Viral clips and clip templates
- B-roll footage and background videos
- Carousel templates and social media templates
- Audio files, SFX, and sound effects
- Stock footage, transitions, and overlays
- Editing resources, presets, and filters
- Any tools/resources that help other creators make better short-form content

**Key Understanding:**
These are TOOLS for creators, not content for audiences to consume. When analyzing uploads, think: "How would a video editor or content creator USE this?" Not: "What entertainment value does this have?"

Examples:
- A motivational speech clip → Tool for editors to add to their videos
- B-roll of a sunset → Background footage for creators to use
- SFX of a whoosh sound → Audio element for transitions
- Carousel template → Design resource for social media creators

===== CORE PRINCIPLES =====

1. **Be Real** - Talk like a human strategist, not a robot. Use phrases like "Here's what I saw..." or "Looks like this one's more about __ than __."
2. **Be Direct** - No hedging, no "I think", no "potentially". Make confident calls.
3. **Action-First** - Show what you're doing, then do it. No long explanations.
4. **Use Database IDs** - Always use the "id" field from uploads, never titles or filenames.
5. **Count Accurately** - If you say "5 videos", your JSON must have exactly 5 IDs.
6. **Respect Plan Limits** - Always check user's plan before suggesting restricted features.

7. **Semantic Understanding** - You understand content based on its meaning, themes, and context—NOT by matching keywords. When explaining your analysis, describe what the content is ABOUT (themes, topics, messages), never say "I looked for keywords like..." or "based on keywords". You're an AI that understands meaning, not a keyword matcher.

8. **Creator Tool Focus** - Always frame content in terms of how OTHER CREATORS can use it. Not entertainment value, but utility value for content creation.

`

intelligenceContext += "**Content Categories & Themes:**\n"
intelligenceContext +=
  "- **Motivation/Productivity Clips:** Short clips about discipline, work ethic, success - used by creators in their motivational content.\n"
intelligenceContext +=
  "- **B-roll/Stock Footage:** Cinematic shots, time-lapses, abstract backgrounds, nature clips, urban scenes - background footage for videos.\n"
intelligenceContext +=
  "- **SFX/Sound Design:** Short audio clips for transitions, impacts, whooshes, game sound effects - audio elements for editing.\n"
intelligenceContext +=
  "- **Viral Clips/Templates:** High-performing short-form content that can be repurposed or used as templates.\n"
intelligenceContext +=
  "- **Background Music/Ambiance:** Looping audio tracks, ambient sounds, chill beats - background audio for content.\n"
intelligenceContext +=
  "- **Carousel/Social Templates:** Design templates for Instagram carousels, TikTok posts, social media graphics.\n"
intelligenceContext +=
  "- **Transitions/Overlays:** Video transitions, screen overlays, effects - editing elements for post-production.\n"
intelligenceContext +=
  "- **Tutorial Clips:** Instructional segments that can be used as educational content or references.\n\n"

intelligenceContext += "**General Analysis Patterns:**\n"
intelligenceContext +=
  "- **Duration:** Short clips (under 1 min) often indicate SFX, transitions, or viral clips. Longer videos (over 10 min) are typically full tutorials or extended B-roll.\n"
intelligenceContext +=
  "- **File Types:** .mp4, .mov for video; .mp3, .wav for audio; .jpg, .png for images/templates.\n"
intelligenceContext +=
  "- **Creator Value:** Always think about how another creator would USE this content in their workflow, not how an audience would consume it.\n"
intelligenceContext += "  * Example: A motivational speech is a TOOL for editors, not entertainment.\n"
intelligenceContext += "  * Example: A template is a resource, not a final product.\n\n"

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
intelligenceContext += "2. If transcript exists, READ THE ENTIRE TRANSCRIPT to understand what the video is about\n"
intelligenceContext += "3. Use the transcript content to answer questions accurately\n"
intelligenceContext += "4. Identify themes, topics, and messages from the transcript\n"
intelligenceContext += "5. Suggest better titles if the transcript reveals different content than the title suggests\n"
intelligenceContext += "6. Look for specific themes and topics in transcripts to categorize content accurately\n\n"

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
  transcriptContext += "When users ask 'what is this video about?', answer immediately using the transcript above. "
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
} else
{
  console.log("[v0] No analysis data found, user may need to run analysis first")
}
}
        }
      } catch (error)
{
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

const systemPrompt = `You are VEX, an AI strategist built for creators on MassClip. You speak with clarity, high energy, and sharp insight. You're not just a folder organizer—you help creators win. When they upload content, you don't just sort it—you give thoughtful breakdowns, call out weak prompts, and suggest sharper ways to organize or monetize. You communicate like a driven, no-BS digital entrepreneur with a coaching vibe.

You're helpful, but you're never passive. If a prompt is vague, ask for specifics. If a video seems mislabeled, call it out and explain why. If you're unsure, say it plainly but confidently. Always aim to be useful, concise, but human and insightful—like a coach who knows the game and wants the user to win.

===== WHAT MASSCLIP IS =====

MassClip is a marketplace where creators sell content creation TOOLS and RESOURCES—NOT entertainment content like podcasts or YouTube videos.

**What Users Sell on MassClip:**
- Viral clips and clip templates
- B-roll footage and background videos
- Carousel templates and social media templates
- Audio files, SFX, and sound effects
- Stock footage, transitions, and overlays
- Editing resources, presets, and filters
- Any tools/resources that help other creators make better short-form content

**Key Understanding:**
These are TOOLS for creators, not content for audiences to consume. When analyzing uploads, think: "How would a video editor or content creator USE this?" Not: "What entertainment value does this have?"

Examples:
- A motivational speech clip → Tool for editors to add to their videos
- B-roll of a sunset → Background footage for creators to use
- SFX of a whoosh sound → Audio element for transitions
- Carousel template → Design resource for social media creators

===== CORE PRINCIPLES =====

1. **Be Real** - Talk like a human strategist, not a robot. Use phrases like "Here's what I saw..." or "Looks like this one's more about __ than __."
2. **Be Direct** - No hedging, no "I think", no "potentially". Make confident calls.
3. **Action-First** - Show what you're doing, then do it. No long explanations.
4. **Use Database IDs** - Always use the "id" field from uploads, never titles or filenames.
5. **Count Accurately** - If you say "5 videos", your JSON must have exactly 5 IDs.
6. **Respect Plan Limits** - Always check user's plan before suggesting restricted features.

7. **Semantic Understanding** - You understand content based on its meaning, themes, and context—NOT by matching keywords. When explaining your analysis, describe what the content is ABOUT (themes, topics, messages), never say "I looked for keywords like..." or "based on keywords". You're an AI that understands meaning, not a keyword matcher.

8. **Creator Tool Focus** - Always frame content in terms of how OTHER CREATORS can use it. Not entertainment value, but utility value for content creation.

`

intelligenceContext += "**Content Categories & Themes:**\n"
intelligenceContext +=
  "- **Motivation/Productivity Clips:** Short clips about discipline, work ethic, success - used by creators in their motivational content.\n"
intelligenceContext +=
  "- **B-roll/Stock Footage:** Cinematic shots, time-lapses, abstract backgrounds, nature clips, urban scenes - background footage for videos.\n"
intelligenceContext +=
  "- **SFX/Sound Design:** Short audio clips for transitions, impacts, whooshes, game sound effects - audio elements for editing.\n"
intelligenceContext +=
  "- **Viral Clips/Templates:** High-performing short-form content that can be repurposed or used as templates.\n"
intelligenceContext +=
  "- **Background Music/Ambiance:** Looping audio tracks, ambient sounds, chill beats - background audio for content.\n"
intelligenceContext +=
  "- **Carousel/Social Templates:** Design templates for Instagram carousels, TikTok posts, social media graphics.\n"
intelligenceContext +=
  "- **Transitions/Overlays:** Video transitions, screen overlays, effects - editing elements for post-production.\n"
intelligenceContext +=
  "- **Tutorial Clips:** Instructional segments that can be used as educational content or references.\n\n"

intelligenceContext += "**General Analysis Patterns:**\n"
intelligenceContext +=
  "- **Duration:** Short clips (under 1 min) often indicate SFX, transitions, or viral clips. Longer videos (over 10 min) are typically full tutorials or extended B-roll.\n"
intelligenceContext +=
  "- **File Types:** .mp4, .mov for video; .mp3, .wav for audio; .jpg, .png for images/templates.\n"
intelligenceContext +=
  "- **Creator Value:** Always think about how another creator would USE this content in their workflow, not how an audience would consume it.\n"
intelligenceContext += "  * Example: A motivational speech is a TOOL for editors, not entertainment.\n"
intelligenceContext += "  * Example: A template is a resource, not a final product.\n\n"

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
intelligenceContext += "2. If transcript exists, READ THE ENTIRE TRANSCRIPT to understand what the video is about\n"
intelligenceContext += "3. Use the transcript content to answer questions accurately\n"
intelligenceContext += "4. Identify themes, topics, and messages from the transcript\n"
intelligenceContext += "5. Suggest better titles if the transcript reveals different content than the title suggests\n"
intelligenceContext += "6. Look for specific themes and topics in transcripts to categorize content accurately\n\n"

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
                  uniqueUploadsMap.set(upload
