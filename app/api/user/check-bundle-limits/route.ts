import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { checkSubscription, canAddVideoToBundle, canCreateBundle } from "@/lib/subscription"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const bundleId = searchParams.get("bundleId")
    const checkType = searchParams.get("type") // "create" or "addVideo"

    const subscription = await checkSubscription(session.user.id)

    if (checkType === "create") {
      // Check if user can create a new bundle
      const bundlesQuery = query(
        collection(db, "productBoxes"),
        where("creatorId", "==", session.user.id)
      )
      const bundlesSnapshot = await getDocs(bundlesQuery)
      const currentBundleCount = bundlesSnapshot.size

      const canCreate = canCreateBundle(currentBundleCount, subscription.plan)

      return NextResponse.json({
        canCreate,
        currentCount: currentBundleCount,
        maxAllowed: subscription.features.maxBundles,
        plan: subscription.plan,
        message: canCreate 
          ? "You can create a new bundle" 
          : `You've reached your bundle limit (${subscription.features.maxBundles}). Upgrade to Creator Pro for unlimited bundles.`
      })
    }

    if (checkType === "addVideo" && bundleId) {
      // Check if user can add a video to existing bundle
      const bundleDoc = await getDoc(doc(db, "productBoxes", bundleId))
      
      if (!bundleDoc.exists()) {
        return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
      }

      const bundleData = bundleDoc.data()
      const currentVideoCount = bundleData.contentItems?.length || 0

      const canAdd = canAddVideoToBundle(currentVideoCount, subscription.plan)

      return NextResponse.json({
        canAdd,
        currentCount: currentVideoCount,
        maxAllowed: subscription.features.maxVideosPerBundle,
        plan: subscription.plan,
        message: canAdd 
          ? "You can add more videos to this bundle" 
          : `You've reached the video limit for this bundle (${subscription.features.maxVideosPerBundle}). Upgrade to Creator Pro for unlimited videos per bundle.`
      })
    }

    return NextResponse.json({ error: "Invalid request parameters" }, { status: 400 })

  } catch (error) {
    console.error("Error checking bundle limits:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
