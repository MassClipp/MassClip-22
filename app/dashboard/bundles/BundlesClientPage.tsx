"use client"

import { useRef } from "react"

import { Package } from "lucide-react"
import { useState, useEffect } from "react"
import { Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, onSnapshot, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"

/* -------------------------------------------------------------------------- */
/*                               PAGE METADATA                                */
/* -------------------------------------------------------------------------- */

interface ContentItem {
  id: string
  title: string
  fileUrl: string
  thumbnailUrl?: string
  mimeType: string
  fileSize: number
  contentType: "video" | "audio" | "image" | "document"
  duration?: number
  filename: string
  createdAt?: any
  type?: string
}

interface ProductBox {
  id: string
  title: string
  description: string
  price: number
  currency: string
  coverImage?: string
  active: boolean
  contentItems: string[]
  createdAt?: any
  updatedAt?: any
  productId?: string
  priceId?: string
}

interface CreateBundleForm {
  title: string
  description: string
  price: string
  billingType: "one_time" | "subscription"
  thumbnail: File | null
}

interface EditBundleForm {
  title: string
  description: string
  price: string
  coverImage: string
}

/* -------------------------------------------------------------------------- */
/*                               MOCKED DATA                                  */
/*    (Replace with real data-fetching logic – this version never crashes)    */
/* -------------------------------------------------------------------------- */
type Bundle = {
  id: string
  name: string
  description?: string
  createdAt: string
  /* NOTE: NO `icon` FIELD → avoids “reading ‘icon’ of undefined” */
}

const MOCK_BUNDLES: Bundle[] = [
  {
    id: "bnd_001",
    name: "Productivity Mastery",
    description: "Collection of videos & templates to boost productivity.",
    createdAt: "2025-07-01",
  },
  {
    id: "bnd_002",
    name: "Design Essentials",
    description: "Essential resources for UI / UX designers.",
    createdAt: "2025-06-12",
  },
]

/* -------------------------------------------------------------------------- */
/*                                   PAGE                                     */
/* -------------------------------------------------------------------------- */
export default function BundlesClientPage() {
  const { user } = useAuth()
  const [productBoxes, setProductBoxes] = useState<ProductBox[]>([])
  const [contentItems, setContentItems] = useState<{ [key: string]: ContentItem[] }>({})
  const [loading, setLoading] = useState(true)
  const [contentLoading, setContentLoading] = useState<{ [key: string]: boolean }>({})
  const [showContent, setShowContent] = useState<{ [key: string]: boolean }>({})
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [createForm, setCreateForm] = useState<CreateBundleForm>({
    title: "",
    description: "",
    price: "",
    billingType: "one_time",
    thumbnail: null,
  })
  const { toast } = useToast()

  const [availableUploads, setAvailableUploads] = useState<ContentItem[]>([])
  const [showAddContentModal, setShowAddContentModal] = useState<string | null>(null)
  const [selectedContentIds, setSelectedContentIds] = useState<string[]>([])
  const [addContentLoading, setAddContentLoading] = useState(false)
  const [uploadsLoading, setUploadsLoading] = useState(false)

  // Edit bundle states
  const [showEditModal, setShowEditModal] = useState<string | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [thumbnailUploading, setThumbnailUploading] = useState(false)
  const [editForm, setEditForm] = useState<EditBundleForm>({
    title: "",
    description: "",
    price: "",
    coverImage: "",
  })

  // Real-time listeners for content updates
  const contentListeners = useRef<{ [key: string]: () => void }>({})

  // Add helper functions at the top of the component
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

  const formatDuration = (seconds: number): string => {
    if (!seconds || seconds <= 0) return "0:00"

    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = Math.floor(seconds % 60)

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
    } else {
      return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
    }
  }

  // Fetch product boxes - Updated to use the bundles API
  const fetchProductBoxes = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      console.log("🔍 [Bundles] Fetching bundles...")

      const idToken = await user.getIdToken()

      // Use the bundles API instead of product-boxes
      const response = await fetch(`/api/creator/bundles`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch bundles: ${response.status}`)
      }

      const data = await response.json()
      const bundles = data.bundles || []

      console.log("📦 [Bundles] Raw bundles data:", bundles)

      // Convert bundles to ProductBox format for compatibility
      const boxes = bundles.map((bundle: any) => ({
        id: bundle.id,
        title: bundle.title,
        description: bundle.description || "",
        price: bundle.price,
        currency: bundle.currency || "usd",
        coverImage: bundle.coverImage,
        active: bundle.active !== false, // Default to true if not specified
        contentItems: bundle.contentItems || [],
        createdAt: bundle.createdAt,
        updatedAt: bundle.updatedAt,
        productId: bundle.productId,
        priceId: bundle.priceId,
      }))

      setProductBoxes(boxes)
      console.log(`✅ [Bundles] Loaded ${boxes.length} bundles`)

      // Initialize show content state and set up real-time listeners
      const initialShowState: { [key: string]: boolean } = {}

      boxes.forEach((box: ProductBox) => {
        initialShowState[box.id] = true // Show content by default
        setupContentListener(box)
      })

      setShowContent(initialShowState)
    } catch (err) {
      console.error("❌ [Bundles] Error:", err)
      setError(err instanceof Error ? err.message : "Failed to load bundles")
    } finally {
      setLoading(false)
    }
  }

  // Set up real-time listener for product box content
  const setupContentListener = (productBox: ProductBox) => {
    // Clean up existing listener
    if (contentListeners.current[productBox.id]) {
      contentListeners.current[productBox.id]()
    }

    // Set up new listener for productBoxContent collection
    const contentQuery = query(collection(db, "productBoxContent"), where("productBoxId", "==", productBox.id))

    const unsubscribe = onSnapshot(
      contentQuery,
      (snapshot) => {
        console.log(`🔄 [Bundles] Content updated for box: ${productBox.id}`)
        fetchContentForBox(productBox)
      },
      (error) => {
        console.error(`❌ [Bundles] Error listening to content for box ${productBox.id}:`, error)
      },
    )

    contentListeners.current[productBox.id] = unsubscribe

    // Initial fetch
    fetchContentForBox(productBox)
  }

  // Fetch content for a specific product box
  const fetchContentForBox = async (productBox: ProductBox) => {
    if (productBox.contentItems.length === 0) {
      setContentItems((prev) => ({ ...prev, [productBox.id]: [] }))
      return
    }

    try {
      setContentLoading((prev) => ({ ...prev, [productBox.id]: true }))

      console.log(`🔍 [Bundles] Fetching content for box: ${productBox.id}`)

      // Method 1: Try productBoxContent collection first
      const contentQuery = query(collection(db, "productBoxContent"), where("productBoxId", "==", productBox.id))
      const contentSnapshot = await getDocs(contentQuery)

      const items: ContentItem[] = []

      if (!contentSnapshot.empty) {
        contentSnapshot.forEach((doc) => {
          const data = doc.data()
          const item: ContentItem = {
            id: doc.id,
            title: data.title || data.filename || "Untitled",
            fileUrl: data.fileUrl || "",
            thumbnailUrl: data.thumbnailUrl || "",
            mimeType: data.mimeType || "application/octet-stream",
            fileSize: data.fileSize || 0,
            contentType: getContentType(data.mimeType || ""),
            duration: data.duration || undefined,
            filename: data.filename || `${doc.id}.file`,
            createdAt: data.createdAt,
          }

          if (item.fileUrl && item.fileUrl.startsWith("http")) {
            items.push(item)
          }
        })
      } else {
        // Method 2: Fallback to uploads collection
        for (const uploadId of productBox.contentItems) {
          try {
            const uploadDoc = await getDocs(query(collection(db, "uploads"), where("__name__", "==", uploadId)))

            if (!uploadDoc.empty) {
              const uploadData = uploadDoc.docs[0].data()
              const item: ContentItem = {
                id: uploadId,
                title: uploadData.title || uploadData.filename || uploadData.originalFileName || "Untitled",
                filename: uploadData.filename || uploadData.title || uploadData.name || "Unknown",
                fileUrl: uploadData.fileUrl,
                thumbnailUrl: uploadData.thumbnailUrl || "",
                mimeType: uploadData.mimeType || uploadData.type || "application/octet-stream",
                fileSize: uploadData.fileSize || uploadData.size || 0,
                contentType: getContentType(uploadData.mimeType || uploadData.type || ""),
                duration: uploadData.duration,
                createdAt: uploadData.createdAt || uploadData.addedAt || uploadData.timestamp,
                type: uploadData.type || uploadData.mimeType?.split("/")[0] || "document",
              }

              if (item.fileUrl && item.fileUrl.startsWith("http")) {
                items.push(item)
              }
            }
          } catch (uploadError) {
            console.error(`❌ [Bundles] Error fetching upload ${uploadId}:`, uploadError)
          }
        }
      }

      // Sort by creation date (newest first)
      items.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0
        const aTime = a.createdAt.seconds || a.createdAt.getTime?.() / 1000 || 0
        const bTime = b.createdAt.seconds || b.createdAt.getTime?.() / 1000 || 0
        return bTime - aTime
      })

      setContentItems((prev) => ({ ...prev, [productBox.id]: items }))
      console.log(`✅ [Bundles] Loaded ${items.length} content items for box ${productBox.id}`)
    } catch (err) {
      console.error(`❌ [Bundles] Error fetching content for box ${productBox.id}:`, err)
      setContentItems((prev) => ({ ...prev, [productBox.id]: [] }))
    } finally {
      setContentLoading((prev) => ({ ...prev, [productBox.id]: false }))
    }
  }

  // Determine content type from MIME type
  const getContentType = (mimeType: string): "video" | "audio" | "image" | "document" => {
    if (mimeType.startsWith("video/")) return "video"
    if (mimeType.startsWith("audio/")) return "audio"
    if (mimeType.startsWith("image/")) return "image"
    return "document"
  }

  // Toggle active status
  const handleToggleActive = async (productBoxId: string) => {
    try {
      const productBox = productBoxes.find((box) => box.id === productBoxId)
      if (!productBox) return

      const newActiveStatus = !productBox.active

      // Update using bundles API
      const idToken = await user?.getIdToken()
      const response = await fetch(`/api/creator/bundles/${productBoxId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          active: newActiveStatus,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update bundle status")
      }

      // Update local state
      setProductBoxes((prev) =>
        prev.map((box) => (box.id === productBoxId ? { ...box, active: newActiveStatus } : box)),
      )

      toast({
        title: "Success",
        description: `Bundle ${newActiveStatus ? "activated" : "deactivated"}`,
      })
    } catch (error) {
      console.error("Error toggling active status:", error)
      toast({
        title: "Error",
        description: "Failed to update bundle status",
        variant: "destructive",
      })
    }
  }

  // Delete product box
  const handleDelete = async (productBoxId: string) => {
    if (!confirm("Are you sure you want to delete this bundle? This action cannot be undone.")) return

    try {
      const idToken = await user?.getIdToken()
      const response = await fetch(`/api/creator/bundles/${productBoxId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to delete bundle")
      }

      // Clean up listener
      if (contentListeners.current[productBoxId]) {
        contentListeners.current[productBoxId]()
        delete contentListeners.current[productBoxId]
      }

      setProductBoxes((prev) => prev.filter((box) => box.id !== productBoxId))
      toast({
        title: "Success",
        description: "Bundle deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting bundle:", error)
      toast({
        title: "Error",
        description: "Failed to delete bundle",
        variant: "destructive",
      })
    }
  }

  // Toggle content visibility
  const toggleContentVisibility = (productBoxId: string) => {
    setShowContent((prev) => ({ ...prev, [productBoxId]: !prev[productBoxId] }))
  }

  // Handle create bundle
  const handleCreateBundle = async () => {
    if (!createForm.title.trim() || !createForm.price) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    try {
      setCreateLoading(true)

      const idToken = await user?.getIdToken()
      if (!idToken) throw new Error("Not authenticated")

      // Create bundle via API first
      const response = await fetch("/api/creator/bundles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          title: createForm.title.trim(),
          description: createForm.description.trim(),
          price: Number.parseFloat(createForm.price),
          currency: "usd",
          type: createForm.billingType,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to create bundle")
      }

      const data = await response.json()
      const bundleId = data.bundleId

      // Upload thumbnail if provided
      if (createForm.thumbnail && bundleId) {
        try {
          const formData = new FormData()
          formData.append("file", createForm.thumbnail)
          formData.append("bundleId", bundleId)

          const uploadResponse = await fetch("/api/upload/bundle-thumbnail", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
            body: formData,
          })

          if (uploadResponse.ok) {
            console.log("✅ [Bundles] Thumbnail uploaded successfully")
          } else {
            console.warn("⚠️ [Bundles] Thumbnail upload failed, but bundle was created")
          }
        } catch (uploadError) {
          console.error("❌ [Bundles] Thumbnail upload error:", uploadError)
          // Don't fail the entire creation for thumbnail upload issues
        }
      }

      toast({
        title: "Success",
        description: data.message || "Bundle created successfully",
      })

      // Reset form and close modal
      setCreateForm({
        title: "",
        description: "",
        price: "",
        billingType: "one_time",
        thumbnail: null,
      })
      setShowCreateModal(false)

      // Refresh bundles to show the new one
      await fetchProductBoxes()
    } catch (error) {
      console.error("Error creating bundle:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create bundle",
        variant: "destructive",
      })
    } finally {
      setCreateLoading(false)
    }
  }

  // Handle thumbnail upload for edit modal
  const handleThumbnailUpload = async (file: File, bundleId: string) => {
    try {
      setThumbnailUploading(true)

      const token = await user?.getIdToken()
      const formData = new FormData()
      formData.append("file", file)
      formData.append("bundleId", bundleId)

      const response = await fetch("/api/upload/bundle-thumbnail", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to upload thumbnail")
      }

      const data = await response.json()
      setEditForm((prev) => ({
        ...prev,
        coverImage: data.url,
      }))

      toast({
        title: "Success",
        description: "Thumbnail uploaded successfully",
      })
    } catch (error) {
      console.error("Error uploading thumbnail:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload thumbnail",
        variant: "destructive",
      })
    } finally {
      setThumbnailUploading(false)
    }
  }

  // Handle edit bundle with Stripe price update
  const handleEditBundle = async (productBoxId: string) => {
    if (!editForm.title.trim() || !editForm.price) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    try {
      setEditLoading(true)

      const currentBundle = productBoxes.find((box) => box.id === productBoxId)
      const priceChanged = currentBundle && Number.parseFloat(editForm.price) !== currentBundle.price

      const idToken = await user?.getIdToken()
      const response = await fetch(`/api/creator/bundles/${productBoxId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          title: editForm.title.trim(),
          description: editForm.description.trim(),
          price: Number.parseFloat(editForm.price),
          coverImage: editForm.coverImage || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to update bundle")
      }

      const data = await response.json()

      // Update local state
      setProductBoxes((prev) =>
        prev.map((box) =>
          box.id === productBoxId
            ? {
                ...box,
                title: editForm.title.trim(),
                description: editForm.description.trim(),
                price: Number.parseFloat(editForm.price),
                coverImage: editForm.coverImage || box.coverImage,
              }
            : box,
        ),
      )

      toast({
        title: "Success",
        description: priceChanged
          ? "Bundle updated successfully. Stripe price will be updated automatically."
          : "Bundle updated successfully",
      })

      setShowEditModal(null)
    } catch (error) {
      console.error("Error updating bundle:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update bundle",
        variant: "destructive",
      })
    } finally {
      setEditLoading(false)
    }
  }

  // Open edit modal with pre-filled data
  const openEditModal = (productBox: ProductBox) => {
    setEditForm({
      title: productBox.title,
      description: productBox.description,
      price: productBox.price.toString(),
      coverImage: productBox.coverImage || "",
    })
    setShowEditModal(productBox.id)
  }

  // Fetch user's uploads
  const fetchUserUploads = async () => {
    if (!user) return

    try {
      setUploadsLoading(true)
      console.log("🔍 [Bundles] Fetching user uploads...")

      const token = await user.getIdToken()

      // Try the creator uploads API first
      let response = await fetch("/api/creator/uploads", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      let data
      if (response.ok) {
        data = await response.json()
        console.log("✅ [Bundles] Creator uploads API Response:", data)
      } else {
        // Fallback to uploads API
        console.log("⚠️ [Bundles] Creator uploads failed, trying uploads API")
        response = await fetch("/api/uploads", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        if (response.ok) {
          data = await response.json()
          console.log("✅ [Bundles] Uploads API Response:", data)
        } else {
          throw new Error(`HTTP ${response.status}: Failed to fetch uploads`)
        }
      }

      const uploadsData = Array.isArray(data.uploads)
        ? data.uploads
        : Array.isArray(data.videos)
          ? data.videos
          : Array.isArray(data)
            ? data
            : []

      console.log("📊 [Bundles] Raw uploads data:", uploadsData)

      // Filter uploads with valid URLs and convert to ContentItem format
      const availableUploads = uploadsData
        .filter((upload) => {
          const hasValidUrl = upload.fileUrl && upload.fileUrl.startsWith("http")
          console.log(`🔍 [Bundles] Upload ${upload.id}: hasValidUrl=${hasValidUrl}`)
          return hasValidUrl
        })
        .map((upload) => ({
          id: upload.id,
          title: upload.title || upload.filename || upload.name || "Untitled",
          filename: upload.filename || upload.title || upload.name || "Unknown",
          fileUrl: upload.fileUrl,
          thumbnailUrl: upload.thumbnailUrl || "",
          mimeType: upload.mimeType || upload.type || "application/octet-stream",
          fileSize: upload.fileSize || upload.size || 0,
          contentType: getContentType(upload.mimeType || upload.type || ""),
          duration: upload.duration,
          createdAt: upload.createdAt || upload.addedAt || upload.timestamp,
          type: upload.type || upload.mimeType?.split("/")[0] || "document",
        }))

      setAvailableUploads(availableUploads)
      console.log(`✅ [Bundles] Loaded ${availableUploads.length} available uploads`)
    } catch (error) {
      console.error("❌ [Bundles] Error fetching uploads:", error)
      toast({
        title: "Error",
        description: "Failed to load uploads",
        variant: "destructive",
      })
    } finally {
      setUploadsLoading(false)
    }
  }

  // Handle adding content to bundle with detailed metadata storage - ENHANCED VERSION
  const handleAddContentToBundle = async (productBoxId: string) => {
    if (selectedContentIds.length === 0) {
      toast({
        title: "No Content Selected",
        description: "Please select at least one content item to add",
        variant: "destructive",
      })
      return
    }

    try {
      setAddContentLoading(true)

      console.log(`🔄 [Bundle Content] Adding ${selectedContentIds.length} items to bundle ${productBoxId}`)

      // Get detailed metadata for each selected content item
      const detailedContentItems: any[] = []
      let totalSize = 0
      let totalDuration = 0

      for (const contentId of selectedContentIds) {
        const contentItem = availableUploads.find((item) => item.id === contentId)
        if (!contentItem) continue

        // Create comprehensive metadata object
        const detailedItem = {
          id: contentId,
          title: contentItem.title,
          filename: contentItem.filename,
          fileUrl: contentItem.fileUrl,
          publicUrl: contentItem.fileUrl, // Assuming fileUrl is the public URL
          downloadUrl: contentItem.fileUrl,
          thumbnailUrl: contentItem.thumbnailUrl || "",
          previewUrl: contentItem.thumbnailUrl || "",

          // File metadata
          mimeType: contentItem.mimeType,
          fileType: contentItem.mimeType,
          fileSize: contentItem.fileSize,
          fileSizeFormatted: formatFileSize(contentItem.fileSize),

          // Video/Audio specific
          duration: contentItem.duration || 0,
          durationFormatted: contentItem.duration ? formatDuration(contentItem.duration) : "0:00",
          contentType: contentItem.contentType,

          // Upload metadata
          uploadedAt: new Date(),
          createdAt: new Date(),
          creatorId: user?.uid || "",

          // Additional metadata
          description: "",
          isPublic: true,
          downloadCount: 0,
          viewCount: 0,
          tags: [],

          // Quality indicators
          quality: "HD", // Default, could be determined from resolution
          format: contentItem.mimeType.split("/")[1] || "unknown",
        }

        detailedContentItems.push(detailedItem)
        totalSize += contentItem.fileSize
        totalDuration += contentItem.duration || 0

        // Create productBoxContent entry for backward compatibility
        await addDoc(collection(db, "productBoxContent"), {
          productBoxId,
          uploadId: contentId,
          title: contentItem.title,
          fileUrl: contentItem.fileUrl,
          thumbnailUrl: contentItem.thumbnailUrl || "",
          mimeType: contentItem.mimeType,
          fileSize: contentItem.fileSize,
          filename: contentItem.filename,
          createdAt: new Date(),
        })
      }

      // Get current bundle data
      const currentBox = productBoxes.find((box) => box.id === productBoxId)
      if (currentBox) {
        const updatedContentItems = [...currentBox.contentItems, ...selectedContentIds]

        // Calculate enhanced metadata for ALL content (existing + new)
        const allDetailedItems = [...(currentBox.detailedContentItems || []), ...detailedContentItems]
        const allTotalDuration = allDetailedItems.reduce((sum, item) => sum + (item.duration || 0), 0)
        const allTotalSize = allDetailedItems.reduce((sum, item) => sum + (item.fileSize || 0), 0)
        const videoCount = allDetailedItems.filter((item) => item.contentType === "video").length
        const audioCount = allDetailedItems.filter((item) => item.contentType === "audio").length
        const imageCount = allDetailedItems.filter((item) => item.contentType === "image").length
        const documentCount = allDetailedItems.filter((item) => item.contentType === "document").length

        // Update bundle with comprehensive metadata - THIS IS THE KEY FIX
        await updateDoc(doc(db, "bundles", productBoxId), {
          contentItems: updatedContentItems,
          detailedContentItems: allDetailedItems,
          contentMetadata: {
            totalItems: allDetailedItems.length,
            totalDuration: allTotalDuration,
            totalDurationFormatted: formatDuration(allTotalDuration),
            totalSize: allTotalSize,
            totalSizeFormatted: formatFileSize(allTotalSize),
            contentBreakdown: {
              videos: videoCount,
              audio: audioCount,
              images: imageCount,
              documents: documentCount,
            },
            averageDuration: allDetailedItems.length > 0 ? allTotalDuration / allDetailedItems.length : 0,
            averageSize: allDetailedItems.length > 0 ? allTotalSize / allDetailedItems.length : 0,
            resolutions: [...new Set(allDetailedItems.map((item) => item.resolution).filter(Boolean))],
            formats: [...new Set(allDetailedItems.map((item) => item.format).filter(Boolean))],
            qualities: [...new Set(allDetailedItems.map((item) => item.quality).filter(Boolean))],
          },
          contentTitles: allDetailedItems.map((item) => item.title),
          contentDescriptions: allDetailedItems.map((item) => item.description || "").filter(Boolean),
          contentTags: [...new Set(allDetailedItems.flatMap((item) => item.tags || []))],
          updatedAt: new Date(),
        })

        console.log(`✅ [Bundle Content] Enhanced metadata stored for bundle ${productBoxId}:`, {
          totalItems: allDetailedItems.length,
          totalDuration: formatDuration(allTotalDuration),
          totalSize: formatFileSize(allTotalSize),
          contentBreakdown: { videos: videoCount, audio: audioCount, images: imageCount, documents: documentCount },
        })
      }

      toast({
        title: "Success",
        description: `Added ${selectedContentIds.length} content item${selectedContentIds.length !== 1 ? "s" : ""} to bundle with detailed metadata`,
      })

      setShowAddContentModal(null)
      setSelectedContentIds([])
      fetchProductBoxes() // Refresh bundles to show updated metadata
    } catch (error) {
      console.error("Error adding content to bundle:", error)
      toast({
        title: "Error",
        description: "Failed to add content to bundle",
        variant: "destructive",
      })
    } finally {
      setAddContentLoading(false)
    }
  }

  // Remove content from bundle - Enhanced for permanent deletion
  const handleRemoveContentFromBundle = async (productBoxId: string, contentId: string) => {
    if (!confirm("Remove this content from the bundle?")) return

    try {
      console.log(`🔍 [Bundles] Removing content ${contentId} from bundle ${productBoxId}`)

      // Step 1: Remove from productBoxContent collection using both contentId and uploadId
      const contentQuery1 = query(
        collection(db, "productBoxContent"),
        where("productBoxId", "==", productBoxId),
        where("uploadId", "==", contentId),
      )
      const contentQuery2 = query(collection(db, "productBoxContent"), where("productBoxId", "==", productBoxId))

      const [contentSnapshot1, contentSnapshot2] = await Promise.all([getDocs(contentQuery1), getDocs(contentQuery2)])

      // Delete all matching documents
      const deletePromises: Promise<void>[] = []

      contentSnapshot1.docs.forEach((docSnapshot) => {
        deletePromises.push(deleteDoc(docSnapshot.ref))
      })

      // Also check for documents where the document ID matches the contentId
      contentSnapshot2.docs.forEach((docSnapshot) => {
        const data = docSnapshot.data()
        if (docSnapshot.id === contentId || data.uploadId === contentId) {
          deletePromises.push(deleteDoc(docSnapshot.ref))
        }
      })

      await Promise.all(deletePromises)
      console.log(`✅ [Bundles] Removed ${deletePromises.length} productBoxContent entries`)

      // Step 2: Update bundle contentItems array and recalculate metadata
      const currentBox = productBoxes.find((box) => box.id === productBoxId)
      if (currentBox) {
        const updatedContentItems = currentBox.contentItems.filter((id) => id !== contentId)

        // Recalculate metadata for remaining content
        const remainingDetailedItems = (currentBox.detailedContentItems || []).filter(
          (item: any) => item.id !== contentId,
        )
        const totalDuration = remainingDetailedItems.reduce((sum: number, item: any) => sum + (item.duration || 0), 0)
        const totalSize = remainingDetailedItems.reduce((sum: number, item: any) => sum + (item.fileSize || 0), 0)
        const videoCount = remainingDetailedItems.filter((item: any) => item.contentType === "video").length
        const audioCount = remainingDetailedItems.filter((item: any) => item.contentType === "audio").length
        const imageCount = remainingDetailedItems.filter((item: any) => item.contentType === "image").length
        const documentCount = remainingDetailedItems.filter((item: any) => item.contentType === "document").length

        // Update bundles collection with recalculated metadata
        await updateDoc(doc(db, "bundles", productBoxId), {
          contentItems: updatedContentItems,
          detailedContentItems: remainingDetailedItems,
          contentMetadata: {
            totalItems: remainingDetailedItems.length,
            totalDuration: totalDuration,
            totalDurationFormatted: formatDuration(totalDuration),
            totalSize: totalSize,
            totalSizeFormatted: formatFileSize(totalSize),
            contentBreakdown: {
              videos: videoCount,
              audio: audioCount,
              images: imageCount,
              documents: documentCount,
            },
            averageDuration: remainingDetailedItems.length > 0 ? totalDuration / remainingDetailedItems.length : 0,
            averageSize: remainingDetailedItems.length > 0 ? totalSize / remainingDetailedItems.length : 0,
            resolutions: [...new Set(remainingDetailedItems.map((item: any) => item.resolution).filter(Boolean))],
            formats: [...new Set(remainingDetailedItems.map((item: any) => item.format).filter(Boolean))],
            qualities: [...new Set(remainingDetailedItems.map((item: any) => item.quality).filter(Boolean))],
          },
          contentTitles: remainingDetailedItems.map((item: any) => item.title),
          contentDescriptions: remainingDetailedItems.map((item: any) => item.description || "").filter(Boolean),
          contentTags: [...new Set(remainingDetailedItems.flatMap((item: any) => item.tags || []))],
          updatedAt: new Date(),
        })

        // Step 3: Update local state immediately for instant UI feedback
        setProductBoxes((prev) =>
          prev.map((box) => (box.id === productBoxId ? { ...box, contentItems: updatedContentItems } : box)),
        )

        // Step 4: Update content items state to remove from UI
        setContentItems((prev) => ({
          ...prev,
          [productBoxId]: prev[productBoxId]?.filter((item) => item.id !== contentId) || [],
        }))

        console.log(`✅ [Bundles] Successfully removed content ${contentId} from bundle ${productBoxId}`)
      }

      toast({
        title: "Success",
        description: "Content removed from bundle",
      })

      // Force refresh the bundle data to ensure persistence
      await fetchProductBoxes()
    } catch (error) {
      console.error("❌ [Bundles] Error removing content from bundle:", error)
      toast({
        title: "Error",
        description: "Failed to remove content from bundle",
        variant: "destructive",
      })
    }
  }

  // Clean up listeners on unmount
  useEffect(() => {
    return () => {
      Object.values(contentListeners.current).forEach((unsubscribe) => unsubscribe())
    }
  }, [])

  useEffect(() => {
    if (user) {
      fetchProductBoxes()
    }
  }, [user])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-zinc-500 animate-spin" />
        <span className="ml-3 text-zinc-400">Loading bundles...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-medium text-white mb-2">Failed to Load Bundles</h3>
        <p className="text-zinc-400 mb-4">{error}</p>
        <Button
          onClick={() => setError(null)}
          variant="outline"
          className="border-zinc-700 hover:bg-zinc-800 bg-transparent"
        >
          Try Again
        </Button>
      </div>
    )
  }

  const bundles = MOCK_BUNDLES // ← swap with DB/API call later

  return (
    <section className="container mx-auto max-w-5xl px-4 py-10">
      <header className="flex items-center gap-3 mb-8">
        <Package className="h-6 w-6 text-zinc-500" />
        <h1 className="text-2xl font-semibold tracking-tight text-white">Bundles</h1>
      </header>

      <Separator className="mb-8" />

      {bundles.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-zinc-500 mx-auto mb-4" />
          <p className="text-sm text-zinc-400">You haven't created or purchased any bundles yet.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {bundles.map((bundle) => (
            <Card key={bundle.id} className="flex flex-col bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="line-clamp-1 text-white">{bundle.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 flex-1">
                <p className="text-sm text-zinc-400 line-clamp-3">{bundle.description ?? "No description provided."}</p>
                <p className="mt-auto text-xs text-zinc-500">Created on {bundle.createdAt}</p>
                <Button variant="secondary" size="sm" className="w-full">
                  View details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}
