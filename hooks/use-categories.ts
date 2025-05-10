"use client"

/**
 * React hooks for working with categories
 */

import { useState, useEffect, useCallback } from "react"
import {
  getActiveCategories,
  getActiveCategoriesWithCounts,
  getFullCategoriesForVideo,
  getFullPrimaryCategoryForVideo,
  assignCategoryFromUpload,
  removeCategoryFromVideo,
  setPrimaryCategoryForVideo,
} from "@/lib/category-system/category-service"
import type { Category, CategoryWithVideos } from "@/lib/category-system/types"

// Hook for getting all active categories
export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchCategories() {
      try {
        setLoading(true)
        const data = await getActiveCategories()
        setCategories(data)
        setError(null)
      } catch (err) {
        console.error("Error fetching categories:", err)
        setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [])

  return { categories, loading, error }
}

// Hook for getting categories with video counts
export function useCategoriesWithCounts() {
  const [categories, setCategories] = useState<CategoryWithVideos[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchCategoriesWithCounts() {
      try {
        setLoading(true)
        const data = await getActiveCategoriesWithCounts()
        setCategories(data)
        setError(null)
      } catch (err) {
        console.error("Error fetching categories with counts:", err)
        setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        setLoading(false)
      }
    }

    fetchCategoriesWithCounts()
  }, [])

  return { categories, loading, error }
}

// Hook for getting categories for a specific video
export function useVideoCategories(videoId: string) {
  const [categories, setCategories] = useState<Category[]>([])
  const [primaryCategory, setPrimaryCategory] = useState<Category | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchVideoCategories() {
      if (!videoId) {
        setCategories([])
        setPrimaryCategory(null)
        setLoading(false)
        return
      }

      try {
        setLoading(true)

        // Fetch all categories for the video
        const allCategories = await getFullCategoriesForVideo(videoId)
        setCategories(allCategories)

        // Fetch the primary category
        const primary = await getFullPrimaryCategoryForVideo(videoId)
        setPrimaryCategory(primary)

        setError(null)
      } catch (err) {
        console.error(`Error fetching categories for video ${videoId}:`, err)
        setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        setLoading(false)
      }
    }

    fetchVideoCategories()
  }, [videoId])

  // Function to assign a category to the video
  const assignCategory = useCallback(
    async (categoryId: string, isPrimary = false) => {
      if (!videoId) return

      try {
        await assignCategoryFromUpload(videoId, categoryId, isPrimary)

        // Refresh the categories
        const allCategories = await getFullCategoriesForVideo(videoId)
        setCategories(allCategories)

        // If this was set as primary, update the primary category
        if (isPrimary) {
          const primary = await getFullPrimaryCategoryForVideo(videoId)
          setPrimaryCategory(primary)
        }
      } catch (err) {
        console.error(`Error assigning category ${categoryId} to video ${videoId}:`, err)
        throw err
      }
    },
    [videoId],
  )

  // Function to remove a category from the video
  const removeCategory = useCallback(
    async (categoryId: string) => {
      if (!videoId) return

      try {
        await removeCategoryFromVideo(videoId, categoryId)

        // Refresh the categories
        const allCategories = await getFullCategoriesForVideo(videoId)
        setCategories(allCategories)

        // Refresh the primary category
        const primary = await getFullPrimaryCategoryForVideo(videoId)
        setPrimaryCategory(primary)
      } catch (err) {
        console.error(`Error removing category ${categoryId} from video ${videoId}:`, err)
        throw err
      }
    },
    [videoId],
  )

  // Function to set the primary category
  const setPrimary = useCallback(
    async (categoryId: string) => {
      if (!videoId) return

      try {
        await setPrimaryCategoryForVideo(videoId, categoryId)

        // Refresh the primary category
        const primary = await getFullPrimaryCategoryForVideo(videoId)
        setPrimaryCategory(primary)
      } catch (err) {
        console.error(`Error setting primary category ${categoryId} for video ${videoId}:`, err)
        throw err
      }
    },
    [videoId],
  )

  return {
    categories,
    primaryCategory,
    loading,
    error,
    assignCategory,
    removeCategory,
    setPrimary,
  }
}
