"use client"

import { useState, useEffect } from "react"
import { collection, query, orderBy, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"

export interface Clip {
  id: string
  title: string
  description?: string
  url: string
  thumbnailUrl?: string
  category?: string
  tags?: string[]
  uploadedAt?: any
}

export function useClips() {
  const [clips, setClips] = useState<Clip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchClips = async () => {
      try {
        setLoading(true)

        // Create a query against the clips collection, ordered by uploadedAt in descending order
        const clipsRef = collection(db, "clips")
        const q = query(clipsRef, orderBy("uploadedAt", "desc"))

        // Get the documents
        const querySnapshot = await getDocs(q)

        // Map the documents to our Clip interface
        const fetchedClips: Clip[] = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Clip, "id">),
        }))

        setClips(fetchedClips)
      } catch (err) {
        console.error("Error fetching clips:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch clips")
      } finally {
        setLoading(false)
      }
    }

    fetchClips()
  }, [])

  // Group clips by category
  const clipsByCategory = clips.reduce(
    (acc, clip) => {
      const category = clip.category || "Uncategorized"
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(clip)
      return acc
    },
    {} as Record<string, Clip[]>,
  )

  return {
    clips,
    clipsByCategory,
    loading,
    error,
  }
}
