import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"
import BundleDetailView from "@/components/bundle-detail-view"

// Helper function to convert Firestore data to plain objects
function serializeData(data: any): any {
  if (!data) return null

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map((item) => serializeData(item))
  }

  // Handle Firestore Timestamp objects
  if (data._seconds !== undefined && data._nanoseconds !== undefined) {
    return new Date(data._seconds * 1000 + data._nanoseconds / 1000000).toISOString()
  }

  // Handle objects with toDate method (Firestore Timestamp)
  if (typeof data.toDate === "function") {
    return data.toDate().toISOString()
  }

  // Handle plain objects recursively
  if (typeof data === "object" && data !== null) {
    const serialized: any = {}
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        serialized[key] = serializeData(data[key])
      }
    }
    return serialized
  }

  // Return primitive values as-is
  return data
}

export async function generateMetadata({
  params,
}: {
  params: { username: string; bundleId: string }
}): Promise<Metadata> {
  const { username, bundleId } = params

  try {
    initializeFirebaseAdmin()

    const bundleDoc = await db.collection("bundles").doc(bundleId).get()

    if (!bundleDoc.exists) {
      return {
        title: "Bundle Not Found | MassClip",
        description: "The bundle you're looking for doesn't exist.",
      }
    }

    const bundleData = bundleDoc.data()
    const thumbnailUrl = bundleData?.thumbnailUrl || "https://massclip.pro/og-image.jpg"

    return {
      title: `${bundleData?.title || "Bundle"} by ${username} | MassClip`,
      description: bundleData?.description || `Check out this content bundle by ${username}`,
      openGraph: {
        title: `${bundleData?.title || "Bundle"} by ${username}`,
        description: bundleData?.description || `Check out this content bundle by ${username}`,
        url: `https://massclip.pro/creator/${username}/bundle/${bundleId}`,
        siteName: "MassClip",
        images: [
          {
            url: thumbnailUrl,
            width: 1200,
            height: 630,
            alt: bundleData?.title || "Bundle",
          },
        ],
        locale: "en_US",
        type: "website",
      },
      alternates: {
        canonical: `https://massclip.pro/creator/${username}/bundle/${bundleId}`,
      },
    }
  } catch (error) {
    console.error("[Metadata] Error generating bundle metadata:", error)
    return {
      title: "Bundle | MassClip",
      description: "View content bundle on MassClip",
    }
  }
}

export default async function BundleDetailPage({
  params,
}: {
  params: { username: string; bundleId: string }
}) {
  const { username, bundleId } = params

  try {
    initializeFirebaseAdmin()

    console.log(`[Bundle Detail] Fetching bundle ${bundleId} for creator ${username}`)

    // Fetch bundle data
    const bundleDoc = await db.collection("bundles").doc(bundleId).get()

    if (!bundleDoc.exists) {
      console.log(`[Bundle Detail] Bundle ${bundleId} not found`)
      notFound()
    }

    const bundleData = bundleDoc.data()

    if (!bundleData) {
      console.log(`[Bundle Detail] Bundle ${bundleId} has no data`)
      notFound()
    }

    // Fetch creator data
    const usersRef = db.collection("users")
    const querySnapshot = await usersRef.where("username", "==", username.toLowerCase()).get()

    if (querySnapshot.empty) {
      console.log(`[Bundle Detail] Creator ${username} not found`)
      notFound()
    }

    const creatorDoc = querySnapshot.docs[0]
    const creatorData = creatorDoc.data()

    if (!creatorData) {
      console.log(`[Bundle Detail] Creator ${username} has no data`)
      notFound()
    }

    const serializedBundle = serializeData(bundleData)
    const serializedCreator = serializeData(creatorData)

    const bundle = {
      id: bundleId,
      title: serializedBundle?.title || "Untitled Bundle",
      description: serializedBundle?.description || "",
      price: typeof serializedBundle?.price === "number" ? serializedBundle.price : 0,
      thumbnailUrl: serializedBundle?.thumbnailUrl || "",
      contentCount: serializedBundle?.contentCount || 0,
      stripePriceId: serializedBundle?.stripePriceId || "",
      stripeProductId: serializedBundle?.stripeProductId || "",
      createdAt: serializedBundle?.createdAt || new Date().toISOString(),
      detailedContentItems: Array.isArray(serializedBundle?.detailedContentItems)
        ? serializedBundle.detailedContentItems
        : [],
    }

    const creator = {
      uid: creatorDoc.id, // Use document ID as uid
      username: serializedCreator?.username || username,
      displayName: serializedCreator?.displayName || serializedCreator?.username || username,
      profilePic: serializedCreator?.profilePic || serializedCreator?.photoURL || "",
      bio: serializedCreator?.bio || "",
    }

    console.log(`[Bundle Detail] Successfully loaded bundle and creator data`)

    return <BundleDetailView bundle={bundle} creator={creator} />
  } catch (error) {
    console.error(`[Bundle Detail] Error fetching bundle ${bundleId}:`, error)
    if (error instanceof Error) {
      console.error(`[Bundle Detail] Error message: ${error.message}`)
      console.error(`[Bundle Detail] Error stack: ${error.stack}`)
    }
    notFound()
  }
}
