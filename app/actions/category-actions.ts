"use server"

import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore"
import { normalizeCategory, getProperCaseTag } from "@/lib/category-utils"

/**
 * Assigns a video to a category, creating the category if it doesn't exist
 * @param videoId The ID of the video to assign
 * @param tagName The tag/category name
 * @param userId The user ID who owns the video
 */
export async function assignVideoToCategory(videoId: string, tagName: string, userId: string) {
  if (!videoId || !tagName || !userId) {
    console.error("Missing required parameters for category assignment")
    return { success: false, error: "Missing required parameters" }
  }

  try {
    // Normalize the tag name to prevent duplicates
    const normalizedTag = normalizeCategory(tagName)

    // Get the proper case version from our predefined list
    const properCaseTag = getProperCaseTag(tagName)

    // Check if the category already exists
    const categoriesRef = collection(db, "categories")
    const q = query(categoriesRef, where("normalizedName", "==", normalizedTag))
    const querySnapshot = await getDocs(q)

    let categoryId: string

    if (querySnapshot.empty) {
      // Category doesn't exist, create it
      console.log(`Creating new category: ${properCaseTag}`)
      const newCategoryRef = await addDoc(categoriesRef, {
        name: properCaseTag,
        normalizedName: normalizedTag,
        createdAt: serverTimestamp(),
        createdBy: userId,
        videoCount: 1,
      })
      categoryId = newCategoryRef.id
    } else {
      // Category exists, use the first match
      categoryId = querySnapshot.docs[0].id
      console.log(`Found existing category: ${querySnapshot.docs[0].data().name} (${categoryId})`)

      // Could update video count here if needed
    }

    // Assign the video to the category
    const videoCategoryRef = collection(db, "videoCategories")
    await addDoc(videoCategoryRef, {
      videoId,
      categoryId,
      userId,
      assignedAt: serverTimestamp(),
    })

    return { success: true, categoryId }
  } catch (error) {
    console.error("Error assigning video to category:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}
