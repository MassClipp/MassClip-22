export const runtime = "nodejs"

import { type NextRequest, NextResponse } from "next/server"
import { StripeSalesService } from "@/lib/stripe-sales-service"
import { FreeVideosService } from "@/lib/free-videos-service"
import { getAuthenticatedUser } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getAuthenticatedUser(request.headers)

    // Get sales data from Stripe and free videos count from Firestore
    const [salesData, freeVideosData] = await Promise.all([
      StripeSalesService.getSalesData(user.uid),
      FreeVideosService.getFreeVideosCount(user.uid),
    ])

    // Get profile views from user document
    const userDoc = await db.collection("users").doc(user.uid).get()
    const userData = userDoc.data() || {}
    const profileViews = userData.profileViews || 0

    // Get video statistics from Firestore
    const uploadsSnapshot = await db.collection("uploads").where("userId", "==", user.uid).get()
    const freeContentSnapshot = await db.collection("freeContent").where("userId", "==", user.uid).get()

    const totalUploads = uploadsSnapshot.size
    const totalFreeVideos = freeContentSnapshot.size
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

    // Combine all data
    const enhancedStats = {
      sales: {
        totalSalesLast30Days: salesData?.totalSalesLast30Days || 0,
        totalRevenueLast30Days: salesData?.totalRevenueLast30Days || 0,
        thisMonthSales: salesData?.thisMonthSales || 0,
        thisMonthRevenue: salesData?.thisMonthRevenue || 0,
        averageOrderValue: salesData?.averageOrderValue || 0,
        recentTransactions: salesData?.recentTransactions || [],
      },
      videos: {
        totalFreeVideos,
        totalUploads,
        freeVideoPercentage,
        recentFreeVideos: recentFreeVideos.map((video) => ({
          id: video.id,
          title: video.title || video.filename || "Untitled",
          uploadedAt: video.uploadedAt,
          downloadCount: video.downloadCount || 0,
        })),
      },
      profile: {
        profileViews,
      },
      lastUpdated: new Date(),
    }

    return NextResponse.json({
      success: true,
      data: enhancedStats,
    })
  } catch (error) {
    console.error("Error fetching enhanced dashboard statistics:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch enhanced statistics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
