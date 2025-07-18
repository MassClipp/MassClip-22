import { notFound } from "next/navigation"
import type { Metadata } from "next"
import CreatorProfileWithSidebar from "@/components/creator-profile-with-sidebar"
import ProfileViewTracker from "@/components/profile-view-tracker"

// Mock user data for preview environment
const mockUsers = {
  take: {
    uid: "mock-uid-take",
    username: "take",
    displayName: "Take",
    bio: "Content creator focused on lifestyle and creativity. Welcome to my profile!",
    profilePic: "/placeholder.svg?height=150&width=150&text=Take",
    email: "take@example.com",
    createdAt: "2024-01-15T00:00:00.000Z",
    updatedAt: "2025-01-18T00:00:00.000Z",
    socialLinks: {
      instagram: "https://instagram.com/take",
      twitter: "https://twitter.com/take",
      youtube: "https://youtube.com/@take",
    },
  },
  demo: {
    uid: "mock-uid-demo",
    username: "demo",
    displayName: "Demo User",
    bio: "This is a demo profile for testing purposes. Check out my content!",
    profilePic: "/placeholder.svg?height=150&width=150&text=Demo",
    email: "demo@example.com",
    createdAt: "2024-02-01T00:00:00.000Z",
    updatedAt: "2025-01-18T00:00:00.000Z",
    socialLinks: {
      website: "https://example.com",
    },
  },
  creator: {
    uid: "mock-uid-creator",
    username: "creator",
    displayName: "Content Creator",
    bio: "Professional content creator sharing tips, tutorials and entertainment. Follow for daily updates!",
    profilePic: "/placeholder.svg?height=150&width=150&text=Creator",
    email: "creator@example.com",
    createdAt: "2024-03-01T00:00:00.000Z",
    updatedAt: "2025-01-18T00:00:00.000Z",
    socialLinks: {
      instagram: "https://instagram.com/creator",
      youtube: "https://youtube.com/@creator",
      website: "https://creator.example.com",
    },
  },
}

// Generate metadata for the page
export async function generateMetadata({ params }: { params: { username: string } }): Promise<Metadata> {
  const { username } = params

  try {
    console.log(`[Metadata] Looking for user with username: ${username}`)

    const userData = mockUsers[username.toLowerCase() as keyof typeof mockUsers]

    if (!userData) {
      console.log(`[Metadata] Creator not found for username: ${username}`)
      return {
        title: "Creator Not Found | MassClip",
        description: "The creator profile you're looking for doesn't exist.",
      }
    }

    console.log(`[Metadata] Found user data for: ${userData.displayName}`)

    const profileImage = userData.profilePic || "https://massclip.pro/og-image.jpg"

    return {
      title: `${userData.displayName} | MassClip`,
      description: userData.bio || `Check out ${userData.displayName}'s content on MassClip`,
      openGraph: {
        title: `${userData.displayName} | MassClip`,
        description: userData.bio || `Check out ${userData.displayName}'s content on MassClip`,
        url: `https://massclip.pro/creator/${username}`,
        siteName: "MassClip",
        images: [
          {
            url: profileImage,
            width: 1200,
            height: 630,
            alt: userData.displayName,
          },
        ],
        locale: "en_US",
        type: "website",
      },
    }
  } catch (error) {
    console.error("[Metadata] Error generating metadata:", error)
    return {
      title: "Creator Profile | MassClip",
      description: "View creator content on MassClip",
    }
  }
}

export default async function CreatorProfilePage({ params }: { params: { username: string } }) {
  const { username } = params

  try {
    console.log(`[Page] Fetching creator profile for username: ${username}`)

    // Use mock data for preview environment
    const userData = mockUsers[username.toLowerCase() as keyof typeof mockUsers]

    if (!userData) {
      console.log(`[Page] Creator profile not found for username: ${username}`)
      notFound()
    }

    console.log(`[Page] Found user data for: ${userData.displayName}`)

    // Format the creator data for the component
    const creatorData = {
      uid: userData.uid,
      username: userData.username,
      displayName: userData.displayName,
      bio: userData.bio || "",
      profilePic: userData.profilePic || "",
      createdAt: userData.createdAt,
      socialLinks: userData.socialLinks || {},
      email: userData.email,
      updatedAt: userData.updatedAt,
    }

    console.log(`[Page] Passing creator data to component for: ${creatorData.displayName}`)

    return (
      <>
        <ProfileViewTracker profileUserId={userData.uid} />
        <CreatorProfileWithSidebar creator={creatorData} />
      </>
    )
  } catch (error) {
    console.error(`[Page] Error fetching creator profile for ${username}:`, error)
    notFound()
  }
}
