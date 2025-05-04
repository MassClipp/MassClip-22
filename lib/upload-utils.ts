import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage"
import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { UserVideo } from "@/lib/types"

/**
 * Generate a thumbnail from a video file
 */
export const generateThumbnail = (videoFile: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      // Create video element
      const video = document.createElement("video")
      video.preload = "metadata"
      video.muted = true
      video.crossOrigin = "anonymous"

      // Create object URL for the video file
      const url = URL.createObjectURL(videoFile)
      video.src = url

      // When video metadata is loaded
      video.onloadedmetadata = () => {
        // Seek to 25% of the video
        video.currentTime = video.duration * 0.25
      }

      // When video frame is loaded at the seeked position
      video.onseeked = () => {
        try {
          // Create canvas with video dimensions
          const canvas = document.createElement("canvas")
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight

          // Draw the video frame to the canvas
          const ctx = canvas.getContext("2d")
          if (!ctx) {
            reject(new Error("Could not get canvas context"))
            return
          }

          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

          // Convert the canvas to a data URL
          const dataUrl = canvas.toDataURL("image/jpeg", 0.8)

          // Clean up
          URL.revokeObjectURL(url)

          resolve(dataUrl)
        } catch (e) {
          reject(e)
        }
      }

      // Handle errors
      video.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error("Error loading video"))
      }
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Upload video and metadata to Firebase
 */
export const uploadVideo = async ({
  file,
  thumbnailFile,
  thumbnailDataUrl,
  title,
  description,
  category,
  isPublic,
  userId,
  onProgress,
}: {
  file: File
  thumbnailFile: File | null
  thumbnailDataUrl: string | null
  title: string
  description: string
  category: string
  isPublic: boolean
  userId: string
  onProgress: (progress: number) => void
}) => {
  // Get storage reference
  const storage = getStorage()

  // Generate a unique filename
  const fileExtension = file.name.split(".").pop() || "mp4"
  const videoFileName = `${userId}_${Date.now()}.${fileExtension}`
  const videoStoragePath = `videos/${userId}/${videoFileName}`

  // Create storage reference for video
  const videoRef = ref(storage, videoStoragePath)

  // Upload video file
  const uploadTask = uploadBytesResumable(videoRef, file)

  // Track upload progress
  return new Promise<string>((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        onProgress(progress)
      },
      (error) => {
        reject(error)
      },
      async () => {
        try {
          // Get download URL for the video
          const videoDownloadUrl = await getDownloadURL(uploadTask.snapshot.ref)

          // Handle thumbnail upload/conversion
          let thumbnailUrl = ""

          if (thumbnailFile) {
            // Upload custom thumbnail
            const thumbnailExtension = thumbnailFile.name.split(".").pop() || "jpg"
            const thumbnailFileName = `${userId}_${Date.now()}_thumb.${thumbnailExtension}`
            const thumbnailRef = ref(storage, `thumbnails/${userId}/${thumbnailFileName}`)

            await uploadBytesResumable(thumbnailRef, thumbnailFile)
            thumbnailUrl = await getDownloadURL(thumbnailRef)
          } else if (thumbnailDataUrl) {
            // Convert data URL to Blob and upload
            const byteString = atob(thumbnailDataUrl.split(",")[1])
            const mimeType = thumbnailDataUrl.split(",")[0].split(":")[1].split(";")[0]
            const ab = new ArrayBuffer(byteString.length)
            const ia = new Uint8Array(ab)

            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i)
            }

            const thumbnailBlob = new Blob([ab], { type: mimeType })
            const thumbnailFileName = `${userId}_${Date.now()}_thumb.jpg`
            const thumbnailRef = ref(storage, `thumbnails/${userId}/${thumbnailFileName}`)

            await uploadBytesResumable(thumbnailRef, thumbnailBlob)
            thumbnailUrl = await getDownloadURL(thumbnailRef)
          }

          // Save metadata to Firestore
          const videoDoc = await addDoc(collection(db, "userVideos"), {
            userId,
            title,
            description,
            category,
            isPublic,
            videoUrl: videoDownloadUrl,
            thumbnailUrl,
            fileName: file.name,
            fileSize: file.size,
            storageRef: videoStoragePath,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          })

          resolve(videoDoc.id)
        } catch (error) {
          reject(error)
        }
      },
    )
  })
}

/**
 * Fetch all uploads for a user
 */
