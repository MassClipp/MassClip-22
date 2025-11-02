import { type NextRequest, NextResponse } from "next/server"
import { cert, getApps, initializeApp } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"
import { UserTrackingService } from "@/lib/user-tracking-service"

// Initialize Firebase Admin
if (!getApps().length) {
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")

  if (projectId && clientEmail && privateKey) {
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    })
  }
}

const db = getFirestore()

async function getTierInfoSafe(uid: string): Promise<{ maxVideosPerBundle: number | null; maxBundles: number | null }> {
  try {
    const tier = await UserTrackingService.getUserTierInfo(uid)
    if (tier && ("maxVideosPerBundle" in tier || "maxBundles" in tier)) {
      return {
        maxVideosPerBundle: tier.maxVideosPerBundle ?? 10,
        maxBundles: tier.maxBundles ?? 2,
      }
    }
  } catch (e) {
    console.warn("⚠️ [Debug] UserTrackingService.getUserTierInfo failed. Falling back to Firestore lookup.", e)
  }

  try {
    const proDoc = await db.collection("creatorProUsers").doc(uid).get()
    if (proDoc.exists) {
      const maxVideosPerBundle = proDoc.get("maxVideosPerBundle")
      const maxBundles = proDoc.get("maxBundles")
      return {
        maxVideosPerBundle: typeof maxVideosPerBundle === "number" ? maxVideosPerBundle : null,
        maxBundles: typeof maxBundles === "number" ? maxBundles : null,
      }
    }

    const freeDoc = await db.collection("freeUsers").doc(uid).get()
    if (freeDoc.exists) {
      const mvb = freeDoc.get("maxVideosPerBundle")
      const mb = freeDoc.get("bundlesLimit") ?? freeDoc.get("maxBundles")
      return {
        maxVideosPerBundle: typeof mvb === "number" ? mvb : 10,
        maxBundles: typeof mb === "number" ? mb : 2,
      }
    }
  } catch (e) {
    console.warn("⚠️ [Debug] Firestore tier lookup failed.", e)
  }

  return { maxVideosPerBundle: 10, maxBundles: 2 }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get("authorization") || ""
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null
    if (!token) {
      return NextResponse.json({ error: "Missing Authorization Bearer token" }, { status: 401 })
    }

    let decoded
    try {
      decoded = await getAuth().verifyIdToken(token)
    } catch (e) {
      return NextResponse.json({ error: "Invalid or expired auth token" }, { status: 401 })
    }
    const uid = decoded.uid

    const bundleId = params.id
    if (!bundleId) {
      return NextResponse.json({ error: "Missing bundle id" }, { status: 400 })
    }

    const bundleRef = db.collection("bundles").doc(bundleId)
    const bundleSnap = await bundleRef.get()
    if (!bundleSnap.exists) {
      return NextResponse.json({ error: "Bundle not found" }, { status: 404 })
    }
    const bundleData = bundleSnap.data() || {}

    const tier = await getTierInfoSafe(uid)
    const rawExistingIds: string[] = Array.isArray(bundleData.contentItems) ? bundleData.contentItems : []

    const existingSet = new Set(rawExistingIds.filter((id: any) => typeof id === "string" && id.length > 0))
    const currentCount = existingSet.size
    const maxPerBundle = tier.maxVideosPerBundle // null => unlimited

    const remaining = maxPerBundle === null ? Number.POSITIVE_INFINITY : Math.max(0, maxPerBundle - currentCount)

    return NextResponse.json({
      success: true,
      tierInfo: tier,
      bundleData: {
        contentItems: bundleData.contentItems,
        detailedContentItems: bundleData.detailedContentItems,
        contentMetadata: bundleData.contentMetadata,
      },
      rawExistingIds,
      uniqueSetSize: existingSet.size,
      currentCount,
      maxPerBundle,
      remaining,
      calculations: {
        rawLength: rawExistingIds.length,
        filteredLength: rawExistingIds.filter((id: any) => typeof id === "string" && id.length > 0).length,
        setSize: existingSet.size,
        maxPerBundle,
        remaining,
      },
    })
  } catch (error: any) {
    console.error("❌ [Debug Bundle Limits] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to get debug data" }, { status: 500 })
  }
}
