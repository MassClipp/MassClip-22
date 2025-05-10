"use client"

import { useState, useEffect } from "react"
import { getAllCategories } from "@/lib/category-system/category-db"
import type { Category, CategoryWithVideos } from "@/lib/category-system/types"
import { STANDARD_CATEGORIES } from "@/lib/category-system/constants"

// Hook for getting all active categories
export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchCategories() {
      try {
        setLoading(true)

        // Try to fetch from Firestore
        const fetchedCategories = await getAllCategories()

        // If we got categories, use them
        if (fetchedCategories && fetchedCategories.length > 0) {
          console.log("Fetched categories from Firestore:", fetchedCategories)
          setCategories(fetchedCategories.filter((cat) => cat.isActive))
        }
        // Otherwise, use the standard categories as a fallback
        else {
          console.log("No categories found in Firestore, using standard categories")
          // Convert standard categories to full Category objects
          const fallbackCategories: Category[] = STANDARD_CATEGORIES.map((cat) => ({
            ...cat,
            createdAt: new Date(),
            updatedAt: new Date(),
          }))
          setCategories(fallbackCategories.filter((cat) => cat.isActive))
        }

        setError(null)
      } catch (err) {
        console.error("Error fetching categories:", err)

        // Use standard categories as fallback on error
        const fallbackCategories: Category[] = STANDARD_CATEGORIES.map((cat) => ({
          ...cat,
          createdAt: new Date(),
          updatedAt: new Date(),
        }))
        setCategories(fallbackCategories.filter((cat) => cat.isActive))

        setError(err instanceof Error ? err : new Error("Failed to fetch categories"))
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

        // For now, just return categories without counts
        // This can be enhanced later to actually count videos per category
        const allCategories = await getAllCategories()

        const categoriesWithCounts: CategoryWithVideos[] = allCategories
          .filter((cat) => cat.isActive)
          .map((cat) => ({
            ...cat,
            videoCount: 0, // Default to 0 for now
          }))

        setCategories(categoriesWithCounts)
        setError(null)
      } catch (err) {
        console.error("Error fetching categories with counts:", err)

        // Use standard categories as fallback
        const fallbackCategories: CategoryWithVideos[] = STANDARD_CATEGORIES.filter((cat) => cat.isActive).map(
          (cat) => ({
            ...cat,
            createdAt: new Date(),
            updatedAt: new Date(),
            videoCount: 0,
          }),
        )

        setCategories(fallbackCategories)
        setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        setLoading(false)
      }
    }

    fetchCategoriesWithCounts()
  }, [])

  return { categories, loading, error }
}
