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
    }

    console.log(`✅ Platform stats calculated successfully`)

    return NextResponse.json(platformStats)
  } catch (error) {
    console.error("❌ Error fetching platform stats:", error)
    return NextResponse.json({ error: "Failed to fetch platform statistics" }, { status: 500 })
  }
}