export const fetchUserUploads = async (userId: string): Promise<UserVideo[]> => {
  try {
    const videosRef = collection(db, "userVideos")
    const q = query(videosRef, where("userId", "==", userId), orderBy("createdAt", "desc"))

    const querySnapshot = await getDocs(q)
    const videos: UserVideo[] = []

    querySnapshot.forEach((doc) => {
      videos.push({
        id: doc.id,
        ...doc.data(),
      } as UserVideo)
    })

    return videos
  } catch (error) {
    console.error("Error fetching user uploads:", error)
    throw error
  }
}

/**
 * Fetch a single video by ID
 */
export const fetchVideoById = async (videoId: string, userId: string): Promise<UserVideo | null> => {
  try {
    const videoDocRef = doc(db, "userVideos", videoId)
    const docSnap = await getDoc(videoDocRef)

    if (!docSnap.exists()) {
      return null
    }

    const videoData = docSnap.data() as Omit<UserVideo, "id">

    // Check if user has permission
    if (videoData.userId !== userId) {
      throw new Error("Not authorized to access this video")
    }

    return {
      id: videoId,
      ...videoData,
    }
  } catch (error) {
    console.error("Error fetching video:", error)
    throw error
  }
}

/**
 * Update video details
 */
export const updateVideoDetails = async (
  videoId: string,
  userId: string,
  details: {
    title?: string
    description?: string
    category?: string
    isPublic?: boolean
  },
) => {
  try {
    // Check if video exists and belongs to user
    const videoDoc = await fetchVideoById(videoId, userId)

    if (!videoDoc) {
      throw new Error("Video not found")
    }

    // Update the video document
    const videoRef = doc(db, "userVideos", videoId)
    await updateDoc(videoRef, {
      ...details,
      updatedAt: Timestamp.now(),
    })

    return true
  } catch (error) {
    console.error("Error updating video:", error)
    throw error
  }
}

/**
 * Delete a user video
 */
export const deleteUserVideo = async (videoId: string, userId: string) => {
  try {
    // Get the video document first
    const videoDoc = await fetchVideoById(videoId, userId)

    if (!videoDoc) {
      throw new Error("Video not found")
    }

    const storage = getStorage()

    // Delete the video file from storage
    if (videoDoc.storageRef) {
      const videoRef = ref(storage, videoDoc.storageRef)
      await deleteObject(videoRef)
    }

    // Delete the thumbnail if it exists
    if (videoDoc.thumbnailUrl) {
      // Extract the path from the URL
      const thumbnailPath = videoDoc.thumbnailUrl.split(`${storage.app.options.storageBucket}/o/`)[1]?.split("?")[0]

      if (thumbnailPath) {
        const decodedPath = decodeURIComponent(thumbnailPath)
        const thumbnailRef = ref(storage, decodedPath)
        await deleteObject(thumbnailRef)
      }
    }

    // Delete the document from Firestore
    const videoRef = doc(db, "userVideos", videoId)
    await deleteDoc(videoRef)

    return true
  } catch (error) {
    console.error("Error deleting video:", error)
    throw error
  }
}

/**
 * Update video visibility
 */
export const updateVideoVisibility = async (videoId: string, userId: string, isPublic: boolean) => {
  return updateVideoDetails(videoId, userId, { isPublic })
}

/**
 * Fetch all public videos for discovery
 */
export const fetchPublicVideos = async (limit = 20): Promise<UserVideo[]> => {
  try {
    const videosRef = collection(db, "userVideos")
    const q = query(videosRef, where("isPublic", "==", true), orderBy("createdAt", "desc"))

    const querySnapshot = await getDocs(q)
    const videos: UserVideo[] = []

    querySnapshot.forEach((doc) => {
      videos.push({
        id: doc.id,
        ...doc.data(),
      } as UserVideo)
    })

    return videos.slice(0, limit)
  } catch (error) {
    console.error("Error fetching public videos:", error)
    throw error
  }
}

/**
 * Fetch videos by category
 */
export const fetchVideosByCategory = async (category: string, limit = 20): Promise<UserVideo[]> => {
  try {
    const videosRef = collection(db, "userVideos")
    const q = query(
      videosRef,
      where("isPublic", "==", true),
      where("category", "==", category),
      orderBy("createdAt", "desc"),
    )

    const querySnapshot = await getDocs(q)
    const videos: UserVideo[] = []

    querySnapshot.forEach((doc) => {
      videos.push({
        id: doc.id,
        ...doc.data(),
      } as UserVideo)
    })

    return videos.slice(0, limit)
  } catch (error) {
    console.error("Error fetching videos by category:", error)
    throw error
  }
}
