import { Suspense } from "react"
import { cookies } from "next/headers"
import { ExploreClient } from "@/components/explore-client"
import { vimeoConfig } from "@/lib/vimeo-config"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
import type { VimeoShowcasesResponse, VimeoShowcase, VimeoVideo, VimeoApiResponse } from "@/lib/types"

// Initialize Firebase Admin
initializeFirebaseAdmin()

// Server-side data fetching functions
async function fetchVimeoShowcases(): Promise<{
  showcases: VimeoShowcase[]
  showcaseVideos: Record<string, VimeoVideo[]>
}> {
  try {
    const response = await fetch(`https://api.vimeo.com/users/${vimeoConfig.userId}/albums?direction=desc&sort=date`, {
      headers: {
        Authorization: `Bearer ${vimeoConfig.accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.vimeo.*+json;version=3.4",
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch showcases: ${response.status}`)
    }

    const data: VimeoShowcasesResponse = await response.json()

    const allowedCategories = [
      "Mindset",
      "Hustle Mentality",
      "High Energy Motivation",
      "Faith",
      "Money & Wealth",
      "Motivational Speeches",
      "Cinema",
    ]

    const relevantShowcases = data.data.filter(
      (showcase) => allowedCategories.includes(showcase.name) || showcase.name === "Introspection",
    )

    // Fetch videos for each showcase
    const showcaseVideos: Record<string, VimeoVideo[]> = {}

    await Promise.all(
      relevantShowcases.map(async (showcase) => {
        const showcaseId = showcase.uri.split("/").pop()
        if (showcaseId) {
          try {
            const videosResponse = await fetch(
              `https://api.vimeo.com/albums/${showcaseId}/videos?per_page=20&fields=uri,name,description,link,duration,width,height,created_time,modified_time,pictures,tags,stats,categories,user,download`,
              {
                headers: {
                  Authorization: `Bearer ${vimeoConfig.accessToken}`,
                  "Content-Type": "application/json",
                  Accept: "application/vnd.vimeo.*+json;version=3.4",
                },
                next: { revalidate: 300 },
              },
            )

            if (videosResponse.ok) {
              const videosData: VimeoApiResponse = await videosResponse.json()
              const displayName = showcase.name === "Introspection" ? "Mindset" : showcase.name
              showcaseVideos[displayName] = videosData.data.sort((a, b) =>
                (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase()),
              )
            }
          } catch (error) {
            console.error(`Error fetching videos for showcase ${showcase.name}:`, error)
          }
        }
      }),
    )

    return { showcases: relevantShowcases, showcaseVideos }
  } catch (error) {
    console.error("Error fetching Vimeo showcases:", error)
    return { showcases: [], showcaseVideos: {} }
  }
}

async function fetchVimeoVideos(): Promise<{ videos: VimeoVideo[]; videosByTag: Record<string, VimeoVideo[]> }> {
  try {
    const response = await fetch(
      `https://api.vimeo.com/users/${vimeoConfig.userId}/videos?page=1&per_page=20&fields=uri,name,description,link,duration,width,height,created_time,modified_time,pictures,tags,stats,categories,user,download`,
      {
        headers: {
          Authorization: `Bearer ${vimeoConfig.accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/vnd.vimeo.*+json;version=3.4",
        },
        next: { revalidate: 300 },
      },
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch videos: ${response.status}`)
    }

    const data: VimeoApiResponse = await response.json()
    const videosByTag: Record<string, VimeoVideo[]> = { "browse all": data.data }

    // Group videos by tags
    data.data.forEach((video) => {
      if (video.tags && video.tags.length > 0) {
        video.tags.forEach((tag) => {
          const normalizedTagName = tag.name.trim().toLowerCase().replace(/\s+/g, " ")
          if (!videosByTag[normalizedTagName]) {
            videosByTag[normalizedTagName] = []
          }
          videosByTag[normalizedTagName].push(video)
        })
      }
    })

    return { videos: data.data, videosByTag }
  } catch (error) {
    console.error("Error fetching Vimeo videos:", error)
    return { videos: [], videosByTag: {} }
  }
}

async function fetchCreatorUploads(): Promise<any[]> {
  try {
    if (!db) {
      return []
    }

    const freeContentRef = db.collection("free_content")
    const snapshot = await freeContentRef.get()

    if (snapshot.empty) {
      return []
    }

    const videos: any[] = []
    const userIds = new Set<string>()

    // Collect user IDs
    snapshot.forEach((doc) => {
      const data = doc.data()
      if (data.uid) {
        userIds.add(data.uid)
      }
    })

    // Fetch user data
    const userDataMap = new Map()
    if (userIds.size > 0) {
      await Promise.all(
        Array.from(userIds).map(async (uid) => {
          try {
            const userDoc = await db.collection("users").doc(uid).get()
            if (userDoc.exists()) {
              const userData = userDoc.data()
              userDataMap.set(uid, {
                name: userData?.displayName || userData?.name || userData?.username || "Unknown Creator",
                username: userData?.username || null,
              })
            }
          } catch (error) {
            console.error(`Error fetching user ${uid}:`, error)
          }
        }),
      )
    }

    // Process videos
    snapshot.forEach((doc) => {
      const data = doc.data()
      const creatorData = userDataMap.get(data.uid) || {
        name: "Unknown Creator",
        username: null,
      }

      const fileUrl = data.fileUrl || data.url || ""
      if (!fileUrl) return

      let addedAtDate = new Date()
      try {
        if (data.addedAt) {
          if (data.addedAt.toDate && typeof data.addedAt.toDate === "function") {
            addedAtDate = data.addedAt.toDate()
          } else if (data.addedAt instanceof Date) {
            addedAtDate = data.addedAt
          } else {
            addedAtDate = new Date(data.addedAt)
          }
        }
      } catch (dateError) {
        addedAtDate = new Date()
      }

      videos.push({
        id: doc.id,
        title: data.title || data.filename || "Untitled",
        fileUrl: fileUrl,
        thumbnailUrl: data.thumbnailUrl || data.thumbnail || "/placeholder.svg?height=200&width=300&text=Video",
        type: data.type || "video",
        duration: data.duration || 0,
        size: data.size || 0,
        addedAt: addedAtDate,
        uid: data.uid,
        creatorName: creatorData.name,
        creatorUsername: creatorData.username,
        views: data.views || 0,
        downloads: data.downloads || 0,
        originalId: data.originalId,
        sourceCollection: data.sourceCollection,
      })
    })

    // Sort by addedAt (newest first)
    videos.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())

    return videos
  } catch (error) {
    console.error("Error fetching creator uploads:", error)
    return []
  }
}

async function getUserFromCookies() {
  const cookieStore = cookies()
  const sessionCookie = cookieStore.get("session")

  if (!sessionCookie) {
    return null
  }

  try {
    // You'll need to implement session verification here
    // This is a placeholder - implement based on your auth system
    return { uid: "user-id" } // Replace with actual user data
  } catch (error) {
    return null
  }
}

interface ExplorePageProps {
  searchParams: { search?: string }
}

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const user = await getUserFromCookies()

  // Only redirect to login if user tries to access premium features
  // if (!user) {
  //   redirect("/login")
  // }

  const searchQuery = searchParams.search || ""

  const [{ showcases, showcaseVideos }, { videos, videosByTag }, creatorUploads] = await Promise.all([
    fetchVimeoShowcases(),
    fetchVimeoVideos(),
    fetchCreatorUploads(),
  ])

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ExploreClient
        initialShowcases={showcases}
        initialShowcaseVideos={showcaseVideos}
        initialVideos={videos}
        initialVideosByTag={videosByTag}
        initialCreatorUploads={creatorUploads}
        initialSearchQuery={searchQuery}
        userId={user?.uid || null} // Allow null userId for anonymous users
      />
    </Suspense>
  )
}
