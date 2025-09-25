import { NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
import { getAuth } from "firebase-admin/auth"
import { FieldValue } from "firebase-admin/firestore"

// Initialize Firebase Admin
initializeFirebaseAdmin()

export const maxDuration = 30

export async function POST(request: Request) {
  try {
    console.log("🚀 [Bundle Creation] API called")

    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const token = authHeader.split("Bearer ")[1]
    const decodedToken = await getAuth().verifyIdToken(token)
    const userId = decodedToken.uid

    const { title, description, price, contentIds, category, tags } = await request.json()

    if (!title || !description || !price || !contentIds || !Array.isArray(contentIds)) {
      return NextResponse.json(
        {
          error: "Missing required fields: title, description, price, contentIds",
        },
        { status: 400 },
      )
    }

    console.log(`🚀 [Bundle Creation] Creating bundle for user ${userId}:`, {
      title,
      price,
      contentIds: contentIds.length,
    })

    // Create bundle document
    const bundleRef = db.collection("bundles").doc()
    const bundleId = bundleRef.id

    const bundleData = {
      id: bundleId,
      title,
      description,
      price: Number(price),
      contentIds,
      category: category || "Mixed Media",
      tags: tags || [],
      creatorId: userId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      isActive: true,
      totalSales: 0,
      totalRevenue: 0,
      createdBy: "vex-ai",
    }

    await bundleRef.set(bundleData)

    console.log(`✅ [Bundle Creation] Bundle created successfully: ${bundleId}`)

    return NextResponse.json({
      success: true,
      bundleId,
      message: "Bundle created successfully",
      bundle: {
        id: bundleId,
        title,
        description,
        price,
        contentIds,
        category,
        tags,
      },
    })
  } catch (error) {
    console.error("❌ [Bundle Creation] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to create bundle",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
