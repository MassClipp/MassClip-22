import { db } from "@/firebase/firebase"
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, orderBy, updateDoc } from "firebase/firestore"

export interface Upload {
  id: string
  filename: string
  url: string
  fileType: string
  size: number
  uploadedAt: Date
  userId: string
  username: string
  title?: string
  description?: string
  tags?: string[]
  isPublic?: boolean
  downloadCount?: number
}

export interface CreateUploadData {
  filename: string
  url: string
  fileType: string
  size: number
  userId: string
  username: string
  title?: string
  description?: string
  tags?: string[]
  isPublic?: boolean
}

// Create a new upload
export async function createUpload(data: CreateUploadData): Promise<string> {
  try {
    const uploadData = {
      ...data,
      uploadedAt: new Date(),
      downloadCount: 0,
      isPublic: data.isPublic ?? true,
      tags: data.tags ?? [],
    }

    const docRef = await addDoc(collection(db, "uploads"), uploadData)
    return docRef.id
  } catch (error) {
    console.error("Error creating upload:", error)
    throw new Error("Failed to create upload")
  }
}

// Get uploads with optional filtering
export async function getUploads(options?: {
  userId?: string
  username?: string
  isPublic?: boolean
  limit?: number
}): Promise<Upload[]> {
  try {
    let q = query(collection(db, "uploads"))

    // Add filters
    if (options?.userId) {
      q = query(q, where("userId", "==", options.userId))
    }
    if (options?.username) {
      q = query(q, where("username", "==", options.username))
    }
    if (options?.isPublic !== undefined) {
      q = query(q, where("isPublic", "==", options.isPublic))
    }

    // Order by upload date (newest first)
    q = query(q, orderBy("uploadedAt", "desc"))

    const querySnapshot = await getDocs(q)
    const uploads: Upload[] = []

    querySnapshot.forEach((doc) => {
      const data = doc.data()
      uploads.push({
        id: doc.id,
        filename: data.filename,
        url: data.url,
        fileType: data.fileType,
        size: data.size,
        uploadedAt: data.uploadedAt?.toDate() || new Date(),
        userId: data.userId,
        username: data.username,
        title: data.title,
        description: data.description,
        tags: data.tags || [],
        isPublic: data.isPublic ?? true,
        downloadCount: data.downloadCount || 0,
      })
    })

    return uploads
  } catch (error) {
    console.error("Error getting uploads:", error)
    throw new Error("Failed to get uploads")
  }
}

// Delete an upload
export async function deleteUpload(uploadId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "uploads", uploadId))
  } catch (error) {
    console.error("Error deleting upload:", error)
    throw new Error("Failed to delete upload")
  }
}

// Update an upload
export async function updateUpload(uploadId: string, data: Partial<Upload>): Promise<void> {
  try {
    const updateData = { ...data }
    delete updateData.id // Remove id from update data

    await updateDoc(doc(db, "uploads", uploadId), updateData)
  } catch (error) {
    console.error("Error updating upload:", error)
    throw new Error("Failed to update upload")
  }
}

// Get upload by ID
export async function getUploadById(uploadId: string): Promise<Upload | null> {
  try {
    const uploads = await getUploads()
    return uploads.find((upload) => upload.id === uploadId) || null
  } catch (error) {
    console.error("Error getting upload by ID:", error)
    throw new Error("Failed to get upload")
  }
}

// Increment download count
export async function incrementDownloadCount(uploadId: string): Promise<void> {
  try {
    const upload = await getUploadById(uploadId)
    if (upload) {
      await updateUpload(uploadId, {
        downloadCount: (upload.downloadCount || 0) + 1,
      })
    }
  } catch (error) {
    console.error("Error incrementing download count:", error)
    throw new Error("Failed to update download count")
  }
}

// Bundle interfaces
export interface Bundle {
  id: string
  title: string
  description?: string
  price: number
  coverImageUrl?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  userId: string
  username: string
  contentItems?: string[] // Array of upload IDs
  contentCount?: number
}

