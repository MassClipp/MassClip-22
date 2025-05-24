"use client"

import { useState, useEffect } from "react"
import { collection, query, where, orderBy, limit, getDocs, Timestamp, doc, getDoc } from "firebase/firestore"
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

      // First, get the user's username from their profile
      const userDoc = await getDoc(doc(db, "users", user.uid))
      if (!userDoc.exists()) {
        console.log("User document not found")
        setVideos([])
        setLoading(false)
        return
      }

      const userData = userDoc.data()
      const username = userData.username

      if (!username) {
        console.log("User has no username set")
        setVideos([])
        setLoading(false)
        return
      }

      console.log("Fetching videos for username:", username)

      // Query videos by username instead of uid
      const videosQuery = query(
        collection(db, "videos"),
        where("username", "==", username),
        where("status", "==", "active"),
        orderBy("createdAt", "desc"),
        limit(limitCount),
      )

      const snapshot = await getDocs(videosQuery)

      console.log(`Found ${snapshot.docs.length} videos for username: ${username}`)

      // If no videos found with username field, try with uid as fallback
      if (snapshot.docs.length === 0) {
        console.log("No videos found with username, trying with uid...")
        const fallbackQuery = query(
          collection(db, "videos"),
          where("uid", "==", user.uid),
          where("status", "==", "active"),
          orderBy("createdAt", "desc"),
          limit(limitCount),
        )

        const fallbackSnapshot = await getDocs(fallbackQuery)
        console.log(`Found ${fallbackSnapshot.docs.length} videos with uid fallback`)

        if (fallbackSnapshot.docs.length > 0) {
          const videosData = fallbackSnapshot.docs.map((doc) => {
            const data = doc.data()
            console.log("Video data (fallback):", data)

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

            // Ensure videoUrl exists
            const videoUrl = data.videoUrl || data.url || null

            return {
              id: doc.id,
              ...data,
              createdAt,
              videoUrl,
            }
          })

          setVideos(videosData)
          setError(null)
          return
        }
      }

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

        // Ensure videoUrl exists - check multiple possible field names
        const videoUrl = data.videoUrl || data.url || null

        return {
          id: doc.id,
          ...data,
          createdAt,
          videoUrl,
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
