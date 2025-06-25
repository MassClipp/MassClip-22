import { type NextRequest, NextResponse } from "next/server"
import { db, FieldValue } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"

export async function POST(request: NextRequest) {
  try {
    // Get Firebase auth token
    const authHeader = request.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    let decodedToken

    try {
      decodedToken = await getAuth().verifyIdToken(token)
    } catch (error) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const userId = decodedToken.uid
    console.log(`🔍 [Create Test Product Box] User ID: ${userId}`)

    // Get request body
    const body = await request.json()
    const { title, description, price, currency = "USD", collectionName = "productBoxes" } = body

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    // Get user info for creator details
    const userDoc = await db.collection("users").doc(userId).get()
    const userData = userDoc.exists ? userDoc.data() : {}

    // Create product box
    const productBoxData = {
      title,
      description: description || `Test product box created on ${new Date().toLocaleString()}`,
      price: price || 9.99,
      currency,
      creatorId: userId,
      creatorName: userData.displayName || userData.name || "Test Creator",
      creatorUsername: userData.username || userId.substring(0, 8),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      status: "active",
      contentCount: 0,
      contentItems: [],
    }

    // Save to specified collection
    const productBoxRef = db.collection(collectionName).doc()
    await productBoxRef.set(productBoxData)

    console.log(`✅ [Create Test Product Box] Created product box: ${productBoxRef.id}`)

    // Create a sample purchase record
    const purchaseData = {
      userId,
      itemId: productBoxRef.id,
      itemType: "productBox",
      itemName: title,
      amount: price || 9.99,
      currency,
      status: "completed",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      paymentMethod: "test",
    }

    const purchaseRef = db.collection("purchases").doc()
    await purchaseRef.set(purchaseData)

    console.log(`✅ [Create Test Product Box] Created purchase record: ${purchaseRef.id}`)

    // Also add to user's purchases subcollection
    await db.collection("users").doc(userId).collection("purchases").doc(purchaseRef.id).set(purchaseData)

    return NextResponse.json({
      success: true,
      productBox: {
        id: productBoxRef.id,
        ...productBoxData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      purchase: {
        id: purchaseRef.id,
        ...purchaseData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error(`❌ [Create Test Product Box] Error:`, error)
    return NextResponse.json(
      {
        error: "Failed to create test product box",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
