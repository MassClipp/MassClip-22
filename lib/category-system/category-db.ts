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
  deleteDoc,
  serverTimestamp,
  type Timestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore"
import type { Category, VideoCategory, CategoryWithVideos } from "./types"
import { STANDARD_CATEGORIES } from "./constants"

// Collection names
const CATEGORIES_COLLECTION = "categories"
const VIDEO_CATEGORIES_COLLECTION = "videoCategories"
const CATEGORY_ASSIGNMENTS_COLLECTION = "categoryAssignments"

/**
 * Initialize the category system by ensuring all standard categories exist
 */
export async function initializeCategorySystem() {
  const batch = writeBatch(db)
  const now = new Date()

  for (const category of STANDARD_CATEGORIES) {
    const categoryRef = doc(db, CATEGORIES_COLLECTION, category.id)
    const categoryDoc = await getDoc(categoryRef)

    if (!categoryDoc.exists()) {
      batch.set(categoryRef, {
        ...category,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    }
  }

  await batch.commit()
  console.log("Category system initialized")
}

/**
 * Get all categories
 */
export async function getAllCategories(): Promise<Category[]> {
  const categoriesRef = collection(db, CATEGORIES_COLLECTION)
  const q = query(categoriesRef, orderBy("order", "asc"))
  const querySnapshot = await getDocs(q)

  return querySnapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      ...data,
      id: doc.id,
      createdAt: (data.createdAt as Timestamp).toDate(),
      updatedAt: (data.updatedAt as Timestamp).toDate(),
    } as Category
  })
}

/**
 * Get a category by ID
 */
export async function getCategoryById(categoryId: string): Promise<Category | null> {
  const categoryRef = doc(db, CATEGORIES_COLLECTION, categoryId)
  const categoryDoc = await getDoc(categoryRef)

  if (!categoryDoc.exists()) {
    return null
  }

  const data = categoryDoc.data()
  return {
    ...data,
    id: categoryDoc.id,
    createdAt: (data.createdAt as Timestamp).toDate(),
    updatedAt: (data.updatedAt as Timestamp).toDate(),
  } as Category
}

/**
 * Get categories with video counts
 */
export async function getCategoriesWithCounts(): Promise<CategoryWithVideos[]> {
  // First get all categories
  const categories = await getAllCategories()

  // Then get counts for each category
  const countPromises = categories.map(async (category) => {
    const videoCategoriesRef = collection(db, VIDEO_CATEGORIES_COLLECTION)
    const q = query(videoCategoriesRef, where("categoryId", "==", category.id))
    const querySnapshot = await getDocs(q)

    return {
      ...category,
      videoCount: querySnapshot.size,
    }
  })

  return Promise.all(countPromises)
}

/**
 * Assign a category to a video
 */
