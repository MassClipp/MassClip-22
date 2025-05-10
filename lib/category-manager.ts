import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore"

/**
 * Saves a category assignment for a video after successful upload
 * This function is called after the upload is complete and doesn't interfere with the upload flow
 */
export async function assignCategoryToVideo({
  videoId,
  category,
  userId,
  videoTitle,
  videoThumbnail,
}: {
  videoId: string
  category: string
  userId: string
  videoTitle: string
  videoThumbnail?: string
}) {
  try {
    // Check if a category assignment already exists for this video
    const existingAssignments = await getCategoryAssignment(videoId)

    if (existingAssignments.length > 0) {
      // Update existing assignment
      const assignmentId = existingAssignments[0].id
      await updateDoc(doc(db, "categoryAssignments", assignmentId), {
        category,
        updatedAt: serverTimestamp(),
      })

      console.log(`Updated category assignment for video ${videoId} to ${category}`)
      return { success: true, assignmentId }
    } else {
      // Create new assignment
      const assignmentData = {
        videoId,
        category,
        userId,
        videoTitle,
        videoThumbnail: videoThumbnail || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      const docRef = await addDoc(collection(db, "categoryAssignments"), assignmentData)

      console.log(`Created new category assignment for video ${videoId} to ${category}`)
      return { success: true, assignmentId: docRef.id }
    }
  } catch (error) {
    console.error("Error assigning category to video:", error)
    return { success: false, error }
  }
}

/**
 * Gets the category assignment for a specific video
 */
export async function getCategoryAssignment(videoId: string) {
  try {
    const q = query(collection(db, "categoryAssignments"), where("videoId", "==", videoId))
    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error("Error getting category assignment:", error)
    return []
  }
}

/**
 * Gets all videos for a specific category
 */
export async function getVideosByCategory(category: string) {
  try {
    const q = query(collection(db, "categoryAssignments"), where("category", "==", category))
    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error("Error getting videos by category:", error)
    return []
  }
}

/**
 * Gets all videos grouped by category
 */
export async function getAllVideosByCategory() {
  try {
    const querySnapshot = await getDocs(collection(db, "categoryAssignments"))

    const videosByCategory: Record<string, any[]> = {}

    querySnapshot.docs.forEach((doc) => {
      const data = doc.data()
      const category = data.category

      if (!videosByCategory[category]) {
        videosByCategory[category] = []
      }

      videosByCategory[category].push({
        id: doc.id,
        ...data,
      })
    })

    return videosByCategory
  } catch (error) {
    console.error("Error getting all videos by category:", error)
    return {}
  }
}
