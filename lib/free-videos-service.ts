import { db } from "@/lib/firebase-admin"

export class FreeVideosService {
  static async getFreeVideosCount(userId: string) {
    try {
      // Get free content count
      const freeContentSnapshot = await db.collection("freeContent").where("userId", "==", userId).get()

      // Get total uploads count
      const uploadsSnapshot = await db.collection("uploads").where("userId", "==", userId).get()

      const totalFreeVideos = freeContentSnapshot.size
      const totalUploads = uploadsSnapshot.size
      const freeVideoPercentage = totalUploads > 0 ? (totalFreeVideos / totalUploads) * 100 : 0

      // Get recent free videos
      const recentFreeVideos = freeContentSnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
          uploadedAt: doc.data().uploadedAt?.toDate() || new Date(),
        }))
        .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
        .slice(0, 5)

      return {
        totalFreeVideos,
        totalUploads,
        freeVideoPercentage,
        recentFreeVideos: recentFreeVideos.map((video) => ({
          id: video.id,
          title: video.title || video.filename || "Untitled",
          uploadedAt: video.uploadedAt,
          downloadCount: video.downloadCount || 0,
        })),
      }
    } catch (error) {
      console.error("Error fetching free videos data:", error)
      return {
        totalFreeVideos: 0,
        totalUploads: 0,
        freeVideoPercentage: 0,
        recentFreeVideos: [],
      }
    }
  }
}
