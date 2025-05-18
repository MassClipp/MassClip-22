import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { CreatorProfile } from "@/components/creator-profile"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"

interface PageProps {
  params: {
    username: string
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = params

  try {
    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    // Query for creator
    const creatorSnapshot = await db.collection("creators").where("username", "==", username).limit(1).get()

    if (creatorSnapshot.empty) {
      return {
        title: "Creator Not Found | MassClip",
        description: "The creator profile you're looking for doesn't exist.",
      }
    }

    const creatorData = creatorSnapshot.docs[0].data()

    return {
      title: `${creatorData.displayName} | MassClip Creator`,
      description: creatorData.bio || `Check out ${creatorData.displayName}'s content on MassClip`,
      openGraph: {
        title: `${creatorData.displayName} | MassClip Creator`,
        description: creatorData.bio || `Check out ${creatorData.displayName}'s content on MassClip`,
        url: `${process.env.NEXT_PUBLIC_SITE_URL}/creator/${username}`,
        siteName: "MassClip",
        images: [
          {
            url: creatorData.profilePic || `${process.env.NEXT_PUBLIC_SITE_URL}/images/default-profile.png`,
            width: 1200,
            height: 630,
            alt: creatorData.displayName,
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

export default async function CreatorProfilePage({ params }: PageProps) {
  const { username } = params

  try {
    // Initialize Firebase Admin
    initializeFirebaseAdmin()

    // Check if creator exists
    const creatorSnapshot = await db.collection("creators").where("username", "==", username).limit(1).get()

    if (creatorSnapshot.empty) {
      return notFound()
    }

    return <CreatorProfile username={username} />
  } catch (error) {
    console.error("Error loading creator profile:", error)
    return notFound()
  }
}
