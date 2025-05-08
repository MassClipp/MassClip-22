"use server"

import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, addDoc, serverTimestamp, updateDoc, doc } from "firebase/firestore"
import { normalizeCategory, getProperCaseNiche } from "@/lib/category-utils"

/**
 * Assigns a video to a category, creating the category if it doesn't exist
 * @param videoId The ID of the video to assign
 * @param niche The primary niche (e.g., Motivation, Meme)
 * @param tag The specific tag within the niche
 * @param userId The user ID who owns the video
 */
export async function assignVideoToCategory(videoId: string, niche: string, tag: string, userId: string) {
  if (!videoId || !niche || !tag || !userId) {
    console.error("Missing required parameters for category assignment")
    return { success: false, error: "Missing required parameters" }
  }

  try {
    // Normalize the tag name to prevent duplicates
    const normalizedTag = normalizeCategory(tag)
    const properCaseNiche = getProperCaseNiche(niche)

    // Check if the category already exists
    const categoriesRef = collection(db, "categories")
    const q = query(categoriesRef, where("normalizedName", "==", normalizedTag))
    const querySnapshot = await getDocs(q)

    let categoryId: string

    if (querySnapshot.empty) {
      // Category doesn't exist, create it
      console.log(`Creating new category: ${tag} (niche: ${properCaseNiche})`)
      const newCategoryRef = await addDoc(categoriesRef, {
        name: tag,
        normalizedName: normalizedTag,
        niche: properCaseNiche,
        createdAt: serverTimestamp(),
        createdBy: userId,
        videoCount: 1,
      })
      categoryId = newCategoryRef.id
    } else {
      // Category exists, use the first match
      categoryId = querySnapshot.docs[0].id
      console.log(`Found existing category: ${querySnapshot.docs[0].data().name} (${categoryId})`)

      // Update video count
      await updateDoc(doc(db, "categories", categoryId), {
        videoCount: (querySnapshot.docs[0].data().videoCount || 0) + 1,
      })
    }

    // Assign the video to the category
    const videoCategoryRef = collection(db, "videoCategories")
    await addDoc(videoCategoryRef, {
      videoId,
      categoryId,
      niche: properCaseNiche,
      tag: tag,
      userId,
      assignedAt: serverTimestamp(),
    })

    // Also update the video document with the category info
    await updateDoc(doc(db, "uploads", videoId), {
      categoryId,
      niche: properCaseNiche,
      tag: tag,
      updatedAt: serverTimestamp(),
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
