"use client"

import { useState, useEffect } from "react"
import { collection, query, where, limit, getDocs, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"

export function useRecentVideos(limitCount = 5) {
  const { user } = useAuth()
  const [videos, setVideos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchVideos = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      console.log("Fetching videos for user:", user.uid)

      // Use a simple query that doesn't require a compound index
      // Just query by uid without additional filters or ordering
      const videosQuery = query(collection(db, "videos"), where("uid", "==", user.uid), limit(limitCount))

      const snapshot = await getDocs(videosQuery)
      console.log(`Found ${snapshot.docs.length} videos for user:`, user.uid)

      // Map the documents to a more usable format and sort them client-side
      const videosData = snapshot.docs.map((doc) => {
        const data = doc.data()
        console.log("Video data:", data)

        // Handle different timestamp formats
        let createdAt
        if (data.createdAt instanceof Timestamp) {
          createdAt = data.createdAt.toDate()
        } else if (data.createdAt && typeof data.createdAt.toDate === "function") {
          createdAt = data.createdAt.toDate()
        } else if (data.createdAt && data.createdAt._seconds) {
          createdAt = new Date(data.createdAt._seconds * 1000)
        } else if (data.createdAt && typeof data.createdAt === "string") {
          createdAt = new Date(data.createdAt)
        } else {
          createdAt = new Date()
        }

        // Ensure videoUrl exists - check multiple possible field names
        const videoUrl = data.videoUrl || data.url || null

        return {
          id: doc.id,
          ...data,
          createdAt,
          videoUrl,
        }
      })

      // Sort videos by createdAt date (newest first) on the client side
      const sortedVideos = videosData.sort((a, b) => {
        return b.createdAt.getTime() - a.createdAt.getTime()
      })

      setVideos(sortedVideos.slice(0, limitCount))
      setError(null)
    } catch (err) {
      console.error("Error fetching recent videos:", err)
      setError(err instanceof Error ? err : new Error("Failed to fetch videos"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVideos()

    // Set up an interval to refresh the data periodically
    const intervalId = setInterval(fetchVideos, 30000) // Refresh every 30 seconds

    return () => clearInterval(intervalId)
  }, [user])

  return { videos, loading, error, refetch: fetchVideos }
}
