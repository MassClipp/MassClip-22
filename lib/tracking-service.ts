import { collection, doc, updateDoc, increment, addDoc, serverTimestamp, getDoc, setDoc } from "firebase/firestore"
import { db as clientDb } from "@/lib/firebase"

export interface TrackingEvent {
  type: "download" | "profile_view" | "sale" | "upload"
  userId: string
  targetId?: string // video ID, profile ID, etc.
  metadata?: any
  timestamp: Date
  ipAddress?: string
  userAgent?: string
}

export class TrackingService {
  /**
   * Track a video download
   */
  static async trackDownload(videoId: string, creatorId: string, downloaderId?: string): Promise<void> {
    try {
      console.log(`📥 Tracking download: video=${videoId}, creator=${creatorId}, downloader=${downloaderId}`)

      // Update video download count
      const videoRef = doc(clientDb, "uploads", videoId)
      await updateDoc(videoRef, {
        downloadCount: increment(1),
        lastDownloaded: serverTimestamp(),
      })

      // Update creator's total downloads
      const creatorRef = doc(clientDb, "users", creatorId)
      await updateDoc(creatorRef, {
        totalDownloads: increment(1),
        lastActivity: serverTimestamp(),
      })

      // Record download event
      const downloadEvent: TrackingEvent = {
        type: "download",
        userId: creatorId,
        targetId: videoId,
        metadata: {
          downloaderId,
          videoId,
        },
        timestamp: new Date(),
      }

      await addDoc(collection(clientDb, "analytics", creatorId, "downloads"), {
        ...downloadEvent,
        timestamp: serverTimestamp(),
      })

      // Update daily stats
      await this.updateDailyStats(creatorId, "downloads", 1)

      console.log(`✅ Download tracked successfully`)
    } catch (error) {
      console.error("Error tracking download:", error)
      throw error
    }
  }

  /**
   * Track a profile view
   */
  static async trackProfileView(profileUserId: string, viewerId?: string): Promise<void> {
    try {
      console.log(`👁️ Tracking profile view: profile=${profileUserId}, viewer=${viewerId}`)

      // Don't track self-views
      if (viewerId === profileUserId) {
        return
      }

      // Check if user document exists first
      const userRef = doc(clientDb, "users", profileUserId)
      const userDoc = await getDoc(userRef)

      if (userDoc.exists()) {
        // Update profile view count
        await updateDoc(userRef, {
          profileViews: increment(1),
          lastProfileView: serverTimestamp(),
        })
      } else {
        // Create user document with initial profile view
        await setDoc(
          userRef,
          {
            profileViews: 1,
            lastProfileView: serverTimestamp(),
          },
          { merge: true },
        )
      }

      // Record profile view event
      const viewEvent: TrackingEvent = {
        type: "profile_view",
        userId: profileUserId,
        metadata: {
          viewerId,
        },
        timestamp: new Date(),
      }

      await addDoc(collection(clientDb, "analytics", profileUserId, "profile_views"), {
        ...viewEvent,
        timestamp: serverTimestamp(),
      })

      // Update daily stats (with error handling)
      try {
        await this.updateDailyStats(profileUserId, "profile_views", 1)
      } catch (statsError) {
        console.warn("Failed to update daily stats for profile view:", statsError)
      }

      console.log(`✅ Profile view tracked successfully`)
    } catch (error) {
      console.error("Error tracking profile view:", error)
      // Don't throw error for profile view tracking to avoid breaking the page
    }
  }

