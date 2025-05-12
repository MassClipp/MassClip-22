"use client"

import { useState, useEffect, useRef } from "react"
import type { VimeoVideo } from "@/lib/types"
import { useVimeoShowcases } from "./use-vimeo-showcases"
import { useUserPlan } from "@/hooks/use-user-plan"

// Extend VimeoVideo type to include accessibility flag
export interface EnhancedVimeoVideo extends VimeoVideo {
  isAccessible?: boolean
}

export function useVimeoTagVideos(tag: string) {
  const [videos, setVideos] = useState<EnhancedVimeoVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const isMounted = useRef(true)
  const { isProUser } = useUserPlan()
  const FREE_USER_LIMIT = 5

  // Get showcase videos
  const { showcaseVideos, loading: loadingShowcases } = useVimeoShowcases()

  // Helper function to normalize tag names
  const normalizeTagName = (tagName: string): string => {
    return tagName.trim().toLowerCase().replace(/\s+/g, " ")
  }

  // Get related tags for special categories
  const getRelatedTags = (categoryName: string): string[] => {
    const normalizedCategory = normalizeTagName(categoryName)

    // Define related tags for special categories
    const relatedTagsMap: Record<string, string[]> = {
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
      // Keep other categories
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
      mindset: ["mindset", "growth", "positive", "thinking", "mental", "attitude", "psychology", "focus", "discipline"],
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

  // Load more videos function - this is now a no-op for free users who have reached their limit
  const loadMore = () => {
    // This is a placeholder - in a real implementation, you would fetch more videos
    // For now, we'll just set hasMore to false to indicate no more videos
    setHasMore(false)
  }

  useEffect(() => {
    // Reset state when tag changes
    setVideos([])
    setError(null)
    setLoading(true)

    // Wait for showcases to load
    if (!loadingShowcases && Object.keys(showcaseVideos).length > 0) {
      try {
        // Get all videos from all showcases
        const allShowcaseVideos = Object.values(showcaseVideos).flat()

        // Filter videos by tag
        const taggedVideos = allShowcaseVideos.filter(
          (video) => videoMatchesTag(video, tag) || videoMatchesByContent(video, tag),
        )

        // Sort videos alphabetically by name
        const sortedVideos = [...taggedVideos].sort((a, b) => {
          const nameA = (a.name || "").toLowerCase()
          const nameB = (b.name || "").toLowerCase()
          return nameA.localeCompare(nameB)
        })

        // Mark videos as accessible or not based on user plan
        const enhancedVideos: EnhancedVimeoVideo[] = sortedVideos.map((video, index) => ({
          ...video,
          isAccessible: isProUser || index < FREE_USER_LIMIT,
        }))

        if (isMounted.current) {
          setVideos(enhancedVideos)
          setHasMore(false) // No more videos to load in this implementation
          setLoading(false)
        }
      } catch (err) {
        console.error("Error processing videos:", err)
        if (isMounted.current) {
          setError(err instanceof Error ? err.message : "Failed to process videos")
          setLoading(false)
        }
      }
    }

    // Cleanup function
    return () => {
      isMounted.current = false
    }
  }, [tag, showcaseVideos, loadingShowcases, isProUser])

  return {
    videos, // Now includes both accessible and inaccessible videos with flags
    loading,
    error,
    hasMore,
    loadMore,
    totalCount: videos.length,
    accessibleCount: videos.filter((video) => video.isAccessible).length,
    inaccessibleCount: videos.filter((video) => !video.isAccessible).length,
    hasInaccessibleVideos: videos.some((video) => !video.isAccessible),
  }
}
