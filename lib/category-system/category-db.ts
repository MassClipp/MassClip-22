/**
 * Database operations for the category system
 */

import { db } from "@/lib/firebase"
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  type Timestamp,
  deleteDoc,
  updateDoc,
} from "firebase/firestore"
import type { Category, VideoCategory, CategoryWithVideos } from "./types"
import { STANDARD_CATEGORIES } from "./constants"

// Collection names
const CATEGORIES_COLLECTION = "categories"
const VIDEO_CATEGORIES_COLLECTION = "videoCategories"

/**
 * Initializes Firebase with standard categories
 */
export async function initializeCategorySystem(): Promise<void> {
  try {
    const categoriesRef = collection(db, CATEGORIES_COLLECTION)
    const querySnapshot = await getDocs(categoriesRef)

    if (querySnapshot.empty) {
      for (const category of STANDARD_CATEGORIES) {
        const categoryRef = doc(db, CATEGORIES_COLLECTION, category.id)
        await setDoc(categoryRef, {
          ...category,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      }
      console.log("Categories initialized successfully")
    } else {
      console.log("Categories already initialized")
    }
  } catch (error) {
    console.error("Error initializing categories:", error)
    throw error
  }
}

/**
 * Get all categories
 */
export async function getAllCategories(): Promise<Category[]> {
  try {
    const categoriesRef = collection(db, CATEGORIES_COLLECTION)
    const q = query(categoriesRef, orderBy("order", "asc"))
    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date(),
        updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toDate() : new Date(),
      } as Category
    })
  } catch (error) {
    console.error("Error getting categories:", error)
    return []
  }
}

/**
 * Get categories with video counts
 */
export async function getCategoriesWithCounts(): Promise<CategoryWithVideos[]> {
  try {
    const categories = await getAllCategories()
    const categoriesWithCounts: CategoryWithVideos[] = []

    for (const category of categories) {
      const videoCount = await getVideoCountForCategory(category.id)
      categoriesWithCounts.push({
        ...category,
        videoCount,
      })
    }

    return categoriesWithCounts
  } catch (error) {
    console.error("Error getting categories with counts:", error)
    return []
  }
}

/**
 * Get the number of videos for a category
 */
async function getVideoCountForCategory(categoryId: string): Promise<number> {
  try {
    const videoCategoriesRef = collection(db, VIDEO_CATEGORIES_COLLECTION)
    const q = query(videoCategoriesRef, where("categoryId", "==", categoryId))
    const querySnapshot = await getDocs(q)
    return querySnapshot.size
  } catch (error) {
    console.error(`Error getting video count for category ${categoryId}:`, error)
    return 0
  }
}

/**
 * Get all videos for a category
 */
export async function getVideosForCategory(categoryId: string, limitCount = 100): Promise<string[]> {
  try {
    const videoCategoriesRef = collection(db, VIDEO_CATEGORIES_COLLECTION)
    const q = query(
      videoCategoriesRef,
      where("categoryId", "==", categoryId),
      orderBy("createdAt", "desc"),
      limit(limitCount),
    )

    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map((doc) => doc.data().videoId)
  } catch (error) {
    console.error(`Error getting videos for category ${categoryId}:`, error)
    return []
  }
}

/**
 * Assign a category to a video
 */
