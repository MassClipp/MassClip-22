'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Package, DollarSign, Edit, Eye, EyeOff, Loader2, AlertCircle, Upload, X, Check, Trash2, ImageIcon } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useUserPlan } from '@/hooks/use-user-plan'
import { StripeConnectionPrompt } from '@/components/stripe-connection-prompt'
import { useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, onSnapshot, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useToast as useToastUi } from "@/components/ui/use-toast"
import { motion, AnimatePresence } from "framer-motion"

interface Bundle {
  id: string
  title: string
  description: string
  price: number
  coverImage?: string
  isActive: boolean
  contentItems?: any[]
  createdAt: any
}

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

export default function BundlesPage() {
  const [bundles, setBundles] = useState<Bundle[]>([])
  const [loading, setLoading] = useState(true)
  const [stripeConnected, setStripeConnected] = useState<boolean | null>(null)
  const { toast } = useToast()
  const { planData, isProUser, plan, loading: planLoading } = useUserPlan()
  const { user } = useAuth()
  const router = useRouter()
  const { toast: toastHook } = useToast()

  const [productBoxes, setProductBoxes] = useState<ProductBox[]>([])
  const [contentItems, setContentItems] = useState<{ [key: string]: ContentItem[] }>({})
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

  // Bundle limit logic for free users
  const bundleLimit = isProUser ? Infinity : 2
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

  // Check Stripe connection status
  useEffect(() => {
    const checkStripeStatus = async () => {
      try {
        const response = await fetch('/api/stripe/connect/status')
        if (response.ok) {
          const data = await response.json()
          setStripeConnected(data.connected)
        } else {
          setStripeConnected(false)
        }
      } catch (error) {
        console.error('Error checking Stripe status:', error)
        setStripeConnected(false)
      }
    }

    checkStripeStatus()
  }, [])

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

  // Fetch bundles
  useEffect(() => {
    const fetchBundles = async () => {
      try {
        const token = localStorage.getItem('authToken')
        if (!token) {
          throw new Error('No auth token found')
        }

        const response = await fetch('/api/creator/bundles', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch bundles: ${response.status}`)
        }

        const data = await response.json()
        setBundles(data.bundles || [])
      } catch (error) {
        console.error('Error fetching bundles:', error)
        toast({
          title: 'Error',
          description: 'Failed to load bundles',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    if (stripeConnected === true) {
      fetchBundles()
    } else if (stripeConnected === false) {
      setLoading(false)
    }
  }, [stripeConnected, toast])

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

  const handleCreateBundleNew = () => {
    // Check if free user has reached limit
    if (plan !== 'pro' && bundles.length >= 2) {
      toast({
        title: 'Bundle Limit Reached',
        description: 'Free users can create up to 2 bundles. Upgrade to Pro for unlimited bundles.',
        variant: 'destructive',
      })
      return
    }

    // Navigate to bundle creation
    window.location.href = '/dashboard/bundles/create'
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

  // Show Stripe connection prompt if not connected
  if (stripeConnected === false) {
    return <StripeConnectionPrompt />
  }

  // Show loading state
  if (loading || stripeConnected === null || planLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading bundles...</p>
          </div>
        </div>
      </div>
    )
  }

  const isFreePlan = plan !== 'pro'
  const bundleCount = bundles.length
  const canCreateMore = !isFreePlan || bundleCount < 2

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
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">Bundles</h1>
          {isFreePlan && (
            <Badge variant="outline" className="text-xs">
              {bundleCount}/2
            </Badge>
          )}
        </div>
        <Button
          onClick={handleCreateBundleNew}
          disabled={!canCreateMore}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Bundle {!canCreateMore && '(Limit Reached)'}
        </Button>
      </div>

      <p className="text-muted-foreground mb-8">
        Create and manage premium content packages for your audience
      </p>

      {bundles.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No bundles yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first bundle to start selling premium content
            </p>
            <Button
              onClick={handleCreateBundleNew}
              disabled={!canCreateMore}
              className="flex items-center gap-2 mx-auto"
            >
              <Plus className="w-4 h-4" />
              Create Your First Bundle
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                <Card className="bg-zinc-900/50 border-zinc-800 overflow-hidden">
                  <div className="aspect-video bg-muted relative">
                    {productBox.coverImage ? (
                      <img
                        src={productBox.coverImage || "/placeholder.svg"}
                        alt={productBox.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <Badge variant={productBox.active ? 'default' : 'secondary'}>
                        {productBox.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>

                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">{productBox.title}</CardTitle>
                        <CardDescription className="line-clamp-2">
                          {productBox.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        <span className="font-semibold text-green-600">
                          ${productBox.price.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Content ({boxContent.length})
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => window.location.href = `/dashboard/bundles/${productBox.id}/edit`}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => window.location.href = `/bundles/${productBox.id}`}
                      >
                        View
                      </Button>
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
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Bundle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
                <Button
                  onClick={() => showAddContentModal && handleAddContentToBundle(showAddContentModal)}
                  disabled={selectedContentIds.length === 0 || addContentLoading}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {addContentLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    `Add ${selectedContentIds.length} Item${selectedContentIds.length !== 1 ? "s" : ""}`
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