export async function assignCategoryToVideo(
  videoId: string,
  categoryId: string,
  isPrimary = true,
  source: "showcase" | "firestore" | "manual" = "manual",
): Promise<void> {
  // First, check if the category exists
  const categoryRef = doc(db, CATEGORIES_COLLECTION, categoryId)
  const categoryDoc = await getDoc(categoryRef)

  if (!categoryDoc.exists()) {
    throw new Error(`Category ${categoryId} does not exist`)
  }

  // Create a unique ID for the video-category relationship
  const videoCategoryId = `${videoId}_${categoryId}`
  const videoCategoryRef = doc(db, VIDEO_CATEGORIES_COLLECTION, videoCategoryId)

  // Create or update the video-category relationship
  await setDoc(videoCategoryRef, {
    videoId,
    categoryId,
    isPrimary,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  // Also record the assignment with its source
  const assignmentId = `${videoId}_${categoryId}_${source}`
  const assignmentRef = doc(db, CATEGORY_ASSIGNMENTS_COLLECTION, assignmentId)

  await setDoc(assignmentRef, {
    videoId,
    categoryId,
    source,
    isPrimary,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  // If this is the primary category, ensure no other categories for this video are primary
  if (isPrimary) {
    const videoCategoriesRef = collection(db, VIDEO_CATEGORIES_COLLECTION)
    const q = query(
      videoCategoriesRef,
      where("videoId", "==", videoId),
      where("isPrimary", "==", true),
      where("categoryId", "!=", categoryId),
    )

    const querySnapshot = await getDocs(q)

    const batch = writeBatch(db)
    querySnapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { isPrimary: false, updatedAt: serverTimestamp() })
    })

    if (querySnapshot.size > 0) {
      await batch.commit()
    }
  }
}

/**
 * Remove a category from a video
 */
export async function removeCategoryFromVideo(videoId: string, categoryId: string): Promise<void> {
  const videoCategoryId = `${videoId}_${categoryId}`
  const videoCategoryRef = doc(db, VIDEO_CATEGORIES_COLLECTION, videoCategoryId)

  await deleteDoc(videoCategoryRef)

  // Also remove all assignments for this video-category pair
  const assignmentsRef = collection(db, CATEGORY_ASSIGNMENTS_COLLECTION)
  const q = query(assignmentsRef, where("videoId", "==", videoId), where("categoryId", "==", categoryId))

  const querySnapshot = await getDocs(q)

  const batch = writeBatch(db)
  querySnapshot.docs.forEach((doc) => {
    batch.delete(doc.ref)
  })

  if (querySnapshot.size > 0) {
    await batch.commit()
  }
}

/**
 * Get all categories for a video
 */
export async function getCategoriesForVideo(videoId: string): Promise<VideoCategory[]> {
  const videoCategoriesRef = collection(db, VIDEO_CATEGORIES_COLLECTION)
  const q = query(videoCategoriesRef, where("videoId", "==", videoId))
  const querySnapshot = await getDocs(q)

  return querySnapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      videoId: data.videoId,
      categoryId: data.categoryId,
      isPrimary: data.isPrimary,
      createdAt: (data.createdAt as Timestamp).toDate(),
      updatedAt: (data.updatedAt as Timestamp).toDate(),
    } as VideoCategory
  })
}

/**
 * Get all videos for a category
 */
export async function getVideosForCategory(categoryId: string, limitCount = 100): Promise<string[]> {
  const videoCategoriesRef = collection(db, VIDEO_CATEGORIES_COLLECTION)
  const q = query(
    videoCategoriesRef,
    where("categoryId", "==", categoryId),
    orderBy("createdAt", "desc"),
    limit(limitCount),
  )

  const querySnapshot = await getDocs(q)

  return querySnapshot.docs.map((doc) => doc.data().videoId)
}

/**
 * Get the primary category for a video
 */
export async function getPrimaryCategoryForVideo(videoId: string): Promise<string | null> {
  const videoCategoriesRef = collection(db, VIDEO_CATEGORIES_COLLECTION)
  const q = query(videoCategoriesRef, where("videoId", "==", videoId), where("isPrimary", "==", true), limit(1))

  const querySnapshot = await getDocs(q)

  if (querySnapshot.empty) {
    return null
  }

  return querySnapshot.docs[0].data().categoryId
}

/**
 * Set the primary category for a video
 */
export async function setPrimaryCategoryForVideo(videoId: string, categoryId: string): Promise<void> {
  // First, ensure the video-category relationship exists
  const videoCategoryId = `${videoId}_${categoryId}`
  const videoCategoryRef = doc(db, VIDEO_CATEGORIES_COLLECTION, videoCategoryId)
  const videoCategoryDoc = await getDoc(videoCategoryRef)

  if (!videoCategoryDoc.exists()) {
    // Create the relationship if it doesn't exist
    await assignCategoryToVideo(videoId, categoryId, true)
    return
  }

  // Update the existing relationship to be primary
  await updateDoc(videoCategoryRef, {
    isPrimary: true,
    updatedAt: serverTimestamp(),
  })

  // Ensure no other categories for this video are primary
  const videoCategoriesRef = collection(db, VIDEO_CATEGORIES_COLLECTION)
  const q = query(
    videoCategoriesRef,
    where("videoId", "==", videoId),
    where("isPrimary", "==", true),
    where("categoryId", "!=", categoryId),
  )

  const querySnapshot = await getDocs(q)

  const batch = writeBatch(db)
  querySnapshot.docs.forEach((doc) => {
    batch.update(doc.ref, { isPrimary: false, updatedAt: serverTimestamp() })
  })

  if (querySnapshot.size > 0) {
    await batch.commit()
  }
}
