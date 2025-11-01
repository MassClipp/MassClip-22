import { NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"

// Initialize Firebase Admin
initializeFirebaseAdmin()

export async function GET() {
  return NextResponse.json({
    message: "Use POST method to create sample purchases",
    usage: "POST /api/test/create-sample-purchases with { userId: 'user-id' }",
  })
}

export async function POST(request: Request) {
  try {
    console.log("🔧 [Create Sample Purchases] Starting...")

    const body = await request.json().catch(() => ({}))
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    console.log(`🔧 [Create Sample Purchases] Creating purchases for user: ${userId}`)

    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Create sample video purchase
    const videoPurchase = {
      buyerUid: userId,
      type: "video",
      itemId: "sample-video-1",
      amount: 9.99,
      currency: "usd",
      status: "completed",
      createdAt: now,
      paymentIntentId: "pi_sample_video_" + Date.now(),
      metadata: {
        title: "Sample Video Content",
        description: "This is a sample video for testing the purchases page",
        thumbnailUrl: "/placeholder.svg?height=200&width=300&text=Sample+Video",
        creatorName: "Sample Creator",
        creatorUsername: "samplecreator",
      },
    }

    // Create sample product box purchase
    const productBoxPurchase = {
      buyerUid: userId,
      type: "product_box",
      itemId: "sample-product-box-1",
      productBoxId: "sample-product-box-1",
      amount: 29.99,
      currency: "usd",
      status: "completed",
      createdAt: yesterday,
      paymentIntentId: "pi_sample_product_box_" + Date.now(),
      metadata: {
        title: "Sample Content Bundle",
        description: "This is a sample product box for testing the purchases page",
        thumbnailUrl: "/placeholder.svg?height=200&width=300&text=Sample+Bundle",
        creatorName: "Sample Creator",
        creatorUsername: "samplecreator",
        contentItems: ["video1.mp4", "audio1.mp3", "document1.pdf"],
      },
    }

    // Add to Firestore using batch
    const batch = db.batch()

    const videoPurchaseRef = db.collection("purchases").doc()
    batch.set(videoPurchaseRef, videoPurchase)

    const productBoxPurchaseRef = db.collection("purchases").doc()
    batch.set(productBoxPurchaseRef, productBoxPurchase)

    await batch.commit()

    console.log("✅ [Create Sample Purchases] Sample data created successfully")

    return NextResponse.json({
      success: true,
      message: "Sample purchase data created successfully",
      data: {
        videoPurchaseId: videoPurchaseRef.id,
        productBoxPurchaseId: productBoxPurchaseRef.id,
        userId,
        count: 2,
      },
    })
  } catch (error) {
    console.error("❌ [Create Sample Purchases] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to create sample purchases",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
