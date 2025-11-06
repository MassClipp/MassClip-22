import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"
import EbookDetailView from "@/components/ebook-detail-view"

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
  params: { username: string; ebookId: string }
}): Promise<Metadata> {
  const { username, ebookId } = params

  try {
    initializeFirebaseAdmin()

    const ebookDoc = await db.collection("ebooks").doc(ebookId).get()

    if (!ebookDoc.exists) {
      return {
        title: "eBook Not Found | MassClip",
        description: "The eBook you're looking for doesn't exist.",
      }
    }

    const ebookData = ebookDoc.data()
    const coverUrl = ebookData?.coverUrl || "https://massclip.pro/og-image.jpg"

    return {
      title: `${ebookData?.title || "eBook"} by ${username} | MassClip`,
      description: ebookData?.description || `Check out this eBook by ${username}`,
      openGraph: {
        title: `${ebookData?.title || "eBook"} by ${username}`,
        description: ebookData?.description || `Check out this eBook by ${username}`,
        url: `https://massclip.pro/creator/${username}/ebook/${ebookId}`,
        siteName: "MassClip",
        images: [
          {
            url: coverUrl,
            width: 1200,
            height: 630,
            alt: ebookData?.title || "eBook",
          },
        ],
        locale: "en_US",
        type: "website",
      },
      alternates: {
        canonical: `https://massclip.pro/creator/${username}/ebook/${ebookId}`,
      },
    }
  } catch (error) {
    console.error("[Metadata] Error generating eBook metadata:", error)
    return {
      title: "eBook | MassClip",
      description: "View eBook on MassClip",
    }
  }
}

export default async function EbookDetailPage({ params }: { params: { username: string; ebookId: string } }) {
  const { username, ebookId } = params

  try {
    initializeFirebaseAdmin()

    console.log(`[eBook Detail] Fetching eBook ${ebookId} for creator ${username}`)

    // Fetch eBook data
    const ebookDoc = await db.collection("ebooks").doc(ebookId).get()

    if (!ebookDoc.exists) {
      console.log(`[eBook Detail] eBook ${ebookId} not found`)
      notFound()
    }

    const ebookData = ebookDoc.data()

    if (!ebookData) {
      console.log(`[eBook Detail] eBook ${ebookId} has no data`)
      notFound()
    }

    // Fetch creator data
    const usersRef = db.collection("users")
    const querySnapshot = await usersRef.where("username", "==", username.toLowerCase()).get()

    if (querySnapshot.empty) {
      console.log(`[eBook Detail] Creator ${username} not found`)
      notFound()
    }

    const creatorDoc = querySnapshot.docs[0]
    const creatorData = creatorDoc.data()

    if (!creatorData) {
      console.log(`[eBook Detail] Creator ${username} has no data`)
      notFound()
    }

    const serializedEbook = serializeData(ebookData)
    const serializedCreator = serializeData(creatorData)

    const ebook = {
      id: ebookId,
      title: serializedEbook?.title || "Untitled eBook",
      description: serializedEbook?.description || "",
      price: typeof serializedEbook?.price === "number" ? serializedEbook.price : 0,
      coverUrl: serializedEbook?.coverUrl || "",
      pageCount: serializedEbook?.pageCount || 0,
      stripePriceId: serializedEbook?.stripePriceId || "",
      stripeProductId: serializedEbook?.stripeProductId || "",
      createdAt: serializedEbook?.createdAt || new Date().toISOString(),
      pages: Array.isArray(serializedEbook?.pages) ? serializedEbook.pages : [],
    }

    const creator = {
      uid: creatorDoc.id,
      username: serializedCreator?.username || username,
      displayName: serializedCreator?.displayName || serializedCreator?.username || username,
      profilePic: serializedCreator?.profilePic || serializedCreator?.photoURL || "",
      bio: serializedCreator?.bio || "",
    }

    console.log(`[eBook Detail] Successfully loaded eBook and creator data`)

    return <EbookDetailView ebook={ebook} creator={creator} />
  } catch (error) {
    console.error(`[eBook Detail] Error fetching eBook ${ebookId}:`, error)
    if (error instanceof Error) {
      console.error(`[eBook Detail] Error message: ${error.message}`)
      console.error(`[eBook Detail] Error stack: ${error.stack}`)
    }
    notFound()
  }
}
