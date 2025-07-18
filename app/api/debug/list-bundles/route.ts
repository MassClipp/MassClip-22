import { type NextRequest, NextResponse } from "next/server"
import { verifyIdToken } from "@/lib/auth-utils"
import { db } from "@/lib/firebase-admin"
import { headers } from "next/headers"

async function verifyToken(request: NextRequest): Promise<any> {
  try {
    const headersList = headers()
    const authorization = headersList.get("authorization")

    if (!authorization || !authorization.startsWith("Bearer ")) {
      console.error(`❌ [List Bundles Debug] Authentication failed`)
      return null
    }

    const token = authorization.split("Bearer ")[1]
    const authResult = await verifyIdToken(request, token)
    return authResult
  } catch (error) {
    console.error(`❌ [List Bundles Debug] Authentication failed`, error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log(`📦 [List Bundles Debug] Fetching available bundles`)

    // Verify authentication
    const decodedToken = await verifyToken(request)
    if (!decodedToken) {
      console.error(`❌ [List Bundles Debug] Authentication failed`)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch bundles from Firestore
    const bundlesSnapshot = await db.collection("bundles").limit(20).get()

    const bundles = bundlesSnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        title: data.title || "Untitled Bundle",
        description: data.description || "No description",
        price: data.price || 0,
        creatorId: data.creatorId || "unknown",
        active: data.active !== false, // Default to true if not specified
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      }
    })

    console.log(`✅ [List Bundles Debug] Found ${bundles.length} bundles`)

    return NextResponse.json({
      success: true,
      bundles,
      count: bundles.length,
    })
  } catch (error: any) {
    console.error(`❌ [List Bundles Debug] Error:`, error)
    return NextResponse.json(
      {
        success: false,
        error: `Failed to fetch bundles: ${error instanceof Error ? error.message : "Unknown error"}`,
        bundles: [],
        count: 0,
      },
      { status: 500 },
    )
  }
}
