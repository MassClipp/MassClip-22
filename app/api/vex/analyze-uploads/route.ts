import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
import { getAuth } from "firebase-admin/auth"
import { analyzeMetadata, type FileMetadata } from "@/lib/vex-metadata-intelligence"

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
  detectedNiche: string | null
  suggestedFolder: string | null
  nicheConfidence: string // Changed to string for "very_high", "high", etc.
  reasoning: string // New: Vex's reasoning about the content
  evidence: string[] // New: List of evidence points
  transcript?: string
  transcriptDuration?: number
  transcriptLanguage?: string
  transcribedAt?: any
}

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Vex Analyze v3] Starting metadata-aware upload analysis...")

    // Get authorization header
    const authHeader = request.headers.get("authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ [Vex Analyze v3] No valid authorization header")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]

    try {
      const decodedToken = await getAuth().verifyIdToken(token)
      const userId = decodedToken.uid
      console.log("✅ [Vex Analyze v3] Authenticated user:", userId)

      console.log("🗂️ [Vex Analyze v3] Loading user's folder structure...")
      const foldersSnapshot = await db.collection("folders").where("userId", "==", userId).get()

      const userFolders = foldersSnapshot.docs
        .map((doc) => ({
          id: doc.id,
          name: doc.data().name,
          fileCount: doc.data().fileCount || 0,
        }))
        .sort((a, b) => a.name.localeCompare(b.name))

      const existingFolderNames = userFolders.map((f) => f.name)
      console.log(`✅ [Vex Analyze v3] Found ${userFolders.length} folders:`, existingFolderNames)

      const uploadsByDocId = new Map<string, Upload>()
      let totalQueriedDocs = 0

      try {
        console.log(`🔍 [Vex Analyze v3] Querying uploads collection only`)

        // Query by both uid and userId to catch all uploads
        const uidSnapshot = await db.collection("uploads").where("uid", "==", userId).limit(500).get()

        const userIdSnapshot = await db.collection("uploads").where("userId", "==", userId).limit(500).get()

        const allDocs = [...uidSnapshot.docs, ...userIdSnapshot.docs]
        totalQueriedDocs = allDocs.length

        console.log(`📊 [Vex Analyze v3] Found ${allDocs.length} docs in uploads collection`)

        for (const doc of allDocs) {
          // Skip duplicates (same doc ID from both queries)
          if (uploadsByDocId.has(doc.id)) {
            console.log(`⏭️ [Vex Analyze v3] Skipping duplicate doc ID: ${doc.id}`)
            continue
          }

          const data = doc.data()

          // Verify ownership
          if (data.uid !== userId && data.userId !== userId) {
            console.warn(`⚠️ [Vex Analyze v3] Skipping ${doc.id} - ownership mismatch`)
            continue
          }

          // Skip items without valid titles
          const title = data.title || data.filename
          if (!title || title === "Untitled" || title === "Unknown") {
            console.warn(`⚠️ [Vex Analyze v3] Skipping ${doc.id} - no valid title`)
            continue
          }

          // Build metadata for analysis
          const fileMetadata: FileMetadata = {
            filename: data.filename || title,
            title: title,
            description: data.description || "",
            mimeType: data.mimeType || data.type || "unknown",
            contentType: determineContentType(data.mimeType || data.type || ""),
            duration: data.duration || null,
            fileSize: data.fileSize || 0,
            folderId: data.folderId || null,
            folderName: data.folderName || null,
            tags: data.tags || [],
          }

          // Analyze with metadata intelligence
          const metadataAnalysis = analyzeMetadata(fileMetadata, existingFolderNames)

          console.log(`🧠 [Vex Analyze v3] ${doc.id}: ${metadataAnalysis.reasoning}`)

          const upload: Upload = {
            id: doc.id,
            title: title,
            filename: data.filename || data.title || "Unknown",
            description: data.description || "",
            tags: data.tags || [],
            mimeType: data.mimeType || data.type || "unknown",
            contentType: determineContentType(data.mimeType || data.type || ""),
            collection: "uploads", // Always uploads now
            createdAt: data.createdAt || data.addedAt || new Date(),
            fileSize: data.fileSize || 0,
            duration: data.duration || null,
            url: data.url || data.downloadURL || null,
            folderId: data.folderId || null,
            folderName: data.folderName || null,
            detectedNiche: metadataAnalysis.detectedNiche,
            suggestedFolder: metadataAnalysis.suggestedFolder,
            nicheConfidence: metadataAnalysis.confidence,
            reasoning: metadataAnalysis.reasoning,
            evidence: metadataAnalysis.evidence,
            ...(data.transcript && { transcript: data.transcript }),
            ...(data.transcriptDuration && { transcriptDuration: data.transcriptDuration }),
            ...(data.transcriptLanguage && { transcriptLanguage: data.transcriptLanguage }),
            ...(data.transcribedAt && { transcribedAt: data.transcribedAt }),
          }

          uploadsByDocId.set(doc.id, upload)
        }
      } catch (collectionError) {
        console.log(`⚠️ [Vex Analyze v3] Error querying uploads collection:`, collectionError)
      }

      const uniqueUploads = Array.from(uploadsByDocId.values()).sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime()
        const dateB = new Date(b.createdAt).getTime()
        return dateB - dateA
      })

      console.log(`✅ [Vex Analyze v3] Deduplication complete:`)
      console.log(`   - Total docs queried: ${totalQueriedDocs}`)
      console.log(`   - Unique uploads: ${uniqueUploads.length}`)
      console.log(`   - Duplicates removed: ${totalQueriedDocs - uniqueUploads.length}`)

      const contentByFolder: Record<string, Upload[]> = {}
      const contentByNiche: Record<string, Upload[]> = {}
      const unorganizedContent: Upload[] = []

      uniqueUploads.forEach((upload) => {
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

      console.log(`📊 [Vex Analyze v3] Content organization:`)
      console.log(`   - Folders: ${Object.keys(contentByFolder).length}`)
      console.log(`   - Detected niches: ${Object.keys(contentByNiche).length}`)
      console.log(`   - Unorganized: ${unorganizedContent.length}`)

      const detectedCategories = Object.keys(contentByNiche).map((niche) => {
        const items = contentByNiche[niche]
        const avgConfidence =
          items.reduce((sum, item) => {
            const confMap = { very_high: 1, high: 0.8, medium: 0.6, low: 0.4 }
            return sum + (confMap[item.nicheConfidence as keyof typeof confMap] || 0.4)
          }, 0) / items.length

        return {
          name: niche.charAt(0).toUpperCase() + niche.slice(1),
          count: items.length,
          avgConfidence: Math.round(avgConfidence * 100),
        }
      })

      const allCategories = [
        ...existingFolderNames,
        ...detectedCategories.filter((c) => !existingFolderNames.includes(c.name)).map((c) => c.name),
      ]

      console.log(`📋 [Vex Analyze v3] Categories identified:`, allCategories)

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
          version: 3, // Version 3 with metadata intelligence
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

      for (const [niche, items] of Object.entries(contentByNiche)) {
        if (items.length >= 5) {
          recommendations.push(`Create a ${niche} bundle with your ${items.length} ${niche} items for maximum value.`)
        }
      }

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
        summary: `Analyzed ${uniqueUploads.length} uploads across ${allCategories.length} categories using metadata intelligence. Detected ${Object.keys(contentByNiche).length} content niches with reasoning.`,
        contentByFolder,
        contentByNiche,
        unorganizedContent: unorganizedContent.map((u) => ({
          id: u.id,
          title: u.title,
          type: u.contentType,
          detectedNiche: u.detectedNiche,
          suggestedFolder: u.suggestedFolder,
          confidence: u.nicheConfidence,
          reasoning: u.reasoning, // Include Vex's reasoning
          transcript: u.transcript,
          transcriptDuration: u.transcriptDuration,
          transcriptLanguage: u.transcriptLanguage,
          transcribedAt: u.transcribedAt,
        })),
        uploads: uniqueUploads,
        userFolders: userFolders,
        analyzedAt: new Date(),
        lastUpdated: new Date(),
        version: 3, // Version 3 with metadata intelligence
      }

      await db.collection("vex_content_analysis").doc(userId).set(analysisData)
      console.log("✅ [Vex Analyze v3] Analysis saved to Firestore with metadata intelligence")

      console.log("✅ [Vex Analyze v3] Analysis completed successfully")

      return NextResponse.json({
        success: true,
        analysis: {
          totalUploads: uniqueUploads.length,
          categories: allCategories,
          detectedNiches: detectedCategories,
          recommendations,
          summary: analysisData.summary,
        },
        uploads: uniqueUploads.slice(0, 20),
      })
    } catch (authError) {
      console.error("❌ [Vex Analyze v3] Auth error:", authError)
      return NextResponse.json(
        {
          error: "Invalid token",
          details: authError instanceof Error ? authError.message : "Authentication failed",
        },
        { status: 401 },
      )
    }
  } catch (error) {
    console.error("❌ [Vex Analyze v3] General error:", error)
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
