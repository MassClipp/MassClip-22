import { db } from "@/lib/firebase-admin"
import { withRetry } from "@/lib/firebase-admin"

export interface UserStatistics {
  totalDownloads: number
  totalEarnings: number
  totalVideos: number
  profileViews: number
  totalSales: number
  recentSales: number
  thisMonthEarnings: number
  lastMonthEarnings: number
  pendingPayout: number
  topPerformingContent: any[]
  salesHistory: any[]
  lastUpdated: Date
}

export class StatisticsService {
  /**
   * Get comprehensive user statistics from Firestore
   */
  static async getUserStatistics(userId: string): Promise<UserStatistics> {
    return withRetry(async () => {
      console.log(`📊 Fetching statistics for user: ${userId}`)

      // Get user's uploads and calculate video stats
      const uploadsSnapshot = await db.collection("uploads").where("userId", "==", userId).get()

      const uploads = uploadsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      // Get user's sales data
      const salesSnapshot = await db
        .collection("users")
        .doc(userId)
        .collection("sales")
        .orderBy("purchasedAt", "desc")
        .get()

      const sales = salesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        purchasedAt: doc.data().purchasedAt?.toDate() || new Date(),
      }))

      // Get user's profile views (if tracked)
      const userDoc = await db.collection("users").doc(userId).get()
      const userData = userDoc.data() || {}

      // Calculate statistics
      const totalDownloads = uploads.reduce((sum, upload) => sum + (upload.downloadCount || 0), 0)
      const totalVideos = uploads.length
      const profileViews = userData.profileViews || 0

      // Calculate earnings
      const totalEarnings = sales.reduce((sum, sale) => sum + (sale.netAmount || 0), 0)
      const totalSales = sales.length

      // Recent sales (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const recentSales = sales.filter((sale) => sale.purchasedAt >= thirtyDaysAgo).length

      // This month earnings
      const thisMonth = new Date()
      thisMonth.setDate(1)
      thisMonth.setHours(0, 0, 0, 0)
      const thisMonthEarnings = sales
        .filter((sale) => sale.purchasedAt >= thisMonth)
        .reduce((sum, sale) => sum + (sale.netAmount || 0), 0)

      // Last month earnings
      const lastMonth = new Date()
      lastMonth.setMonth(lastMonth.getMonth() - 1)
      lastMonth.setDate(1)
      lastMonth.setHours(0, 0, 0, 0)
      const lastMonthEnd = new Date()
      lastMonthEnd.setDate(0)
      lastMonthEnd.setHours(23, 59, 59, 999)
      const lastMonthEarnings = sales
        .filter((sale) => sale.purchasedAt >= lastMonth && sale.purchasedAt <= lastMonthEnd)
        .reduce((sum, sale) => sum + (sale.netAmount || 0), 0)

      // Pending payout (this month's earnings)
      const pendingPayout = thisMonthEarnings

      // Top performing content (by download count)
      const topPerformingContent = uploads.sort((a, b) => (b.downloadCount || 0) - (a.downloadCount || 0)).slice(0, 5)

      const statistics: UserStatistics = {
        totalDownloads,
        totalEarnings,
        totalVideos,
        profileViews,
        totalSales,
        recentSales,
        thisMonthEarnings,
        lastMonthEarnings,
        pendingPayout,
        topPerformingContent,
        salesHistory: sales.slice(0, 50), // Last 50 sales
        lastUpdated: new Date(),
      }

      // Cache statistics in Firestore for faster access
      await db.collection("users").doc(userId).collection("statistics").doc("current").set(statistics)

      console.log(`✅ Statistics calculated for user ${userId}:`, {
        totalDownloads,
        totalEarnings,
        totalVideos,
        totalSales,
      })

      return statistics
    })
  }

  /**
   * Update download count for a specific upload
   */
  static async incrementDownloadCount(uploadId: string, userId: string): Promise<void> {
    return withRetry(async () => {
      const uploadRef = db.collection("uploads").doc(uploadId)

      await uploadRef.update({
        downloadCount: db.FieldValue.increment(1),
        lastDownloaded: new Date(),
      })

      // Update user's total downloads
      const userRef = db.collection("users").doc(userId)
      await userRef.update({
        totalDownloads: db.FieldValue.increment(1),
      })

      console.log(`📈 Incremented download count for upload ${uploadId}`)
    })
  }

  /**
   * Update profile view count
   */
  static async incrementProfileViews(userId: string): Promise<void> {
    return withRetry(async () => {
      const userRef = db.collection("users").doc(userId)

      await userRef.update({
        profileViews: db.FieldValue.increment(1),
        lastProfileView: new Date(),
      })

      console.log(`👁️ Incremented profile views for user ${userId}`)
    })
  }

  /**
   * Record a new sale
   */
  static async recordSale(userId: string, saleData: any): Promise<void> {
    return withRetry(async () => {
      const saleRef = db.collection("users").doc(userId).collection("sales").doc()

      await saleRef.set({
        ...saleData,
        recordedAt: new Date(),
      })

      // Update user's total earnings
      const userRef = db.collection("users").doc(userId)
      await userRef.update({
        totalEarnings: db.FieldValue.increment(saleData.netAmount || 0),
        totalSales: db.FieldValue.increment(1),
      })

      console.log(`💰 Recorded sale for user ${userId}:`, saleData)
    })
  }
}