export async function assignCategoryToVideo(
  videoId: string,
  categoryId: string,
  isPrimary = true,
  source = "manual",
): Promise<void> {
  try {
    const videoCategoriesRef = collection(db, VIDEO_CATEGORIES_COLLECTION)
    const q = query(videoCategoriesRef, where("videoId", "==", videoId), where("categoryId", "==", categoryId))
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      await setDoc(doc(collection(db, VIDEO_CATEGORIES_COLLECTION)), {
        videoId,
        categoryId,
        isPrimary,
        source,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    } else {
      querySnapshot.forEach(async (docSnapshot) => {
        await updateDoc(doc(db, VIDEO_CATEGORIES_COLLECTION, docSnapshot.id), {
          isPrimary,
          updatedAt: serverTimestamp(),
        })
      })
    }

    console.log(`Category ${categoryId} assigned to video ${videoId}`)
  } catch (error) {
    console.error("Error assigning category to video:", error)
    throw error
  }
}

/**
 * Get all categories for a video
 */
export async function getCategoriesForVideo(videoId: string): Promise<VideoCategory[]> {
  try {
    const videoCategoriesRef = collection(db, VIDEO_CATEGORIES_COLLECTION)
    const q = query(videoCategoriesRef, where("videoId", "==", videoId))
    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<VideoCategory, "id">),
    })) as VideoCategory[]
  } catch (error) {
    console.error("Error getting categories for video:", error)
    return []
  }
}

/**
 * Get a category by ID
 */
export async function getCategoryById(categoryId: string): Promise<Category | null> {
  try {
    const categoryRef = doc(db, CATEGORIES_COLLECTION, categoryId)
    const categoryDoc = await getDoc(categoryRef)

    if (categoryDoc.exists()) {
      const data = categoryDoc.data()
      return {
        ...data,
        id: categoryDoc.id,
        createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date(),
        updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toDate() : new Date(),
      } as Category
    }

    return null
  } catch (error) {
    console.error("Error getting category by ID:", error)
    return null
  }
}

/**
 * Get the primary category for a video
 */
export async function getPrimaryCategoryForVideo(videoId: string): Promise<string | null> {
  try {
    const videoCategoriesRef = collection(db, VIDEO_CATEGORIES_COLLECTION)
    const q = query(videoCategoriesRef, where("videoId", "==", videoId), where("isPrimary", "==", true), limit(1))
    const querySnapshot = await getDocs(q)

    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data().categoryId
    }

    return null
  } catch (error) {
    console.error("Error getting primary category for video:", error)
    return null
  }
}

/**
 * Remove a category from a video
 */
export async function removeCategoryFromVideo(videoId: string, categoryId: string): Promise<void> {
  try {
    const videoCategoriesRef = collection(db, VIDEO_CATEGORIES_COLLECTION)
    const q = query(
      videoCategoriesRef,
      where("videoId", "==", videoId),
      where("categoryId", "==", categoryId),
      limit(1),
    )
    const querySnapshot = await getDocs(q)

    if (!querySnapshot.empty) {
      await deleteDoc(doc(db, VIDEO_CATEGORIES_COLLECTION, querySnapshot.docs[0].id))
      console.log(`Category ${categoryId} removed from video ${videoId}`)
    } else {
      console.warn(`Category ${categoryId} not found for video ${videoId}`)
    }
  } catch (error) {
    console.error("Error removing category from video:", error)
    throw error
  }
}

/**
 * Set a category as the primary category for a video
 */
export async function setPrimaryCategoryForVideo(videoId: string, categoryId: string): Promise<void> {
  try {
    // First, unset the isPrimary flag for all other categories for this video
    const videoCategoriesRef = collection(db, VIDEO_CATEGORIES_COLLECTION)
    const q = query(videoCategoriesRef, where("videoId", "==", videoId))
    const querySnapshot = await getDocs(q)

    for (const docSnapshot of querySnapshot.docs) {
      await updateDoc(doc(db, VIDEO_CATEGORIES_COLLECTION, docSnapshot.id), {
        isPrimary: docSnapshot.data().categoryId === categoryId,
        updatedAt: serverTimestamp(),
      })
    }

    // If the category doesn't exist for this video yet, create it
    const q2 = query(
      videoCategoriesRef,
      where("videoId", "==", videoId),
      where("categoryId", "==", categoryId),
      limit(1),
    )
    const querySnapshot2 = await getDocs(q2)

    if (querySnapshot2.empty) {
      await assignCategoryToVideo(videoId, categoryId, true)
    }

    console.log(`Category ${categoryId} set as primary for video ${videoId}`)
  } catch (error) {
    console.error("Error setting primary category for video:", error)
    throw error
  }
}
