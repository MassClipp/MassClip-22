import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { getAuthenticatedUser } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    // Verify admin access (you should implement proper admin role checking)
    const user = await getAuthenticatedUser(request.headers)

    // TODO: Add admin role verification here
    // For now, we'll allow any authenticated user
    // In production, check if user has admin role in Firestore

    const searchParams = request.nextUrl.searchParams
    const range = searchParams.get("range") || "30d"

    console.log(`📊 Fetching platform stats for range: ${range}`)

    // Calculate date range
    const now = new Date()
    let startDate = new Date()

    switch (range) {
      case "7d":
        startDate.setDate(now.getDate() - 7)
        break
      case "30d":
        startDate.setDate(now.getDate() - 30)
        break
      case "90d":
        startDate.setDate(now.getDate() - 90)
        break
      case "all":
        startDate = new Date(0) // Beginning of time
        break
    }

    // Get all users
    const usersSnapshot = await db.collection("users").get()
    const totalUsers = usersSnapshot.size

    // Get all uploads to count videos and active creators
    const uploadsSnapshot = await db.collection("uploads").get()
    const uploads = uploadsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    const totalVideos = uploads.length
    const creatorIds = new Set(uploads.map((upload: any) => upload.userId))
    const activeCreators = creatorIds.size

    // Count free vs premium videos
    const freeVideos = uploads.filter((upload: any) => upload.isFree).length
    const premiumVideos = totalVideos - freeVideos

    // Calculate average price of premium content
    const premiumPrices = uploads
      .filter((upload: any) => !upload.isFree && upload.price)
      .map((upload: any) => upload.price)
    const avgPrice =
      premiumPrices.length > 0 ? premiumPrices.reduce((sum, price) => sum + price, 0) / premiumPrices.length : 0

    // Get all bundle purchases for revenue calculation
    const purchasesSnapshot = await db.collection("bundlePurchases").where("purchasedAt", ">=", startDate).get()

    const purchases = purchasesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      purchasedAt: doc.data().purchasedAt?.toDate() || new Date(),
    }))

    const totalRevenue = purchases.reduce((sum, purchase: any) => sum + (purchase.netAmount || 0), 0)
    const totalSales = purchases.length

    // Calculate revenue by creator
    const revenueByCreator = new Map<string, { revenue: number; sales: number; videos: number; username: string }>()

    purchases.forEach((purchase: any) => {
      const creatorId = purchase.creatorId || purchase.userId
      if (creatorId) {
        const existing = revenueByCreator.get(creatorId) || { revenue: 0, sales: 0, videos: 0, username: "" }
        existing.revenue += purchase.netAmount || 0
        existing.sales += 1
        revenueByCreator.set(creatorId, existing)
      }
    })

    // Add video counts to creators
    uploads.forEach((upload: any) => {
      if (upload.userId) {
        const existing = revenueByCreator.get(upload.userId) || { revenue: 0, sales: 0, videos: 0, username: "" }
        existing.videos += 1
        revenueByCreator.set(upload.userId, existing)
      }
    })

    // Get usernames for top creators
    const topCreatorsArray = Array.from(revenueByCreator.entries())
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 10)

    // Fetch usernames
    const topCreators = await Promise.all(
      topCreatorsArray.map(async ([userId, data]) => {
        try {
          const userDoc = await db.collection("users").doc(userId).get()
          const userData = userDoc.data()
          return {
            userId,
            username: userData?.username || userData?.displayName || "Anonymous",
            revenue: data.revenue,
            sales: data.sales,
            videos: data.videos,
          }
        } catch (error) {
          return {
            userId,
            username: "Anonymous",
            revenue: data.revenue,
            sales: data.sales,
            videos: data.videos,
          }
        }
      }),
    )

    // Calculate average revenue per creator
    const avgRevenuePerCreator = activeCreators > 0 ? totalRevenue / activeCreators : 0
    const avgVideosPerCreator = activeCreators > 0 ? totalVideos / activeCreators : 0

    // Get total profile views
    let totalProfileViews = 0
    for (const doc of usersSnapshot.docs) {
      const userData = doc.data()
      totalProfileViews += userData.profileViews || 0
    }

    // Calculate revenue by month
    const revenueByMonth = new Map<string, { revenue: number; sales: number }>()

    purchases.forEach((purchase: any) => {
      const month = purchase.purchasedAt.toLocaleDateString("en-US", { year: "numeric", month: "short" })
      const existing = revenueByMonth.get(month) || { revenue: 0, sales: 0 }
      existing.revenue += purchase.netAmount || 0
      existing.sales += 1
      revenueByMonth.set(month, existing)
    })

    const revenueByMonthArray = Array.from(revenueByMonth.entries())
      .map(([month, data]) => ({
        month,
        revenue: data.revenue,
        sales: data.sales,
      }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())

    // Calculate user growth (simplified - you might want to track actual registration dates)
    const userGrowth = []
    const daysToShow = range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 365

    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      userGrowth.push({
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        users: Math.floor(totalUsers * (1 - i / daysToShow)), // Simplified growth curve
      })
    }

    const dailyStats = []
    const dailyDataMap = new Map<string, { revenue: number; sales: number; views: number; newUsers: number }>()

    purchases.forEach((purchase: any) => {
      const dateKey = purchase.purchasedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      const existing = dailyDataMap.get(dateKey) || { revenue: 0, sales: 0, views: 0, newUsers: 0 }
      existing.revenue += purchase.netAmount || 0
      existing.sales += 1
      dailyDataMap.set(dateKey, existing)
    })

    // Sort and format daily stats
    const sortedDailyStats = Array.from(dailyDataMap.entries())
      .map(([date, data]) => ({
        date,
        revenue: data.revenue,
        sales: data.sales,
        views: data.views,
        newUsers: data.newUsers,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-30) // Last 30 days

    const conversionFunnel = {
      profileViews: totalProfileViews,
      videoViews: Math.floor(totalProfileViews * 0.65), // Estimated 65% view videos after profile visit
      addToCarts: Math.floor(totalProfileViews * 0.15), // Estimated 15% add to cart
      purchases: totalSales,
    }

    const videoViewsMap = new Map<string, number>()
    const videoRevenueMap = new Map<string, number>()

    // Aggregate views and revenue per video
    purchases.forEach((purchase: any) => {
      const videoId = purchase.videoId || purchase.bundleId
      if (videoId) {
        videoRevenueMap.set(videoId, (videoRevenueMap.get(videoId) || 0) + (purchase.netAmount || 0))
      }
    })

    const avgViewsPerVideo = totalProfileViews / totalVideos
    const avgRevenuePerVideo = totalRevenue / totalVideos

    // Get top performing videos
    const topPerformingVideos = Array.from(videoRevenueMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([videoId, revenue]) => {
        const video = uploads.find((u: any) => u.id === videoId)
        const views = Math.floor(Math.random() * 1000) + 100 // Simulated views
        return {
          id: videoId,
          title: video?.title || "Untitled Video",
          views,
          revenue,
          conversionRate: (revenue / views) * 100,
        }
      })

    const contentPerformance = {
      avgViewsPerVideo,
      avgRevenuePerVideo,
      topPerformingVideos,
    }

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(now.getDate() - 30)
    const sixtyDaysAgo = new Date()
    sixtyDaysAgo.setDate(now.getDate() - 60)

    const recentPurchases = purchases.filter((p: any) => p.purchasedAt >= thirtyDaysAgo)
    const previousPurchases = purchases.filter(
      (p: any) => p.purchasedAt >= sixtyDaysAgo && p.purchasedAt < thirtyDaysAgo,
    )

    const recentRevenue = recentPurchases.reduce((sum, p: any) => sum + (p.netAmount || 0), 0)
    const previousRevenue = previousPurchases.reduce((sum, p: any) => sum + (p.netAmount || 0), 0)

    const revenueGrowthMoM = previousRevenue > 0 ? ((recentRevenue - previousRevenue) / previousRevenue) * 100 : 0

    // Simplified user growth calculation
    const userGrowthMoM = 5.2 // Placeholder - would need actual registration date tracking

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(now.getDate() - 7)
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(now.getDate() - 14)

    const thisWeekSales = purchases.filter((p: any) => p.purchasedAt >= sevenDaysAgo).length
    const lastWeekSales = purchases.filter(
      (p: any) => p.purchasedAt >= fourteenDaysAgo && p.purchasedAt < sevenDaysAgo,
    ).length

    const salesGrowthWoW = lastWeekSales > 0 ? ((thisWeekSales - lastWeekSales) / lastWeekSales) * 100 : 0

    const growthMetrics = {
      revenueGrowthMoM,
      userGrowthMoM,
      salesGrowthWoW,
    }

    const creatorTiers = {
      topTier: 0, // >$1000/month
      midTier: 0, // $100-$1000/month
      lowTier: 0, // <$100/month
    }

    revenueByCreator.forEach((data) => {
      if (data.revenue > 1000) {
        creatorTiers.topTier++
      } else if (data.revenue >= 100) {
        creatorTiers.midTier++
      } else {
        creatorTiers.lowTier++
      }
    })

    const activityByHour = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      activity: Math.floor(Math.random() * 100) + 20, // Simulated data - would need actual timestamp tracking
    }))

    const activityByDay = [
      { day: "Mon", activity: Math.floor(Math.random() * 500) + 200 },
      { day: "Tue", activity: Math.floor(Math.random() * 500) + 200 },
      { day: "Wed", activity: Math.floor(Math.random() * 500) + 200 },
      { day: "Thu", activity: Math.floor(Math.random() * 500) + 200 },
      { day: "Fri", activity: Math.floor(Math.random() * 500) + 200 },
      { day: "Sat", activity: Math.floor(Math.random() * 500) + 200 },
      { day: "Sun", activity: Math.floor(Math.random() * 500) + 200 },
    ]

    const peakHourData = activityByHour.reduce((max, curr) => (curr.activity > max.activity ? curr : max))
    const peakDayData = activityByDay.reduce((max, curr) => (curr.activity > max.activity ? curr : max))

    const peakActivity = {
      peakHour: peakHourData.hour,
      peakDay: peakDayData.day,
      activityByHour,
      activityByDay,
    }

    // Calculate revenue breakdown
    const platformFeeRate = 0.1 // 10% platform fee
    const creatorEarnings = totalRevenue * (1 - platformFeeRate)
    const platformFees = totalRevenue * platformFeeRate
    const avgTransactionSize = totalSales > 0 ? totalRevenue / totalSales : 0
    const largestTransaction = purchases.length > 0 ? Math.max(...purchases.map((p: any) => p.netAmount || 0)) : 0

    const revenueBreakdown = {
      platformFees,
      creatorEarnings,
      avgTransactionSize,
      largestTransaction,
    }

    // Calculate user retention metrics
    const oneDayAgo = new Date()
    oneDayAgo.setDate(now.getDate() - 1)
    const thirtyDaysAgoForRetention = new Date()
    thirtyDaysAgoForRetention.setDate(now.getDate() - 30)

    // Simulated active user data - in production, track actual user activity
    const dailyActiveUsers = Math.floor(totalUsers * 0.15) // 15% daily active
    const weeklyActiveUsers = Math.floor(totalUsers * 0.35) // 35% weekly active
    const monthlyActiveUsers = Math.floor(totalUsers * 0.55) // 55% monthly active
    const retentionRate = (monthlyActiveUsers / totalUsers) * 100

    const userRetention = {
      dailyActiveUsers,
      weeklyActiveUsers,
      monthlyActiveUsers,
      retentionRate,
    }

    // Calculate content engagement metrics
    const totalViews = totalProfileViews + Math.floor(totalProfileViews * 0.65) // Profile + video views
    const avgWatchTime = 8.5 // Average minutes per video (simulated)
    const completionRate = 72.3 // Percentage who complete videos (simulated)
    const shareRate = 5.2 // Percentage who share content (simulated)

    const contentEngagement = {
      totalViews,
      avgWatchTime,
      completionRate,
      shareRate,
    }

    // Simulated geographic data - in production, track actual user locations
    const geographicData = [
      { country: "United States", users: Math.floor(totalUsers * 0.35), revenue: totalRevenue * 0.42 },
      { country: "United Kingdom", users: Math.floor(totalUsers * 0.15), revenue: totalRevenue * 0.18 },
      { country: "Canada", users: Math.floor(totalUsers * 0.12), revenue: totalRevenue * 0.14 },
      { country: "Australia", users: Math.floor(totalUsers * 0.08), revenue: totalRevenue * 0.09 },
      { country: "Germany", users: Math.floor(totalUsers * 0.07), revenue: totalRevenue * 0.06 },
      { country: "France", users: Math.floor(totalUsers * 0.06), revenue: totalRevenue * 0.05 },
      { country: "Netherlands", users: Math.floor(totalUsers * 0.05), revenue: totalRevenue * 0.03 },
      { country: "Spain", users: Math.floor(totalUsers * 0.04), revenue: totalRevenue * 0.02 },
      { country: "Italy", users: Math.floor(totalUsers * 0.04), revenue: totalRevenue * 0.01 },
      { country: "Other", users: Math.floor(totalUsers * 0.04), revenue: totalRevenue * 0.0 },
    ]

    // Simulated device breakdown - in production, track actual device types
    const deviceBreakdown = {
      mobile: Math.floor(totalUsers * 0.62), // 62% mobile
      desktop: Math.floor(totalUsers * 0.31), // 31% desktop
      tablet: Math.floor(totalUsers * 0.07), // 7% tablet
    }

    const platformStats = {
      totalUsers,
      activeCreators,
      totalVideos,
      totalRevenue,
      totalSales,
      totalProfileViews,
      avgRevenuePerCreator,
      avgVideosPerCreator,
      topCreators,
      revenueByMonth: revenueByMonthArray,
      userGrowth,
      contentStats: {
        freeVideos,
        premiumVideos,
        avgPrice,
      },
      dailyStats: sortedDailyStats,
      conversionFunnel,
      contentPerformance,
      growthMetrics,
      creatorTiers,
      peakActivity,
      revenueBreakdown,
      userRetention,
      contentEngagement,
      geographicData,
      deviceBreakdown,
    }

    console.log(`✅ Platform stats calculated successfully`)

    return NextResponse.json(platformStats)
  } catch (error) {
    console.error("❌ Error fetching platform stats:", error)
    return NextResponse.json({ error: "Failed to fetch platform statistics" }, { status: 500 })
  }
}
