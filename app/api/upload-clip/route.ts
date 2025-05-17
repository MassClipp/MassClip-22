import { type NextRequest, NextResponse } from "next/server"
import { auth, db, storage } from "@/lib/firebase-admin"
import { v4 as uuidv4 } from "uuid"
import type { UserClip } from "@/lib/types"
import admin from "firebase-admin"

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(token)
    } catch (error) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const userId = decodedToken.uid

    // Parse form data
    const formData = await request.formData()
    const clipPackId = formData.get("clipPackId") as string
    const title = formData.get("title") as string
    const description = formData.get("description") as string
    const videoFile = formData.get("videoFile") as File
    const thumbnailFile = formData.get("thumbnailFile") as File | null

    if (!clipPackId || !title || !videoFile) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Verify clip pack ownership
    const clipPackDoc = await db.collection("clipPacks").doc(clipPackId).get()
    if (!clipPackDoc.exists) {
      return NextResponse.json({ error: "Clip pack not found" }, { status: 404 })
    }

    if (clipPackDoc.data()?.creatorId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Generate unique IDs for files
    const clipId = uuidv4()
    const videoFileName = `${clipId}-${videoFile.name.replace(/\s+/g, "_")}`
    const videoBuffer = Buffer.from(await videoFile.arrayBuffer())

    // Upload video file
    const videoFileRef = storage.bucket().file(`clips/${videoFileName}`)
    await videoFileRef.save(videoBuffer, {
      metadata: {
        contentType: videoFile.type,
      },
    })

    // Make file publicly accessible
    await videoFileRef.makePublic()
    const videoUrl = `https://storage.googleapis.com/${storage.bucket().name}/clips/${videoFileName}`

    // Upload thumbnail if provided, or generate one
    let thumbnailUrl = ""
    if (thumbnailFile) {
      const thumbnailFileName = `${clipId}-thumbnail.${thumbnailFile.name.split(".").pop()}`
      const thumbnailBuffer = Buffer.from(await thumbnailFile.arrayBuffer())

      const thumbnailFileRef = storage.bucket().file(`thumbnails/${thumbnailFileName}`)
      await thumbnailFileRef.save(thumbnailBuffer, {
        metadata: {
          contentType: thumbnailFile.type,
        },
      })

      await thumbnailFileRef.makePublic()
      thumbnailUrl = `https://storage.googleapis.com/${storage.bucket().name}/thumbnails/${thumbnailFileName}`
    } else {
      // Use a default thumbnail or generate one (simplified for this example)
      thumbnailUrl = `/placeholder.svg?height=720&width=1280&query=video thumbnail for ${encodeURIComponent(title)}`
    }

    // Create clip metadata
    const newClip: UserClip = {
      id: clipId,
      title,
      description: description || "",
      videoUrl,
      thumbnailUrl,
      duration: 0, // Will be updated after processing
      fileSize: videoFile.size,
      format: videoFile.type,
      resolution: "", // Will be updated after processing
      createdAt: new Date(),
      isProcessed: false,
      processingStatus: "pending",
    }

    // Add clip to clip pack
    await db
      .collection("clipPacks")
      .doc(clipPackId)
      .update({
        clips: admin.firestore.FieldValue.arrayUnion(newClip),
        updatedAt: new Date(),
      })

    // Trigger video processing (would be implemented separately)
    // This would extract metadata like duration and resolution

    return NextResponse.json({
      success: true,
      clipId,
      videoUrl,
      thumbnailUrl,
    })
  } catch (error) {
    console.error("Error uploading clip:", error)
    return NextResponse.json({ error: "Failed to upload clip" }, { status: 500 })
  }
}
