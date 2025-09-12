"use client"

import { useRef } from "react"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Edit, Eye, EyeOff, Loader2, AlertCircle, Upload, X, Check, Trash2, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import { useUserPlan } from "@/hooks/use-user-plan"
import { useRouter } from "next/navigation"
import { useFreeTierLimits } from "@/hooks/use-free-tier-limits"

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
  detailedContentItems?: ContentItem[]
}

interface CreateBundleForm {
  title: string
  description: string
  price: string
  comparePrice: string
  billingType: "one_time" | "subscription"
  thumbnail: File | null
}

interface EditBundleForm {
  title: string
  description: string
  price: string
  comparePrice: string
  coverImage: string
}

const CONTENT_LIMIT_FREE = 5

export default function BundlesPage() {
  const { user } = useAuth()
  const [productBoxes, setProductBoxes] = useState<ProductBox[]>([])
  const [contentItems, setContentItems] = useState<{ [key: string]: ContentItem[] }>({})
  const [loading, setLoading] = useState(true)
  const [contentLoading, setContentLoading] = useState<{ [key: string]: boolean }>({})
  const [showContent, setShowContent] = useState<{ [key: string]: boolean }>({})
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    price: "",
    comparePrice: "",
    billingType: "one_time" as "one_time" | "subscription",
    thumbnail: null as File | null,
  })
  const { toast, toast: customToast } = useToast()
  const router = useRouter()

  const { limits: freeTierLimits, loading: limitsLoading } = useFreeTierLimits()
  const { planData, isProUser } = useUserPlan()

  const bundleLimit = isProUser ? Number.POSITIVE_INFINITY : freeTierLimits?.bundlesLimit || 2
  const isAtBundleLimit = !isProUser && productBoxes.length >= bundleLimit

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
    comparePrice: "",
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
        let errorData
        try {
          errorData = await response.json()
        } catch {
          // If we can't parse the response, assume it's a Stripe connection issue for 400 errors
          if (response.status === 400) {
            customToast({
              variant: "gradient",
              title: "Stripe Account Required",
              description: "You need to connect your Stripe account to sell bundles and receive payments.",
              action: (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10 bg-transparent"
                  onClick={() => router.push("/dashboard/earnings")}
                >
                  Connect Stripe
                </Button>
              ),
            })
            return
          }
          throw new Error("Failed to create bundle")
        }

        // Handle specific Stripe-related errors with gradient toast
        if (errorData.code === "NO_STRIPE_ACCOUNT" || response.status === 400) {
          customToast({
            variant: "gradient",
            title: "Stripe Account Required",
            description: "You need to connect your Stripe account to sell bundles and receive payments.",
            action: (
              <Button
                size="sm"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 bg-transparent"
                onClick={() => router.push("/dashboard/earnings")}
              >
                Connect Stripe
              </Button>
            ),
          })
          return
        }

        if (errorData.code === "STRIPE_ACCOUNT_INCOMPLETE") {
          customToast({
            variant: "gradient",
            title: "Complete Stripe Setup",
            description: "Your Stripe account setup is incomplete. Please finish the setup process to start selling.",
            action: (
              <Button
                size="sm"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 bg-transparent"
                onClick={() => router.push("/dashboard/earnings")}
              >
                Complete Setup
              </Button>
            ),
          })
          return
        }

        // For other errors, use gradient toast as well
        customToast({
          variant: "gradient",
          title: "Bundle Creation Failed",
          description: errorData.error || errorData.message || "Unable to create bundle. Please try again.",
        })
        return
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
        comparePrice: "",
        billingType: "one_time",
        thumbnail: null,
      })
      setShowCreateModal(false)

      // Refresh bundles to show the new one
      await fetchProductBoxes()
    } catch (error) {
      console.error("Error creating bundle:", error)
      customToast({
        variant: "gradient",
        title: "Connection Error",
        description: "Unable to connect to the server. Please check your connection and try again.",
      })
    } finally {
      setCreateLoading(false)
    }
  }

  // Handle thumbnail upload for edit modal
  const handleThumbnailUpload = async (file: File, bundleId: string) => {
    try {
      setThumbnailUploading(true)

      console.log(`🖼️ [Bundles] Starting thumbnail upload for bundle: ${bundleId}`)
      console.log(`📁 [Bundles] File details:`, {
        name: file.name,
        size: file.size,
        type: file.type,
      })

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

      console.log(`✅ [Bundles] Thumbnail upload successful:`, {
        url: data.url,
        fileName: data.fileName,
        bundleId: data.bundleId,
      })

      setEditForm((prev) => ({
        ...prev,
        coverImage: data.url,
      }))

      // Update local state immediately to show the new thumbnail
      setProductBoxes((prev) =>
        prev.map((box) =>
          box.id === bundleId
            ? {
                ...box,
                coverImage: data.url,
                customPreviewThumbnail: data.url,
                coverImageUrl: data.url,
              }
            : box,
        ),
      )

      toast({
        title: "Success",
        description: "Thumbnail uploaded and saved successfully",
      })
    } catch (error) {
      console.error("❌ [Bundles] Error uploading thumbnail:", error)
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
      comparePrice: productBox.comparePrice ? productBox.comparePrice.toString() : "",
      coverImage: productBox.coverImage || "",
    })
    setShowEditModal(productBox.id)
  }

  // Format file size
  // const formatFileSize = (bytes: number): string => {
  //   if (bytes === 0) return "0 Bytes"
  //   const k = 1024
  //   const sizes = ["Bytes", "KB", "MB", "GB"]
  //   const i = Math.floor(Math.log(bytes) / Math.log(k))
  //   return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  // }

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
  async function handleAddContentToBundle(productBoxId: string) {
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

      // Always enforce on the server to ensure correct tier limits
      const idToken = await user?.getIdToken()
      if (!idToken) {
        throw new Error("Not authenticated")
      }

      // Call the server API to add content with limit enforcement
      const response = await fetch(`/api/creator/bundles/${productBoxId}/add-content`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          contentIds: selectedContentIds,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        const message =
          (data && (data.error || data.message)) ||
          (response.status === 400
            ? "Bundle limit reached or invalid request"
            : `Failed with status ${response.status}`)
        throw new Error(message)
      }

      // Server returns { success, added, skipped, maxPerBundle, remainingBefore }
      const added = typeof data.added === "number" ? data.added : 0
      const skipped = typeof data.skipped === "number" ? data.skipped : 0

      toast({
        title: "Success",
        description:
          skipped > 0
            ? `Added ${added} item${added !== 1 ? "s" : ""}. Skipped ${skipped} due to bundle limit.`
            : `Added ${added} item${added !== 1 ? "s" : ""} to bundle`,
      })

      // Reset selection and close modal, then refresh bundles to reflect changes
      setShowAddContentModal(null)
      setSelectedContentIds([])
      await fetchProductBoxes()
    } catch (error) {
      console.error("❌ [Bundles] Error adding content (server):", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add content to bundle",
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
          onClick={fetchProductBoxes}
          variant="outline"
          className="border-zinc-700 hover:bg-zinc-800 bg-transparent"
        >
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-light text-white mb-2">
            Bundles{" "}
            <span className="text-zinc-500 text-lg font-normal">
              {productBoxes.length}/{isProUser ? "∞" : bundleLimit}
            </span>
          </h1>
          <p className="text-zinc-400 text-sm">Create and manage premium content packages for your audience</p>
        </div>

        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className={`border-white/20 text-white hover:bg-white/5 hover:border-white/40 transition-all duration-200 ${
                isAtBundleLimit ? "opacity-60 cursor-not-allowed" : ""
              }`}
              disabled={isAtBundleLimit}
              onClick={() => {
                if (isAtBundleLimit) {
                  toast({
                    title: "Bundle Limit Reached",
                    description: "Free users can create up to 2 bundles. Upgrade to Creator Pro for unlimited bundles.",
                    variant: "destructive",
                  })
                  return
                }
                setShowCreateModal(true)
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Bundle
              {isAtBundleLimit && " (Limit Reached)"}
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
            <DialogHeader>
              <DialogTitle>Create New Bundle</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={createForm.title}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter bundle title"
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={createForm.description}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your bundle"
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>

              <div>
                <Label htmlFor="price">Price (USD) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0.50"
                  value={createForm.price}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, price: e.target.value }))}
                  placeholder="9.99"
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>

              <div>
                <Label htmlFor="comparePrice">Compare At Price (USD)</Label>
                <Input
                  id="comparePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={createForm.comparePrice}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, comparePrice: e.target.value }))}
                  placeholder="19.99"
                  className="bg-zinc-800 border-zinc-700"
                />
                <p className="text-xs text-zinc-400 mt-1">
                  Optional: Show customers how much they save compared to the original price
                </p>
                {createForm.comparePrice &&
                  createForm.price &&
                  Number.parseFloat(createForm.comparePrice) > Number.parseFloat(createForm.price) && (
                    <div className="mt-2 p-2 bg-green-900/20 border border-green-700/50 rounded-md">
                      <p className="text-xs text-green-200">
                        Customers will save $
                        {(Number.parseFloat(createForm.comparePrice) - Number.parseFloat(createForm.price)).toFixed(2)}(
                        {Math.round(
                          ((Number.parseFloat(createForm.comparePrice) - Number.parseFloat(createForm.price)) /
                            Number.parseFloat(createForm.comparePrice)) *
                            100,
                        )}
                        % off)
                      </p>
                    </div>
                  )}
                {createForm.comparePrice &&
                  createForm.price &&
                  Number.parseFloat(createForm.comparePrice) <= Number.parseFloat(createForm.price) && (
                    <div className="mt-2 p-2 bg-amber-900/20 border border-amber-700/50 rounded-md">
                      <p className="text-xs text-amber-200">
                        Compare price should be higher than the regular price to show savings
                      </p>
                    </div>
                  )}
              </div>

              {/* Enhanced Thumbnail Section */}
              <div className="space-y-4">
                <Label>Bundle Thumbnail (Optional)</Label>

                {/* Thumbnail Preview */}
                {createForm.thumbnail && (
                  <div className="relative">
                    <div className="aspect-square w-32 h-32 rounded-lg overflow-hidden border border-zinc-700">
                      <img
                        src={URL.createObjectURL(createForm.thumbnail) || "/placeholder.svg"}
                        alt="Thumbnail preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setCreateForm((prev) => ({ ...prev, thumbnail: null }))}
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-600 hover:bg-red-700 text-white p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    <p className="text-xs text-zinc-400 mt-2">{createForm.thumbnail.name}</p>
                  </div>
                )}

                {/* Upload Area */}
                {!createForm.thumbnail && (
                  <div
                    className="border-2 border-dashed border-zinc-700 rounded-lg p-8 text-center hover:border-zinc-600 transition-colors cursor-pointer"
                    onClick={() => document.getElementById("thumbnail-upload")?.click()}
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.currentTarget.classList.add("border-zinc-500")
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault()
                      e.currentTarget.classList.remove("border-zinc-500")
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      e.currentTarget.classList.remove("border-zinc-500")
                      const files = e.dataTransfer.files
                      if (files.length > 0) {
                        const file = files[0]
                        if (file.type.startsWith("image/")) {
                          setCreateForm((prev) => ({ ...prev, thumbnail: file }))
                        }
                      }
                    }}
                  >
                    <div className="space-y-3">
                      <div className="w-16 h-16 mx-auto bg-zinc-800 rounded-lg flex items-center justify-center">
                        <Upload className="h-8 w-8 text-zinc-500" />
                      </div>
                      <div>
                        <p className="text-sm text-zinc-300 font-medium">Upload bundle thumbnail</p>
                        <p className="text-xs text-zinc-500 mt-1">Drag and drop an image here, or click to browse</p>
                      </div>
                      <div className="text-xs text-zinc-600">
                        Supports: JPEG, PNG, WebP • Max size: 5MB • Recommended: 400x400px
                      </div>
                    </div>
                  </div>
                )}

                {/* Hidden File Input */}
                <input
                  id="thumbnail-upload"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      // Validate file type
                      const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
                      if (!allowedTypes.includes(file.type)) {
                        toast({
                          title: "Invalid File Type",
                          description: "Please select a JPEG, PNG, or WebP image",
                          variant: "destructive",
                        })
                        return
                      }

                      // Validate file size (5MB max)
                      const maxSize = 5 * 1024 * 1024
                      if (file.size > maxSize) {
                        toast({
                          title: "File Too Large",
                          description: "Please select an image smaller than 5MB",
                          variant: "destructive",
                        })
                        return
                      }

                      setCreateForm((prev) => ({ ...prev, thumbnail: file }))
                    }
                  }}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowCreateModal(false)} className="border-zinc-700">
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateBundle}
                  disabled={createLoading}
                  className="bg-white text-black hover:bg-zinc-200"
                >
                  {createLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Bundle"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Product Boxes */}
      {productBoxes.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-xl font-medium text-white mb-2">No Bundles Yet</h3>
          <p className="text-zinc-400 mb-4">Create your first premium content bundle to get started</p>
          <Button
            className="bg-red-600 hover:bg-red-700"
            disabled={isAtBundleLimit}
            onClick={() => {
              if (isAtBundleLimit) {
                toast({
                  title: "Bundle Limit Reached",
                  description: "Free users can create up to 2 bundles. Upgrade to Creator Pro for unlimited bundles.",
                  variant: "destructive",
                })
                return
              }
              setShowCreateModal(true)
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Bundle
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {productBoxes.map((productBox, index) => {
            const boxContent = contentItems[productBox.id] || []
            const isContentLoading = contentLoading[productBox.id] || false
            const isContentVisible = showContent[productBox.id] || false

            return (
              <motion.div
                key={productBox.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card className="bg-black border-zinc-800 overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
                  <CardHeader className="relative z-10">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-xl text-white">{productBox.title}</CardTitle>
                          <Badge
                            variant={productBox.active ? "default" : "secondary"}
                            className={
                              productBox.active
                                ? "bg-white text-black hover:bg-zinc-200"
                                : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                            }
                          >
                            {productBox.active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="text-zinc-400 mb-3">{productBox.description}</p>
                        <div className="flex items-center gap-4">
                          <span className="text-2xl font-light text-white">${productBox.price.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    {/* Content Section Header */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-zinc-400">Content ({boxContent.length})</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleContentVisibility(productBox.id)}
                        className="text-xs text-zinc-400 hover:text-white hover:bg-zinc-800"
                      >
                        {isContentVisible ? (
                          <>
                            <EyeOff className="h-3 w-3 mr-1" />
                            Hide
                          </>
                        ) : (
                          <>
                            <Eye className="h-3 w-3 mr-1" />
                            Show Content
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Content Grid */}
                    <AnimatePresence>
                      {isContentVisible && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="space-y-4"
                        >
                          {isContentLoading ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="h-5 w-5 text-zinc-500 animate-spin" />
                              <span className="ml-2 text-sm text-zinc-400">Loading content...</span>
                            </div>
                          ) : boxContent.length > 0 ? (
                            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                              {boxContent.map((item) => (
                                <div key={item.id} className="group relative">
                                  <div className="relative aspect-[9/16] bg-zinc-900 rounded-lg overflow-hidden shadow-md border border-transparent hover:border-white/20 transition-all duration-300">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleRemoveContentFromBundle(productBox.id, item.id)
                                      }}
                                      className="absolute top-2 right-2 z-30 w-6 h-6 bg-black/80 hover:bg-black rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg"
                                      title="Remove from bundle"
                                    >
                                      <X className="w-3 h-3 text-white" />
                                    </button>

                                    {item.contentType === "video" ? (
                                      <video
                                        src={item.fileUrl}
                                        className="w-full h-full object-cover cursor-pointer"
                                        muted
                                        preload="metadata"
                                        poster={item.thumbnailUrl}
                                        onMouseEnter={(e) => {
                                          const video = e.target as HTMLVideoElement
                                          video.play().catch(() => {})
                                        }}
                                        onMouseLeave={(e) => {
                                          const video = e.target as HTMLVideoElement
                                          video.pause()
                                          video.currentTime = 0
                                        }}
                                        onClick={() => window.open(item.fileUrl, "_blank")}
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center cursor-pointer bg-zinc-800">
                                        <div className="text-center">
                                          <div className="text-2xl mb-1">
                                            {item.contentType === "audio"
                                              ? "🎵"
                                              : item.contentType === "image"
                                                ? "🖼️"
                                                : "📄"}
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* Play overlay for videos */}
                                    {item.contentType === "video" && (
                                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                                    )}
                                  </div>

                                  {/* File info */}
                                  <div className="mt-2">
                                    <p className="text-xs text-zinc-300 truncate font-light">{item.title}</p>
                                  </div>
                                </div>
                              ))}

                              {/* Add Content Placeholder - Only show when there's existing content */}
                              <div
                                className="aspect-[9/16] bg-zinc-800/50 rounded-lg border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center cursor-pointer hover:border-zinc-600 hover:bg-zinc-800/70 transition-all duration-200"
                                onClick={() => {
                                  fetchUserUploads()
                                  setShowAddContentModal(productBox.id)
                                }}
                              >
                                <Plus className="w-6 h-6 text-zinc-500 mb-1" />
                                <p className="text-xs text-zinc-500 text-center px-1">Add Content</p>
                              </div>
                            </div>
                          ) : (
                            // Empty state - Show centered Add Content button
                            <div className="text-center py-8">
                              <div className="text-4xl mb-2">📹</div>
                              <p className="text-sm text-zinc-500 mb-4">No content added yet</p>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-zinc-700 text-zinc-300 bg-transparent hover:bg-zinc-800"
                                onClick={() => {
                                  fetchUserUploads()
                                  setShowAddContentModal(productBox.id)
                                }}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Content
                              </Button>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Mobile Controls Section - Separated by border */}
                    <div className="mt-6 pt-4 border-t border-zinc-800">
                      <div className="flex items-center justify-between gap-4">
                        {/* Toggle Switch */}
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={productBox.active}
                            onCheckedChange={() => handleToggleActive(productBox.id)}
                            className="data-[state=checked]:bg-white data-[state=unchecked]:bg-zinc-700"
                          />
                          <span className="text-sm text-zinc-400">{productBox.active ? "Active" : "Inactive"}</span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="hover:bg-zinc-800 text-zinc-400 hover:text-white"
                            onClick={() => openEditModal(productBox)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="hover:bg-zinc-800 text-zinc-400 hover:text-white"
                            onClick={() => handleDelete(productBox.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Edit Bundle Modal */}
      <Dialog open={!!showEditModal} onOpenChange={() => setShowEditModal(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Edit Bundle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            <div>
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Enter bundle title"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your bundle"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            <div>
              <Label htmlFor="edit-price">Price (USD) *</Label>
              <Input
                id="edit-price"
                type="number"
                step="0.01"
                min="0.50"
                value={editForm.price}
                onChange={(e) => setEditForm((prev) => ({ ...prev, price: e.target.value }))}
                placeholder="9.99"
                className="bg-zinc-800 border-zinc-700"
              />
              <div className="mt-2 p-3 bg-amber-900/20 border border-amber-700/50 rounded-md">
                <p className="text-xs text-amber-200">
                  <strong>Note:</strong> Changing the price will create a new Stripe price automatically. However, you
                  may need to manually update the price in your Stripe Product Catalog if there are any sync issues.
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="edit-comparePrice">Compare At Price (USD)</Label>
              <Input
                id="edit-comparePrice"
                type="number"
                step="0.01"
                min="0"
                value={editForm.comparePrice}
                onChange={(e) => setEditForm((prev) => ({ ...prev, comparePrice: e.target.value }))}
                placeholder="19.99"
                className="bg-zinc-800 border-zinc-700"
              />
              <p className="text-xs text-zinc-400 mt-1">
                Optional: Show customers how much they save compared to the original price
              </p>
              {editForm.comparePrice &&
                editForm.price &&
                Number.parseFloat(editForm.comparePrice) > Number.parseFloat(editForm.price) && (
                  <div className="mt-2 p-2 bg-green-900/20 border border-green-700/50 rounded-md">
                    <p className="text-xs text-green-200">
                      Customers will save $
                      {(Number.parseFloat(editForm.comparePrice) - Number.parseFloat(editForm.price)).toFixed(2)}(
                      {Math.round(
                        ((Number.parseFloat(editForm.comparePrice) - Number.parseFloat(editForm.price)) /
                          Number.parseFloat(editForm.comparePrice)) *
                          100,
                      )}
                      % off)
                    </p>
                  </div>
                )}
              {editForm.comparePrice &&
                editForm.price &&
                Number.parseFloat(editForm.comparePrice) <= Number.parseFloat(editForm.price) && (
                  <div className="mt-2 p-2 bg-amber-900/20 border border-amber-700/50 rounded-md">
                    <p className="text-xs text-amber-200">
                      Compare price should be higher than the regular price to show savings
                    </p>
                  </div>
                )}
            </div>

            {/* Thumbnail Upload Section */}
            <div className="space-y-3">
              <Label>Bundle Thumbnail</Label>

              {/* Current Thumbnail Preview */}
              {editForm.coverImage && (
                <div className="relative">
                  <img
                    src={editForm.coverImage || "/placeholder.svg"}
                    alt="Bundle thumbnail"
                    className="w-full h-48 object-cover rounded-lg border border-zinc-700"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditForm((prev) => ({ ...prev, coverImage: "" }))}
                    className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Upload Options */}
              <div className="space-y-3">
                {/* URL Input */}
                <Input
                  placeholder="Enter thumbnail URL or upload a file below"
                  value={editForm.coverImage}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, coverImage: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />

                {/* File Upload */}
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file && showEditModal) {
                          // Validate file type
                          const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
                          if (!allowedTypes.includes(file.type)) {
                            toast({
                              title: "Invalid File Type",
                              description: "Please select a JPEG, PNG, or WebP image",
                              variant: "destructive",
                            })
                            return
                          }

                          // Validate file size (5MB max)
                          const maxSize = 5 * 1024 * 1024
                          if (file.size > maxSize) {
                            toast({
                              title: "File Too Large",
                              description: "Please select an image smaller than 5MB",
                              variant: "destructive",
                            })
                            return
                          }

                          handleThumbnailUpload(file, showEditModal)
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={thumbnailUploading}
                    />
                    <Button
                      variant="outline"
                      disabled={thumbnailUploading}
                      className="w-full border-zinc-700 hover:bg-zinc-800 bg-transparent"
                    >
                      {thumbnailUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload New Thumbnail
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-zinc-500">
                  Supported formats: JPEG, PNG, WebP. Maximum size: 5MB. Recommended size: 1280x720px
                </p>
              </div>

              {/* No Thumbnail State */}
              {!editForm.coverImage && (
                <div className="border-2 border-dashed border-zinc-700 rounded-lg p-8 text-center">
                  <ImageIcon className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-400 mb-2">No thumbnail selected</p>
                  <p className="text-xs text-zinc-500">Upload an image or enter a URL above</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowEditModal(null)} className="border-zinc-700">
                Cancel
              </Button>
              <Button
                onClick={() => showEditModal && handleEditBundle(showEditModal)}
                disabled={editLoading || thumbnailUploading}
                className="bg-red-600 hover:bg-red-700"
              >
                {editLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Bundle"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Content Modal */}
      <Dialog open={!!showAddContentModal} onOpenChange={() => setShowAddContentModal(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Add Content to Bundle</DialogTitle>
            {!isProUser && (
              <p className="text-xs text-zinc-500 mt-1">Free plan limit: {CONTENT_LIMIT_FREE} items per bundle.</p>
            )}
          </DialogHeader>
          <div className="flex flex-col flex-1 min-h-0 space-y-4">
            <p className="text-sm text-zinc-400 flex-shrink-0">
              Select content from your uploads to add to this bundle:
            </p>

            {uploadsLoading ? (
              <div className="flex items-center justify-center py-8 flex-1">
                <Loader2 className="h-5 w-5 text-zinc-500 animate-spin" />
                <span className="ml-2 text-sm text-zinc-400">Loading uploads...</span>
              </div>
            ) : availableUploads.length === 0 ? (
              <div className="text-center py-8 flex-1 flex items-center justify-center">
                <p className="text-zinc-500">No uploads available. Upload some content first.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3 pb-4">
                  {availableUploads.map((item) => (
                    <div key={item.id} className="group relative">
                      <div
                        className={`relative aspect-[9/16] bg-zinc-800 rounded-lg overflow-hidden cursor-pointer border-2 transition-all duration-200 ${
                          selectedContentIds.includes(item.id)
                            ? "border-red-500 ring-2 ring-red-500/50"
                            : "border-transparent hover:border-zinc-600"
                        }`}
                        onClick={() => {
                          setSelectedContentIds((prev) =>
                            prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id],
                          )
                        }}
                      >
                        {item.contentType === "video" ? (
                          <video
                            src={item.fileUrl}
                            className="w-full h-full object-cover"
                            muted
                            preload="metadata"
                            poster={item.thumbnailUrl}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-xl mb-1">
                                {item.contentType === "audio" ? "🎵" : item.contentType === "image" ? "🖼️" : "📄"}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Selection indicator */}
                        {selectedContentIds.includes(item.id) && (
                          <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                            <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 mt-1 truncate">{item.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t border-zinc-800 flex-shrink-0">
              <p className="text-sm text-zinc-400">{selectedContentIds.length} item(s) selected</p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowAddContentModal(null)} className="border-zinc-700">
                  Cancel
                </Button>
                {(() => {
                  const targetBox = productBoxes.find((box) => box.id === showAddContentModal)
                  const existingCount = targetBox
                    ? (targetBox.detailedContentItems?.length ??
                      targetBox.contentItems?.length ??
                      contentItems[targetBox.id]?.length ??
                      0)
                    : 0
                  const maxPerBundle = isProUser ? Number.POSITIVE_INFINITY : CONTENT_LIMIT_FREE
                  const remaining = Math.max(0, (maxPerBundle as number) - existingCount)
                  const overLimit = !isProUser && selectedContentIds.length > remaining

                  return (
                    <Button
                      onClick={() => showAddContentModal && handleAddContentToBundle(showAddContentModal)}
                      disabled={selectedContentIds.length === 0 || addContentLoading || (remaining <= 0 && !isProUser)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {addContentLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : remaining === Number.POSITIVE_INFINITY ? (
                        `Add ${selectedContentIds.length} Item${selectedContentIds.length !== 1 ? "s" : ""}`
                      ) : (
                        `Add ${Math.min(selectedContentIds.length, remaining)} Item${Math.min(selectedContentIds.length, remaining) !== 1 ? "s" : ""} (${remaining} remaining)`
                      )}
                    </Button>
                  )
                })()}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
