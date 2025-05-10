/**
 * Business logic for the category system
 */

import {
  initializeCategorySystem,
  getAllCategories,
  getCategoriesWithCounts,
  assignCategoryToVideo,
  getCategoriesForVideo,
  getCategoryById,
  getPrimaryCategoryForVideo,
  removeCategoryFromVideo,
  setPrimaryCategoryForVideo,
} from "./category-db"
import { SHOWCASE_TO_CATEGORY_MAP, CATEGORY_TO_SHOWCASE_MAP } from "./constants"
import type { Category, CategoryWithVideos } from "./types"

// Initialize the system
export async function ensureCategorySystem() {
  await initializeCategorySystem()
}

// Get all active categories
export async function getActiveCategories(): Promise<Category[]> {
  const categories = await getAllCategories()
  return categories.filter((category) => category.isActive)
}

// Get categories with video counts
export async function getActiveCategoriesWithCounts(): Promise<CategoryWithVideos[]> {
  const categoriesWithCounts = await getCategoriesWithCounts()
  return categoriesWithCounts.filter((category) => category.isActive)
}

// Assign a category to a video from a user upload
export async function assignCategoryFromUpload(
  videoId: string,
  categoryId: string,
  isPrimary = true,
  source: "showcase" | "firestore" | "manual" = "manual",
): Promise<void> {
  await assignCategoryToVideo(videoId, categoryId, isPrimary, source)
}

// Assign a category to a video from a showcase
export async function assignCategoryFromShowcase(videoId: string, showcaseId: string): Promise<void> {
  const categoryId = SHOWCASE_TO_CATEGORY_MAP[showcaseId]

  if (!categoryId) {
    console.warn(`No category mapping found for showcase ${showcaseId}`)
    return
  }

  await assignCategoryToVideo(videoId, categoryId, true, "showcase")
}

// Get the showcase ID for a category (for backward compatibility)
export function getShowcaseIdForCategory(categoryId: string): string | null {
  return CATEGORY_TO_SHOWCASE_MAP[categoryId] || null
}

// Get all categories for a video with full category details
export async function getFullCategoriesForVideo(videoId: string): Promise<Category[]> {
  const videoCategories = await getCategoriesForVideo(videoId)

  if (videoCategories.length === 0) {
    return []
  }

  const categoryIds = videoCategories.map((vc) => vc.categoryId)
  const categoryPromises = categoryIds.map((id) => getCategoryById(id))
  const categories = await Promise.all(categoryPromises)

  // Filter out any null values (in case a category was deleted)
  return categories.filter(Boolean) as Category[]
}

// Get the primary category for a video with full details
export async function getFullPrimaryCategoryForVideo(videoId: string): Promise<Category | null> {
  const primaryCategoryId = await getPrimaryCategoryForVideo(videoId)

  if (!primaryCategoryId) {
    return null
  }

  return getCategoryById(primaryCategoryId)
}

// Migrate a video from showcase-based categorization to the new system
export async function migrateVideoCategories(videoId: string, showcaseIds: string[]): Promise<void> {
  // Map showcase IDs to category IDs
  const categoryIds = showcaseIds.map((showcaseId) => SHOWCASE_TO_CATEGORY_MAP[showcaseId]).filter(Boolean) // Remove any undefined values

  if (categoryIds.length === 0) {
    console.warn(`No category mappings found for showcases: ${showcaseIds.join(", ")}`)
    return
  }

  // Assign each category, making the first one primary
  for (let i = 0; i < categoryIds.length; i++) {
    await assignCategoryToVideo(
      videoId,
      categoryIds[i],
      i === 0, // First category is primary
      "showcase",
    )
  }
}

export { removeCategoryFromVideo, setPrimaryCategoryForVideo }
