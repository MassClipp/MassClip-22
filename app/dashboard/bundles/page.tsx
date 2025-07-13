"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Edit, Eye, EyeOff, Loader2, AlertCircle, X, Check, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"

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

interface BundleMade {
  id: string
  title: string
  description: string
  price: number
  currency: string
  coverImage?: string
  active: boolean
  contentItems: ContentItem[]
  contentCount: number
  totalDuration: number
  totalSize: number
  contentBreakdown: {
    videos: number
    audio: number
    images: number
    documents: number
  }
  contentTitles: string[]
  contentUrls: string[]
  contentThumbnails: string[]
  createdAt?: any
  updatedAt?: any
  stripeProductId?: string
  stripePriceId?: string
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
  const { user } = useAuth()
  const [bundles, setBundles] = useState<BundleMade[]>([])
  const [loading, setLoading] = useState(true)
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

  // Fetch bundles from bundlesMade collection
  const fetchBundles = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      console.log("🔍 [Bundles] Fetching bundles from bundlesMade collection...")

      const idToken = await user.getIdToken()

      const response = await fetch(`/api/creator/bundles-made`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch bundles: ${response.status}`)
      }

      const data = await response.json()
      const fetchedBundles = data.bundles || []

      console.log("📦 [Bundles] Raw bundles data:", fetchedBundles)

      setBundles(fetchedBundles)
      console.log(`✅ [Bundles] Loaded ${fetchedBundles.length} bundles`)

      // Initialize show content state
      const initialShowState: { [key: string]: boolean } = {}
      fetchedBundles.forEach((bundle: BundleMade) => {
        initialShowState[bundle.id] = true // Show content by default
      })
      setShowContent(initialShowState)
    } catch (err) {
      console.error("❌ [Bundles] Error:", err)
      setError(err instanceof Error ? err.message : "Failed to load bundles")
    } finally {
      setLoading(false)
    }
  }

  // Toggle active status
  const handleToggleActive = async (bundleId: string) => {
    try {
      const bundle = bundles.find((b) => b.id === bundleId)
      if (!bundle) return

      const newActiveStatus = !bundle.active

      const idToken = await user?.getIdToken()
      const response = await fetch(`/api/creator/bundles-made/${bundleId}`, {
        method: "PUT",
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
      setBundles((prev) => prev.map((b) => (b.id === bundleId ? { ...b, active: newActiveStatus } : b)))

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

  // Delete bundle
  const handleDelete = async (bundleId: string) => {
    if (!confirm("Are you sure you want to delete this bundle? This action cannot be undone.")) return

    try {
      const idToken = await user?.getIdToken()
      const response = await fetch(`/api/creator/bundles-made/${bundleId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to delete bundle")
      }

      setBundles((prev) => prev.filter((b) => b.id !== bundleId))
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
  const toggleContentVisibility = (bundleId: string) => {
    setShowContent((prev) => ({ ...prev, [bundleId]: !prev[bundleId] }))
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

      // Create bundle via new API
      const response = await fetch("/api/creator/bundles-made", {
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
      await fetchBundles()
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

  // Handle edit bundle
  const handleEditBundle = async (bundleId: string) => {
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

      const idToken = await user?.getIdToken()
      const response = await fetch(`/api/creator/bundles-made/${bundleId}`, {
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

      // Update local state
      setBundles((prev) =>
        prev.map((b) =>
          b.id === bundleId
            ? {
                ...b,
                title: editForm.title.trim(),
                description: editForm.description.trim(),
                price: Number.parseFloat(editForm.price),
                coverImage: editForm.coverImage || b.coverImage,
              }
            : b,
        ),
      )

      toast({
        title: "Success",
        description: "Bundle updated successfully",
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
  const openEditModal = (bundle: BundleMade) => {
    setEditForm({
      title: bundle.title,
      description: bundle.description,
      price: bundle.price.toString(),
      coverImage: bundle.coverImage || "",
    })
    setShowEditModal(bundle.id)
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

  // Determine content type from MIME type
  const getContentType = (mimeType: string): "video" | "audio" | "image" | "document" => {
    if (mimeType.startsWith("video/")) return "video"
    if (mimeType.startsWith("audio/")) return "audio"
    if (mimeType.startsWith("image/")) return "image"
    return "document"
  }

  // Handle adding content to bundle
  const handleAddContentToBundle = async (bundleId: string) => {
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

      console.log(`🔄 [Bundle Content] Adding ${selectedContentIds.length} items to bundle ${bundleId}`)

      const idToken = await user?.getIdToken()
      const response = await fetch(`/api/creator/bundles-made/${bundleId}/add-content`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          contentIds: selectedContentIds,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to add content to bundle")
      }

      const data = await response.json()

      toast({
        title: "Success",
        description: data.message,
      })

      setShowAddContentModal(null)
      setSelectedContentIds([])
      fetchBundles() // Refresh bundles to show updated content
    } catch (error) {
      console.error("Error adding content to bundle:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add content to bundle",
        variant: "destructive",
      })
    } finally {
      setAddContentLoading(false)
    }
  }

  // Remove content from bundle
  const handleRemoveContentFromBundle = async (bundleId: string, contentId: string) => {
    if (!confirm("Remove this content from the bundle?")) return

    try {
      console.log(`🔍 [Bundles] Removing content ${contentId} from bundle ${bundleId}`)

      // Update local state immediately for instant UI feedback
      setBundles((prev) =>
        prev.map((bundle) => {
          if (bundle.id === bundleId) {
            const updatedContentItems = bundle.contentItems.filter((item) => item.id !== contentId)
            return {
              ...bundle,
              contentItems: updatedContentItems,
              contentCount: updatedContentItems.length,
            }
          }
          return bundle
        }),
      )

      toast({
        title: "Success",
        description: "Content removed from bundle",
      })

      // Force refresh the bundle data to ensure persistence
      await fetchBundles()
    } catch (error) {
      console.error("❌ [Bundles] Error removing content from bundle:", error)
      toast({
        title: "Error",
        description: "Failed to remove content from bundle",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    if (user) {
      fetchBundles()
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
        <Button onClick={fetchBundles} variant="outline" className="border-zinc-700 hover:bg-zinc-800 bg-transparent">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Bundles</h1>
          <p className="text-zinc-400">Create and manage premium content packages for your audience</p>
        </div>

        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button className="bg-red-600 hover:bg-red-700">
              <Plus className="h-4 w-4 mr-2" />
              Create Bundle
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

              <div className="grid grid-cols-2 gap-4">
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
                  <Label htmlFor="billing">Billing Type</Label>
                  <Select
                    value={createForm.billingType}
                    onValueChange={(value: "one_time" | "subscription") =>
                      setCreateForm((prev) => ({ ...prev, billingType: value }))
                    }
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="one_time">One-time Payment</SelectItem>
                      <SelectItem value="subscription">Monthly Subscription</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowCreateModal(false)} className="border-zinc-700">
                  Cancel
                </Button>
                <Button onClick={handleCreateBundle} disabled={createLoading} className="bg-red-600 hover:bg-red-700">
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

      {/* Bundles */}
      {bundles.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-xl font-medium text-white mb-2">No Bundles Yet</h3>
          <p className="text-zinc-400 mb-4">Create your first premium content bundle to get started</p>
          <Button className="bg-red-600 hover:bg-red-700" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Bundle
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {bundles.map((bundle, index) => {
            const isContentVisible = showContent[bundle.id] || false

            return (
              <motion.div
                key={bundle.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card className="bg-zinc-900/50 border-zinc-800 overflow-hidden">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-xl text-white">{bundle.title}</CardTitle>
                          <Badge variant={bundle.active ? "default" : "secondary"}>
                            {bundle.active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="text-zinc-400 mb-3">{bundle.description}</p>
                        <div className="flex items-center gap-4">
                          <span className="text-2xl font-bold text-green-400">${bundle.price.toFixed(2)}</span>
                          <span className="text-sm text-zinc-500">
                            {bundle.contentCount} item{bundle.contentCount !== 1 ? "s" : ""}
                          </span>
                          {bundle.totalDuration > 0 && (
                            <span className="text-sm text-zinc-500">{formatDuration(bundle.totalDuration)}</span>
                          )}
                          <span className="text-sm text-zinc-500">{formatFileSize(bundle.totalSize)}</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    {/* Content Section Header */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-zinc-400">Content ({bundle.contentCount})</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleContentVisibility(bundle.id)}
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
                          {bundle.contentItems.length > 0 ? (
                            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                              {bundle.contentItems.map((item) => (
                                <div key={item.id} className="group relative">
                                  <div className="relative aspect-[9/16] bg-zinc-900 rounded-lg overflow-hidden shadow-md border border-transparent hover:border-white/20 transition-all duration-300">
                                    {/* Delete button */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleRemoveContentFromBundle(bundle.id, item.id)
                                      }}
                                      className="absolute top-2 right-2 z-30 w-6 h-6 bg-red-600/90 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg"
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
                                  setShowAddContentModal(bundle.id)
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
                                  setShowAddContentModal(bundle.id)
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
                            checked={bundle.active}
                            onCheckedChange={() => handleToggleActive(bundle.id)}
                            className="data-[state=checked]:bg-red-600"
                          />
                          <span className="text-sm text-zinc-400">{bundle.active ? "Active" : "Inactive"}</span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="hover:bg-zinc-800 text-zinc-400 hover:text-white"
                            onClick={() => openEditModal(bundle)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="hover:bg-red-900/50 text-red-400 hover:text-red-300"
                            onClick={() => handleDelete(bundle.id)}
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
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowEditModal(null)} className="border-zinc-700">
                Cancel
              </Button>
              <Button
                onClick={() => showEditModal && handleEditBundle(showEditModal)}
                disabled={editLoading}
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
