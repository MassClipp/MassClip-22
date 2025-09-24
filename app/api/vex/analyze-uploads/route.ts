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
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ [Vex Analyze] No valid authorization header")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]

    try {
      // Verify the Firebase ID token
      const decodedToken = await getAuth().verifyIdToken(token)
      const userId = decodedToken.uid

      console.log("✅ [Vex Analyze] Authenticated user:", userId)

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
            categories: [],
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
      }))

      // Use AI to analyze and categorize uploads
      const { text } = await generateText({
        model: groq("llama-3.3-70b-versatile"),
        prompt: `You are Vex, an AI bundle assistant. Analyze this user's content uploads and provide detailed bundle categorization.

Content to analyze:
${JSON.stringify(contentSummary, null, 2)}

Please provide a JSON response with:
1. "categories" - Array of suggested bundle categories based on content themes/keywords
2. "recommendations" - Array of specific bundle ideas with titles and descriptions
3. "summary" - Brief overview of the user's content library and potential
4. "contentByCategory" - Object mapping categories to arrays of content titles that fit each category
5. "detailedAnalysis" - Array of objects with individual content analysis including suggested category, value assessment, and bundle potential

Focus on profitable bundle categories like:
- Photography (portraits, landscapes, wedding, etc.)
- Video editing (transitions, effects, templates)
- Social media (templates, graphics, content packs)
- Design assets (fonts, graphics, mockups)
- Educational content (tutorials, courses, guides)
- Motivation/Inspiration content
- Fitness/Health content
- Business/Marketing content

Format as valid JSON only, no markdown or extra text.`,
      })

      let analysis
      try {
        analysis = JSON.parse(text)
      } catch (parseError) {
        console.error("❌ [Vex Analyze] Failed to parse AI response:", parseError)
        // Fallback analysis
        analysis = {
          categories: ["Mixed Content"],
          recommendations: ["Create a starter bundle with your best content"],
          summary: "Content analysis completed. Consider organizing your uploads into themed bundles.",
          contentByCategory: { "Mixed Content": uniqueUploads.map((u) => u.title) },
          detailedAnalysis: uniqueUploads.map((u) => ({
            title: u.title,
            category: "Mixed Content",
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
      console.error("❌ [Vex Analyze] Auth error:", authError)
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }
  } catch (error) {
    console.error("❌ [Vex Analyze] General error:", error)
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
