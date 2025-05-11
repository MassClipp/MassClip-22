"use client"

import { useState, useEffect } from "react"
import { useClips } from "@/hooks/use-clips"
import type { Clip } from "@/hooks/use-clips"

// Define minimal types to maintain compatibility
interface VimeoShowcase {
  name: string
  uri: string
}

// Mock data structure to maintain compatibility with existing code
export function useVimeoShowcases() {
  const [showcases, setShowcases] = useState<VimeoShowcase[]>([])
  const [showcaseVideos, setShowcaseVideos] = useState<Record<string, Clip[]>>({})
  const [showcaseIds, setShowcaseIds] = useState<Record<string, string>>({})
  const [categoryToShowcaseMap, setCategoryToShowcaseMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Use our new clips hook
  const { clips, clipsByCategory, loading: clipsLoading, error: clipsError } = useClips()

  useEffect(() => {
    if (clipsLoading) {
      setLoading(true)
      return
    }

    if (clipsError) {
      setError(clipsError)
      setLoading(false)
      return
    }

    try {
      // Get unique categories
      const categories = Object.keys(clipsByCategory)

      // Create showcase objects
      const showcasesList: VimeoShowcase[] = categories.map((category) => ({
        name: category,
        uri: `/category/${category.toLowerCase().replace(/\s+/g, "-")}`,
      }))

      setShowcases(showcasesList)

      // Create mappings
      const idMap: Record<string, string> = {}
      const categoryMap: Record<string, string> = {}

      showcasesList.forEach((showcase) => {
        const id = showcase.uri.split("/").pop() || ""
        idMap[showcase.name] = id
        categoryMap[showcase.name.toLowerCase()] = showcase.name
      })

      setShowcaseIds(idMap)
      setCategoryToShowcaseMap(categoryMap)
      setShowcaseVideos(clipsByCategory)
      setLoading(false)
    } catch (err) {
      console.error("Error processing showcases:", err)
      setError("Failed to process showcases")
      setLoading(false)
    }
  }, [clipsLoading, clipsError, clipsByCategory])

  return {
    showcases,
    showcaseVideos,
    showcaseIds,
    categoryToShowcaseMap,
    loading: loading || clipsLoading,
    error: error || clipsError,
  }
}
