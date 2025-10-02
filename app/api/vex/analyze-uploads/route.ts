import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
import { getAuth } from "firebase-admin/auth"
import { analyzeContent, getNicheContext } from "@/lib/vex-intelligence"

// Initialize Firebase Admin
initializeFirebaseAdmin()

interface Upload {
  id: string
  title: string
  filename: string
  description: string
  tags: string[]
  mimeType: string
  contentType: "video" | "audio" | "image" | "document"
  collection: string
  createdAt: any
  fileSize: number
  duration: number | null
  url: string | null
  folderId: string | null
  folderName: string | null
  // Keyword intelligence fields
  detectedNiche: string | null
  suggestedFolder: string | null
  nicheConfidence: number
}

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Vex Analyze v2] Starting comprehensive upload analysis...")

    // Get authorization header
    const authHeader = request.headers.get("authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ [Vex Analyze v2] No valid authorization header")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]

    try {
      const decodedToken = await getAuth().verifyIdToken(token)
      const userId = decodedToken.uid
      console.log("✅ [Vex Analyze v2] Authenticated user:", userId)

      console.log("🗂️ [Vex Analyze v2] Loading user's folder structure...")
      const foldersSnapshot = await db.collection("folders").where("userId", "==", userId).get()

      const userFolders = foldersSnapshot.docs
        .map((doc) => ({
          id: doc.id,
          name: doc.data().name,
          fileCount: doc.data().fileCount || 0,
        }))
        .sort((a, b) => a.name.localeCompare(b.name))

      const existingFolderNames = userFolders.map((f) => f.name)
      console.log(`✅ [Vex Analyze v2] Found ${userFolders.length} folders:`, existingFolderNames)

      const collections = ["uploads", "free_content", "videos", "content"]
      const uploadsByDocId = new Map<string, Upload>()
      let totalQueriedDocs = 0

      for (const collectionName of collections) {
        try {
          console.log(`🔍 [Vex Analyze v2] Querying collection: ${collectionName}`)

          // Try both uid and userId fields
          const uidSnapshot = await db.collection(collectionName).where("uid", "==", userId).limit(100).get()

          const userIdSnapshot = await db.collection(collectionName).where("userId", "==", userId).limit(100).get()

          const allDocs = [...uidSnapshot.docs, ...userIdSnapshot.docs]
          totalQueriedDocs += allDocs.length

          console.log(`📊 [Vex Analyze v2] Found ${allDocs.length} docs in ${collectionName}`)

          for (const doc of allDocs) {
            if (uploadsByDocId.has(doc.id)) {
              console.log(`⏭️ [Vex Analyze v2] Skipping duplicate doc ID: ${doc.id}`)
              continue
            }

            const data = doc.data()

            // Validate ownership
            if (data.uid !== userId && data.userId !== userId) {
              console.warn(`⚠️ [Vex Analyze v2] Skipping ${doc.id} - ownership mismatch`)
              continue
            }

            // Validate title
            const title = data.title || data.filename
            if (!title || title === "Untitled" || title === "Unknown") {
              console.warn(`⚠️ [Vex Analyze v2] Skipping ${doc.id} - no valid title`)
              continue
            }

            const contentAnalysis = analyzeContent(title, existingFolderNames)

            const upload: Upload = {
              id: doc.id,
              title: title,
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
              detectedNiche: contentAnalysis.primaryNiche,
              suggestedFolder: contentAnalysis.suggestedFolder,
              nicheConfidence: contentAnalysis.confidence,
            }

            uploadsByDocId.set(doc.id, upload)
          }
        } catch (collectionError) {
          console.log(`⚠️ [Vex Analyze v2] Error querying ${collectionName}:`, collectionError)
        }
      }

      const uniqueUploads = Array.from(uploadsByDocId.values()).sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime()
        const dateB = new Date(b.createdAt).getTime()
        return dateB - dateA
      })

      console.log(`✅ [Vex Analyze v2] Deduplication complete:`)
      console.log(`   - Total docs queried: ${totalQueriedDocs}`)
      console.log(`   - Unique uploads: ${uniqueUploads.length}`)
      console.log(`   - Duplicates removed: ${totalQueriedDocs - uniqueUploads.length}`)

      const contentByFolder: Record<string, Upload[]> = {}
      const contentByNiche: Record<string, Upload[]> = {}
      const unorganizedContent: Upload[] = []

      uniqueUploads.forEach((upload) => {
        // Organize by folder
        if (upload.folderId && upload.folderName) {
          if (!contentByFolder[upload.folderName]) {
            contentByFolder[upload.folderName] = []
          }
          contentByFolder[upload.folderName].push(upload)
        } else {
          unorganizedContent.push(upload)
        }

        if (upload.detectedNiche) {
          if (!contentByNiche[upload.detectedNiche]) {
            contentByNiche[upload.detectedNiche] = []
          }
          contentByNiche[upload.detectedNiche].push(upload)
        }
      })

      console.log(`📊 [Vex Analyze v2] Content organization:`)
      console.log(`   - Folders: ${Object.keys(contentByFolder).length}`)
      console.log(`   - Detected niches: ${Object.keys(contentByNiche).length}`)
      console.log(`   - Unorganized: ${unorganizedContent.length}`)

      const detectedCategories = Object.keys(contentByNiche).map((niche) => {
        const count = contentByNiche[niche].length
        const context = getNicheContext(niche)
        return {
          name: niche.charAt(0).toUpperCase() + niche.slice(1),
          count,
          context,
        }
      })

      // Combine with existing folders
      const allCategories = [
        ...existingFolderNames,
        ...detectedCategories.filter((c) => !existingFolderNames.includes(c.name)).map((c) => c.name),
      ]

      console.log(`📋 [Vex Analyze v2] Categories identified:`, allCategories)

      if (uniqueUploads.length === 0) {
        const emptyAnalysis = {
          userId,
          totalUploads: 0,
          categories: existingFolderNames,
          detectedNiches: {},
          contentByFolder: {},
          contentByNiche: {},
          unorganizedContent: [],
          uploads: [],
          userFolders: userFolders,
          analyzedAt: new Date(),
          lastUpdated: new Date(),
          version: 2, // Version tracking
        }

        await db.collection("vex_content_analysis").doc(userId).set(emptyAnalysis)

        return NextResponse.json({
          success: true,
          analysis: {
            totalUploads: 0,
            categories: existingFolderNames,
            summary: "No uploads found. Start by uploading your content to get AI-powered bundle suggestions.",
          },
        })
      }

      const recommendations: string[] = []

      // Recommend organizing unorganized content
      if (unorganizedContent.length > 0) {
        const nicheBreakdown = unorganizedContent.reduce(
          (acc, upload) => {
            if (upload.detectedNiche) {
              acc[upload.detectedNiche] = (acc[upload.detectedNiche] || 0) + 1
            }
            return acc
          },
          {} as Record<string, number>,
        )

        const topNiche = Object.entries(nicheBreakdown).sort(([, a], [, b]) => b - a)[0]
        if (topNiche) {
          recommendations.push(
            `You have ${unorganizedContent.length} unorganized ${topNiche[0]} items. Consider creating a "${topNiche[0].charAt(0).toUpperCase() + topNiche[0].slice(1)}" folder.`,
          )
        }
      }

      // Recommend bundles based on niche clusters
      for (const [niche, items] of Object.entries(contentByNiche)) {
        if (items.length >= 5) {
          recommendations.push(`Create a ${niche} bundle with your ${items.length} ${niche} items for maximum value.`)
        }
      }

      // Recommend cross-niche bundles
      if (Object.keys(contentByNiche).length >= 2) {
        recommendations.push(
          `Consider creating a variety bundle combining ${Object.keys(contentByNiche).join(", ")} content.`,
        )
      }

      const analysisData = {
        userId,
        totalUploads: uniqueUploads.length,
        categories: allCategories,
        detectedNiches: detectedCategories,
        recommendations,
        summary: `Analyzed ${uniqueUploads.length} uploads across ${allCategories.length} categories. Detected ${Object.keys(contentByNiche).length} content niches using keyword intelligence.`,
        contentByFolder,
        contentByNiche, // New: organized by AI-detected niche
        unorganizedContent: unorganizedContent.map((u) => ({
          id: u.id,
          title: u.title,
          type: u.contentType,
          detectedNiche: u.detectedNiche,
          suggestedFolder: u.suggestedFolder,
          confidence: u.nicheConfidence,
        })),
        uploads: uniqueUploads, // Store full upload details with intelligence data
        userFolders: userFolders,
        analyzedAt: new Date(),
        lastUpdated: new Date(),
        version: 2, // Version 2 with keyword intelligence
      }

      await db.collection("vex_content_analysis").doc(userId).set(analysisData)
      console.log("✅ [Vex Analyze v2] Analysis saved to Firestore (same document updated)")

      console.log("✅ [Vex Analyze v2] Analysis completed successfully")

      return NextResponse.json({
        success: true,
        analysis: {
          totalUploads: uniqueUploads.length,
          categories: allCategories,
          detectedNiches: detectedCategories,
          recommendations,
          summary: analysisData.summary,
        },
        uploads: uniqueUploads.slice(0, 20), // Return first 20 for reference
      })
    } catch (authError) {
      console.error("❌ [Vex Analyze v2] Auth error:", authError)
      return NextResponse.json(
        {
          error: "Invalid token",
          details: authError instanceof Error ? authError.message : "Authentication failed",
        },
        { status: 401 },
      )
    }
  } catch (error) {
    console.error("❌ [Vex Analyze v2] General error:", error)
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
