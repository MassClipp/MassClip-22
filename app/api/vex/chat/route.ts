import { NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
import { getAuth } from "firebase-admin/auth"
import Stripe from "stripe"
import { getUserTierInfo, incrementUserBundles } from "@/lib/user-tier-service"

// Initialize Firebase Admin
initializeFirebaseAdmin()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export const maxDuration = 30

// REMOVED: ReasoningPass, MultiPassDecision interfaces, and related multi-pass reasoning functions
// ADDED: SemanticMatch, SemanticAnalysisResult interfaces, and analyzeContentSemantics function

interface SemanticMatch {
  id: string
  title: string
  evidence: string
  confidence: number
  reasoning: string
}

interface SemanticAnalysisResult {
  matches: SemanticMatch[]
  overallConfidence: number
  recommendation: "proceed" | "ask_user" | "reject"
  reasoning: string
}

/**
 * Analyzes content semantics using LLM-first approach.
 * Directly analyzes transcripts using the LLM instead of keyword matching.
 */
async function analyzeContentSemantics(
  userRequest: string,
  targetFolder: string,
  fileIdentifiers: string[],
  uploads: any[],
): Promise<SemanticAnalysisResult> {
  console.log(`[v0] 🧠 Starting LLM semantic analysis for "${targetFolder}"`)
  console.log(`[v0] 📝 User request: "${userRequest}"`)
  console.log(`[v0] 📊 Analyzing ${uploads.length} uploads`)

  // Build a prompt with all transcripts for the LLM to analyze
  const transcriptData = uploads
    .map((upload, index) => {
      return `
[${index + 1}] ID: ${upload.id}
Title: ${upload.title}
Transcript: ${upload.transcript ? upload.transcript.substring(0, 1000) : "No transcript available"}
---`
    })
    .join("\n")

  const analysisPrompt = `You are analyzing video content to determine if it matches a user's organization request.

User's request: "${userRequest}"
Target folder: "${targetFolder}"

Here are the available videos with their transcripts:

${transcriptData}

Task: Determine which videos semantically match the folder theme "${targetFolder}" based on their actual transcript content.

For each video that matches:
1. Quote specific evidence from the transcript that proves it fits
2. Assign a confidence score (0-100)
3. Explain your reasoning

Respond in JSON format:
{
  "matches": [
    {
      "id": "video_id",
      "title": "video_title",
      "evidence": "Direct quotes from transcript showing relevance",
      "confidence": 95,
      "reasoning": "Why this video fits the folder theme"
    }
  ],
  "overallConfidence": 85,
  "recommendation": "proceed" | "ask_user" | "reject",
  "reasoning": "Overall assessment of the match quality"
}

Only include videos with confidence >= 60. Be strict - only match videos that genuinely discuss the folder theme.`

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a content analysis expert. Analyze transcripts semantically and quote evidence to support your matches.",
          },
          {
            role: "user",
            content: analysisPrompt,
          },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`)
    }

    const data = await response.json()
    const result = JSON.parse(data.choices[0].message.content) as SemanticAnalysisResult

    console.log(`[v0] ✅ LLM analysis complete: ${result.matches.length} matches found`)
    console.log(`[v0] 📊 Overall confidence: ${result.overallConfidence}%`)
    console.log(`[v0] 💡 Recommendation: ${result.recommendation}`)

    return result
  } catch (error) {
    console.error("[v0] ❌ LLM analysis failed:", error)
    // Fallback to reject if LLM fails
    return {
      matches: [],
      overallConfidence: 0,
      recommendation: "reject",
      reasoning: "Failed to analyze content semantically. Please try again.",
    }
  }
}

// REMOVED: analyzeSemanticFit, analyzeFolderContext, analyzeTranscriptRelevance
// REMOVED: performMultiPassReasoning

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
You say: "I'll organize these 3 faith videos: '2819 Rebellion', 'AZ Compass', and 'John Mark Stev'"
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

    // CHANGE: Adding multi-pass reasoning for ORGANIZE_FILES action
    if (assistantMessage.includes("ORGANIZE_FILES:") && userId) {
      try {
        console.log("[v0] 🧠 Starting LLM semantic analysis for ORGANIZE_FILES action...")

        // Extract organization data
        const organizeMatch = assistantMessage.match(/ORGANIZE_FILES:\s*({.*?})/s)
        if (!organizeMatch) {
          throw new Error("No valid organization data found")
        }

        const organizeData = JSON.parse(organizeMatch[1])
        console.log("[v0] Parsed organization data:", organizeData)

        // Get user's uploads for analysis
        const analysisDoc = await db.collection("vex_content_analysis").doc(userId).get()
        if (!analysisDoc.exists) {
          throw new Error("Content analysis not found")
        }

        const analysisData = analysisDoc.data()!
        const uploads = analysisData.uploads || []

        // Perform LLM semantic analysis
        const semanticResult = await analyzeContentSemantics(
          messages[messages.length - 1].content, // Use the last user message as the request
          organizeData.targetFolder,
          organizeData.fileIds, // Pass original requested file IDs for context, LLM will determine matches
          uploads,
        )

        // Handle recommendation
        if (semanticResult.recommendation === "reject") {
          assistantMessage = `I analyzed the transcripts and couldn't find a good semantic match for organizing content into "${organizeData.targetFolder}".\n\n**Reasoning:** ${semanticResult.reasoning}\n\nWould you like me to try a different folder or show you what I found?`
          return NextResponse.json({ message: assistantMessage })
        }

        if (semanticResult.recommendation === "ask_user") {
          // Show user the matches with evidence and ask for confirmation
          let confirmationMessage = `I found ${semanticResult.matches.length} videos that might fit "${organizeData.targetFolder}", but I want to confirm with you:\n\n`

          semanticResult.matches.forEach((match, index) => {
            confirmationMessage += `**${index + 1}. ${match.title}** (${match.confidence}% confidence)\n`
            confirmationMessage += `Evidence: "${match.evidence}"\n`
            confirmationMessage += `Reasoning: ${match.reasoning}\n\n`
          })

          confirmationMessage += `\nOverall confidence: ${semanticResult.overallConfidence}%\n`
          confirmationMessage += `${semanticResult.reasoning}\n\n`
          confirmationMessage += `Should I proceed with organizing these ${semanticResult.matches.length} videos into "${organizeData.targetFolder}"?`

          assistantMessage = confirmationMessage
          return NextResponse.json({ message: assistantMessage })
        }

        // Proceed with organization using the semantically matched IDs
        console.log("[v0] Proceeding with organization based on semantic matches")

        // Update organizeData with the semantically matched IDs
        organizeData.fileIds = semanticResult.matches.map((match) => match.id)

        // Construct a more informative progress message
        let progressMessage = `🗂️ **Organizing ${semanticResult.matches.length} videos into "${organizeData.targetFolder}"**\n\n`
        progressMessage += `Confidence: ${semanticResult.overallConfidence}%\n\n`
        progressMessage += `**Matched videos:**\n`

        semanticResult.matches.forEach((match, index) => {
          progressMessage += `${index + 1}. ${match.title} (${match.confidence}%)\n`
        })

        // Replace the ORGANIZE_FILES action with the progress message
        assistantMessage = assistantMessage.replace(/ORGANIZE_FILES:\s*{.*?}/s, progressMessage)

        // Call the organize files API
        const organizeResult = await organizeFilesDirectly(userId, organizeData)

        if (organizeResult.success) {
          assistantMessage += `\n\n✅ Successfully organized ${organizeResult.movedCount} videos into "${organizeData.targetFolder}"!`
          if (organizeResult.notFoundFiles && organizeResult.notFoundFiles.length > 0) {
            assistantMessage += `\n\n*Note: Some files could not be found or moved: ${organizeResult.notFoundFiles.join(", ")}*`
          }
        } else {
          assistantMessage += `\n\n❌ Error organizing files: ${organizeResult.error}`
        }

        return NextResponse.json({ message: assistantMessage })
      } catch (error) {
        console.error("[v0] File organization LLM integration failed:", error)
        assistantMessage = `I encountered an error while trying to organize your files: ${error instanceof Error ? error.message : "Unknown error"}`
        // If the original message contained the action, remove it to avoid confusion
        assistantMessage = assistantMessage.replace(/ORGANIZE_FILES:\s*{.*?}/s, "").trim()
        if (assistantMessage === "") {
          assistantMessage = "Sorry, I couldn't organize your files due to an internal error."
        }
        return NextResponse.json({ message: assistantMessage })
      }
    }

    // CHANGE: Replace bundle validation with LLM semantic analysis
    if (assistantMessage.includes("CREATE_BUNDLE:") && userId) {
      try {
        console.log("[v0] Vex wants to create a bundle, performing semantic analysis...")

        // Extract bundle data
        const bundleMatch = assistantMessage.match(/CREATE_BUNDLE:\s*({.*?})/s)
        if (!bundleMatch) {
          throw new Error("No valid bundle data found")
        }

        const bundleData = JSON.parse(bundleMatch[1])
        console.log("[v0] Parsed bundle data:", bundleData)

        // Get user's uploads for analysis
        const analysisDoc = await db.collection("vex_content_analysis").doc(userId).get()
        if (!analysisDoc.exists) {
          assistantMessage = "Please run content analysis first before creating bundles."
          return NextResponse.json({ message: assistantMessage })
        }

        const analysisData = analysisDoc.data()!
        const uploads = analysisData.uploads || []

        // Perform LLM semantic analysis
        const semanticResult = await analyzeContentSemantics(
          messages[messages.length - 1].content, // Use the last user message as the request
          bundleData.title, // Use bundle title as the target theme
          bundleData.contentIds, // Pass original requested content IDs for context, LLM will determine matches
          uploads,
        )

        // Handle recommendation
        if (semanticResult.recommendation === "reject") {
          assistantMessage = `I analyzed the content and couldn't find a good semantic match for your "${bundleData.title}" bundle.\n\n**Reasoning:** ${semanticResult.reasoning}\n\nWould you like me to suggest different content or adjust the bundle theme?`
          return NextResponse.json({ message: assistantMessage })
        }

        if (semanticResult.recommendation === "ask_user") {
          // Show user the matches with evidence and ask for confirmation
          let confirmationMessage = `I found ${semanticResult.matches.length} videos that could fit your "${bundleData.title}" bundle, but I want to confirm with you:\n\n`

          semanticResult.matches.forEach((match, index) => {
            confirmationMessage += `**${index + 1}. ${match.title}** (${match.confidence}% confidence)\n`
            confirmationMessage += `Evidence: "${match.evidence}"\n`
            confirmationMessage += `Reasoning: ${match.reasoning}\n\n`
          })

          confirmationMessage += `\nOverall confidence: ${semanticResult.overallConfidence}%\n`
          confirmationMessage += `${semanticResult.reasoning}\n\n`
          confirmationMessage += `Should I proceed with creating this bundle with these ${semanticResult.matches.length} items?`

          assistantMessage = confirmationMessage
          return NextResponse.json({ message: assistantMessage })
        }

        // Proceed with bundle creation using the semantically matched IDs
        console.log("[v0] Proceeding with bundle creation based on semantic matches")

        // Update bundleData with the semantically matched IDs
        bundleData.contentIds = semanticResult.matches.map((match) => match.id)

        // Construct a progress message
        let progressMessage = `🚀 **Creating "${bundleData.title}" bundle with ${semanticResult.matches.length} videos**\n\n`
        progressMessage += `Confidence: ${semanticResult.overallConfidence}%\n\n`

        // Replace the CREATE_BUNDLE action with the progress message
        assistantMessage = assistantMessage.replace(/CREATE_BUNDLE:\s*{.*?}/s, progressMessage)

        // Call the bundle creation API
        const bundleResult = await createBundleDirectly(userId, bundleData)

        if (bundleResult.success) {
          assistantMessage += `\n\n✅ Bundle "${bundleResult.bundle.title}" created successfully!`
        } else {
          assistantMessage += `\n\n❌ Error creating bundle: ${bundleResult.error}`
        }

        return NextResponse.json({ message: assistantMessage })
      } catch (error) {
        console.error("[v0] Bundle creation LLM integration failed:", error)
        assistantMessage = `I encountered an error while trying to create your bundle: ${error instanceof Error ? error.message : "Unknown error"}`
        // If the original message contained the action, remove it to avoid confusion
        assistantMessage = assistantMessage.replace(/CREATE_BUNDLE:\s*{.*?}/s, "").trim()
        if (assistantMessage === "") {
          assistantMessage = "Sorry, I couldn't create your bundle due to an internal error."
        }
        return NextResponse.json({ message: assistantMessage })
      }
    }

    // Handle REFRESH_ANALYSIS action
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

    // Handle RENAME_CONTENT action
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

    // Handle CREATE_FOLDER action
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

