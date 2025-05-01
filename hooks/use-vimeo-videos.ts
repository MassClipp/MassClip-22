"use client"

import { useState, useEffect, useRef } from "react"
import type { VimeoApiResponse, VimeoVideo } from "@/lib/types"

export function useVimeoVideos() {
  const [videos, setVideos] = useState<VimeoVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [videosByTag, setVideosByTag] = useState<Record<string, VimeoVideo[]>>({})
  const isMounted = useRef(true)
  const isInitialLoad = useRef(true)
  const fetchedPages = useRef(new Set<number>())
  const allVideosCache = useRef<VimeoVideo[]>([])
  const perPage = 50 // Increased from 20 to 50 for better content coverage

  // Helper function to normalize tag names
  const normalizeTagName = (tagName: string): string => {
    return tagName.trim().toLowerCase().replace(/\s+/g, " ")
  }

  // Get related tags for special categories
  const getRelatedTags = (categoryName: string): string[] => {
    const normalizedCategory = normalizeTagName(categoryName)

    // Define related tags for special categories
    const relatedTagsMap: Record<string, string[]> = {
      "high energy motivation": [
        "high energy",
        "motivation",
        "energy",
        "motivational",
        "inspire",
        "inspiration",
        "success",
        "achievement",
        "drive",
        "ambition",
        "hustle",
        "grind",
        "determination",
      ],
      "hustle mentality": [
        "hustle",
        "grind",
        "work ethic",
        "success",
        "entrepreneur",
        "business",
        "ambition",
        "drive",
        "determination",
      ],
      mindset: ["mindset", "growth", "positive", "thinking", "mental", "attitude", "psychology", "focus", "discipline"],
      introspection: [
        "introspection",
        "reflection",
        "meditation",
        "self",
        "awareness",
        "consciousness",
        "mindfulness",
        "inner",
        "peace",
      ],
      "money and wealth": [
        "money",
        "wealth",
        "finance",
        "financial",
        "rich",
        "success",
        "abundance",
        "prosperity",
        "investment",
      ],
      "motivational speeches": [
        "speech",
        "motivational",
        "speaker",
        "inspiration",
        "inspire",
        "talk",
        "lecture",
        "presentation",
        "keynote",
        "motivation",
      ],
    }

    return relatedTagsMap[normalizedCategory] || [normalizedCategory]
  }

  const fetchVideos = async (pageNum: number) => {
    // Skip if we've already fetched this page
    if (fetchedPages.current.has(pageNum)) {
      return
    }

    try {
      setLoading(true)
      console.log(`Fetching videos page ${pageNum}, ${perPage} per page`)

      const response = await fetch(`/api/vimeo?page=${pageNum}&per_page=${perPage}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || "Failed to fetch videos")
      }

      const data: VimeoApiResponse = await response.json()
      console.log(`Received ${data.data.length} videos from API`)

      // Mark this page as fetched
      fetchedPages.current.add(pageNum)

      // Only update state if component is still mounted
      if (!isMounted.current) return

      // Add new videos to our cache
      const newVideos = data.data.filter(
        (newVideo) => !allVideosCache.current.some((existingVideo) => existingVideo.uri === newVideo.uri),
      )
      allVideosCache.current = [...allVideosCache.current, ...newVideos]

      // Update videos state
      setVideos((prev) => {
        const combined = [...prev, ...newVideos]
        // Remove duplicates based on URI
        const uniqueVideos = Array.from(new Map(combined.map((video) => [video.uri, video])).values())
        return uniqueVideos
      })

      // Check if there are more videos to load
      setHasMore(!!data.paging.next)

      // Group videos by tag with normalized tag names
      const newVideosByTag: Record<string, VimeoVideo[]> = { ...videosByTag }

      // Create a "browse all" category that contains all videos
      if (!newVideosByTag["browse all"]) {
        newVideosByTag["browse all"] = []
      }

      // Add all videos to the "browse all" category
      newVideosByTag["browse all"] = Array.from(
        new Map([...newVideosByTag["browse all"], ...data.data].map((video) => [video.uri, video])).values(),
      )

      // Create a set to track processed tags to avoid duplicates
      const processedTags = new Set<string>()

      // Process standard tags from videos
      data.data.forEach((video) => {
        if (video.tags && video.tags.length > 0) {
          video.tags.forEach((tag) => {
            // Normalize the tag name to prevent duplicates
            const normalizedTagName = normalizeTagName(tag.name)

            // Skip if we've already processed this tag for this video
            if (processedTags.has(`${video.uri}-${normalizedTagName}`)) return
            processedTags.add(`${video.uri}-${normalizedTagName}`)

            // Create a key using the normalized name
            if (!newVideosByTag[normalizedTagName]) {
              newVideosByTag[normalizedTagName] = []
            }

            // Store the video with this tag
            if (!newVideosByTag[normalizedTagName].some((v) => v.uri === video.uri)) {
              newVideosByTag[normalizedTagName].push(video)
            }
          })
        }
      })

      // Process special categories
      const specialCategories = [
        "high energy motivation",
        "hustle mentality",
        "mindset",
        "introspection",
        "money and wealth",
        "motivational speeches",
      ]

      specialCategories.forEach((category) => {
        if (!newVideosByTag[category]) {
          newVideosByTag[category] = []
        }

        // Get related tags for this category
        const relatedTags = getRelatedTags(category)

        // Find videos that match any related tag
        data.data.forEach((video) => {
          // Skip if we've already processed this video for this category
          if (processedTags.has(`${video.uri}-${category}`)) return

          // Check if video has any related tags
          const hasRelatedTag = video.tags?.some((videoTag) => {
            const normalizedVideoTag = normalizeTagName(videoTag.name)
            return relatedTags.some((relatedTag) => normalizedVideoTag.includes(relatedTag))
          })

          // Check if video name or description contains related terms
          const nameOrDescriptionMatches = relatedTags.some((term) => {
            const videoName = (video.name || "").toLowerCase()
            const videoDescription = (video.description || "").toLowerCase()
            return videoName.includes(term) || videoDescription.includes(term)
          })

          // If video matches, add it to this category
          if (hasRelatedTag || nameOrDescriptionMatches) {
            processedTags.add(`${video.uri}-${category}`)
            if (!newVideosByTag[category].some((v) => v.uri === video.uri)) {
              newVideosByTag[category].push(video)
            }
          }
        })
      })

      setVideosByTag(newVideosByTag)
    } catch (err) {
      console.error("Error fetching videos:", err)
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : "Failed to fetch videos")
      }
    } finally {
      if (isMounted.current) {
        setLoading(false)
        isInitialLoad.current = false
      }
    }
  }

  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchVideos(nextPage)
    }
  }

  // Function to fetch additional pages for more variety
  const fetchAdditionalPages = async () => {
    // Fetch up to 3 pages for more variety
    const pagesToFetch = 3
    for (let i = 1; i <= pagesToFetch; i++) {
      if (i !== page && hasMore) {
        await fetchVideos(i)
      }
    }
  }

  useEffect(() => {
    // Only fetch on initial mount
    if (isInitialLoad.current) {
      fetchVideos(page)
      // After initial load, fetch additional pages for more variety
      fetchAdditionalPages()
    }

    // Cleanup function
    return () => {
      isMounted.current = false
    }
  }, []) // Empty dependency array to only run on mount

  return {
    videos,
    videosByTag,
    loading,
    error,
    hasMore,
    loadMore,
    allVideosCache: allVideosCache.current,
  }
}