export interface CreateBundleData {
  title: string
  description?: string
  price: number
  coverImageUrl?: string
  isActive?: boolean
  userId: string
  username: string
  contentItems?: string[]
}

// Get bundles with optional filtering
export async function getBundles(options?: {
  userId?: string
  username?: string
  isActive?: boolean
  limit?: number
}): Promise<Bundle[]> {
  try {
    let q = query(collection(db, "bundles"))

    // Add filters
    if (options?.userId) {
      q = query(q, where("userId", "==", options.userId))
    }
    if (options?.username) {
      q = query(q, where("username", "==", options.username))
    }
    if (options?.isActive !== undefined) {
      q = query(q, where("isActive", "==", options.isActive))
    }

    // Order by creation date (newest first)
    q = query(q, orderBy("createdAt", "desc"))

    const querySnapshot = await getDocs(q)
    const bundles: Bundle[] = []

    querySnapshot.forEach((doc) => {
      const data = doc.data()
      bundles.push({
        id: doc.id,
        title: data.title,
        description: data.description,
        price: data.price,
        coverImageUrl: data.coverImageUrl,
        isActive: data.isActive ?? true,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        userId: data.userId,
        username: data.username,
        contentItems: data.contentItems || [],
        contentCount: data.contentItems?.length || 0,
      })
    })

    return bundles
  } catch (error) {
    console.error("Error getting bundles:", error)
    throw new Error("Failed to get bundles")
  }
}

// Create a new bundle
export async function createBundle(data: CreateBundleData): Promise<string> {
  try {
    const bundleData = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: data.isActive ?? true,
      contentItems: data.contentItems ?? [],
    }

    const docRef = await addDoc(collection(db, "bundles"), bundleData)
    return docRef.id
  } catch (error) {
    console.error("Error creating bundle:", error)
    throw new Error("Failed to create bundle")
  }
}

// Update a bundle
export async function updateBundle(bundleId: string, data: Partial<Bundle>): Promise<void> {
  try {
    const updateData = {
      ...data,
      updatedAt: new Date(),
    }
    delete updateData.id // Remove id from update data

    await updateDoc(doc(db, "bundles", bundleId), updateData)
  } catch (error) {
    console.error("Error updating bundle:", error)
    throw new Error("Failed to update bundle")
  }
}

// Delete a bundle
export async function deleteBundle(bundleId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "bundles", bundleId))
  } catch (error) {
    console.error("Error deleting bundle:", error)
    throw new Error("Failed to delete bundle")
  }
}

// Get bundle by ID
export async function getBundleById(bundleId: string): Promise<Bundle | null> {
  try {
    const bundles = await getBundles()
    return bundles.find((bundle) => bundle.id === bundleId) || null
  } catch (error) {
    console.error("Error getting bundle by ID:", error)
    throw new Error("Failed to get bundle")
  }
}

// Add content to bundle
export async function addContentToBundle(bundleId: string, uploadIds: string[]): Promise<void> {
  try {
    const bundle = await getBundleById(bundleId)
    if (bundle) {
      const existingContent = bundle.contentItems || []
      const newContent = [...new Set([...existingContent, ...uploadIds])] // Remove duplicates

      await updateBundle(bundleId, {
        contentItems: newContent,
        updatedAt: new Date(),
      })
    }
  } catch (error) {
    console.error("Error adding content to bundle:", error)
    throw new Error("Failed to add content to bundle")
  }
}

// Remove content from bundle
export async function removeContentFromBundle(bundleId: string, uploadIds: string[]): Promise<void> {
  try {
    const bundle = await getBundleById(bundleId)
    if (bundle) {
      const existingContent = bundle.contentItems || []
      const newContent = existingContent.filter((id) => !uploadIds.includes(id))

      await updateBundle(bundleId, {
        contentItems: newContent,
        updatedAt: new Date(),
      })
    }
  } catch (error) {
    console.error("Error removing content from bundle:", error)
    throw new Error("Failed to remove content from bundle")
  }
}
