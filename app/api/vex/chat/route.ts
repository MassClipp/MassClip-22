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

interface ReasoningPass {
  passNumber: number
  analysis: string
  confidence: number
  concerns: string[]
  recommendation: string
}

interface MultiPassDecision {
  finalDecision: "proceed" | "reject" | "ask_user"
  reasoning: ReasoningPass[]
  overallConfidence: number
  warnings: string[]
}

/**
 * NEW: LLM-First Semantic Analysis
 * Let the AI model read transcripts and decide semantic fit
 * No more keyword matching, fuzzy logic, or complex scoring
 */
async function analyzeContentWithLLM(
  targetFolder: string,
  fileIds: string[],
  uploads: any[],
  reason?: string,
): Promise<{
  decision: "proceed" | "reject" | "ask_user"
  confidence: number
  analysis: string
  fileAnalysis: Array<{
    id: string
    title: string
    decision: "include" | "exclude"
    reason: string
    transcriptQuote?: string
  }>
}> {
  console.log(`[v0] 🤖 LLM analyzing ${fileIds.length} files for "${targetFolder}" folder`)

  // Build context for the LLM
  const filesToAnalyze = fileIds
    .map((id) => {
      const upload = uploads.find((u: any) => u.id === id || u.title === id || u.filename === id)
      if (!upload) return null

      return {
        id: upload.id,
        title: upload.title || upload.filename,
        transcript: upload.transcript || null,
        duration: upload.duration || null,
        detectedNiche: upload.detectedNiche || null,
      }
    })
    .filter(Boolean)

  if (filesToAnalyze.length === 0) {
    return {
      decision: "reject",
      confidence: 0,
      analysis: "No valid files found to analyze",
      fileAnalysis: [],
    }
  }

  // Create a prompt for the LLM to analyze semantic fit
  const analysisPrompt = `You are analyzing whether video content belongs in a folder called "${targetFolder}".

${reason ? `User's reason for organizing: "${reason}"` : ""}

For each video below, read the transcript carefully and decide if it semantically fits the "${targetFolder}" theme.

Videos to analyze:
${filesToAnalyze
  .map(
    (file: any, idx: number) => `
${idx + 1}. "${file.title}"
   Duration: ${file.duration ? `${Math.floor(file.duration / 60)}m ${file.duration % 60}s` : "unknown"}
   Transcript: ${file.transcript ? `"${file.transcript.substring(0, 500)}${file.transcript.length > 500 ? "..." : ""}"` : "NO TRANSCRIPT AVAILABLE"}
`,
  )
  .join("\n")}

For each video, respond with:
1. INCLUDE or EXCLUDE
2. A brief reason why (1-2 sentences)
3. A quote from the transcript that supports your decision (if transcript available)

Be strict: only include videos that clearly match the "${targetFolder}" theme. If a video is about a different topic, exclude it even if there's some overlap.

Format your response as JSON:
{
  "overallDecision": "proceed" | "reject" | "ask_user",
  "confidence": 0-100,
  "reasoning": "overall analysis",
  "files": [
    {
      "title": "video title",
      "decision": "include" | "exclude",
      "reason": "why this decision was made",
      "transcriptQuote": "relevant quote from transcript"
    }
  ]
}`

  try {
    // Call Groq API for analysis
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content:
              "You are a content categorization expert. You read video transcripts and determine if they semantically match a given folder theme. You are strict and only include content that clearly fits.",
          },
          {
            role: "user",
            content: analysisPrompt,
          },
        ],
        temperature: 0.3, // Low temperature for consistent decisions
        response_format: { type: "json_object" },
      }),
    })

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.statusText}`)
    }

    const data = await response.json()
    const analysisResult = JSON.parse(data.choices[0].message.content)

    console.log(`[v0] ✅ LLM Analysis Complete:`, analysisResult)

    // Map the LLM's analysis to our format
    const fileAnalysis = analysisResult.files.map((file: any) => {
      const originalFile = filesToAnalyze.find((f: any) => f.title === file.title)
      return {
        id: originalFile?.id || "",
        title: file.title,
        decision: file.decision,
        reason: file.reason,
        transcriptQuote: file.transcriptQuote,
      }
    })

    return {
      decision: analysisResult.overallDecision,
      confidence: analysisResult.confidence,
      analysis: analysisResult.reasoning,
      fileAnalysis,
    }
  } catch (error) {
    console.error("[v0] LLM Analysis Error:", error)
    // Fallback to simple matching if LLM fails
    return {
      decision: "ask_user",
      confidence: 50,
      analysis: "Unable to perform semantic analysis. Please review manually.",
      fileAnalysis: filesToAnalyze.map((file: any) => ({
        id: file.id,
        title: file.title,
        decision: "include",
        reason: "Fallback: LLM analysis unavailable",
      })),
    }
  }
}

