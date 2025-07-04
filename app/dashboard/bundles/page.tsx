"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Package, DollarSign, Users, AlertCircle, RefreshCw } from "lucide-react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { BundleCreationForm } from "@/components/bundle-creation-form"

import { useRef } from "react"
import { useToast } from "@/hooks/use-toast"
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, onSnapshot, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

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

interface Bundle {
  id: string
  title: string
  description: string
  price: number
  currency: string
  type: string
  active: boolean
  contentItems: any[]
  createdAt: any
  updatedAt: any
  productId?: string
  priceId?: string
}

export default function BundlesPage() {
  const [bundles, setBundles] = useState<Bundle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const { user, loading: authLoading } = useFirebaseAuth()
  const router = useRouter()

  const [productBoxes, setProductBoxes] = useState<ProductBox[]>([])
  const [contentItems, setContentItems] = useState<{ [key: string]: ContentItem[] }>({})
  const [contentLoading, setContentLoading] = useState<{ [key: string]: boolean }>({})
  const [showContent, setShowContent] = useState<{ [key: string]: boolean }>({})
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

  const fetchBundles = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      const token = await user.getIdToken()
      const response = await fetch("/api/creator/bundles", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success) {
        setBundles(data.bundles || [])
      } else {
        throw new Error(data.error || "Failed to fetch bundles")
      }
    } catch (err) {
      console.error("Error fetching bundles:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch bundles")
    } finally {
      setLoading(false)
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
                fileUrl: uploadData.fileUrl || uploadData.publicUrl || uploadData.downloadUrl || "",
                thumbnailUrl: uploadData.thumbnailUrl || "",
                mimeType: uploadData.mimeType || uploadData.fileType || "application/octet-stream",
                fileSize: uploadData.fileSize || uploadData.size || 0,
                contentType: getContentType(uploadData.mimeType || uploadData.fileType || ""),
                duration: uploadData.duration || undefined,
                filename: uploadData.filename || uploadData.originalFileName || `${uploadId}.file`,
                createdAt: uploadData.createdAt || uploadData.uploadedAt,
                type: uploadData.type,
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

  const handleCreateBundle2 = async (bundleData: any) => {
    if (!user) return

    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/creator/bundles", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bundleData),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setShowCreateForm(false)
        await fetchBundles() // Refresh the list
        return { success: true }
      } else {
        throw new Error(data.message || data.error || "Failed to create bundle")
      }
    } catch (err) {
      console.error("Error creating bundle:", err)
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to create bundle",
      }
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

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
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

  // Handle adding content to bundle
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

      // Add each selected content item to the product box
      for (const contentId of selectedContentIds) {
        const contentItem = availableUploads.find((item) => item.id === contentId)
        if (!contentItem) continue

        // Create productBoxContent entry
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

      // Update product box contentItems array using bundles collection
      const currentBox = productBoxes.find((box) => box.id === productBoxId)
      if (currentBox) {
        const updatedContentItems = [...currentBox.contentItems, ...selectedContentIds]
        await updateDoc(doc(db, "bundles", productBoxId), {
          contentItems: updatedContentItems,
          updatedAt: new Date(),
        })
      }

      toast({
        title: "Success",
        description: `Added ${selectedContentIds.length} content item${selectedContentIds.length !== 1 ? "s" : ""} to bundle`,
      })

      setShowAddContentModal(null)
      setSelectedContentIds([])
      fetchProductBoxes() // Refresh bundles
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

      // Step 1: Remove from productBoxContent collection
      const contentQuery = query(
        collection(db, "productBoxContent"),
        where("productBoxId", "==", productBoxId),
        where("uploadId", "==", contentId),
      )
      const contentSnapshot = await getDocs(contentQuery)

      const deletePromises = contentSnapshot.docs.map((docSnapshot) => deleteDoc(docSnapshot.ref))
      await Promise.all(deletePromises)

      console.log(`✅ [Bundles] Removed ${deletePromises.length} productBoxContent entries`)

      // Step 2: Update bundle contentItems array in both possible collections
      const currentBox = productBoxes.find((box) => box.id === productBoxId)
      if (currentBox) {
        const updatedContentItems = currentBox.contentItems.filter((id) => id !== contentId)

        // Try both collections to ensure permanent removal
        const updatePromises = []

        // Update bundles collection
        try {
          updatePromises.push(
            updateDoc(doc(db, "bundles", productBoxId), {
              contentItems: updatedContentItems,
              updatedAt: new Date(),
            }),
          )
        } catch (bundlesError) {
          console.log("⚠️ [Bundles] Bundles collection not found, skipping")
        }

        // Update productBoxes collection as fallback
        try {
          updatePromises.push(
            updateDoc(doc(db, "productBoxes", productBoxId), {
              contentItems: updatedContentItems,
              updatedAt: new Date(),
            }),
          )
        } catch (productBoxesError) {
          console.log("⚠️ [Bundles] ProductBoxes collection not found, skipping")
        }

        // Wait for all updates to complete
        await Promise.allSettled(updatePromises)

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
    if (!authLoading && user) {
      fetchBundles()
    } else if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to login
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Content Bundles</h1>
            <p className="text-muted-foreground">Create and manage your premium content bundles</p>
          </div>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Bundle
          </Button>
        </div>

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={fetchBundles} className="ml-4 bg-transparent">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {loading && !error && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && bundles.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No bundles yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first content bundle to start selling premium content
              </p>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Bundle
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Bundles Grid */}
        {!loading && !error && bundles.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {bundles.map((bundle) => (
              <Card key={bundle.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="line-clamp-2">{bundle.title}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {bundle.description || "No description provided"}
                      </CardDescription>
                    </div>
                    <Badge variant={bundle.active ? "default" : "secondary"}>
                      {bundle.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">
                          ${bundle.price.toFixed(2)} {bundle.currency.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{bundle.contentItems?.length || 0} items</span>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                        View
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Bundle Form Modal */}
        {showCreateForm && (
          <BundleCreationForm onSubmit={handleCreateBundle2} onCancel={() => setShowCreateForm(false)} />
        )}
      </div>
    </div>
  )
}
