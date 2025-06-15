import { db } from "@/lib/firebase-admin"
import { FieldValue, Timestamp } from "firebase-admin/firestore"

export interface ProfileViewRecord {
  id: string
  profileUserId: string
  viewerId: string | null
  timestamp: Timestamp
  ipAddress: string
  userAgent: string
  sessionId: string
}

export interface ProfileViewStats {
  totalViews: number
  uniqueViews: number
  todayViews: number
  weekViews: number
  monthViews: number
  lastViewAt: Timestamp | null
}

export class ProfileViewSystem {
  private static readonly RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
  private static readonly MAX_VIEWS_PER_WINDOW = 3 // Max 3 views per minute per IP
  private static readonly SESSION_DURATION = 30 * 60 * 1000 // 30 minutes

  /**
   * Track a profile view with comprehensive validation and rate limiting
   */
  static async trackProfileView(params: {
    profileUserId: string
    viewerId?: string | null
    ipAddress: string
    userAgent: string
    sessionId?: string
  }): Promise<{ success: boolean; message: string; viewCount?: number }> {
    const { profileUserId, viewerId, ipAddress, userAgent, sessionId } = params

    try {
      // Validate input
      if (!profileUserId) {
        return { success: false, message: "Profile user ID is required" }
      }

      // Prevent self-views
      if (viewerId && viewerId === profileUserId) {
        return { success: false, message: "Self-views are not tracked" }
      }

      console.log(`🔍 [ProfileViewSystem] Processing view for profile: ${profileUserId}`)

      // Check rate limiting
      const rateLimitCheck = await this.checkRateLimit(profileUserId, ipAddress)
      if (!rateLimitCheck.allowed) {
        return { success: false, message: rateLimitCheck.message }
      }

      // Generate session ID if not provided
      const finalSessionId = sessionId || this.generateSessionId(ipAddress, userAgent)

      // Check if this is a duplicate view within the session
      const isDuplicate = await this.checkDuplicateView(profileUserId, finalSessionId)
      if (isDuplicate) {
        return { success: false, message: "Duplicate view within session" }
      }

      // Execute atomic view tracking
      const result = await this.executeViewTracking({
        profileUserId,
        viewerId,
        ipAddress,
        userAgent,
        sessionId: finalSessionId,
      })

      return result
    } catch (error) {
      console.error("❌ [ProfileViewSystem] Error tracking profile view:", error)
      return { success: false, message: "Internal error tracking view" }
    }
  }

  /**
   * Execute atomic view tracking with proper transaction handling
   */
  private static async executeViewTracking(params: {
    profileUserId: string
    viewerId?: string | null
    ipAddress: string
    userAgent: string
    sessionId: string
  }): Promise<{ success: boolean; message: string; viewCount: number }> {
    const { profileUserId, viewerId, ipAddress, userAgent, sessionId } = params

    return await db.runTransaction(async (transaction) => {
      const timestamp = Timestamp.now()
      const dateKey = new Date().toISOString().split("T")[0]

      // References
      const userRef = db.collection("users").doc(profileUserId)
      const viewRecordRef = db.collection("profile_views").doc()
      const dailyStatsRef = db.collection("profile_view_stats").doc(`${profileUserId}_${dateKey}`)
      const rateLimitRef = db.collection("view_rate_limits").doc(`${profileUserId}_${ipAddress}`)

      // Get current user data
      const userDoc = await transaction.get(userRef)
      if (!userDoc.exists) {
        throw new Error("Profile user not found")
      }

      const currentViews = userDoc.data()?.profileViews || 0

      // Create view record
      const viewRecord: Omit<ProfileViewRecord, "id"> = {
        profileUserId,
        viewerId: viewerId || null,
        timestamp,
        ipAddress,
        userAgent,
        sessionId,
      }

      // Update user profile views
      transaction.set(
        userRef,
        {
          profileViews: FieldValue.increment(1),
          lastProfileView: timestamp,
          updatedAt: timestamp,
        },
        { merge: true },
      )

      // Create view record
      transaction.set(viewRecordRef, viewRecord)

      // Update daily stats
      transaction.set(
        dailyStatsRef,
        {
          profileUserId,
          date: dateKey,
          viewCount: FieldValue.increment(1),
          lastViewAt: timestamp,
          updatedAt: timestamp,
        },
        { merge: true },
      )

      // Update rate limiting
      transaction.set(
        rateLimitRef,
        {
          profileUserId,
          ipAddress,
          viewCount: FieldValue.increment(1),
          lastViewAt: timestamp,
          windowStart: timestamp,
        },
        { merge: true },
      )

      const newViewCount = currentViews + 1
      console.log(`✅ [ProfileViewSystem] Successfully tracked view. New count: ${newViewCount}`)

      return {
        success: true,
        message: "Profile view tracked successfully",
        viewCount: newViewCount,
      }
    })
  }