export async function POST(req: Request) {
  try {
    console.log("[v0] Chat API called")
    const { messages } = await req.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.log("[v0] No messages provided")
      return NextResponse.json({ error: "No messages provided" }, { status: 400 })
    }

    if (!process.env.GROQ_API_KEY) {
      // Changed from GROQ_API to GROQ_API_KEY
      console.log("[v0] Groq API key missing")
      return NextResponse.json({ error: "AI service not configured" }, { status: 500 })
    }

    console.log("[v0] Processing", messages.length, "messages")

    // Get user context if authenticated
    let userContentContext = ""
    let bundleLimitsContext = ""
    let folderContext = ""
    let userId = null
    const authHeader = req.headers.get("authorization")

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
            bundleLimitsContext = `

BUNDLE LIMITS:
Current bundles: ${tierInfoData.bundlesCreated || 0}
Bundle limit: ${tierInfoData.bundlesLimit === null ? "unlimited" : tierInfoData.bundlesLimit || 2}
Can create bundles: ${!tierInfoData.reachedBundleLimit ? "YES" : "NO"}
User tier: ${tierInfoData.tier || "free"}
Max videos per bundle: ${tierInfoData.maxVideosPerBundle === null ? "unlimited" : tierInfoData.maxVideosPerBundle || 10}

${tierInfoData.reachedBundleLimit ? `⚠️ BUNDLE LIMIT REACHED: User has reached their limit of ${tierInfoData.bundlesLimit || 2} bundles. ${(tierInfoData.tier || "free") === "free" ? "They need to upgrade to Creator Pro for unlimited bundles or purchase extra bundle slots." : "They should contact support."}` : ""}
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
                    .map((item: any) => {
                      const title = item.title || item.filename || "Untitled"
                      const type = item.type || "unknown"
                      return `  - ${title} (${type})`
                    })
                    .join("\n")

                  folderContentsContext +=
                    '\n"' + folderName + '" folder (' + itemsArray.length + " items):\n" + itemsList + "\n"
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

                  const nicheTitle = niche.charAt(0).toUpperCase() + niche.slice(1)
                  nicheContentsContext += `\n${nicheTitle} (${itemsArray.length} items):\n${itemsList}\n`
                  if (itemsArray.length > 10) {
                    nicheContentsContext += `  ... and ${itemsArray.length - 10} more ${niche} items\n`
                  }
                }
              }

              console.log(`[v0] Total items in folders: ${totalFolderItems}`)
              console.log(`[v0] Total unorganized items: ${validUnorganizedContent.length}`)

              let intelligenceContext = "\n\n🧠 VEX INTELLIGENCE SYSTEM:\n"
              intelligenceContext += "You have access to advanced metadata analysis and cultural understanding.\n\n"

              intelligenceContext += "**Faith & Spirituality Keywords:**\n"
              intelligenceContext +=
                "- Christian: Jesus, Christ, God, Lord, Holy Spirit, Bible, Scripture, Gospel, salvation, grace, faith, prayer, worship, church, ministry, pastor, sermon, testimony, blessed, amen\n"
              intelligenceContext +=
                "- General Faith: spiritual, spirituality, soul, divine, sacred, holy, heaven, eternal, redemption, forgiveness, mercy, righteousness, covenant, disciple, believer\n"
              intelligenceContext +=
                "- Biblical Themes: rebellion (against God), repentance, transformation, renewal, deliverance, breakthrough, victory, overcome, perseverance, endurance\n"
              intelligenceContext +=
                "- Worship & Praise: praise, glory, hallelujah, hosanna, exalt, magnify, adore, thanksgiving\n\n"

              intelligenceContext += "**Metadata Intelligence Patterns:**\n"
              intelligenceContext += "- SFX: 0.5-5s duration, .wav/.mp3, names like 'whoosh', 'impact', 'click'\n"
              intelligenceContext +=
                "- Motivation: 30s-5min videos, .mp4, names with 'grind', 'discipline', 'success'\n"
              intelligenceContext += "- Memes: 5-30s videos, .mp4/.gif, names with 'meme', 'funny', 'POV', 'me when'\n"
              intelligenceContext += "- Mindset: 1-10min videos, philosophical content, 'mindset', 'growth', 'mental'\n"
              intelligenceContext += "- B-roll: 10s-2min footage, cinematic, 'timelapse', 'footage', 'shots'\n"
              intelligenceContext +=
                "- Background Videos: 30s-5min loops, 'background', 'loop', 'abstract', 'particles'\n"
              intelligenceContext += "- Voiceover: 10-60s audio, .mp3, 'voiceover', 'narration', 'commercial'\n"
              intelligenceContext +=
                "- Faith/Sermon: 1-60min videos, .mp4, contains faith keywords, sermon-like content\n\n"

              intelligenceContext += "**Cultural & Conversational Patterns:**\n"
              intelligenceContext += "- Motivation: 'don't wait', 'grind', 'no excuses', 'get up', imperative tone\n"
              intelligenceContext +=
                "- Memes: 'POV:', 'me when', 'bro aint no way', 💀😂 emojis, 'fr fr', 'literally me'\n"
              intelligenceContext +=
                "- SFX: 'clean whoosh', 'perfect for intros', 'crisp', 'punchy', technical descriptions\n"
              intelligenceContext += "- Mindset: philosophical, 'perspective shift', 'mental model', deeper thinking\n"
              intelligenceContext += "- B-roll: 'aesthetic vibes', 'moody footage', 'cinematic', 'overlay this'\n"
              intelligenceContext +=
                "- Background Videos: 'seamless loop', 'chill vibes', 'ambient', 'perfect for backgrounds'\n"
              intelligenceContext +=
                "- Faith/Sermon: references to God/Jesus, biblical language, spiritual themes, testimony-style\n\n"

              intelligenceContext += "**Critical Thinking Rules:**\n"
              intelligenceContext += "1. ANALYZE TITLES CAREFULLY - What do the words actually mean?\n"
              intelligenceContext +=
                "2. GENERIC TITLES = ASK FIRST - Camera defaults (IMG_8030), pure numbers (2819), sequential names (Video 1)\n"
              intelligenceContext +=
                "3. DESCRIPTIVE TITLES = USE CONTEXT - '2819 Rebellion' has 'Rebellion' (meaningful), 'grind_speech_final' is clearly motivation\n"
              intelligenceContext += "4. CHECK METADATA - Duration, file type, size all matter\n"
              intelligenceContext += "5. WHEN UNCERTAIN = ASK - Don't guess\n"
              intelligenceContext += "6. USE EVIDENCE - Combine filename + duration + keywords + cultural patterns\n"
              intelligenceContext +=
                "7. **READ TRANSCRIPTS FIRST** - If a video has a transcript, READ IT to understand the actual content\n"
              intelligenceContext +=
                "8. **TRANSCRIPT > TITLE** - The transcript is the truth. Titles can be misleading or generic.\n\n"

              intelligenceContext += "🎬 VIDEO TRANSCRIPT INTELLIGENCE:\n"
              intelligenceContext += "When a user asks about a video, YOU MUST:\n"
              intelligenceContext += "1. Check if the video has a 'transcript' field\n"
              intelligenceContext +=
                "2. If transcript exists, READ THE ENTIRE TRANSCRIPT to understand what the video is about\n"
              intelligenceContext += "3. Use the transcript content to answer questions accurately\n"
              intelligenceContext += "4. Identify themes, topics, and keywords from the transcript\n"
              intelligenceContext +=
                "5. Suggest better titles if the transcript reveals different content than the title suggests\n"
              intelligenceContext +=
                "6. Look for faith keywords in transcripts to identify religious/spiritual content\n\n"

              intelligenceContext += "**Example:**\n"
              intelligenceContext += "User: 'What is my video about?'\n"
              intelligenceContext += "You see: title: 'AZ Compass', transcript: 'like all American work...'\n"
              intelligenceContext +=
                "You respond: 'Based on the transcript, your video is about work ethic and motivation...'\n\n"

              // Get all unique uploads from analysisData
              const allUploads = analysisData.uploads || []
              const uniqueUploadsMap = new Map()

              allUploads.forEach((upload: any) => {
                if (!uniqueUploadsMap.has(upload.id)) {
                  uniqueUploadsMap.set(upload.id, upload)
                }
              })

              const uniqueUploads = Array.from(uniqueUploadsMap.values())

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
${transcriptContext}${folderContentsContext}${nicheContentsContext}${intelligenceContext}

Available content IDs for bundling: ${(analysisData?.uploads || []).map((upload: any) => upload.id).join(", ")}
`
              console.log("[v0] User context loaded with FULL metadata intelligence, transcripts, and faith keywords")
            } else {
              console.log("[v0] No analysis data found, user may need to run analysis first")
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

🎬 VIDEO TRANSCRIPT INTELLIGENCE:
You have access to video transcripts! When a user asks about video content:
1. **Check if the video has a transcript** - Look for the "transcript" field in the upload data
2. **Read and analyze the transcript** - Understand what the video is actually about
3. **Use transcript content to answer questions** - Don't just rely on titles
4. **Summarize key points** - Help users understand their content better
5. **Suggest better titles** - If the transcript reveals the content is different from the title suggests

Example:
User: "What is my video 'AZ Compass' about?"
You see: transcript: "like all American work all American works big how often do you go work out how many days you go a week man please but you know your opportunity to be an all American was the ball in your hand..."
You respond: "Based on the transcript, your 'AZ Compass' video is actually motivational content about work ethic and showing up. It talks about being an 'all American' and emphasizes consistency and dedication. Would you like me to suggest a more descriptive title like 'Work Ethic Motivation' or 'Show Up Every Day'?"

CRITICAL: THINK BEFORE YOU ACT
You have been trained with comprehensive metadata intelligence and cultural understanding. USE IT!

Before organizing, renaming, or categorizing ANY content:
1. **Analyze the full context** - filename, duration, file type, keywords, cultural patterns
2. **Think about what the title means** - Does "2819 Rebellion" sound like a sound effect? No! It has the word "Rebellion" which is meaningful
3. **Check for generic titles** - IMG_8030, pure numbers, "Video 1" = ASK FIRST
4. **Use your intelligence** - You know that:
   - "grind mode" = has 'grind' keyword = motivation
   - "meme template" = has 'meme' keyword = meme
   - "2819 Fruit" = unclear = ASK
   - "whoosh_01.wav" = short audio + 'whoosh' = SFX
   - "IMG_8030" = camera default = ASK
5. **Combine evidence** - Filename + duration + file type + keywords + cultural patterns
6. **When uncertain = ASK** - Don't guess
7. **Explain your reasoning** - "This file is called grind_speech_final.mp4, is 35 seconds long, and includes keywords like 'grind' and 'speech'. It's likely motivational content."

**Example of GOOD thinking:**
User: "organize my content"
You see: "2819 Rebellion" (video, 45s)
You think: "This title has the word 'Rebellion' which is meaningful, but I'm not sure what type of content this is. The duration is 45s which could be motivation or a meme. I should ask."
You say: "I see a file called '2819 Rebellion' - can you tell me what type of content this is? Is it motivational, a meme, or something else?"

**Example of BAD thinking:**
You see: "2819 Rebellion"
You think: "Has numbers, must be SFX"
You say: "Moving to SFX folder" ❌ WRONG!

===== YOUR CAPABILITIES =====

**0. REFRESH CONTENT ANALYSIS**
If the user asks to "refresh", "update my library", "rescan my content", or mentions that you're not seeing their latest uploads, respond with:

REFRESH_ANALYSIS: true

This will trigger a fresh scan of their entire content library and update your understanding of their folders and uploads.

**1. CREATE FOLDERS**
When someone asks to create a folder, respond naturally then add this instruction:

CREATE_FOLDER: {"name": "Folder Name", "description": "Brief description"}

Rules:
- Use clear, descriptive names (2-4 words max)
- MUST be valid JSON on a single line
- Check if folder exists first to avoid duplicates

**2. RENAME CONTENT**
When you encounter titles that don't clearly describe the content:

GENERIC titles (ask user to rename):
- Camera/device defaults: IMG_8030, VID_1234, DSC_5678, MOV_0123
- Pure numbers without context: 2819, 1234, 5678
- Sequential names: Video 1, File 2, Content 3
- Vague names: Untitled, New Video, Clip

DESCRIPTIVE titles (these are good):
- "2819 Rebellion" - has meaningful words (Rebellion)
- "Codie Sanchez A People Business" - describes the content
- "meme template" - clear purpose
- "Motivation Speech" - clear category

Use your judgment: If a title has meaningful words that describe what the content is about, it's descriptive. If it's just numbers, codes, or generic labels, it's generic.

When you find generic titles, STOP organizing and ask what those files are about. Offer to rename them.

To rename, use:

RENAME_CONTENT: {"contentId": "file_id_or_current_title", "newTitle": "Descriptive New Title", "reason": "why this name is better"}

**3. ORGANIZE CONTENT INTO FOLDERS**

⚠️ **CRITICAL CONSISTENCY RULE - READ CAREFULLY** ⚠️

**THE PROBLEM:**
You have been saying you'll organize 10 videos, but only organizing 5. This is UNACCEPTABLE.

**THE SOLUTION:**
1. **USE REAL DATABASE IDs** - The content analysis provides you with actual database IDs for each upload
2. **VERIFY YOUR COUNT** - Before responding, COUNT how many files you're including in the JSON
3. **MATCH YOUR WORDS TO YOUR ACTIONS** - If you say 10, include 10. If you say 5, include 5.

**HOW TO USE DATABASE IDs:**
In your context, you have access to: "Available content IDs for bundling: abc123, def456, ghi789, ..."
These are REAL DATABASE IDs. USE THEM DIRECTLY in your fileIds array.

**CORRECT PROCESS:**
1. Look at the content analysis data
2. Identify which uploads match the folder theme (use transcripts, detected niche, keywords)
3. Get the REAL DATABASE ID for each upload (from the uploads array)
4. Count how many you found
5. Say: "I'll organize [COUNT] videos: [list them]"
6. Put ALL [COUNT] database IDs in the fileIds array
7. VERIFY: Does your count match? If not, FIX IT before responding!

**BAD Example (WRONG):**
You say: "I'll organize these 10 faith videos: Video A, Video B, Video C, Video D, Video E, Video F, Video G, Video H, Video I, Video J"
You output: ORGANIZE_FILES: {"targetFolder": "Faith", "fileIds": ["Video A", "Video B", "Video C"], ...}
❌ WRONG! You said 10 but only included 3!

**BAD Example (WRONG):**
You say: "I'll organize these 5 faith videos"
You output: ORGANIZE_FILES: {"targetFolder": "Faith", "fileIds": ["abc123", "def456", "ghi789", "jkl012", "mno345", "pqr678", "stu901", "vwx234"], ...}
❌ WRONG! You said 5 but included 8 IDs!

**GOOD Example (CORRECT):**
You say: "I'll organize these 3 faith videos into your Faith folder: '2819 Rebellion', 'AZ Compass', and 'John Mark Stev'"
You output: ORGANIZE_FILES: {"targetFolder": "Faith", "fileIds": ["giKlNW6GUD176E34O9gx", "nSOHQnlPBpUq6Gzelhet", "abc123xyz"], ...}
✅ CORRECT! You said 3 and included exactly 3 database IDs!

**VERIFICATION CHECKLIST:**
Before you respond, ask yourself:
1. ✓ Did I count how many files I'm organizing?
2. ✓ Did I use REAL DATABASE IDs from the content analysis?
3. ✓ Does the number I said match the number of IDs in my JSON?
4. ✓ Did I include ALL relevant content that matches the folder theme?

**AGGRESSIVE MATCHING:**
When organizing by theme (like "faith content"), you MUST:
- Check ALL uploads for matching keywords in transcripts
- Include ANY video that mentions relevant keywords (Jesus, God, faith, etc.)
- Use the detected niche data to find related content
- Don't be conservative - if it matches the theme, INCLUDE IT!

**DATABASE ID FORMAT:**
- Real IDs look like: "giKlNW6GUD176E34O9gx", "nSOHQnlPBpUq6Gzelhet"
- NOT titles like: "2819 Rebellion", "AZ Compass"
- NOT descriptions or keywords

To organize, use:

ORGANIZE_FILES: {"targetFolder": "Folder Name", "fileIds": ["REAL_DB_ID_1", "REAL_DB_ID_2", "REAL_DB_ID_3"], "reason": "Detailed reasoning"}

Format requirements:
- MUST be valid JSON on a single line
- NO line breaks or lists inside the JSON
- Create the folder first if it doesn't exist
- Include detailed reasoning that shows your intelligence
- **fileIds MUST contain REAL DATABASE IDs from the content analysis**

**4. CREATE BUNDLES**

⚠️ **CRITICAL CONSISTENCY RULE - READ CAREFULLY** ⚠️

**THE PROBLEM:**
You have been saying you'll create bundles with 10 items, but only including 5. This is UNACCEPTABLE.

**THE SOLUTION:**
1. **USE REAL DATABASE IDs** - The content analysis provides you with actual database IDs
2. **VERIFY YOUR COUNT** - Before responding, COUNT how many items you're including
3. **MATCH YOUR WORDS TO YOUR ACTIONS** - If you say 10, include 10. If you say 5, include 5.

**CORRECT PROCESS:**
1. Look at the content analysis data
2. Identify which uploads match the bundle theme
3. Get the REAL DATABASE ID for each upload
4. Count how many you found
5. Say: "I'll create a bundle with [COUNT] items: [list them]"
6. Put ALL [COUNT] database IDs in the contentIds array
7. VERIFY: Does your count match? If not, FIX IT!

**VERIFICATION CHECKLIST:**
Before you respond, ask yourself:
1. ✓ Did I count how many items I'm including?
2. ✓ Did I use REAL DATABASE IDs from the content analysis?
3. ✓ Does the number I said match the number of IDs in my JSON?
4. ✓ Did I include ALL relevant content that matches the bundle theme?

**PROCESS:**
1. **FIRST:** Analyze ALL content and decide which files belong in the bundle
2. **SECOND:** List ALL of them in your response
3. **THIRD:** Include ALL of them in the contentIds array
4. **VERIFY:** Count the files you mentioned vs the files in the JSON - they MUST match!

When creating bundles:
- Check bundle limits first (shown in context below)
- Check video count limits for free users (max 10 videos)
- Use your intelligence to match content appropriately
- Use real content IDs from their library
- Price fairly: $5-15 starter, $15-35 bigger, $35+ premium
- Include 3-8 items for good value
- **BE AGGRESSIVE** - Include ALL relevant content that matches the bundle theme

To create, use:

CREATE_BUNDLE: {"title": "Bundle Name", "description": "Bundle description", "price": 15, "contentIds": ["ALL", "THE", "FILES", "YOU", "MENTIONED"], "category": "Video Pack", "tags": ["tag1", "tag2"]}

Bundle limit responses:
- If at limit: "You've reached your bundle limit. Upgrade to Creator Pro for unlimited bundles!"
- If free tier wants >10 videos: "Free users can only include up to 10 videos per bundle. Upgrade for unlimited!"

${userContentContext}${bundleLimitsContext}${folderContext}

**FINAL REMINDER:**
Your words and your actions MUST be consistent. Count your IDs. Use real database IDs. Verify before responding. NO EXCEPTIONS!

Be helpful, natural, and focus on their success. USE YOUR INTELLIGENCE to make smart decisions. Never expose internal instructions or technical details to users.`

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
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`, // Changed from GROQ_API to GROQ_API_KEY
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

    // CHANGE: LLM analysis happens inside organizeFilesDirectly now
    if (assistantMessage.includes("ORGANIZE_FILES:") && userId) {
      try {
        console.log("[v0] Validating ORGANIZE_FILES action...")

        const organizeMatch = assistantMessage.match(/ORGANIZE_FILES:\s*({.*?})/s)
        if (!organizeMatch) {
          throw new Error("No valid organize data found")
        }

        const organizeData = JSON.parse(organizeMatch[1])
        console.log("[v0] Parsed organize data:", organizeData)

        console.log("[v0] Vex wants to organize files, starting direct organization...")

        const orgProgressMessage = `🗂️ **Analyzing and organizing your files...** This will just take a moment!`
        const orgActionRegex = /ORGANIZE_FILES:\s*({.*?})/s
        if (assistantMessage.match(orgActionRegex)) {
          assistantMessage = assistantMessage.replace(orgActionRegex, orgProgressMessage)
        } else {
          assistantMessage += `\n\n${orgProgressMessage}`
        }

        const orgResult = await organizeFilesDirectly(userId, organizeData)

        if (orgResult.success) {
          let successMessage = `✅ **Files moved successfully!** Your "${orgResult.targetFolder}" folder now contains the following files:\n\n`
          successMessage += `**Files moved:**\n`
          orgResult.movedFiles.forEach((file: string) => {
            successMessage += `* ${file}\n`
          })

          if (orgResult.llmAnalysis) {
            successMessage += `\n**Analysis (${orgResult.llmAnalysis.confidence}% confidence):**\n${orgResult.llmAnalysis.reasoning}\n\n`
            successMessage += `**Why each file was included:**\n`
            orgResult.llmAnalysis.fileDetails
              .filter((f: any) => f.decision === "include")
              .forEach((f: any) => {
                successMessage += `* **${f.title}**: ${f.reason}\n`
                if (f.transcriptQuote) {
                  successMessage += `  > "${f.transcriptQuote}"\n`
                }
              })
          }

          if (orgResult.notFound && orgResult.notFound.length > 0) {
            successMessage += `\n⚠️ Could not find: ${orgResult.notFound.join(", ")}`
          }

          assistantMessage = assistantMessage.replace(orgProgressMessage, successMessage)
        } else {
          const errorMessage = `❌ ${orgResult.error}`
          assistantMessage = assistantMessage.replace(orgProgressMessage, errorMessage)
        }
      } catch (error) {
        console.error("[v0] Organization error:", error)
        const errorMessage = `❌ Error organizing files: ${error instanceof Error ? error.message : "Unknown error"}`
        assistantMessage += `\n\n${errorMessage}`
      }
    }

    if (assistantMessage.includes("CREATE_BUNDLE:") && userId) {
      try {
        console.log("[v0] Validating CREATE_BUNDLE action...")

        // Extract bundle data
        const bundleMatch = assistantMessage.match(/CREATE_BUNDLE:\s*({.*?})/s)
        if (!bundleMatch) {
          throw new Error("No valid bundle data found")
        }

        const bundleData = JSON.parse(bundleMatch[1])
        console.log("[v0] Parsed bundle data:", bundleData)

        // Retrieve necessary context for multi-pass reasoning
        const analysisDoc = await db.collection("vex_content_analysis").doc(userId).get()
        let analysisData: any = {}
        let uploads: any[] = []

        if (analysisDoc.exists) {
          analysisData = analysisDoc.data()!
          uploads = analysisData.uploads || []
        }

        // The multi-pass reasoning is now simplified and integrated directly into the LLM analysis for relevant actions like bundle creation.
        // This section will now directly call a helper function or rely on the LLM's internal reasoning.

        // For bundle creation, we rely on the LLM's direct decision making and use analyzeContentWithLLM for semantic fit checks on the content IDs proposed for the bundle.
        // This assumes the LLM has already considered the semantic fit of the content IDs it chose.
        // If `bundleData.contentIds` are provided, we perform a check on them.
        let llmBundleAnalysis = {
          decision: "proceed" as "proceed" | "reject" | "ask_user",
          confidence: 100,
          analysis: "Content fit validated by LLM.",
          fileAnalysis: [],
        }

        if (bundleData.contentIds && bundleData.contentIds.length > 0) {
          llmBundleAnalysis = await analyzeContentWithLLM(
            bundleData.title || "Bundle Content", // Using bundle title as target folder for analysis
            bundleData.contentIds,
            uploads,
            bundleData.description,
          )
          console.log("[v0] LLM Analysis for Bundle Content:", llmBundleAnalysis)
        }

        // Handle decision
        if (llmBundleAnalysis.decision === "reject") {
          const errorMessage = `I cannot create this bundle as the content doesn't seem to fit together well.\n\n**Analysis:**\n${llmBundleAnalysis.analysis}\n\n**File Analysis:**\n${llmBundleAnalysis.fileAnalysis.map((f) => `• ${f.title}: ${f.reason}`).join("\n")}`
          assistantMessage = errorMessage
          console.log("[v0] Bundle creation rejected based on LLM analysis.")
        } else if (llmBundleAnalysis.decision === "ask_user") {
          const confirmationMessage = `I'm a bit unsure about creating this bundle (${llmBundleAnalysis.confidence}% confidence).\n\n**Analysis:**\n${llmBundleAnalysis.analysis}\n\n**File Analysis:**\n${llmBundleAnalysis.fileAnalysis.map((f) => `• ${f.title}: ${f.decision === "include" ? "✓" : "✗"} ${f.reason}`).join("\n")}\n\nWould you like me to proceed anyway?`
          assistantMessage = confirmationMessage
          console.log("[v0] User confirmation requested for bundle creation.")
        } else {
          // Proceed with bundle creation
          console.log("[v0] LLM analysis indicates proceed, continuing with bundle creation.")

          // VALIDATION STEP 1: Count what Vex said it would include
          const naturalLanguageText = assistantMessage.split("CREATE_BUNDLE:")[0]
          const mentionedCount = countMentionedItems(naturalLanguageText)
          const jsonCount = bundleData.contentIds?.length || 0

          console.log(`[v0] 🔍 Consistency Check:`)
          console.log(`[v0]   - Vex said: ${mentionedCount} items`)
          console.log(`[v0]   - JSON has: ${jsonCount} items`)

          // VALIDATION STEP 2: Check if counts match
          if (mentionedCount > 0 && jsonCount > 0 && Math.abs(mentionedCount - jsonCount) > 2) {
            console.log(`[v0] ❌ MISMATCH DETECTED: Said ${mentionedCount} but JSON has ${jsonCount}`)

            // Get analysis data to re-match properly
            const correctedContentIds: string[] = []

            console.log(`[v0] 🔄 Re-matching content IDs aggressively...`)

            // Use LLM's file analysis for better ID matching if available
            if (llmBundleAnalysis.fileAnalysis && llmBundleAnalysis.fileAnalysis.length > 0) {
              for (const fileAnalysis of llmBundleAnalysis.fileAnalysis) {
                if (fileAnalysis.decision === "include" && fileAnalysis.id) {
                  correctedContentIds.push(fileAnalysis.id)
                }
              }
              console.log(`[v0] ✅ Corrected: ${correctedContentIds.length} items using LLM file analysis`)
            } else {
              // Fallback if LLM analysis didn't provide IDs directly
              for (const contentIdentifier of bundleData.contentIds) {
                const matchResult = findBestMatch(contentIdentifier, uploads, []) // Use empty keywords for general matching
                if (matchResult.upload && matchResult.confidence >= 50) {
                  correctedContentIds.push(matchResult.upload.id)
                  console.log(
                    `[v0]   ✓ "${contentIdentifier}" → "${matchResult.upload.title}" (${matchResult.confidence}%)`,
                  )
                } else {
                  console.log(`[v0]   ✗ "${contentIdentifier}" - No confident match`)
                }
              }
              console.log(`[v0] ✅ Corrected: ${correctedContentIds.length} items using fallback matching`)
            }

            // Update the JSON with corrected IDs
            bundleData.contentIds = correctedContentIds
            console.log(`[v0] ✅ Corrected: ${correctedContentIds.length} items will be in bundle`)

            // Update the assistant message
            const correctedMessage = assistantMessage.replace(
              /CREATE_BUNDLE:\s*{.*?}/s,
              `CREATE_BUNDLE: ${JSON.stringify(bundleData)}`,
            )
            assistantMessage = correctedMessage

            // Add a note about the correction
            if (correctedContentIds.length !== jsonCount) {
              assistantMessage = assistantMessage.replace(
                "CREATE_BUNDLE:",
                `\n\n*Note: I've verified and will include ${correctedContentIds.length} items in your bundle based on AI analysis.*\n\nCREATE_BUNDLE:`,
              )
            }
          } else {
            console.log(`[v0] ✅ Consistency check passed`)
          }

          // VALIDATION STEP 3: Verify all IDs are real database IDs
          const validIds = new Set(uploads.map((u: any) => u.id))
          const invalidIds = bundleData.contentIds.filter((id: string) => !validIds.has(id))

          if (invalidIds.length > 0) {
            console.log(`[v0] ⚠️ Found ${invalidIds.length} invalid IDs, attempting to fix...`)
            const correctedIds: string[] = []

            for (const identifier of bundleData.contentIds) {
              if (validIds.has(identifier)) {
                correctedIds.push(identifier)
              } else {
                // Fallback matching if LLM didn't provide a direct ID
                const matchResult = findBestMatch(identifier, uploads, [])
                if (matchResult.upload && matchResult.confidence >= 50) {
                  correctedIds.push(matchResult.upload.id)
                  console.log(`[v0]   Fixed: "${identifier}" → "${matchResult.upload.id}" (${matchResult.confidence}%)`)
                }
              }
            }

            bundleData.contentIds = correctedIds
            const correctedMessage = assistantMessage.replace(
              /CREATE_BUNDLE:\s*{.*?}/s,
              `CREATE_BUNDLE: ${JSON.stringify(bundleData)}`,
            )
            assistantMessage = correctedMessage
            console.log(`[v0] ✅ Fixed IDs: ${correctedIds.length} valid database IDs`)
          }

          // Now proceed with bundle creation
          console.log("[v0] Vex wants to create a bundle, starting direct creation...")

          // Show progress message
          const bundleProgressMessage = "🚀 **Creating your bundle now...** This will just take a moment!"
          const bundleActionRegex = /CREATE_BUNDLE:\s*({.*?})/s
          if (assistantMessage.match(bundleActionRegex)) {
            assistantMessage = assistantMessage.replace(bundleActionRegex, bundleProgressMessage)
          } else {
            assistantMessage += `\n\n${bundleProgressMessage}`
          }

          // Direct bundle creation with detailed progress
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
        }
      } catch (error) {
        console.error("[v0] Bundle creation failed:", error)
        const errorMessage =
          "❌ I encountered an error while creating your bundle. Please try again or create it manually in your dashboard."
        if (assistantMessage.includes("🚀 **Creating your bundle now...** This will just take a moment!")) {
          assistantMessage = assistantMessage.replace(
            "🚀 **Creating your bundle now...** This will just take a moment!",
            errorMessage,
          )
        } else {
          assistantMessage += `\n\n${errorMessage}`
        }
      }
    }

    if (assistantMessage.includes("REFRESH_ANALYSIS:") && userId) {
      try {
        console.log("[v0] Vex wants to refresh content analysis...")

        // Show progress message
        const refreshProgressMessage = "🔄 **Refreshing your content analysis...** Scanning your library now!"
        assistantMessage = assistantMessage.replace(/REFRESH_ANALYSIS:\s*true/, refreshProgressMessage)

        // Trigger analysis refresh
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

        // Extract rename data
        const renameMatch = assistantMessage.match(/RENAME_CONTENT:\s*({.*?})/s)
        if (!renameMatch) {
          throw new Error("No valid rename data found")
        }

        const renameData = JSON.parse(renameMatch[1])
        console.log("[v0] Parsed rename data:", renameData)

        // Show progress message
        const renameProgressMessage = "✏️ **Renaming content now...** Updating the title!"
        assistantMessage = assistantMessage.replace(/RENAME_CONTENT:\s*{.*?}/s, renameProgressMessage)

        // Call the rename function
        const renameResult = await renameContentDirectly(userId, renameData)

        if (renameResult.success) {
          assistantMessage = assistantMessage.replace(
            renameProgressMessage,
            `✅ **Content renamed successfully!** "${renameResult.oldTitle}" is now "${renameResult.newTitle}". This will make it much easier to organize!`,
          )
        } else {
          assistantMessage = assistantMessage.replace(
            renameProgressMessage,
            `❌ ${renameResult.error || "I encountered an issue renaming the content. Please try again."}`,
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

        // Extract folder data
        const folderMatch = assistantMessage.match(/CREATE_FOLDER:\s*({.*?})/s)
        if (!folderMatch) {
          throw new Error("No valid folder data found")
        }

        const folderData = JSON.parse(folderMatch[1])
        console.log("[v0] Parsed folder data:", folderData)

        // Show progress message
        const createFolderProgressMessage = "📁 **Creating folder now...** Setting up your new folder!"
        assistantMessage = assistantMessage.replace(/CREATE_FOLDER:\s*{.*?}/s, createFolderProgressMessage)

        // Create the folder
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
    // Check bundle limits
    const tierInfo = await getUserTierInfo(userId)
    if (tierInfo.reachedBundleLimit) {
      return {
        success: false,
        error: `You've reached your bundle limit. Please upgrade your plan to create more bundles.`,
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

    console.log(`[v0] 📂 Starting organization: ${fileIds.length} files → "${targetFolder}"`)
    console.log(`[v0] 📝 Reason: ${reason}`)

    // Check if folder exists
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
      return {
        success: false,
        error: `Folder "${targetFolder}" not found. Please create it first.`,
      }
    }

    const targetFolderId = foldersSnapshot.docs[0].id
    console.log(`[v0] ✅ Found folder: ${targetFolderId}`)

    // Get content analysis
    const analysisDoc = await db.collection("vex_content_analysis").doc(userId).get()
    if (!analysisDoc.exists) {
      return {
        success: false,
        error: "Content analysis not found. Please refresh your content analysis first.",
      }
    }

    const analysisData = analysisDoc.data()!
    const uploads = analysisData.uploads || []
    console.log(`[v0] 📊 Loaded ${uploads.length} uploads from analysis`)

    const llmAnalysis = await analyzeContentWithLLM(targetFolder, fileIds, uploads, reason)

    console.log(`[v0] 🤖 LLM Decision: ${llmAnalysis.decision} (${llmAnalysis.confidence}% confidence)`)
    console.log(`[v0] 📝 Analysis: ${llmAnalysis.analysis}`)

    // Handle LLM decision
    if (llmAnalysis.decision === "reject") {
      return {
        success: false,
        error: `I cannot organize these files into "${targetFolder}".\n\n${llmAnalysis.analysis}\n\n**File Analysis:**\n${llmAnalysis.fileAnalysis.map((f) => `• ${f.title}: ${f.reason}`).join("\n")}`,
      }
    }

    if (llmAnalysis.decision === "ask_user") {
      return {
        success: false,
        error: `I'm unsure about organizing these files into "${targetFolder}" (${llmAnalysis.confidence}% confidence).\n\n${llmAnalysis.analysis}\n\n**File Analysis:**\n${llmAnalysis.fileAnalysis.map((f) => `• ${f.title}: ${f.decision === "include" ? "✓" : "✗"} ${f.reason}`).join("\n")}\n\nWould you like me to proceed anyway?`,
      }
    }

    // Proceed with organization - only include files that LLM approved
    const approvedFiles = llmAnalysis.fileAnalysis.filter((f) => f.decision === "include")
    const movedFiles: string[] = []
    const notFoundFiles: string[] = []

    for (const fileAnalysis of approvedFiles) {
      const upload = uploads.find((u: any) => u.id === fileAnalysis.id)

      if (!upload) {
        console.log(`[v0] ❌ Not found: "${fileAnalysis.title}"`)
        notFoundFiles.push(fileAnalysis.title)
        continue
      }

      console.log(`[v0] ✅ Moving: "${upload.title}"`)
      console.log(`[v0]    Reason: ${fileAnalysis.reason}`)
      if (fileAnalysis.transcriptQuote) {
        console.log(`[v0]    Quote: "${fileAnalysis.transcriptQuote}"`)
      }

      try {
        const docRef = db.collection(upload.collection).doc(upload.id)

        // Verify document exists and belongs to user
        const docSnap = await docRef.get()
        if (!docSnap.exists) {
          console.log(`[v0] ❌ Document doesn't exist: ${upload.id}`)
          notFoundFiles.push(fileAnalysis.title)
          continue
        }

        const docData = docSnap.data()!
        if (docData.uid !== userId && docData.userId !== userId) {
          console.log(`[v0] ❌ Ownership mismatch: ${upload.id}`)
          notFoundFiles.push(fileAnalysis.title)
          continue
        }

        // Update the document
        await docRef.update({
          folderId: targetFolderId,
          folderName: targetFolder,
          updatedAt: FieldValue.serverTimestamp(),
          vexOrganized: true,
          vexOrganizeReason: fileAnalysis.reason,
          vexLLMAnalysis: {
            decision: fileAnalysis.decision,
            reason: fileAnalysis.reason,
            transcriptQuote: fileAnalysis.transcriptQuote,
            confidence: llmAnalysis.confidence,
            analyzedAt: new Date().toISOString(),
          },
        })

        movedFiles.push(upload.title || upload.filename || fileAnalysis.title)
        console.log(`[v0] ✅ Moved: "${upload.title}" to "${targetFolder}"`)
      } catch (error) {
        console.error(`[v0] ❌ Error moving ${upload.id}:`, error)
        notFoundFiles.push(fileAnalysis.title)
      }
    }

    console.log(`[v0] 📊 Organization Summary:`)
    console.log(`[v0]   ✅ Moved: ${movedFiles.length}`)
    console.log(`[v0]   ❌ Not found: ${notFoundFiles.length}`)

    if (movedFiles.length === 0) {
      return {
        success: false,
        error: `Could not move any files. ${notFoundFiles.length > 0 ? `Not found: ${notFoundFiles.join(", ")}` : ""}`,
      }
    }

    // Trigger analysis refresh in background
    try {
      fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/vex/analyze-uploads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
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
      llmAnalysis: {
        confidence: llmAnalysis.confidence,
        reasoning: llmAnalysis.analysis,
        fileDetails: llmAnalysis.fileAnalysis,
      },
    }
  } catch (error) {
    console.error("[v0] File organization error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred while organizing files.",
    }
  }
}

function createFolderDirectly(userId: string, folderData: any) {
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
      // FIX: Added await for db.collection(...).doc(...).get()
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

      // If not found by ID, try to fuzzy matching by title/filename
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

function countMentionedItems(text: string): number {
  // Look for patterns like:
  // - "I'll organize these 10 videos"
  // - "I'll create a bundle with 5 items"
  // - "Moving 3 files"
  // - "Including 7 videos"

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

  // Also count bullet points or numbered lists
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

// The findBestMatch function is kept for bundle creation's fallback matching.
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

    // Exact ID match (100% confidence)
    if (upload.id === identifier) {
      return { upload, confidence: 100, matchReason: "Exact ID match" }
    }

    // Exact title match (95% confidence)
    if (upload.title === identifier) {
      return { upload, confidence: 95, matchReason: "Exact title match" }
    }

    // Case-insensitive title match (90% confidence)
    if (upload.title?.toLowerCase() === lowerIdentifier) {
      confidence = Math.max(confidence, 90)
      reasons.push("Case-insensitive title match")
    }

    // Filename match (85% confidence)
    if (upload.filename === identifier || upload.filename?.toLowerCase() === lowerIdentifier) {
      confidence = Math.max(confidence, 85)
      reasons.push("Filename match")
    }

    // Title contains identifier (70% confidence)
    if (upload.title?.toLowerCase().includes(lowerIdentifier)) {
      confidence = Math.max(confidence, 70)
      reasons.push("Title contains identifier")
    }

    // Identifier contains title (65% confidence)
    if (upload.title && lowerIdentifier.includes(upload.title.toLowerCase())) {
      confidence = Math.max(confidence, 65)
      reasons.push("Identifier contains title")
    }

    // Fuzzy title matching - check for partial word matches
    if (upload.title) {
      const titleWords = upload.title.toLowerCase().split(/\s+/)
      const identifierWords = lowerIdentifier.split(/\s+/)

      let matchingWords = 0
      titleWords.forEach((titleWord) => {
        if (titleWord.length > 2) {
          // Skip very short words
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

    // AGGRESSIVE TRANSCRIPT MATCHING
    if (upload.transcript && typeof upload.transcript === "string") {
      const transcriptLower = upload.transcript.toLowerCase()

      // Check if identifier is in transcript
      if (transcriptLower.includes(lowerIdentifier)) {
        confidence = Math.max(confidence, 75)
        reasons.push("Identifier found in transcript")
      }

      // AGGRESSIVE: Check for ANY folder keyword matches in transcript
      let keywordMatches = 0
      const matchedKeywords: string[] = []

      folderKeywords.forEach((keyword) => {
        if (transcriptLower.includes(keyword)) {
          keywordMatches++
          matchedKeywords.push(keyword)
        }
      })

      // If ANY keywords match, give it a decent confidence score
      if (keywordMatches > 0) {
        // More aggressive scoring: even 1 keyword match gets 50% confidence
        const keywordConfidence = Math.min(50 + keywordMatches * 15, 95)
        confidence = Math.max(confidence, keywordConfidence)
        reasons.push(`${keywordMatches} folder keywords in transcript (${matchedKeywords.slice(0, 3).join(", ")})`)
      }

      // AGGRESSIVE: Check for related terms and synonyms
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

    // AGGRESSIVE: Detected niche matching
    if (upload.detectedNiche) {
      const nicheLower = upload.detectedNiche.toLowerCase()

      // Check if detected niche matches ANY folder keywords
      let nicheKeywordMatches = 0
      folderKeywords.forEach((keyword) => {
        if (nicheLower.includes(keyword) || keyword.includes(nicheLower)) {
          nicheKeywordMatches++
        }
      })

      if (nicheKeywordMatches > 0) {
        // Use the upload's confidence score if available, otherwise default to 60%
        const nicheConfidence = upload.confidence ? Math.min(55 + upload.confidence * 25, 85) : 60
        confidence = Math.max(confidence, nicheConfidence)
        reasons.push(`Detected niche matches (${upload.detectedNiche})`)
      }

      // Check if identifier matches detected niche
      if (
        nicheLower === lowerIdentifier ||
        nicheLower.includes(lowerIdentifier) ||
        lowerIdentifier.includes(nicheLower)
      ) {
        confidence = Math.max(confidence, 65)
        reasons.push("Identifier matches detected niche")
      }
    }

    // AGGRESSIVE: Check description if available
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

    // AGGRESSIVE: Check tags if available
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

    // Update best match if this is better
    if (confidence > bestConfidence) {
      bestMatch = upload
      bestConfidence = confidence
      bestReason = reasons.join(", ")
    }
  }

  // AGGRESSIVE: Lower threshold from 50% to 30%
  if (bestConfidence >= 30) {
    return { upload: bestMatch, confidence: bestConfidence, matchReason: bestReason }
  }

  return { upload: null, confidence: 0, matchReason: "No confident match found" }
}

// Placeholder for getRelatedTerms, assuming it's defined elsewhere or not strictly needed for this merge.
// If this function is critical and missing, it would need to be provided.
function getRelatedTerms(keywords: string[]): string[] {
  // This is a placeholder. A real implementation would involve a dictionary or NLP model.
  // For example, if keywords include "faith", related terms could be "spiritual", "religion", "god", etc.
  const related: { [key: string]: string[] } = {
    faith: ["spiritual", "religion", "god", "belief", "soul", "divine", "sacred", "worship"],
    motivation: ["inspiration", "success", "hustle", "grind", "discipline", "goals", "achieve", "mindset"],
    meme: ["funny", "lol", "tiktok", "viral", "relatable", "comedy"],
    sfx: ["sound effect", "audio", "clip", "sound design", "music"],
    "b-roll": ["footage", "stock footage", "cinematic", "background", "overlay"],
  }

  let allRelated: string[] = []
  keywords.forEach((keyword) => {
    const lowerKeyword = keyword.toLowerCase()
    if (related[lowerKeyword]) {
      allRelated = allRelated.concat(related[lowerKeyword])
    }
  })

  // Add some general related terms
  allRelated.push("content", "video", "upload", "file", "asset")

  // Remove duplicates
  return Array.from(new Set(allRelated))
}

// Placeholder for extractKeywordsFromText, assuming it's defined elsewhere or not strictly needed for this merge.
function extractKeywordsFromText(text: string): string[] {
  // A very basic keyword extractor. A real implementation would use NLP techniques.
  const words = text.toLowerCase().match(/\b\w{4,}\b/g) || [] // Match words of 4+ characters
  const stopWords = new Set([
    "the",
    "and",
    "for",
    "with",
    "this",
    "that",
    "your",
    "about",
    "what",
    "when",
    "where",
    "how",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "a",
    "an",
    "in",
    "on",
    "at",
    "to",
    "of",
    "it",
    "its",
    "he",
    "she",
    "they",
    "them",
    "their",
    "we",
    "us",
    "our",
    "you",
    "your",
    "me",
    "my",
  ])

  const keywords = words.filter((word) => !stopWords.has(word))
  return Array.from(new Set(keywords)) // Return unique keywords
}
