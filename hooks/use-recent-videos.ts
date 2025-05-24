"use client"

import { useState, useEffect } from "react"
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from "firebase/firestore"
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

      // Create a query to get the user's videos, ordered by creation date
      const videosQuery = query(
        collection(db, "videos"),
        where("uid", "==", user.uid),
        where("status", "==", "active"),
        orderBy("createdAt", "desc"),
        limit(limitCount),
      )

      console.log("Fetching recent videos for user:", user.uid)

      const snapshot = await getDocs(videosQuery)

      console.log(`Found ${snapshot.docs.length} videos`)

      // Map the documents to a more usable format
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

        return {
          id: doc.id,
          ...data,
          createdAt,
        }
      })

      setVideos(videosData)
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