async function organizeFilesDirectly(userId: string, organizeData: any) {
  try {
    const { targetFolder, fileIds, reason } = organizeData

    if (!targetFolder || !fileIds || !Array.isArray(fileIds)) {
      return { success: false, error: "Missing required organization information." }
    }

    console.log(`[v0] 📂 Starting organization: ${fileIds.length} files → "${targetFolder}"`)

    // CHANGE: Removed keyword extraction and fuzzy matching
    // Files are already validated by LLM semantic analysis

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
        .where("uid", "==", userId) // Use uid for backward compatibility
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

    const analysisDoc = await db.collection("vex_content_analysis").doc(userId).get()
    if (!analysisDoc.exists) {
      return {
        success: false,
        error: "Content analysis not found. Please refresh your content analysis first.",
      }
    }

    const analysisData = analysisDoc.data()!
    const uploads = analysisData.uploads || []
    console.log(`[v0] 📊 Loaded ${uploads.length} uploads from analysis for reference`)

    const movedFiles: string[] = []
    const notFoundFiles: string[] = []

    // CHANGE: Direct ID lookup - no fuzzy matching needed
    for (const fileId of fileIds) {
      // Find the upload object corresponding to the fileId from the analysis data
      const upload = uploads.find((u: any) => u.id === fileId)

      if (!upload) {
        console.log(`[v0] ❌ Upload not found in analysis data for ID: "${fileId}"`)
        notFoundFiles.push(fileId)
        continue
      }

      console.log(`[v0] ✅ Found upload object for ID: "${fileId}" (Title: "${upload.title}")`)

      try {
        // Get the actual document reference from Firestore
        let docRef = db.collection(upload.collection).doc(upload.id) // CHANGED: from const to let
        let docSnap = await docRef.get() // CHANGED: from const to let

        if (!docSnap.exists) {
          // Try searching other potential collections if not found in 'uploads'
          // This is a basic fallback; a more robust solution might involve a dedicated search index
          const collectionsToSearch = ["videos", "images", "audio"] // Add other relevant collections
          let found = false
          for (const collection of collectionsToSearch) {
            const potentialDocRef = db.collection(collection).doc(upload.id)
            const potentialDocSnap = await potentialDocRef.get()
            if (potentialDocSnap.exists) {
              docRef = potentialDocRef // Reassign docRef
              docSnap = potentialDocSnap // Reassign docSnap
              found = true
              break
            }
          }
          if (!found) {
            console.log(`[v0] ❌ Document doesn't exist in Firestore for ID: ${upload.id}`)
            notFoundFiles.push(fileId)
            continue
          }
        }

        const docData = docSnap.data()!
        // Verify ownership using both userId and uid fields
        if (docData.uid !== userId && docData.userId !== userId) {
          console.log(`[v0] ❌ Permission denied for ID ${upload.id}. User ID mismatch.`)
          notFoundFiles.push(fileId)
          continue
        }

        // Update the document in Firestore
        await docRef.update({
          folderId: targetFolderId,
          folderName: targetFolder, // Store folder name for easier reference
          updatedAt: new Date().toISOString(), // Use ISO string for consistency
        })

        movedFiles.push(upload.title || upload.filename || fileId) // Use title, filename, or ID for reporting
        console.log(`[v0] ✅ Successfully moved "${upload.title || fileId}" to "${targetFolder}"`)
      } catch (error) {
        console.error(`[v0] ❌ Error moving document with ID ${upload.id}:`, error)
        notFoundFiles.push(fileId)
      }
    }

    console.log(`[v0] ✅ Organization complete: ${movedFiles.length} moved, ${notFoundFiles.length} failed`)

    // Trigger analysis refresh in background as content has been organized
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
      notFoundFiles: notFoundFiles.length > 0 ? notFoundFiles : undefined,
    }
  } catch (error) {
    console.error("[v0] Organization error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred.",
    }
  }
}

