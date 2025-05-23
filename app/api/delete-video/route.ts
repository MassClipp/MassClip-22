import { type NextRequest, NextResponse } from "next/server"
import { doc, deleteDoc, getDoc } from "firebase/firestore"
import { db as clientDb } from "@/lib/firebase"

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get("videoId")
    const userId = searchParams.get("userId")

    if (!videoId || !userId) {
      return NextResponse.json({ error: "Video ID and User ID are required" }, { status: 400 })
    }

    console.log(`Attempting to delete video ${videoId} for user ${userId}`)

    // Get video document to verify ownership and get file URLs
    const videoRef = doc(clientDb, "videos", videoId)
    const videoDoc = await getDoc(videoRef)

    if (!videoDoc.exists()) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    const videoData = videoDoc.data()

    // Verify ownership
    if (videoData.uid !== userId) {
      return NextResponse.json({ error: "Unauthorized - you can only delete your own videos" }, { status: 403 })
    }

    // Delete files from Cloudflare R2 if they exist
    const filesToDelete = []
    if (videoData.url) filesToDelete.push(videoData.url)
    if (videoData.thumbnailUrl) filesToDelete.push(videoData.thumbnailUrl)

    for (const fileUrl of filesToDelete) {
      try {
        // Extract the file key from the URL
        const urlParts = fileUrl.split("/")
        const fileKey = urlParts[urlParts.length - 1]

        console.log(`Deleting file from R2: ${fileKey}`)

        // Delete from Cloudflare R2
        const deleteResponse = await fetch(
          `${process.env.CLOUDFLARE_R2_ENDPOINT}/${process.env.CLOUDFLARE_R2_BUCKET_NAME}/${fileKey}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `AWS4-HMAC-SHA256 Credential=${process.env.CLOUDFLARE_R2_ACCESS_KEY_ID}`,
              "X-Amz-Content-Sha256": "UNSIGNED-PAYLOAD",
            },
          },
        )

        if (!deleteResponse.ok) {
          console.warn(`Failed to delete file ${fileKey} from R2:`, deleteResponse.statusText)
        } else {
          console.log(`Successfully deleted file ${fileKey} from R2`)
        }
      } catch (error) {
        console.warn(`Error deleting file from R2:`, error)
        // Continue with Firestore deletion even if R2 deletion fails
      }
    }

    // Delete from Firestore
    await deleteDoc(videoRef)
    console.log(`Successfully deleted video ${videoId} from Firestore`)

    return NextResponse.json({
      success: true,
      message: "Video deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting video:", error)
    return NextResponse.json(
      { error: "Failed to delete video", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