  /**
   * Get comprehensive profile view statistics
   */
  static async getProfileViewStats(profileUserId: string): Promise<ProfileViewStats> {
    try {
      console.log(`📊 [ProfileViewSystem] Fetching stats for user: ${profileUserId}`)

      // Get user document
      const userDoc = await db.collection("users").doc(profileUserId).get()
      const userData = userDoc.data()

      if (!userData) {
        return this.getEmptyStats()
      }

      // Calculate date ranges
      const now = new Date()
      const today = now.toISOString().split("T")[0]
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

      // Get daily stats for recent periods
      const [todayStats, weekStats, monthStats, uniqueViewsCount] = await Promise.all([
        this.getDailyViewCount(profileUserId, today),
        this.getViewCountSince(profileUserId, weekAgo),
        this.getViewCountSince(profileUserId, monthAgo),
        this.getUniqueViewCount(profileUserId),
      ])

      const stats: ProfileViewStats = {
        totalViews: userData.profileViews || 0,
        uniqueViews: uniqueViewsCount,
        todayViews: todayStats,
        weekViews: weekStats,
        monthViews: monthStats,
        lastViewAt: userData.lastProfileView || null,
      }

      console.log(`📈 [ProfileViewSystem] Stats for ${profileUserId}:`, stats)
      return stats
    } catch (error) {
      console.error("❌ [ProfileViewSystem] Error fetching stats:", error)
      return this.getEmptyStats()
    }
  }

  /**
   * Verify and repair view count integrity
   */
  static async verifyAndRepairViewCount(profileUserId: string): Promise<{
    success: boolean
    originalCount: number
    actualCount: number
    repaired: boolean
  }> {
    try {
      console.log(`🔧 [ProfileViewSystem] Verifying view count for: ${profileUserId}`)

      // Get current stored count
      const userDoc = await db.collection("users").doc(profileUserId).get()
      const storedCount = userDoc.data()?.profileViews || 0

      // Count actual view records
      const viewRecordsSnapshot = await db.collection("profile_views").where("profileUserId", "==", profileUserId).get()

      const actualCount = viewRecordsSnapshot.size

      console.log(`📊 [ProfileViewSystem] Stored: ${storedCount}, Actual: ${actualCount}`)

      // Repair if mismatch
      if (storedCount !== actualCount) {
        await db.collection("users").doc(profileUserId).update({
          profileViews: actualCount,
          updatedAt: Timestamp.now(),
        })

        console.log(`🔧 [ProfileViewSystem] Repaired count from ${storedCount} to ${actualCount}`)

        return {
          success: true,
          originalCount: storedCount,
          actualCount,
          repaired: true,
        }
      }

      return {
        success: true,
        originalCount: storedCount,
        actualCount,
        repaired: false,
      }
    } catch (error) {
      console.error("❌ [ProfileViewSystem] Error verifying view count:", error)
      return {
        success: false,
        originalCount: 0,
        actualCount: 0,
        repaired: false,
      }
    }
  }

  /**
   * Reset profile view count (for testing/admin purposes)
   */
  static async resetProfileViewCount(profileUserId: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`🔄 [ProfileViewSystem] Resetting view count for: ${profileUserId}`)

