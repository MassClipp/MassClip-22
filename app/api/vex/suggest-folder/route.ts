import { type NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
import { generateText } from "ai"

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

    const { filename, title, description, fileType } = await request.json()

    if (!filename) {
      return NextResponse.json({ error: "Filename is required" }, { status: 400 })
    }

    console.log(`🔍 [Vex Suggest] Analyzing file: ${filename}`)

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

    // Use AI to suggest the best folder
    const { text } = await generateText({
      model: "groq/llama-3.1-8b-instant",
      prompt: `You are Vex, an AI assistant helping organize content files. 

Analyze this file and suggest which folder it should go in:
- Filename: ${filename}
- Title: ${title || "Not provided"}
- Description: ${description || "Not provided"}
- File Type: ${fileType || "Unknown"}

Available folders: ${folders.join(", ")}

Rules:
1. Choose the MOST appropriate folder from the available list
2. If none fit perfectly, suggest "Main" 
3. Consider the content theme, not just keywords
4. Be practical - don't overthink it

Respond with ONLY the folder name and a brief reason (max 20 words).
Format: "FOLDER_NAME: reason"

Example: "funny: This appears to be humorous content based on the filename"`,
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

    console.log(`✅ [Vex Suggest] Suggested folder: ${validFolder} (${reason})`)

    return NextResponse.json({
      success: true,
      suggestion: {
        folderId,
        folderName: validFolder,
        reason: reason,
        confidence: validFolder === suggestedFolder ? "high" : "fallback",
      },
      availableFolders: folders,
      analysis: {
        filename,
        title,
        fileType,
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
