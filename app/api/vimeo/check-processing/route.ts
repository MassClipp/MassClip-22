import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, updateDoc, serverTimestamp, doc } from "firebase/firestore"
import { vimeoConfig } from "@/lib/vimeo-config"

// This endpoint should be called by a cron job every few minutes
export async function GET(request: NextRequest) {
  try {
    // Get all uploads that are in processing status
    const uploadsRef = collection(db, "uploads")
    const q = query(uploadsRef, where("status", "==", "processing"))
    const querySnapshot = await getDocs(q)

    const updates = []

    for (const firebaseDoc of querySnapshot.docs) {
      const uploadData = firebaseDoc.data()
      const vimeoId = uploadData.vimeoId

      if (!vimeoId) continue

      try {
        // Check status with Vimeo
        const response = await fetch(`https://api.vimeo.com/videos/${vimeoId}`, {
          headers: {
            Authorization: `Bearer ${vimeoConfig.accessToken}`,
            "Content-Type": "application/json",
            Accept: "application/vnd.vimeo.*+json;version=3.4",
          },
        })

        if (!response.ok) {
          console.error(`Error checking status for video ${vimeoId}:`, await response.text())
          continue
        }

        const videoData = await response.json()

        // If video is ready, update status
        if (videoData.status === "available" && videoData.is_playable) {
          updates.push({
            id: firebaseDoc.id,
            vimeoId,
            userId: uploadData.userId,
            update: {
              status: "ready",
              vimeoStatus: videoData.status,
              transcodeStatus: videoData.transcode?.status,
              isPlayable: videoData.is_playable,
              thumbnail: videoData.pictures?.sizes?.[3]?.link || null,
              duration: videoData.duration,
              width: videoData.width,
              height: videoData.height,
              updatedAt: serverTimestamp(),
            },
          })
        }
      } catch (error) {
        console.error(`Error checking status for video ${vimeoId}:`, error)
      }
    }

    // Apply all updates
    for (const update of updates) {
      try {
        // Update main uploads collection
        await updateDoc(doc(db, "uploads", update.id), update.update)

        // Update user's uploads collection
        const userUploadsRef = collection(db, `users/${update.userId}/uploads`)
        const userUploadQuery = query(userUploadsRef, where("uploadId", "==", update.id))
        const userUploadSnapshot = await getDocs(userUploadQuery)

        if (!userUploadSnapshot.empty) {
          await updateDoc(userUploadSnapshot.docs[0].ref, update.update)
        }
      } catch (error) {
        console.error(`Error updating status for upload ${update.id}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      processed: querySnapshot.size,
      updated: updates.length,
    })
  } catch (error) {
    console.error("Error checking processing videos:", error)
    return NextResponse.json(
      { error: "Failed to check processing videos", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