async function createBundleDirectly(userId: string, bundleData: any) {
  try {
    const { title, description, contentIds, price } = bundleData

    if (!title || !contentIds || !Array.isArray(contentIds) || contentIds.length === 0) {
      return { success: false, error: "Missing required bundle information." }
    }

    console.log(`[v0] 🎁 Creating bundle: "${title}" with ${contentIds.length} items`)

    // CHANGE: Removed keyword extraction and fuzzy matching
    // Content is already validated by LLM semantic analysis

    // Fetch user data to check for connected Stripe account
    const userDoc = await db.collection("users").doc(userId).get()
    if (!userDoc.exists) {
      return { success: false, error: "User not found." }
    }

    const userData = userDoc.data()!
    const connectedAccount = userData.connectedAccount || userData.stripeConnectedAccount

    if (!connectedAccount?.stripe_user_id && !connectedAccount?.stripeAccountId) {
      return {
        success: false,
        error: "Please connect your Stripe account first to create bundles.",
      }
    }

    const stripeAccountId = connectedAccount.stripe_user_id || connectedAccount.stripeAccountId

    // Fetch analysis data to get upload details
    const analysisDoc = await db.collection("vex_content_analysis").doc(userId).get()
    if (!analysisDoc.exists) {
      return { success: false, error: "Please run content analysis first before creating bundles." }
    }

    const analysisData = analysisDoc.data()!
    const availableUploads = analysisData.uploads || []

    const contentItems = []

    // CHANGE: Direct ID lookup - no fuzzy matching needed
    for (const contentId of contentIds) {
      // Find the upload object corresponding to the contentId from the analysis data
      const upload = availableUploads.find((u: any) => u.id === contentId)

      if (!upload) {
        console.log(`[v0] ❌ Could not find upload in analysis data for ID: "${contentId}"`)
        continue // Skip if not found in analysis data
      }

      console.log(`[v0] ✅ Found upload object for ID: "${contentId}" (Title: "${upload.title}")`)

      try {
        // Get the actual document reference from Firestore
        const contentDoc = await db.collection(upload.collection).doc(upload.id).get()
        if (contentDoc.exists) {
          const contentData = contentDoc.data()!

          // Verify ownership
          if (contentData.uid === userId || contentData.userId === userId) {
            contentItems.push({
              id: upload.id,
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
            })
          } else {
            console.log(`[v0] ❌ Ownership mismatch for content ID: ${upload.id}`)
          }
        } else {
          console.log(`[v0] ❌ Content document not found in Firestore for ID: ${upload.id}`)
        }
      } catch (error) {
        console.error(`[v0] Error processing content ID ${upload.id}:`, error)
      }
    }

    if (contentItems.length === 0) {
      return { success: false, error: "No valid content items found for this bundle." }
    }

    console.log(`[v0] ✅ Prepared ${contentItems.length} content items for bundle`)

    // Create Stripe product and price
    // Using a newer API version for Stripe initialization
    const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-12-18.acacia" })

    const product = await stripeClient.products.create(
      {
        name: title,
        description: description || `Bundle containing ${contentItems.length} items`,
        metadata: {
          bundleId: "pending", // Placeholder, will be updated after DB save
          userId: userId,
          contentCount: contentItems.length.toString(),
        },
      },
      {
        stripeAccount: stripeAccountId,
      },
    )

    const priceAmount = Math.round((price || 9.99) * 100)
    const stripePrice = await stripeClient.prices.create(
      {
        product: product.id,
        unit_amount: priceAmount,
        currency: "usd",
      },
      {
        stripeAccount: stripeAccountId,
      },
    )

    // Create bundle document in Firestore
    const bundleRef = db.collection("bundles").doc()
    const bundleDoc = {
      id: bundleRef.id,
      userId: userId,
      title: title,
      description: description || "",
      price: price || 9.99,
      stripeProductId: product.id,
      stripePriceId: stripePrice.id,
      stripeAccountId: stripeAccountId,
      contentItems: contentItems, // Store full content item details
      contentCount: contentItems.length,
      thumbnailUrl: contentItems[0]?.thumbnailUrl || "", // Use first item's thumbnail as default
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await bundleRef.set(bundleDoc)

    // Update Stripe product with the final bundle ID
    await stripeClient.products.update(
      product.id,
      {
        metadata: {
          bundleId: bundleRef.id, // Final bundle ID
          userId: userId,
          contentCount: contentItems.length.toString(),
        },
      },
      {
        stripeAccount: stripeAccountId,
      },
    )

    console.log(`[v0] ✅ Bundle created successfully with ID: ${bundleRef.id}`)

    // Update user's bundle creation count
    await incrementUserBundles(userId)

    return {
      success: true,
      bundleId: bundleRef.id,
      bundle: {
        id: bundleRef.id,
        title: bundleDoc.title,
        description: bundleDoc.description,
        price: bundleDoc.price,
        contentCount: bundleDoc.contentCount,
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

// Helper functions for file size and duration formatting
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
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
  if (!mimeType) return "unknown"
  const mimeParts = mimeType.split("/")
  if (mimeParts.length === 2) {
    return mimeParts[1].split(";")[0] // Remove potential charset info
  }
  return "unknown"
}

function getContentTypeFromMimeType(mimeType: string): string {
  if (!mimeType) return "unknown"
  if (mimeType.startsWith("video/")) return "video"
  if (mimeType.startsWith("audio/")) return "audio"
  if (mimeType.startsWith("image/")) return "image"
  if (
    mimeType.startsWith("text/") ||
    mimeType.startsWith("application/pdf") ||
    mimeType.startsWith("application/msword")
  )
    return "document"
  return "file"
}

// REMOVED: countMentionedItems (no longer needed for LLM-based actions)

// REMOVED: findBestMatch (no longer needed for LLM-based actions)

// REMOVED: extractKeywordsFromText (no longer needed for LLM-based actions)
// REMOVED: getRelatedTerms (no longer needed for LLM-based actions)

// Helper function definitions for RENAME_CONTENT and CREATE_FOLDER actions
async function renameContentDirectly(userId: string, renameData: any) {
  try {
    const { contentId, newTitle, reason } = renameData

    if (!contentId || !newTitle) {
      return { success: false, error: "Missing content ID or new title." }
    }

    // Fetch the document to verify ownership and get the old title
    let docRef = db.collection("uploads").doc(contentId) // CHANGED: from const to let
    let docSnap = await docRef.get() // CHANGED: from const to let

    if (!docSnap.exists) {
      // Try searching other potential collections if not found in 'uploads'
      // This is a basic fallback; a more robust solution might involve a dedicated search index
      const collectionsToSearch = ["videos", "images", "audio"] // Add other relevant collections
      let found = false
      for (const collection of collectionsToSearch) {
        const potentialDocRef = db.collection(collection).doc(contentId)
        const potentialDocSnap = await potentialDocRef.get()
        if (potentialDocSnap.exists) {
          docRef = potentialDocRef // Reassign docRef
          docSnap = potentialDocSnap // Reassign docSnap
          found = true
          break
        }
      }
      if (!found) {
        return { success: false, error: "Content not found." }
      }
    }

    const docData = docSnap.data()
    if (!docData || (docData.uid !== userId && docData.userId !== userId)) {
      return { success: false, error: "Permission denied. You do not own this content." }
    }

    const oldTitle = docData.title || docData.filename || contentId

    await docRef.update({
      title: newTitle,
      reasonForRename: reason, // Store the reason for renaming
      updatedAt: new Date().toISOString(),
    })

    console.log(`[v0] ✅ Renamed content "${oldTitle}" to "${newTitle}" for user ${userId}`)
    return { success: true, oldTitle, newTitle, reason }
  } catch (error) {
    console.error("[v0] Error renaming content:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred while renaming content.",
    }
  }
}

async function createFolderDirectly(userId: string, folderData: any) {
  try {
    const { name, description } = folderData

    if (!name) {
      return { success: false, error: "Folder name is required." }
    }

    // Check if folder already exists for this user
    let existingFoldersSnapshot = await db
      .collection("folders")
      .where("userId", "==", userId)
      .where("name", "==", name)
      .where("isDeleted", "==", false)
      .limit(1)
      .get()

    if (existingFoldersSnapshot.empty) {
      existingFoldersSnapshot = await db
        .collection("folders")
        .where("uid", "==", userId) // Also check with uid for backward compatibility
        .where("name", "==", name)
        .where("isDeleted", "==", false)
        .limit(1)
        .get()
    }

    if (!existingFoldersSnapshot.empty) {
      return { success: false, error: `A folder named "${name}" already exists.` }
    }

    const folderRef = db.collection("folders").doc()
    await folderRef.set({
      id: folderRef.id,
      userId: userId, // Primary userId
      uid: userId, // For backward compatibility with older data
      name: name,
      description: description || "",
      fileCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    console.log(`[v0] ✅ Created folder "${name}" for user ${userId}`)
    return { success: true, folderId: folderRef.id, folderName: name }
  } catch (error) {
    console.error("[v0] Error creating folder:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred while creating the folder.",
    }
  }
}
