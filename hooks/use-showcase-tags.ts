"use client"

import { useState, useEffect } from "react"
import { useVimeoShowcases } from "@/hooks/use-vimeo-showcases"
import { updateTagsForNiche, PREDEFINED_NICHES, NICHE_TO_TAGS_MAPPING } from "@/lib/category-utils"

export function useShowcaseTags() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nicheTagsMap, setNicheTagsMap] = useState<Record<string, string[]>>(NICHE_TO_TAGS_MAPPING)

  // Use the existing hook to get showcase data
  const { showcases, loading: showcasesLoading, error: showcasesError } = useVimeoShowcases()

  useEffect(() => {
    if (showcasesLoading) return

    if (showcasesError) {
      setError(showcasesError)
      setIsLoading(false)
      return
    }

    try {
      // Process showcases to update our niche-to-tags mapping
      const motivationShowcases = showcases
        .filter(
          (showcase) =>
            showcase.name.includes("Motivation") ||
            showcase.name.includes("Introspection") ||
            showcase.name.includes("Hustle") ||
            showcase.name.includes("Faith") ||
            showcase.name.includes("Money") ||
            showcase.name.includes("Wealth"),
        )
        .map((showcase) => showcase.name)

      // Update the mapping for each niche with real data from showcases
      // For now, we'll just update the Motivation niche with real data
      if (motivationShowcases.length > 0) {
        updateTagsForNiche("Motivation", motivationShowcases)
      }

      // Update the state with the latest mapping
      setNicheTagsMap({ ...NICHE_TO_TAGS_MAPPING })
      setIsLoading(false)
    } catch (err) {
      console.error("Error processing showcase tags:", err)
      setError("Failed to process showcase categories")
      setIsLoading(false)
    }
  }, [showcases, showcasesLoading, showcasesError])

  return {
    nicheTagsMap,
    isLoading,
    error,
    niches: PREDEFINED_NICHES,
  }
}
