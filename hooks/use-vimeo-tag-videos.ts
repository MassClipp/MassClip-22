"use client"

import { useState, useEffect, useRef } from "react"
import type { VimeoApiResponse, VimeoVideo } from "@/lib/types"

export function useVimeoTagVideos(tag: string) {
  const [videos, setVideos] = useState<VimeoVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const isMounted = useRef(true)
  const isInitialLoad = useRef(true)
  const maxPages = 10 // Increased to ensure we find enough videos
  const pageSize = 30 // Increased page size to get more videos per request

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

  // Helper function to check if a video matches the tag
  const videoMatchesTag = (video: VimeoVideo, searchTag: string): boolean => {
    if (!video.tags || video.tags.length === 0) return false

    const relatedTags = getRelatedTags(searchTag)

    // Check if any video tag matches any of our related tags
    return video.tags.some((videoTag) => {
      const normalizedVideoTag = normalizeTagName(videoTag.name)
      return relatedTags.some((relatedTag) => normalizedVideoTag.includes(relatedTag))
    })
  }

  // Helper function to check if a video matches by name or description
  const videoMatchesByContent = (video: VimeoVideo, searchTag: string): boolean => {
    if (!video.name && !video.description) return false

    const relatedTerms = getRelatedTags(searchTag)
    const videoName = (video.name || "").toLowerCase()
    const videoDescription = (video.description || "").toLowerCase()

    // Check if video name or description contains any related terms
    return relatedTerms.some((term) => videoName.includes(term) || videoDescription.includes(term))
  }

  const fetchVideos = async (pageNum: number) => {
    try {
      setLoading(true)
      console.log(`Fetching videos for tag "${tag}", page ${pageNum}`)

      const response = await fetch(`/api/vimeo?page=${pageNum}&per_page=${pageSize}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || "Failed to fetch videos")
      }

      const data: VimeoApiResponse = await response.json()

      // Only update state if component is still mounted
      if (!isMounted.current) return

      // Filter videos by tag using our helper function
      const tagVideos = data.data.filter((video) => videoMatchesTag(video, tag) || videoMatchesByContent(video, tag))

      console.log(`Found ${tagVideos.length} videos matching tag "${tag}" on page ${pageNum}`)

      // Update videos - sort by title alphabetically instead of shuffling
      setVideos((prev) => {
        // Create a Set of existing URIs to avoid duplicates
        const existingUris = new Set(prev.map((video) => video.uri))

        // Filter out duplicates
        const newVideos = tagVideos.filter((video) => !existingUris.has(video.uri))

        // Combine previous and new videos, then sort alphabetically by title
        const combinedVideos = [...prev, ...newVideos]
        return combinedVideos.sort((a, b) => {
          const nameA = (a.name || "").toLowerCase()
          const nameB = (b.name || "").toLowerCase()
          return nameA.localeCompare(nameB)
        })
      })

      // Check if there are more videos to load
      // Stop after maxPages or if no videos were found in this batch
      const reachedMaxPages = pageNum >= maxPages
      setHasMore(!!data.paging.next && !reachedMaxPages && tagVideos.length > 0)

      // If we didn't find any videos on the first page and there are more pages,
      // automatically try the next page
      if (pageNum === 1 && tagVideos.length === 0 && data.paging.next && !reachedMaxPages) {
        setPage(2)
        fetchVideos(2)
      }
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
    // Reset state when tag changes
    setVideos([])
    setPage(1)
    setHasMore(true)
    setError(null)
    isInitialLoad.current = true

    // Fetch videos for the new tag
    fetchVideos(1)

    // Cleanup function
    return () => {
      isMounted.current = false
    }
  }, [tag]) // Re-run when tag changes

  return {
    videos,
    loading,
    error,
    hasMore,
    loadMore,
  }
}