  /**
   * Track a sale
   */
  static async trackSale(creatorId: string, saleData: any): Promise<void> {
    try {
      console.log(`💰 Tracking sale: creator=${creatorId}`, saleData)

      // Update creator's total sales and earnings
      const creatorRef = doc(clientDb, "users", creatorId)
      const creatorDoc = await getDoc(creatorRef)

      if (creatorDoc.exists()) {
        await updateDoc(creatorRef, {
          totalSales: increment(1),
          totalEarnings: increment(saleData.amount || 0),
          lastSale: serverTimestamp(),
        })
      } else {
        await setDoc(
          creatorRef,
          {
            totalSales: 1,
            totalEarnings: saleData.amount || 0,
            lastSale: serverTimestamp(),
          },
          { merge: true },
        )
      }

      // Record sale event
      const saleEvent: TrackingEvent = {
        type: "sale",
        userId: creatorId,
        targetId: saleData.productId,
        metadata: saleData,
        timestamp: new Date(),
      }

      await addDoc(collection(clientDb, "analytics", creatorId, "sales"), {
        ...saleEvent,
        timestamp: serverTimestamp(),
      })

      // Update monthly stats
      await this.updateMonthlyStats(creatorId, "sales", 1, saleData.amount || 0)

      console.log(`✅ Sale tracked successfully`)
    } catch (error) {
      console.error("Error tracking sale:", error)
      throw error
    }
  }

  /**
   * Track a video upload
   */
  static async trackUpload(creatorId: string, videoData: any): Promise<void> {
    try {
      console.log(`📤 Tracking upload: creator=${creatorId}`, videoData)

      // Update creator's total videos
      const creatorRef = doc(clientDb, "users", creatorId)
      const creatorDoc = await getDoc(creatorRef)

      if (creatorDoc.exists()) {
        await updateDoc(creatorRef, {
          totalVideos: increment(1),
          lastUpload: serverTimestamp(),
        })
      } else {
        await setDoc(
          creatorRef,
          {
            totalVideos: 1,
            lastUpload: serverTimestamp(),
          },
          { merge: true },
        )
      }

      // Record upload event
      const uploadEvent: TrackingEvent = {
        type: "upload",
        userId: creatorId,
        targetId: videoData.id,
        metadata: videoData,
        timestamp: new Date(),
      }

      await addDoc(collection(clientDb, "analytics", creatorId, "uploads"), {
        ...uploadEvent,
        timestamp: serverTimestamp(),
      })

      console.log(`✅ Upload tracked successfully`)
    } catch (error) {
      console.error("Error tracking upload:", error)
      throw error
    }
  }

  /**
   * Update daily statistics
   */
  private static async updateDailyStats(userId: string, metric: string, incrementValue: number): Promise<void> {
    const today = new Date().toISOString().split("T")[0] // YYYY-MM-DD
    const dailyStatsRef = doc(clientDb, "analytics", userId, "daily_stats", today)

    try {
      const dailyStatsDoc = await getDoc(dailyStatsRef)

      if (dailyStatsDoc.exists()) {
        await updateDoc(dailyStatsRef, {
          [metric]: increment(incrementValue),
          lastUpdated: serverTimestamp(),
        })
      } else {
        await setDoc(dailyStatsRef, {
          date: today,
          [metric]: incrementValue,
          lastUpdated: serverTimestamp(),
        })
      }
    } catch (error) {
      console.error("Error updating daily stats:", error)
    }
  }

  /**
   * Update monthly statistics
   */
  private static async updateMonthlyStats(
    userId: string,
    metric: string,
    count: number,
    amount?: number,
  ): Promise<void> {
    const now = new Date()
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}` // YYYY-MM
    const monthlyStatsRef = doc(clientDb, "analytics", userId, "monthly_stats", monthKey)

    try {
      const monthlyStatsDoc = await getDoc(monthlyStatsRef)

      const updateData: any = {
        [metric]: increment(count),
        lastUpdated: serverTimestamp(),
      }

      if (amount !== undefined) {
        updateData[`${metric}_amount`] = increment(amount)
      }

      if (monthlyStatsDoc.exists()) {
        await updateDoc(monthlyStatsRef, updateData)
      } else {
        await setDoc(monthlyStatsRef, {
          month: monthKey,
          [metric]: count,
          ...(amount !== undefined && { [`${metric}_amount`]: amount }),
          lastUpdated: serverTimestamp(),
        })
      }
    } catch (error) {
      console.error("Error updating monthly stats:", error)
    }
  }
}
