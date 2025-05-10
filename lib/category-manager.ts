import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore"
import { fetchVimeoShowcaseVideos } from "@/lib/vimeo-helpers" // We'll create this helper

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
  isUserGenerated = false, // Flag to identify UGC content
}: {
  videoId: string
  category: string
  userId: string
  videoTitle: string
  videoThumbnail?: string
  isUserGenerated?: boolean
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
        isUserGenerated, // Store whether this is UGC
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
        isUserGenerated, // Store whether this is UGC
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
 * Gets all videos for a specific category from Firestore
 */
export async function getFirestoreVideosByCategory(category: string) {
  try {
    const q = query(collection(db, "categoryAssignments"), where("category", "==", category))
    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error("Error getting videos by category from Firestore:", error)
    return []
  }
}

/**
 * Gets all videos for a specific category from both Firestore and Vimeo showcases
 * This is the main function that implements the fallback logic
 */
export async function getVideosByCategory(category: string, showcaseId?: string) {
  try {
    // First, get videos from Firestore
    const firestoreVideos = await getFirestoreVideosByCategory(category)

    // If showcaseId is provided, also get videos from Vimeo showcase
    let showcaseVideos: any[] = []
    if (showcaseId) {
      showcaseVideos = await fetchVimeoShowcaseVideos(showcaseId)
    }

    // Create a map of video IDs from Firestore to avoid duplicates
    const firestoreVideoIds = new Set(firestoreVideos.map((video) => video.videoId))

    // Filter out showcase videos that already exist in Firestore
    const uniqueShowcaseVideos = showcaseVideos.filter((video) => {
      const videoId = video.uri.split("/").pop()
      return !firestoreVideoIds.has(videoId)
    })

    // Combine both sources, prioritizing Firestore videos
    return [...firestoreVideos, ...uniqueShowcaseVideos]
  } catch (error) {
    console.error("Error getting videos by category:", error)
    return []
  }
}

/**
 * Gets all videos grouped by category from both Firestore and Vimeo showcases
 */
export async function getAllVideosByCategory() {
  try {
    // Get all Firestore category assignments
    const querySnapshot = await getDocs(collection(db, "categoryAssignments"))

    const videosByCategory: Record<string, any[]> = {}

    // Process Firestore videos
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

    // We'll keep the showcase videos separate for now
    // In a real implementation, you'd also fetch showcase videos and merge them

    return videosByCategory
  } catch (error) {
    console.error("Error getting all videos by category:", error)
    return {}
  }
}

/**
 * Checks if a video exists in a specific showcase
 */
export async function checkVideoInShowcase(videoId: string, showcaseId: string) {
  try {
    const showcaseVideos = await fetchVimeoShowcaseVideos(showcaseId)
    return showcaseVideos.some((video) => video.uri.includes(videoId))
  } catch (error) {
    console.error("Error checking video in showcase:", error)
    return false
  }
}
