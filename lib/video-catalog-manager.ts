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
  updateDoc,
  increment,
  type Timestamp,
} from "firebase/firestore"
import type { VimeoVideo } from "@/lib/types"

/**
 * Adds a video to the app's catalog after successful upload
 */
export async function addVideoToCatalog({
  vimeoId,
  vimeoData,
  userId,
  title,
  description,
  category,
  tags = [],
  isPremium = false,
  visibility = "public",
}: {
  vimeoId: string
  vimeoData: any
  userId: string
  title: string
  description?: string
  category: string
  tags?: string[]
  isPremium?: boolean
  visibility?: string
}) {
  try {
    // Create a document ID based on the Vimeo ID
    const videoDocRef = doc(db, "videos", vimeoId)

    // Check if the video already exists in our catalog
    const existingDoc = await getDoc(videoDocRef)

    // Prepare the video data
    const videoData = {
      vimeoId,
      title,
      description: description || "",
      category, // Store the category slug directly
      tags,
      isPremium,
      visibility,
      uploadedBy: userId,
      uploadedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      vimeoLink: vimeoData.link || null,
      thumbnail: `https://vumbnail.com/${vimeoId}.jpg`, // Default thumbnail from Vimeo
      views: 0,
      likes: 0,
      status: "active",
      // Store selected Vimeo data
      vimeoData: {
        link: vimeoData.link,
        name: vimeoData.name || title,
        description: vimeoData.description || description || "",
        pictures: vimeoData.pictures || null,
        duration: vimeoData.duration || null,
        width: vimeoData.width || null,
        height: vimeoData.height || null,
      },
    }

    if (existingDoc.exists()) {
      // Update existing video
      await updateDoc(videoDocRef, {
        ...videoData,
        updatedAt: serverTimestamp(),
      })
      console.log(`Updated existing video in catalog: ${vimeoId}`)
    } else {
      // Add new video
      await setDoc(videoDocRef, videoData)
      console.log(`Added new video to catalog: ${vimeoId}`)
    }

    return { success: true, videoId: vimeoId }
  } catch (error) {
    console.error("Error adding video to catalog:", error)
    return { success: false, error }
  }
}

/**
 * Gets videos from the catalog by category
 */
export async function getVideosByCategory(category: string, limitCount = 20) {
  try {
    const q = query(
      collection(db, "videos"),
      where("category", "==", category),
      where("status", "==", "active"),
      where("visibility", "==", "public"),
      orderBy("uploadedAt", "desc"),
      limit(limitCount),
    )

    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      // Convert Firestore Timestamps to regular dates for easier handling in components
      uploadedAt: formatTimestamp(doc.data().uploadedAt),
      updatedAt: formatTimestamp(doc.data().updatedAt),
    }))
  } catch (error) {
    console.error("Error getting videos by category:", error)
    return []
  }
}

/**
 * Gets recently added videos from the catalog
 */
export async function getRecentVideos(limitCount = 20) {
  try {
    const q = query(
      collection(db, "videos"),
      where("status", "==", "active"),
      where("visibility", "==", "public"),
      orderBy("uploadedAt", "desc"),
      limit(limitCount),
    )

    const querySnapshot = await getDocs(q)

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      // Convert Firestore Timestamps to regular dates for easier handling in components
      uploadedAt: formatTimestamp(doc.data().uploadedAt),
      updatedAt: formatTimestamp(doc.data().updatedAt),
    }))
  } catch (error) {
    console.error("Error getting recent videos:", error)
    return []
  }
}

/**
 * Gets a single video by ID
 */
export async function getVideoById(videoId: string) {
  try {
    const videoDoc = await getDoc(doc(db, "videos", videoId))

    if (videoDoc.exists()) {
      const data = videoDoc.data()
      return {
        id: videoDoc.id,
        ...data,
        // Convert Firestore Timestamps to regular dates for easier handling in components
        uploadedAt: formatTimestamp(data.uploadedAt),
        updatedAt: formatTimestamp(data.updatedAt),
      }
    }

    return null
  } catch (error) {
    console.error("Error getting video by ID:", error)
    return null
  }
}

/**
 * Updates a video's Vimeo data after processing is complete
 */
export async function updateVideoVimeoData(videoId: string, vimeoData: VimeoVideo) {
  try {
    const videoDocRef = doc(db, "videos", videoId)

    // Extract the relevant data from the Vimeo response
    const updatedData = {
      updatedAt: serverTimestamp(),
      status: "active", // Mark as active once processing is complete
      thumbnail:
        vimeoData.pictures?.sizes?.[vimeoData.pictures.sizes.length - 1]?.link || `https://vumbnail.com/${videoId}.jpg`,
      vimeoData: {
        link: vimeoData.link,
        name: vimeoData.name,
        description: vimeoData.description,
        pictures: vimeoData.pictures,
        duration: vimeoData.duration,
        width: vimeoData.width,
        height: vimeoData.height,
      },
    }

    await updateDoc(videoDocRef, updatedData)

    return { success: true }
  } catch (error) {
    console.error("Error updating video Vimeo data:", error)
    return { success: false, error }
  }
}

/**
 * Increments the view count for a video
 */
export async function incrementVideoViews(videoId: string) {
  try {
    const videoDocRef = doc(db, "videos", videoId)

    await updateDoc(videoDocRef, {
      views: increment(1),
    })

    return { success: true }
  } catch (error) {
    console.error("Error incrementing video views:", error)
    return { success: false, error }
  }
}

/**
 * Helper function to format Firestore timestamps
 */
function formatTimestamp(timestamp: Timestamp | null | undefined) {
  if (!timestamp) return null

  try {
    return timestamp.toDate()
  } catch (e) {
    return null
  }
}
