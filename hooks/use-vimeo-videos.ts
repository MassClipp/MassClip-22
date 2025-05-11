"use client"

import { useState, useEffect, useRef } from "react"
import type { VimeoApiResponse, VimeoVideo } from "@/lib/types"
import { useUserPlan } from "@/hooks/use-user-plan"

export function useVimeoVideos() {
  const [videos, setVideos] = useState<VimeoVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [videosByTag, setVideosByTag] = useState<Record<string, VimeoVideo[]>>({})
  const isMounted = useRef(true)
  const isInitialLoad = useRef(true)
  const perPage = 20 // Increased from 12 to 20 for better content coverage
  const { isProUser } = useUserPlan() // Get user plan information
  const FREE_USER_VIDEO_LIMIT = 5 // Limit for free users

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

      // Only update state if component is still mounted
      if (!isMounted.current) return

      // Update videos
      setVideos((prev) => [...prev, ...data.data])

      // Check if there are more videos to load
      setHasMore(!!data.paging.next)

      // Group videos by tag with normalized tag names
      const newVideosByTag: Record<string, VimeoVideo[]> = { ...videosByTag }

      // Create a "browse all" category that contains all videos
      if (!newVideosByTag["browse all"]) {
        newVideosByTag["browse all"] = []
      }

      // Add videos to the "browse all" category, respecting free user limits
      if (isProUser || newVideosByTag["browse all"].length < FREE_USER_VIDEO_LIMIT) {
        // For free users, only add up to the limit
        const remainingSlots = isProUser
          ? data.data.length
          : Math.min(FREE_USER_VIDEO_LIMIT - newVideosByTag["browse all"].length, data.data.length)

        newVideosByTag["browse all"] = [...newVideosByTag["browse all"], ...data.data.slice(0, remainingSlots)]
      }

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

            // For free users, only add if we haven't reached the limit yet
            if (isProUser || newVideosByTag[normalizedTagName].length < FREE_USER_VIDEO_LIMIT) {
              // Store the video with this tag
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

          // For free users, check if we've already reached the limit
          if (!isProUser && newVideosByTag[category].length >= FREE_USER_VIDEO_LIMIT) return

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
            newVideosByTag[category].push(video)
          }
        })
      })

      // Sort videos in each category alphabetically by title
      Object.keys(newVideosByTag).forEach((tag) => {
        newVideosByTag[tag].sort((a, b) => {
          const nameA = (a.name || "").toLowerCase()
          const nameB = (b.name || "").toLowerCase()
          return nameA.localeCompare(nameB)
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

  useEffect(() => {
    // Only fetch on initial mount
    if (isInitialLoad.current) {
      fetchVideos(page)
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
  }
}
