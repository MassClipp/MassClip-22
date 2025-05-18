import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getFirestore } from "firebase-admin/firestore"
import { getApp, getApps, initializeApp, cert } from "firebase-admin/app"
import CreatorProfile from "@/components/creator-profile"

// Initialize Firebase Admin
function getFirebaseAdmin() {
  if (getApps().length === 0) {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }

    initializeApp({
      credential: cert(serviceAccount),
    })
  }
  return getApp()
}

// Helper function to convert Firestore data to plain objects
function serializeData(data: any) {
  if (!data) return null

  // Convert to plain object
  const plainData = { ...data }

  // Handle Firestore Timestamp objects
  if (plainData.createdAt && typeof plainData.createdAt.toDate === "function") {
    plainData.createdAt = plainData.createdAt.toDate().toISOString()
  }

  // Handle arrays with potential Timestamp objects
  if (Array.isArray(plainData.freeClips)) {
    plainData.freeClips = plainData.freeClips.map((clip: any) => {
      const serializedClip = { ...clip }
      if (serializedClip.createdAt && typeof serializedClip.createdAt.toDate === "function") {
        serializedClip.createdAt = serializedClip.createdAt.toDate().toISOString()
      }
      return serializedClip
    })
  }

  if (Array.isArray(plainData.paidClips)) {
    plainData.paidClips = plainData.paidClips.map((clip: any) => {
      const serializedClip = { ...clip }
      if (serializedClip.createdAt && typeof serializedClip.createdAt.toDate === "function") {
        serializedClip.createdAt = serializedClip.createdAt.toDate().toISOString()
      }
      return serializedClip
    })
  }

  return plainData
}

// Generate metadata for the page
export async function generateMetadata({ params }: { params: { username: string } }): Promise<Metadata> {
  const { username } = params

  try {
    getFirebaseAdmin()
    const db = getFirestore()
    const creatorDoc = await db.collection("creators").doc(username).get()

    if (!creatorDoc.exists) {
      return {
        title: "Creator Not Found | MassClip",
        description: "The creator profile you're looking for doesn't exist.",
      }
    }

    const creatorData = creatorDoc.data()

    return {
      title: `${creatorData?.displayName || username} | MassClip`,
      description: creatorData?.bio || `Check out ${creatorData?.displayName || username}'s content on MassClip`,
      openGraph: {
        title: `${creatorData?.displayName || username} | MassClip`,
        description: creatorData?.bio || `Check out ${creatorData?.displayName || username}'s content on MassClip`,
        url: `https://massclip.pro/creator/${username}`,
        siteName: "MassClip",
        images: [
          {
            url: creatorData?.profilePic || "https://massclip.pro/og-image.jpg",
            width: 1200,
            height: 630,
            alt: creatorData?.displayName || username,
          },
        ],
        locale: "en_US",
        type: "website",
      },
    }
  } catch (error) {
    console.error("Error generating metadata:", error)
    return {
      title: "Creator Profile | MassClip",
      description: "View creator content on MassClip",
    }
  }
}

export default async function CreatorProfilePage({ params }: { params: { username: string } }) {
  const { username } = params

  try {
    getFirebaseAdmin()
    const db = getFirestore()
    const creatorDoc = await db.collection("creators").doc(username).get()

    if (!creatorDoc.exists) {
      notFound()
    }

    // Serialize the Firestore data to plain objects
    const creatorData = serializeData(creatorDoc.data())

    return <CreatorProfile creator={creatorData} />
  } catch (error) {
    console.error("Error fetching creator profile:", error)
    notFound()
  }
}
