import { db } from "@/lib/firebase"
import { doc, setDoc, increment, serverTimestamp, collection, addDoc, getDoc } from "firebase/firestore"

export class ProfileViewTracker {
  /**
   * Track a profile view from the client side
   */
  static async trackProfileView(profileUserId: string, viewerId?: string): Promise<void> {
    try {
      if (!profileUserId) {
        console.warn("ProfileViewTracker: Profile user ID is required")
        return
      }

      // Don't track self-views
      if (viewerId && viewerId === profileUserId) {
        console.log("ProfileViewTracker: Skipping self-view")
        return
      }

      console.log(`🔍 [ProfileViewTracker] Tracking view for profile: ${profileUserId}`)

      const timestamp = new Date()
      const dateKey = timestamp.toISOString().split("T")[0] // YYYY-MM-DD

      // Check current profile views before incrementing
      const userRef = doc(db, "users", profileUserId)
      const userDoc = await getDoc(userRef)
      const currentViews = userDoc.exists() ? userDoc.data()?.profileViews || 0 : 0

      console.log(`📊 [ProfileViewTracker] Current views before increment: ${currentViews}`)

      // Prepare view data
      const viewData = {
        profileUserId,
        viewerId: viewerId || "anonymous",
        timestamp,
        dateKey,
        userAgent: typeof window !== "undefined" ? window.navigator.userAgent : "unknown",
        referrer: typeof window !== "undefined" ? document.referrer || "direct" : "direct",
      }

      // Use a batch of promises for better performance
      const promises: Promise<any>[] = []

      // 1. Update user's total profile views
      promises.push(
        setDoc(
          userRef,
          {
            profileViews: increment(1),
            lastProfileView: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        ),
      )

      // 2. Log individual profile view
      const profileViewsRef = collection(db, "profile_views")
      promises.push(addDoc(profileViewsRef, viewData))

      // 3. Update daily stats
      const dailyStatsRef = doc(db, "users", profileUserId, "daily_stats", dateKey)
      promises.push(
        setDoc(
          dailyStatsRef,
          {
            date: dateKey,
            profileViews: increment(1),
            lastView: serverTimestamp(),
          },
          { merge: true },
        ),
      )

      // 4. Update analytics
      const analyticsRef = doc(db, "users", profileUserId, "analytics", "profile_views")
      promises.push(
        setDoc(
          analyticsRef,
          {
            totalViews: increment(1),
            lastView: serverTimestamp(),
            [`daily.${dateKey}`]: increment(1),
          },
          { merge: true },
        ),
      )

      // Execute all updates
      const results = await Promise.allSettled(promises)

      // Log any failures
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          console.error(`❌ [ProfileViewTracker] Promise ${index} failed:`, result.reason)
        }
      })

      console.log(`✅ [ProfileViewTracker] Successfully tracked view for profile: ${profileUserId}`)
    } catch (error) {
      console.error("❌ [ProfileViewTracker] Error tracking profile view:", error)
      // Don't throw error to prevent breaking the UI
    }
  }

  /**
   * Get profile view stats for a user
   */
  static async getProfileViewStats(userId: string): Promise<{
    totalViews: number
    todayViews: number
    thisWeekViews: number
    thisMonthViews: number
  }> {
    try {
      const today = new Date().toISOString().split("T")[0]
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

      // This would need to be implemented with proper Firestore queries
      // For now, return a basic structure
      return {
        totalViews: 0,
        todayViews: 0,
        thisWeekViews: 0,
        thisMonthViews: 0,
      }
    } catch (error) {
      console.error("Error getting profile view stats:", error)
      return {
        totalViews: 0,
        todayViews: 0,
        thisWeekViews: 0,
        thisMonthViews: 0,
      }
    }
  }
}

// Export the function as a named export for easier importing
export const trackProfileView = ProfileViewTracker.trackProfileView
export const getProfileViewStats = ProfileViewTracker.getProfileViewStats

// Default export for backward compatibility
export default ProfileViewTracker
