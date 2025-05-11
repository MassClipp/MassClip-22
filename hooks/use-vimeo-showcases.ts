"use client"

import { useState, useEffect } from "react"

// Define minimal types to maintain compatibility
interface VimeoShowcase {
  name: string
  uri: string
}

interface VimeoVideo {
  id: string
  title: string
  description?: string
  thumbnailUrl: string
  videoUrl: string
  downloadUrl?: string
  tags?: string[]
  uri: string
  name: string
}

// Mock data structure to maintain compatibility with existing code
export function useVimeoShowcases() {
  const [showcases, setShowcases] = useState<VimeoShowcase[]>([])
  const [showcaseVideos, setShowcaseVideos] = useState<Record<string, VimeoVideo[]>>({})
  const [showcaseIds, setShowcaseIds] = useState<Record<string, string>>({})
  const [categoryToShowcaseMap, setCategoryToShowcaseMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchShowcases = async () => {
      try {
        setLoading(true)

        // Fetch from our new API endpoint instead of Vimeo
        const response = await fetch("/api/videos/categories")

        if (!response.ok) {
          throw new Error("Failed to fetch video categories")
        }

        const data = await response.json()

        // Transform the data to match the expected format
        const showcasesList: VimeoShowcase[] = data.categories.map((category: string) => ({
          name: category,
          uri: `/categories/${category}`,
        }))

        setShowcases(showcasesList)

        // Create mappings similar to what the original hook provided
        const idMap: Record<string, string> = {}
        const categoryMap: Record<string, string> = {}
        const videosMap: Record<string, VimeoVideo[]> = {}

        showcasesList.forEach((showcase) => {
          const id = showcase.uri.split("/").pop() || ""
          idMap[showcase.name] = id
          categoryMap[showcase.name.toLowerCase()] = showcase.name

          // Initialize empty array for each category
          videosMap[showcase.name] = []
        })

        setShowcaseIds(idMap)
        setCategoryToShowcaseMap(categoryMap)

        // Fetch videos for each category
        const videosResponse = await fetch("/api/videos")

        if (videosResponse.ok) {
          const videosData = await videosResponse.json()

          // Group videos by category
          videosData.videos.forEach((video: any) => {
            const categories = video.categories || []
            categories.forEach((category: string) => {
              if (videosMap[category]) {
                videosMap[category].push({
                  ...video,
                  uri: `/videos/${video.id}`,
                  name: video.title,
                })
              }
            })
          })

          setShowcaseVideos(videosMap)
        }
      } catch (err) {
        console.error("Error fetching showcases:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch showcases")
      } finally {
        setLoading(false)
      }
    }

    fetchShowcases()
  }, [])

  return {
    showcases,
    showcaseVideos,
    showcaseIds,
    categoryToShowcaseMap,
    loading,
    error,
  }
}
