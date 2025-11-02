import { NextResponse } from "next/server"
import { getFirestore } from "firebase-admin/firestore"
import { initializeApp, getApps, cert } from "firebase-admin/app"

// Initialize Firebase Admin
if (!getApps().length) {
  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
  }

  initializeApp({
    credential: cert(serviceAccount as any),
  })
}

const db = getFirestore()

export async function GET() {
  try {
    // Fetch all active, public bundles
    const bundlesQuery = db.collection("bundles").where("active", "==", true).where("isPublic", "==", true)

    const bundlesSnapshot = await bundlesQuery.get()

    const bundles = bundlesSnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        title: data.title,
        description: data.description || "",
        price: data.price || 0,
        currency: data.currency || "usd",
        thumbnailUrl: data.thumbnailUrl || data.coverImage || "",
        creatorName: data.creatorName || "Unknown Creator",
        creatorUsername: data.creatorUsername || "",
        creatorId: data.creatorId,
        category: data.category || "Uncategorized",
        niche: data.niche || "",
        tags: data.tags || [],
        rating: data.rating || 0,
        reviewCount: data.reviewCount || 0,
        salesCount: data.salesCount || 0,
        contentMetadata: data.contentMetadata || { totalItems: 0 },
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      }
    })

    return NextResponse.json({
      success: true,
      bundles,
      count: bundles.length,
    })
  } catch (error: any) {
    console.error("Error fetching marketplace bundles:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch bundles",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
