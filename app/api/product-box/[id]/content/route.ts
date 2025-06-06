import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/server-session"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log(`🔍 [Product Box Content] Fetching content for product box: ${params.id}`)

    const session = await getServerSession()
    if (!session?.uid) {
      console.log("❌ [Product Box Content] Unauthorized - no session")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify product box access
    const productBoxRef = db.collection("productBoxes").doc(params.id)
    const productBoxDoc = await productBoxRef.get()

    if (!productBoxDoc.exists) {
      console.log(`❌ [Product Box Content] Product box not found: ${params.id}`)
      return NextResponse.json({ error: "Product box not found" }, { status: 404 })
    }

    const productBoxData = productBoxDoc.data()

    // Check if user owns this product box OR has purchased it
    const isOwner = productBoxData?.creatorId === session.uid
    let hasPurchased = false

    if (!isOwner) {
      // Check if user has purchased this product box
      const purchaseQuery = db
        .collection("purchases")
        .where("userId", "==", session.uid)
        .where("productBoxId", "==", params.id)
        .where("status", "==", "completed")

      const purchaseSnapshot = await purchaseQuery.get()
      hasPurchased = !purchaseSnapshot.empty
    }

    if (!isOwner && !hasPurchased) {
      console.log(`❌ [Product Box Content] Access denied for user ${session.uid} to product box ${params.id}`)
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Fetch content files
    const contentQuery = db
      .collection("productBoxContent")
      .where("productBoxId", "==", params.id)
      .where("status", "==", "completed")
      .orderBy("uploadedAt", "desc")

    const contentSnapshot = await contentQuery.get()
    const content = contentSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      uploadedAt: doc.data().uploadedAt?.toDate?.()?.toISOString() || null,
    }))

    console.log(`✅ [Product Box Content] Found ${content.length} content items`)

    return NextResponse.json({
      success: true,
      content,
      isOwner,
      hasPurchased,
    })
  } catch (error) {
    console.error(`❌ [Product Box Content] Error fetching content:`, error)
    return NextResponse.json(
      {
        error: "Failed to fetch content",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
