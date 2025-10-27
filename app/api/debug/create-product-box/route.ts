import { NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"

export async function POST(request: Request) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized - no token" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    let decodedToken

    try {
      decodedToken = await getAuth().verifyIdToken(token)
    } catch (error) {
      return NextResponse.json({ error: "Unauthorized - invalid token" }, { status: 401 })
    }

    const userId = decodedToken.uid
    console.log(`✅ [Create Product Box] User authenticated: ${userId}`)

    // Get request body
    const body = await request.json()
    const { productBoxId, title, description, price } = body

    if (!productBoxId) {
      return NextResponse.json({ error: "Product box ID is required" }, { status: 400 })
    }

    // Check if product box already exists
    const productBoxRef = db.collection("productBoxes").doc(productBoxId)
    const productBoxDoc = await productBoxRef.get()

    if (productBoxDoc.exists) {
      console.log(`⚠️ [Create Product Box] Product box already exists: ${productBoxId}`)
      return NextResponse.json({
        message: "Product box already exists",
        productBoxId,
        data: productBoxDoc.data(),
      })
    }

    // Get user data for creator info
    const userDoc = await db.collection("users").doc(userId).get()
    const userData = userDoc.data() || {}

    // Create product box
    const productBoxData = {
      id: productBoxId,
      title: title || "Test Product Box",
      description: description || "This is a test product box created for debugging purposes.",
      price: price || 9.99,
      creatorId: userId,
      creatorName: userData.displayName || "Test Creator",
      creatorUsername: userData.username || "testcreator",
      createdAt: new Date(),
      updatedAt: new Date(),
      status: "active",
      type: "product_box",
    }

    await productBoxRef.set(productBoxData)
    console.log(`✅ [Create Product Box] Created product box: ${productBoxId}`)

    // Create a sample content item
    const contentRef = db.collection("productBoxContent").doc()
    const contentData = {
      id: contentRef.id,
      productBoxId: productBoxId,
      title: "Sample Content",
      description: "This is a sample content item for testing.",
      fileUrl: "https://example.com/sample.pdf",
      fileType: "pdf",
      fileSize: 1024,
      uploadedAt: new Date(),
      status: "completed",
      creatorId: userId,
    }

    await contentRef.set(contentData)
    console.log(`✅ [Create Product Box] Created sample content: ${contentRef.id}`)

    return NextResponse.json({
      success: true,
      message: "Product box created successfully",
      productBoxId,
      productBox: productBoxData,
      contentId: contentRef.id,
    })
  } catch (error) {
    console.error("[Create Product Box] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to create product box",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
