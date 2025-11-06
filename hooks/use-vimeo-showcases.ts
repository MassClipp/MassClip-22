"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import type { VimeoShowcasesResponse, VimeoShowcase, VimeoVideo, VimeoApiResponse } from "@/lib/types"

export function useVimeoShowcases() {
  const [showcases, setShowcases] = useState<VimeoShowcase[]>([])
  const [showcaseVideos, setShowcaseVideos] = useState<Record<string, VimeoVideo[]>>({})
  const [showcaseIds, setShowcaseIds] = useState<Record<string, string>>({})
  const [categoryToShowcaseMap, setCategoryToShowcaseMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMounted = useRef(true)
  const fetchedShowcases = useRef(false)
  const maxVideosPerShowcase = 20

  // Define the exact categories we want to display
  const allowedCategories = useMemo(
    () => [
      "Mindset", // Changed from "Introspection" to "Mindset"
      "Hustle Mentality",
      "High Energy Motivation",
      "Faith",
      "Money & Wealth",
      "Motivational Speeches",
      "Cinema",
    ],
    [],
  )

  // Helper function to normalize category names - memoized to prevent recreation
  const normalizeCategory = useCallback((category: string): string => {
    return category.trim().toLowerCase().replace(/\s+/g, " ")
  }, [])

  // Define exact mapping for our specific categories
  const exactCategoryMapping = useMemo(
    () => ({
      mindset: "Mindset", // Changed from "introspection": "Introspection"
      introspection: "Mindset", // Added this mapping to handle existing data
      "hustle mentality": "Hustle Mentality",
      "high energy motivation": "High Energy Motivation",
      faith: "Faith",
      "money & wealth": "Money & Wealth",
      "motivational speeches": "Motivational Speeches",
      cinema: "Cinema",
    }),
    [],
  )

  // Fetch videos for a specific showcase
  const fetchShowcaseVideos = useCallback(
    async (showcaseId: string, showcaseName: string) => {
      // Special case: if the showcase name is "Introspection", rename it to "Mindset"
      const displayName = showcaseName === "Introspection" ? "Mindset" : showcaseName

      // Only fetch videos for allowed categories or if it's "Introspection" (which we'll rename to "Mindset")
      if (!allowedCategories.includes(displayName) && showcaseName !== "Introspection") {
        return
      }

      try {
        console.log(`Fetching videos for showcase ${showcaseName} (display as: ${displayName})`)

        const response = await fetch(`/api/vimeo/showcases/${showcaseId}/videos?per_page=${maxVideosPerShowcase}`)

        // Check if response is OK
        if (!response.ok) {
          console.error(`Error fetching videos for showcase ${showcaseName}: Status ${response.status}`)
          return
        }

        // Try to parse as JSON
        let data: VimeoApiResponse
        try {
          data = await response.json()
        } catch (jsonError) {
          console.error(`Error parsing JSON for showcase ${showcaseName}:`, jsonError)
          return
        }

        // Only update state if component is still mounted
        if (!isMounted.current) return

        console.log(`Received ${data.data.length} videos for showcase ${showcaseName}`)

        // Sort videos alphabetically by title
        const sortedVideos = [...data.data].sort((a, b) => {
          const nameA = (a.name || "").toLowerCase()
          const nameB = (b.name || "").toLowerCase()
          return nameA.localeCompare(nameB)
        })

        // Update showcaseVideos state - use displayName (Mindset) instead of showcaseName (Introspection)
        setShowcaseVideos((prev) => ({
          ...prev,
          [displayName]: sortedVideos,
        }))
      } catch (err) {
        console.error(`Error fetching videos for showcase ${showcaseName}:`, err)
        // Don't set global error, just log it
      }
    },
    [maxVideosPerShowcase, allowedCategories],
  )

  // Fetch all showcases
  const fetchShowcases = useCallback(async () => {
    // Prevent multiple fetches
    if (fetchedShowcases.current) return
    fetchedShowcases.current = true

    try {
      setLoading(true)
      console.log("Fetching showcases")

      const response = await fetch("/api/vimeo/showcases")

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.details || "Failed to fetch showcases")
      }

      const data: VimeoShowcasesResponse = await response.json()

      // Only update state if component is still mounted
      if (!isMounted.current) return

      // Get all showcases
      const allShowcases = data.data

      // Filter to only the showcases we care about - include both "Introspection" and "Mindset"
      const relevantShowcases = allShowcases.filter(
        (showcase) => allowedCategories.includes(showcase.name) || showcase.name === "Introspection",
      )

      setShowcases(relevantShowcases)
      console.log(`Received ${relevantShowcases.length} relevant showcases`)

      // Create mappings
      const idMap: Record<string, string> = {}
      const categoryMap: Record<string, string> = {}

      // Process each showcase
      relevantShowcases.forEach((showcase) => {
        const showcaseId = showcase.uri.split("/").pop()
        if (showcaseId) {
          // For "Introspection", store it as "Mindset" in the maps
          const displayName = showcase.name === "Introspection" ? "Mindset" : showcase.name

          // Store the showcase ID mapped to the name
          idMap[displayName] = showcaseId

          // Map normalized category name to showcase name
          const normalizedName = normalizeCategory(displayName)
          categoryMap[normalizedName] = displayName

          // Also ensure our exact mapping is in place
          Object.entries(exactCategoryMapping).forEach(([category, mappedShowcase]) => {
            if (normalizeCategory(mappedShowcase) === normalizedName) {
              categoryMap[category] = displayName
            }
          })
        }
      })

      // Store the mappings
      setShowcaseIds(idMap)
      setCategoryToShowcaseMap(categoryMap)

      console.log("Category to showcase mapping:", categoryMap)
      console.log("Showcase IDs mapping:", idMap)

      // Fetch videos for each showcase
      const showcasePromises = relevantShowcases.map(async (showcase) => {
        const showcaseId = showcase.uri.split("/").pop()
        if (showcaseId) {
          await fetchShowcaseVideos(showcaseId, showcase.name)
        }
        return Promise.resolve()
      })

      // Wait for all showcase video fetches to complete
      await Promise.allSettled(showcasePromises)
    } catch (err) {
      console.error("Error fetching showcases:", err)
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : "Failed to fetch showcases")
      }
    } finally {
      if (isMounted.current) {
        setLoading(false)
      }
    }
  }, [normalizeCategory, exactCategoryMapping, fetchShowcaseVideos, allowedCategories])

  useEffect(() => {
    // Only fetch on initial mount
    fetchShowcases()

    // Cleanup function
    return () => {
      isMounted.current = false
    }
  }, [fetchShowcases]) // Include fetchShowcases in the dependency array since it's memoized

  return {
    showcases,
    showcaseVideos,
    showcaseIds,
    categoryToShowcaseMap,
    loading,
    error,
  }
}
