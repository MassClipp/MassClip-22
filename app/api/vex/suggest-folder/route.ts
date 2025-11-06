import { type NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
import { generateText } from "ai"
import { canAnalyzeTranscripts } from "@/lib/subscription"
import { getUserTierInfo } from "@/lib/user-tier-service"

// Initialize Firebase Admin
initializeFirebaseAdmin()

async function verifyAuthToken(request: NextRequest) {
  try {
    const headersList = headers()
    const authorization = headersList.get("authorization")

    if (!authorization?.startsWith("Bearer ")) {
      return null
    }

    const token = authorization.split("Bearer ")[1]
    if (!token) {
      return null
    }

    const { getAuth } = await import("firebase-admin/auth")
    const decodedToken = await getAuth().verifyIdToken(token)
    return decodedToken
  } catch (error) {
    console.error("Token verification failed:", error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuthToken(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { filename, title, description, fileType, transcript, duration, mimeType } = await request.json()

    if (!filename) {
      return NextResponse.json({ error: "Filename is required" }, { status: 400 })
    }

    console.log(`🔍 [Vex Suggest] Analyzing file: ${filename}`)

    const tierInfo = await getUserTierInfo(user.uid)
    const userPlan = tierInfo.tier || "free"
    const canAnalyze = canAnalyzeTranscripts(userPlan)

    console.log(`🔐 [Vex Suggest] User plan: ${userPlan}, Can analyze transcripts: ${canAnalyze}`)

    // Get user's folders
    const foldersSnapshot = await db
      .collection("folders")
      .where("userId", "==", user.uid)
      .where("isDeleted", "==", false)
      .get()

    const folders = ["Main"] // Always include Main folder
    foldersSnapshot.docs.forEach((doc) => {
      const folderData = doc.data()
      folders.push(folderData.name)
    })

    const transcriptSection =
      canAnalyze && transcript
        ? `- Transcript: "${transcript.substring(0, 1000)}${transcript.length > 1000 ? "..." : ""}"`
        : ""

    const durationSection = duration
      ? `- Duration: ${duration < 60 ? `${duration}s` : `${Math.floor(duration / 60)}m ${duration % 60}s`}`
      : ""

    // Use AI to suggest the best folder with enhanced context
    const { text } = await generateText({
      model: "groq/llama-3.1-70b-versatile", // Use more powerful model for better analysis
      prompt: `You are Vex, an AI assistant helping organize content files. 

Analyze this file and suggest which folder it should go in:
- Filename: ${filename}
- Title: ${title || "Not provided"}
- Description: ${description || "Not provided"}
- File Type: ${fileType || "Unknown"}
- MIME Type: ${mimeType || "Unknown"}
${durationSection}
${transcriptSection}

Available folders: ${folders.join(", ")}

${canAnalyze && transcript ? "IMPORTANT: The transcript is the MOST IMPORTANT signal for understanding content. Analyze it carefully for themes, topics, and tone." : ""}

Rules:
1. Choose the MOST appropriate folder from the available list
2. If the transcript mentions faith, spirituality, God, Jesus, or religious themes, strongly consider "Faith" or similar folders
3. If the transcript discusses motivation, success, hustle, or mindset, consider "Motivation" or similar folders
4. Consider the content theme and actual meaning, not just keywords
5. If none fit perfectly, suggest "Main" 
6. Be practical and confident in your choice

Respond with ONLY the folder name and a brief reason (max 30 words).
Format: "FOLDER_NAME: reason"

Example: "Faith: The transcript discusses spiritual themes and mentions God multiple times, indicating faith-based content"`,
    })

    const response = text.trim()
    const [suggestedFolder, ...reasonParts] = response.split(": ")
    const reason = reasonParts.join(": ") || "Best match based on content analysis"

    // Validate the suggested folder exists
    const validFolder = folders.includes(suggestedFolder) ? suggestedFolder : "Main"

    // Get folder ID if not Main
    let folderId = "main"
    if (validFolder !== "Main") {
      const folderDoc = foldersSnapshot.docs.find((doc) => doc.data().name === validFolder)
      if (folderDoc) {
        folderId = folderDoc.id
      }
    }

    const confidence =
      canAnalyze && transcript && validFolder === suggestedFolder
        ? "very_high"
        : validFolder === suggestedFolder
          ? "high"
          : "fallback"

    console.log(`✅ [Vex Suggest] Suggested folder: ${validFolder} (${reason}) [Confidence: ${confidence}]`)

    return NextResponse.json({
      success: true,
      suggestion: {
        folderId,
        folderName: validFolder,
        reason: reason,
        confidence,
        usedTranscript: canAnalyze && !!transcript,
      },
      availableFolders: folders,
      analysis: {
        filename,
        title,
        fileType,
        userPlan,
        transcriptAnalyzed: canAnalyze && !!transcript,
        processedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("❌ [Vex Suggest] Error suggesting folder:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
