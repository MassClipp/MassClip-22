"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase-safe"
import { collection, query, where, onSnapshot } from "firebase/firestore"

interface VideoStats {
  totalUploads: number
  totalFreeVideos: number
  freeVideoPercentage: number
  recentUploads: any[]
  recentFreeVideos: any[]
  loading: boolean
  error: string | null
}

export function useRealTimeVideoStats() {
  const { user } = useAuth()
  const [stats, setStats] = useState<VideoStats>({
    totalUploads: 0,
    totalFreeVideos: 0,
    freeVideoPercentage: 0,
    recentUploads: [],
    recentFreeVideos: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    if (!user || !db) {
      setStats((prev) => ({ ...prev, loading: false }))
      return
    }

    let uploadsUnsubscribe: (() => void) | undefined
    let freeContentUnsubscribe: (() => void) | undefined

    try {
      // Listen to uploads collection - simplified query without orderBy to avoid index requirement
      const uploadsQuery = query(collection(db, "uploads"), where("userId", "==", user.uid))

      uploadsUnsubscribe = onSnapshot(
        uploadsQuery,
        (uploadsSnapshot) => {
          const uploads = uploadsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            uploadedAt: doc.data().uploadedAt?.toDate() || new Date(),
          }))

          // Sort client-side to avoid index requirement
          const sortedUploads = uploads.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())

          // Listen to free content collection - simplified query
          const freeContentQuery = query(collection(db, "freeContent"), where("userId", "==", user.uid))

          freeContentUnsubscribe = onSnapshot(
            freeContentQuery,
            (freeContentSnapshot) => {
              const freeContent = freeContentSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
                uploadedAt: doc.data().uploadedAt?.toDate() || new Date(),
              }))

              // Sort client-side
              const sortedFreeContent = freeContent.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())

              const totalUploads = uploads.length
              const totalFreeVideos = freeContent.length
              const freeVideoPercentage = totalUploads > 0 ? (totalFreeVideos / totalUploads) * 100 : 0

              setStats({
                totalUploads,
                totalFreeVideos,
                freeVideoPercentage,
                recentUploads: sortedUploads.slice(0, 5),
                recentFreeVideos: sortedFreeContent.slice(0, 5),
                loading: false,
                error: null,
              })
            },
            (error) => {
              console.error("Error listening to free content:", error)
              setStats((prev) => ({
                ...prev,
                loading: false,
                error: "Failed to load free content data",
              }))
            },
          )
        },
        (error) => {
          console.error("Error listening to uploads:", error)
          setStats((prev) => ({
            ...prev,
            loading: false,
            error: "Failed to load upload data",
          }))
        },
      )
    } catch (error) {
      console.error("Error setting up real-time listeners:", error)
      setStats((prev) => ({
        ...prev,
        loading: false,
        error: "Failed to initialize real-time updates",
      }))
    }

    // Cleanup function
    return () => {
      if (uploadsUnsubscribe) uploadsUnsubscribe()
      if (freeContentUnsubscribe) freeContentUnsubscribe()
    }
  }, [user])

  return stats
}
