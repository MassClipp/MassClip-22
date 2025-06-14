import { db } from "@/lib/firebase/firebaseAdmin"
import { db as clientDb } from "@/lib/firebase"
import { doc, updateDoc, increment, serverTimestamp, setDoc, getDoc, addDoc, collection } from "firebase/firestore"

export interface ProfileView {
  profileUserId: string
  viewerId?: string
  timestamp: Date
  ipAddress?: string
  userAgent?: string
  referrer?: string
}

export class ProfileViewTracker {
  /**
   * Track a profile view (server-side)
   */
  static async trackProfileViewServer(
    profileUserId: string,
    viewerData?: {
      viewerId?: string
      ipAddress?: string
      userAgent?: string
      referrer?: string
    },
  ): Promise<void> {
    try {
      console.log(`👁️ [Server] Tracking profile view for: ${profileUserId}`)

      // Don't track self-views
      if (viewerData?.viewerId === profileUserId) {
        console.log(`⏭️ [Server] Skipping self-view for user: ${profileUserId}`)
        return
      }

      // Get or create user document
      const userRef = db.collection("users").doc(profileUserId)
      const userDoc = await userRef.get()

      if (userDoc.exists) {
        // Update existing user's profile view count
        await userRef.update({
          profileViews: db.FieldValue.increment(1),
          lastProfileView: db.FieldValue.serverTimestamp(),
          lastActivity: db.FieldValue.serverTimestamp(),
        })
      } else {
        // Create user document with initial profile view
        await userRef.set(
          {
            profileViews: 1,
            lastProfileView: db.FieldValue.serverTimestamp(),
            lastActivity: db.FieldValue.serverTimestamp(),
            createdAt: db.FieldValue.serverTimestamp(),
          },
          { merge: true },
        )
      }

      // Record detailed view event
      const viewEvent: ProfileView = {
        profileUserId,
        viewerId: viewerData?.viewerId,
        timestamp: new Date(),
        ipAddress: viewerData?.ipAddress,
        userAgent: viewerData?.userAgent,
        referrer: viewerData?.referrer,
      }

      // Add to profile views collection
      await db.collection("profile_views").add({
        ...viewEvent,
        timestamp: db.FieldValue.serverTimestamp(),
      })

      // Add to user's analytics subcollection
      await db
        .collection("users")
        .doc(profileUserId)
        .collection("analytics")
        .add({
          type: "profile_view",
          ...viewEvent,
          timestamp: db.FieldValue.serverTimestamp(),
        })

      // Update daily stats
      await this.updateDailyProfileViews(profileUserId)

      console.log(`✅ [Server] Profile view tracked successfully for: ${profileUserId}`)
    } catch (error) {
      console.error(`❌ [Server] Error tracking profile view for ${profileUserId}:`, error)
      throw error
    }
  }

  /**
   * Track a profile view (client-side)
   */
  static async trackProfileViewClient(profileUserId: string, viewerId?: string): Promise<void> {
    try {
      console.log(`👁️ [Client] Tracking profile view for: ${profileUserId}`)

      // Don't track self-views
      if (viewerId === profileUserId) {
        console.log(`⏭️ [Client] Skipping self-view for user: ${profileUserId}`)
        return
      }

      // Get or create user document
      const userRef = doc(clientDb, "users", profileUserId)
      const userDoc = await getDoc(userRef)

      if (userDoc.exists()) {
        // Update existing user's profile view count
        await updateDoc(userRef, {
          profileViews: increment(1),
          lastProfileView: serverTimestamp(),
          lastActivity: serverTimestamp(),
        })
      } else {
        // Create user document with initial profile view
        await setDoc(
          userRef,
          {
            profileViews: 1,
            lastProfileView: serverTimestamp(),
            lastActivity: serverTimestamp(),
            createdAt: serverTimestamp(),
          },
          { merge: true },
        )
      }

      // Record detailed view event
      const viewEvent = {
        profileUserId,
        viewerId,
        timestamp: serverTimestamp(),
        userAgent: typeof window !== "undefined" ? window.navigator.userAgent : undefined,
        referrer: typeof window !== "undefined" ? document.referrer : undefined,
      }

      // Add to profile views collection
      await addDoc(collection(clientDb, "profile_views"), viewEvent)

      // Add to user's analytics subcollection
      await addDoc(collection(clientDb, "users", profileUserId, "analytics"), {
        type: "profile_view",
        ...viewEvent,
      })

      console.log(`✅ [Client] Profile view tracked successfully for: ${profileUserId}`)
    } catch (error) {
      console.error(`❌ [Client] Error tracking profile view for ${profileUserId}:`, error)
      // Don't throw error for client-side tracking to avoid breaking the page
    }
  }

  /**
   * Update daily profile view stats
   */
  private static async updateDailyProfileViews(profileUserId: string): Promise<void> {
    try {
      const today = new Date().toISOString().split("T")[0] // YYYY-MM-DD
      const dailyStatsRef = db.collection("users").doc(profileUserId).collection("daily_stats").doc(today)

      const dailyStatsDoc = await dailyStatsRef.get()

      if (dailyStatsDoc.exists) {
        await dailyStatsRef.update({
          profileViews: db.FieldValue.increment(1),
          lastUpdated: db.FieldValue.serverTimestamp(),
        })
      } else {
        await dailyStatsRef.set({
          date: today,
          profileViews: 1,
          lastUpdated: db.FieldValue.serverTimestamp(),
        })
      }
    } catch (error) {
      console.error("Error updating daily profile view stats:", error)
    }
  }

  /**
   * Get profile view statistics
   */
  static async getProfileViewStats(profileUserId: string): Promise<{
    totalViews: number
    todayViews: number
    weekViews: number
    monthViews: number
  }> {
    try {
      // Get user document for total views
      const userDoc = await db.collection("users").doc(profileUserId).get()
      const totalViews = userDoc.data()?.profileViews || 0

      // Get today's views
      const today = new Date().toISOString().split("T")[0]
      const todayStatsDoc = await db.collection("users").doc(profileUserId).collection("daily_stats").doc(today).get()
      const todayViews = todayStatsDoc.data()?.profileViews || 0

      // Get week views (last 7 days)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const weekViewsSnapshot = await db
        .collection("profile_views")
        .where("profileUserId", "==", profileUserId)
        .where("timestamp", ">=", weekAgo)
        .get()
      const weekViews = weekViewsSnapshot.size

      // Get month views (last 30 days)
      const monthAgo = new Date()
      monthAgo.setDate(monthAgo.getDate() - 30)
      const monthViewsSnapshot = await db
        .collection("profile_views")
        .where("profileUserId", "==", profileUserId)
        .where("timestamp", ">=", monthAgo)
        .get()
      const monthViews = monthViewsSnapshot.size

      return {
        totalViews,
        todayViews,
        weekViews,
        monthViews,
      }
    } catch (error) {
      console.error("Error getting profile view stats:", error)
      return {
        totalViews: 0,
        todayViews: 0,
        weekViews: 0,
        monthViews: 0,
      }
    }
  }
}
