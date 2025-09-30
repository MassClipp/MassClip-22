import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
import { getAuth } from "firebase-admin/auth"
import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"

// Initialize Firebase Admin
initializeFirebaseAdmin()

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Vex Analyze] Starting upload analysis...")

    // Get authorization header
    const authHeader = request.headers.get("authorization")
    console.log("[v0] Auth header present:", !!authHeader)
    console.log("[v0] Auth header format:", authHeader?.substring(0, 20) + "...")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ [Vex Analyze] No valid authorization header")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    console.log("[v0] Token extracted, length:", token?.length)

    try {
      console.log("[v0] Attempting to verify Firebase ID token...")
      const decodedToken = await getAuth().verifyIdToken(token)
      const userId = decodedToken.uid
      console.log("✅ [Vex Analyze] Authenticated user:", userId)

      if (!process.env.GROQ_API_KEY) {
        console.error("❌ [Vex Analyze] GROQ_API_KEY environment variable is missing")
        return NextResponse.json(
          {
            error: "Server configuration error",
            details: "AI service not configured",
          },
          { status: 500 },
        )
      }

      console.log("🗂️ [Vex Analyze] Loading user's folder structure...")
      const foldersSnapshot = await db.collection("folders").where("userId", "==", userId).get()

      const userFolders = foldersSnapshot.docs
        .map((doc) => ({
          id: doc.id,
          name: doc.data().name,
          fileCount: doc.data().fileCount || 0,
        }))
        .sort((a, b) => a.name.localeCompare(b.name))

      console.log(
        `✅ [Vex Analyze] Found ${userFolders.length} user folders:`,
        userFolders.map((f) => f.name),
      )

      // Query multiple collections for uploads
      const collections = ["uploads", "free_content", "videos", "content"]
      let allUploads: any[] = []

      for (const collectionName of collections) {
        try {
          console.log(`🔍 [Vex Analyze] Checking collection: ${collectionName}`)

          const snapshot = await db.collection(collectionName).where("uid", "==", userId).limit(100).get()

          if (!snapshot.empty) {
            const uploads = snapshot.docs.map((doc) => {
              const data = doc.data()
              return {
                id: doc.id,
                title: data.title || data.filename || "Untitled",
                filename: data.filename || data.title || "Unknown",
                description: data.description || "",
                tags: data.tags || [],
                mimeType: data.mimeType || data.type || "unknown",
                contentType: determineContentType(data.mimeType || data.type || ""),
                collection: collectionName,
                createdAt: data.createdAt || data.addedAt || new Date(),
                fileSize: data.fileSize || 0,
                duration: data.duration || null,
                url: data.url || data.downloadURL || null,
                folderId: data.folderId || null,
                folderName: data.folderName || null,
              }
            })

            allUploads = [...allUploads, ...uploads]
            console.log(`✅ [Vex Analyze] Found ${uploads.length} uploads in ${collectionName}`)
          }
        } catch (collectionError) {
          console.log(`⚠️ [Vex Analyze] Error querying ${collectionName}:`, collectionError)
        }
      }

      // Remove duplicates and sort by creation date
      const uniqueUploads = allUploads.filter(
        (upload, index, self) =>
          index === self.findIndex((u) => u.title === upload.title && u.filename === upload.filename),
      )

      uniqueUploads.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime()
        const dateB = new Date(b.createdAt).getTime()
        return dateB - dateA
      })

      console.log(`✅ [Vex Analyze] Found ${uniqueUploads.length} unique uploads to analyze`)

      if (uniqueUploads.length === 0) {
        return NextResponse.json({
          success: true,
          analysis: {
            totalUploads: 0,
            categories: userFolders.length > 0 ? userFolders.map((f) => f.name) : [],
            recommendations: ["Upload some content first to get personalized bundle recommendations!"],
            summary: "No uploads found. Start by uploading your content to get AI-powered bundle suggestions.",
          },
        })
      }

      // Prepare content for AI analysis
      const contentSummary = uniqueUploads.map((upload) => ({
        title: upload.title,
        type: upload.contentType,
        description: upload.description,
        tags: upload.tags,
        filename: upload.filename,
        folderName: upload.folderName,
      }))

      let analysis
      try {
        console.log("[v0] Starting AI analysis with Groq...")
        const { text } = await generateText({
          model: groq("llama-3.3-70b-versatile"),
          prompt: `You are Vex, an AI bundle assistant. Analyze this user's content uploads and provide detailed bundle categorization.

User's existing folders: ${userFolders.map((f) => f.name).join(", ")}

Content to analyze:
${JSON.stringify(contentSummary, null, 2)}

Please provide a JSON response with:
1. "categories" - Array of suggested bundle categories. PRIORITIZE the user's existing folder names: ${userFolders.map((f) => f.name).join(", ")}. Only suggest new categories if the existing folders don't cover the content well.
2. "recommendations" - Array of specific bundle ideas with titles and descriptions
3. "summary" - Brief overview of the user's content library and potential
4. "contentByCategory" - Object mapping categories to arrays of content titles that fit each category
5. "detailedAnalysis" - Array of objects with individual content analysis including suggested category, value assessment, and bundle potential

IMPORTANT: 
- Use the user's actual folder names (${userFolders.map((f) => f.name).join(", ")}) as primary categories when possible
- Only suggest new categories if the content doesn't fit existing folders
- Return ONLY valid JSON. No markdown formatting, no code blocks, no extra text. Just pure JSON.`,
        })

        console.log("[v0] AI analysis completed, parsing response...")

        let cleanedText = text.trim()

        // Remove markdown code blocks if present
        if (cleanedText.startsWith("```json")) {
          cleanedText = cleanedText.replace(/^```json\s*/, "").replace(/\s*```$/, "")
        } else if (cleanedText.startsWith("```")) {
          cleanedText = cleanedText.replace(/^```\s*/, "").replace(/\s*```$/, "")
        }

        // Remove any leading/trailing whitespace and newlines
        cleanedText = cleanedText.trim()

        console.log("[v0] Attempting to parse cleaned AI response:", cleanedText.substring(0, 200) + "...")

        analysis = JSON.parse(cleanedText)
        console.log("✅ [Vex Analyze] Successfully parsed AI response")
      } catch (aiError) {
        console.error("❌ [Vex Analyze] AI analysis failed:", aiError)

        const suggestedCategories = userFolders.length > 0 ? userFolders.map((f) => f.name) : ["Main", "Uncategorized"]

        analysis = {
          categories: suggestedCategories,
          recommendations: [
            "Create a starter bundle with your best content",
            "Consider organizing content by your existing folders",
            "Group similar themed content together for better value",
          ],
          summary: `Content analysis completed. Found ${uniqueUploads.length} uploads. Your folders: ${suggestedCategories.join(", ")}. Consider organizing your uploads into themed bundles using your existing folder structure.`,
          contentByCategory: {
            [suggestedCategories[0]]: uniqueUploads.slice(0, 10).map((u) => u.title),
          },
          detailedAnalysis: uniqueUploads.slice(0, 20).map((u) => ({
            title: u.title,
            category: u.folderName || suggestedCategories[0],
            value: "Medium",
            bundlePotential: "Good for starter bundle",
          })),
        }
      }

      const analysisData = {
        userId,
        totalUploads: uniqueUploads.length,
        categories: analysis.categories || [],
        recommendations: analysis.recommendations || [],
        summary: analysis.summary || "Analysis completed successfully.",
        contentByCategory: analysis.contentByCategory || {},
        detailedAnalysis: analysis.detailedAnalysis || [],
        uploads: uniqueUploads, // Store full upload details
        userFolders: userFolders,
        analyzedAt: new Date(),
        lastUpdated: new Date(),
      }

      // Save to vex_content_analysis collection
      await db.collection("vex_content_analysis").doc(userId).set(analysisData)
      console.log("✅ [Vex Analyze] Stored detailed analysis for chat access")

      console.log("✅ [Vex Analyze] Analysis completed successfully")

      return NextResponse.json({
        success: true,
        analysis: {
          totalUploads: uniqueUploads.length,
          categories: analysis.categories || [],
          recommendations: analysis.recommendations || [],
          summary: analysis.summary || "Analysis completed successfully.",
        },
        uploads: uniqueUploads.slice(0, 20), // Return first 20 for reference
      })
    } catch (authError) {
      console.error("❌ [Vex Analyze] Auth error details:", {
        error: authError,
        message: authError instanceof Error ? authError.message : "Unknown auth error",
        tokenLength: token?.length,
        hasToken: !!token,
      })
      return NextResponse.json(
        {
          error: "Invalid token",
          details: authError instanceof Error ? authError.message : "Authentication failed",
        },
        { status: 401 },
      )
    }
  } catch (error) {
    console.error("❌ [Vex Analyze] General error:", error)
    console.error("❌ [Vex Analyze] Error stack:", error instanceof Error ? error.stack : "No stack trace")
    return NextResponse.json(
      {
        error: "Failed to analyze uploads",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

function determineContentType(mimeType: string): "video" | "audio" | "image" | "document" {
  if (!mimeType) return "document"

  if (mimeType.startsWith("video/")) return "video"
  if (mimeType.startsWith("audio/")) return "audio"
  if (mimeType.startsWith("image/")) return "image"
  return "document"
}
