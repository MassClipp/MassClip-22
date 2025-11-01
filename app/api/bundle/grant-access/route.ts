import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { auth } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    console.log(`🚀 [Grant Access] API called with auth`)

    // Get auth token
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 })
    }

    const idToken = authHeader.split("Bearer ")[1]
    const decodedToken = await auth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    const { bundleId, creatorId } = await request.json()

    if (!bundleId || !creatorId) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    console.log(`🔄 [Grant Access] Processing for user: ${userId}, bundle: ${bundleId}`)

    // Get bundle information
    const bundleRef = db.collection("productBoxes").doc(bundleId)
    const bundleDoc = await bundleRef.get()

    if (!bundleDoc.exists) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }

    const bundleData = bundleDoc.data()

    // Get creator information
    const creatorRef = db.collection("users").doc(creatorId)
    const creatorDoc = await creatorRef.get()

    if (!creatorDoc.exists) {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 })
    }

    const creatorData = creatorDoc.data()

    // Check if user already has access
    const existingPurchaseRef = db
      .collection("productBoxPurchases")
      .where("userId", "==", userId)
      .where("productBoxId", "==", bundleId)

    const existingPurchases = await existingPurchaseRef.get()
    const alreadyPurchased = !existingPurchases.empty

    if (!alreadyPurchased) {
      // Create purchase record
      const purchaseData = {
        userId,
        productBoxId: bundleId,
        creatorId,
        purchaseDate: new Date(),
        status: "completed",
        accessGranted: true,
        grantMethod: "post_purchase_verification",
        bundleTitle: bundleData?.title || "Unknown Bundle",
        bundlePrice: bundleData?.price || 0,
        currency: bundleData?.currency || "usd",
      }

      // Add to main purchases collection
      await db.collection("productBoxPurchases").add(purchaseData)

      // Add to unified purchases collection
      await db.collection("unifiedPurchases").add({
        ...purchaseData,
        type: "product_box",
      })

      // Add to user's purchases subcollection
      await db.collection("users").doc(userId).collection("purchases").add(purchaseData)

      console.log(`✅ [Grant Access] Access granted successfully for user: ${userId}`)
    } else {
      console.log(`ℹ️ [Grant Access] User already has access: ${userId}`)
    }

    return NextResponse.json({
      success: true,
      alreadyPurchased,
      bundle: {
        id: bundleId,
        title: bundleData?.title || "Unknown Bundle",
        description: bundleData?.description || "",
        price: bundleData?.price || 0,
        currency: bundleData?.currency || "usd",
        thumbnailUrl: bundleData?.thumbnailUrl || "",
      },
      creator: {
        id: creatorId,
        name: creatorData?.displayName || creatorData?.name || "Unknown Creator",
        username: creatorData?.username || "",
      },
    })
  } catch (error: any) {
    console.error(`❌ [Grant Access] Error:`, error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to grant access",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