      await db.runTransaction(async (transaction) => {
        const userRef = db.collection("users").doc(profileUserId)

        transaction.update(userRef, {
          profileViews: 0,
          lastProfileView: null,
          updatedAt: Timestamp.now(),
        })
      })

      return { success: true, message: "Profile view count reset successfully" }
    } catch (error) {
      console.error("❌ [ProfileViewSystem] Error resetting view count:", error)
      return { success: false, message: "Failed to reset view count" }
    }
  }

  // Private helper methods

  private static async checkRateLimit(
    profileUserId: string,
    ipAddress: string,
  ): Promise<{ allowed: boolean; message: string }> {
    try {
      const rateLimitDoc = await db.collection("view_rate_limits").doc(`${profileUserId}_${ipAddress}`).get()

      if (!rateLimitDoc.exists) {
        return { allowed: true, message: "No rate limit history" }
      }

      const data = rateLimitDoc.data()!
      const lastView = data.lastViewAt.toDate()
      const viewCount = data.viewCount || 0
      const timeSinceLastView = Date.now() - lastView.getTime()

      // Reset counter if window has passed
      if (timeSinceLastView > this.RATE_LIMIT_WINDOW) {
        return { allowed: true, message: "Rate limit window reset" }
      }

      // Check if within limits
      if (viewCount >= this.MAX_VIEWS_PER_WINDOW) {
        return { allowed: false, message: "Rate limit exceeded" }
      }

      return { allowed: true, message: "Within rate limits" }
    } catch (error) {
      console.error("Error checking rate limit:", error)
      return { allowed: true, message: "Rate limit check failed, allowing" }
    }
  }

  private static async checkDuplicateView(profileUserId: string, sessionId: string): Promise<boolean> {
    try {
      const cutoffTime = Timestamp.fromDate(new Date(Date.now() - this.SESSION_DURATION))

      const duplicateCheck = await db
        .collection("profile_views")
        .where("profileUserId", "==", profileUserId)
        .where("sessionId", "==", sessionId)
        .where("timestamp", ">", cutoffTime)
        .limit(1)
        .get()

      return !duplicateCheck.empty
    } catch (error) {
      console.error("Error checking duplicate view:", error)
      return false // Allow view if check fails
    }
  }

  private static generateSessionId(ipAddress: string, userAgent: string): string {
    const timestamp = Date.now()
    const hash = Buffer.from(`${ipAddress}_${userAgent}_${timestamp}`).toString("base64")
    return hash.substring(0, 16)
  }

  private static async getDailyViewCount(profileUserId: string, date: string): Promise<number> {
    try {
      const dailyDoc = await db.collection("profile_view_stats").doc(`${profileUserId}_${date}`).get()
      return dailyDoc.data()?.viewCount || 0
    } catch (error) {
      console.error("Error getting daily view count:", error)
      return 0
    }
  }

  private static async getViewCountSince(profileUserId: string, sinceDate: string): Promise<number> {
    try {
      const snapshot = await db
        .collection("profile_view_stats")
        .where("profileUserId", "==", profileUserId)
        .where("date", ">=", sinceDate)
        .get()

      return snapshot.docs.reduce((total, doc) => total + (doc.data().viewCount || 0), 0)
    } catch (error) {
      console.error("Error getting view count since date:", error)
      return 0
    }
  }

  private static async getUniqueViewCount(profileUserId: string): Promise<number> {
    try {
      const snapshot = await db.collection("profile_views").where("profileUserId", "==", profileUserId).get()

      const uniqueViewers = new Set()
      snapshot.docs.forEach((doc) => {
        const data = doc.data()
        const identifier = data.viewerId || data.sessionId
        if (identifier) {
          uniqueViewers.add(identifier)
        }
      })

      return uniqueViewers.size
    } catch (error) {
      console.error("Error getting unique view count:", error)
      return 0
    }
  }

  private static getEmptyStats(): ProfileViewStats {
    return {
      totalViews: 0,
      uniqueViews: 0,
      todayViews: 0,
      weekViews: 0,
      monthViews: 0,
      lastViewAt: null,
    }
  }
}
