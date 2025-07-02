"use client"

import { useRef } from "react"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Trash2, Eye, EyeOff, Loader2, AlertCircle, Upload, Play, X } from "lucide-react"
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
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
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
}

interface CreateBundleForm {
  title: string
  description: string
  price: string
  billingType: "one_time" | "subscription"
  thumbnail: File | null
}

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
  const [createForm, setCreateForm] = useState<CreateBundleForm>({
    title: "",
    description: "",
    price: "",
    billingType: "one_time",
    thumbnail: null,
  })
  const [playingVideo, setPlayingVideo] = useState<string | null>(null)
  const { toast } = useToast()

  const [showAddContentModal, setShowAddContentModal] = useState(false)
  const [availableUploads, setAvailableUploads] = useState<ContentItem[]>([])
  const [uploadsLoading, setUploadsLoading] = useState(false)
  const [currentBundleId, setCurrentBundleId] = useState<string>("")

  // Real-time listeners for content updates
  const contentListeners = useRef<{ [key: string]: () => void }>({})

  // Fetch product boxes
  const fetchProductBoxes = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      console.log("🔍 [Bundles] Fetching product boxes...")

      const idToken = await user.getIdToken()
      const response = await fetch(`/api/creator/${user.uid}/product-boxes`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch product boxes: ${response.status}`)
      }

      const data = await response.json()
      const boxes = data.productBoxes || []

      setProductBoxes(boxes)
      console.log(`✅ [Bundles] Loaded ${boxes.length} product boxes`)

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

      // Update in Firestore
      await updateDoc(doc(db, "productBoxes", productBoxId), {
        active: newActiveStatus,
        updatedAt: new Date(),
      })

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
    if (!confirm("Are you sure you want to delete this bundle?")) return

    try {
      await deleteDoc(doc(db, "productBoxes", productBoxId))

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

  // Remove content from bundle
  const handleRemoveContentFromBundle = async (bundleId: string, contentId: string) => {
    if (!confirm("Are you sure you want to remove this content from the bundle?")) return

    try {
      const productBox = productBoxes.find((box) => box.id === bundleId)
      if (!productBox) return

      // Remove from contentItems array
      const updatedContentItems = productBox.contentItems.filter((id) => id !== contentId)

      // Update in Firestore
      await updateDoc(doc(db, "productBoxes", bundleId), {
        contentItems: updatedContentItems,
        updatedAt: new Date(),
      })

      // Update local state
      setProductBoxes((prev) =>
        prev.map((box) => (box.id === bundleId ? { ...box, contentItems: updatedContentItems } : box)),
      )

      // Remove from content items display
      setContentItems((prev) => ({
        ...prev,
        [bundleId]: prev[bundleId]?.filter((item) => item.id !== contentId) || [],
      }))

      toast({
        title: "Success",
        description: "Content removed from bundle",
      })
    } catch (error) {
      console.error("Error removing content from bundle:", error)
      toast({
        title: "Error",
        description: "Failed to remove content from bundle",
        variant: "destructive",
      })
    }
  }

  // Handle video play
  const handleVideoPlay = (videoId: string, videoElement: HTMLVideoElement) => {
    // Pause any currently playing video
    if (playingVideo && playingVideo !== videoId) {
      const currentVideo = document.querySelector(`video[data-video-id="${playingVideo}"]`) as HTMLVideoElement
      if (currentVideo) {
        currentVideo.pause()
      }
    }

    setPlayingVideo(videoId)
    videoElement.play()
  }

  // Handle video pause
  const handleVideoPause = (videoId: string) => {
    setPlayingVideo(null)
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

      // Create bundle via API (this will handle Stripe integration)
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

      // Refresh bundles
      fetchProductBoxes()
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

  const fetchUserUploads = async () => {
    if (!user) return

    try {
      setUploadsLoading(true)
      const idToken = await user.getIdToken()
      const response = await fetch("/api/uploads", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      })

      if (!response.ok) throw new Error("Failed to fetch uploads")

      const data = await response.json()
      const uploads = data.uploads || []

      const formattedUploads: ContentItem[] = uploads.map((upload: any) => ({
        id: upload.id,
        title: upload.title || upload.filename || upload.originalFileName || "Untitled",
        fileUrl: upload.fileUrl || upload.publicUrl || upload.downloadUrl || "",
        thumbnailUrl: upload.thumbnailUrl || "",
        mimeType: upload.mimeType || upload.fileType || "application/octet-stream",
        fileSize: upload.fileSize || upload.size || 0,
        contentType: getContentType(upload.mimeType || upload.fileType || ""),
        duration: upload.duration || undefined,
        filename: upload.filename || upload.originalFileName || `${upload.id}.file`,
        createdAt: upload.createdAt || upload.uploadedAt,
      }))

      setAvailableUploads(formattedUploads)
    } catch (error) {
      console.error("Error fetching uploads:", error)
      toast({
        title: "Error",
        description: "Failed to load your uploads",
        variant: "destructive",
      })
    } finally {
      setUploadsLoading(false)
    }
  }

  const handleAddContentToBundle = async (bundleId: string, uploadId: string) => {
    try {
      const productBox = productBoxes.find((box) => box.id === bundleId)
      if (!productBox) return

      // Check if content is already in bundle
      if (productBox.contentItems.includes(uploadId)) {
        toast({
          title: "Already Added",
          description: "This content is already in the bundle",
          variant: "destructive",
        })
        return
      }

      // Add to contentItems array
      const updatedContentItems = [...productBox.contentItems, uploadId]

      // Update in Firestore
      await updateDoc(doc(db, "productBoxes", bundleId), {
        contentItems: updatedContentItems,
        updatedAt: new Date(),
      })

      // Update local state
      setProductBoxes((prev) =>
        prev.map((box) => (box.id === bundleId ? { ...box, contentItems: updatedContentItems } : box)),
      )

      toast({
        title: "Success",
        description: "Content added to bundle",
      })

      setShowAddContentModal(false)
    } catch (error) {
      console.error("Error adding content to bundle:", error)
      toast({
        title: "Error",
        description: "Failed to add content to bundle",
        variant: "destructive",
      })
    }
  }

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
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

              <div>
                <Label htmlFor="thumbnail">Thumbnail (Optional)</Label>
                <div className="mt-2 flex items-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-zinc-700 bg-transparent"
                    onClick={() => document.getElementById("thumbnail-input")?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Thumbnail
                  </Button>
                  <input
                    id="thumbnail-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null
                      setCreateForm((prev) => ({ ...prev, thumbnail: file }))
                    }}
                  />
                  {createForm.thumbnail && <span className="text-sm text-zinc-400">{createForm.thumbnail.name}</span>}
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

        {/* Add Content Modal */}
        <Dialog open={showAddContentModal} onOpenChange={setShowAddContentModal}>
          <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Content to Bundle</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {uploadsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading your uploads...</span>
                </div>
              ) : availableUploads.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {availableUploads.map((upload) => (
                    <div
                      key={upload.id}
                      className="group cursor-pointer"
                      onClick={() => handleAddContentToBundle(currentBundleId, upload.id)}
                    >
                      <div className="relative aspect-[9/16] bg-zinc-800 rounded-lg overflow-hidden">
                        {upload.contentType === "video" ? (
                          <video
                            src={upload.fileUrl}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            preload="metadata"
                            poster={upload.thumbnailUrl}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-2xl mb-1">
                                {upload.contentType === "audio" ? "🎵" : upload.contentType === "image" ? "🖼️" : "📄"}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Overlay */}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Plus className="w-8 h-8 text-white" />
                        </div>
                      </div>

                      <div className="mt-1">
                        <p className="text-xs text-zinc-400 truncate">{upload.title}</p>
                        <p className="text-xs text-zinc-500">{formatFileSize(upload.fileSize)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">📹</div>
                  <p className="text-zinc-400">No uploads found</p>
                  <p className="text-sm text-zinc-500 mt-1">Upload some content first to add to bundles</p>
                </div>
              )}
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
          <Button className="bg-red-600 hover:bg-red-700" onClick={() => setShowCreateModal(true)}>
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
                <Card className="bg-zinc-900/50 border-zinc-800 overflow-hidden">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-xl text-white">{productBox.title}</CardTitle>
                          <Badge variant={productBox.active ? "default" : "secondary"}>
                            {productBox.active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="text-zinc-400 mb-3">{productBox.description}</p>
                        <div className="flex items-center gap-4">
                          <span className="text-2xl font-bold text-green-400">${productBox.price.toFixed(2)}</span>
                          <span className="text-sm text-zinc-500">
                            {boxContent.length} content item{boxContent.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch checked={productBox.active} onCheckedChange={() => handleToggleActive(productBox.id)} />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(productBox.id)}
                          className="hover:bg-red-900/50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
                                  <div className="relative aspect-[9/16] bg-zinc-800 rounded-lg overflow-hidden cursor-pointer">
                                    {item.contentType === "video" ? (
                                      <>
                                        <video
                                          src={item.fileUrl}
                                          className="w-full h-full object-cover"
                                          preload="metadata"
                                          poster={item.thumbnailUrl}
                                          data-video-id={item.id}
                                          onPlay={() => setPlayingVideo(item.id)}
                                          onPause={() => handleVideoPause(item.id)}
                                          onClick={() => {
                                            // Open in full video player
                                            window.open(`/video/${item.id}`, "_blank")
                                          }}
                                        />

                                        {/* Play Button Overlay */}
                                        {playingVideo !== item.id && (
                                          <div
                                            className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              const video = document.querySelector(
                                                `video[data-video-id="${item.id}"]`,
                                              ) as HTMLVideoElement
                                              if (video) {
                                                handleVideoPlay(item.id, video)
                                              }
                                            }}
                                          >
                                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                              <Play className="w-6 h-6 text-white ml-1" fill="white" />
                                            </div>
                                          </div>
                                        )}
                                      </>
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
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

                                    {/* Delete Button */}
                                    <button
                                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600/80 hover:bg-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleRemoveContentFromBundle(productBox.id, item.id)
                                      }}
                                      title="Remove from bundle"
                                    >
                                      <X className="w-3 h-3 text-white" />
                                    </button>
                                  </div>

                                  {/* File info */}
                                  <div className="mt-1">
                                    <p className="text-xs text-zinc-400 truncate">{item.title}</p>
                                    <p className="text-xs text-zinc-500">{formatFileSize(item.fileSize)}</p>
                                  </div>
                                </div>
                              ))}

                              {/* Add Content Placeholder */}
                              <div
                                className="aspect-[9/16] bg-zinc-800/50 rounded-lg border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center cursor-pointer hover:border-zinc-600 hover:bg-zinc-800/70 transition-all duration-200"
                                onClick={() => {
                                  setCurrentBundleId(productBox.id)
                                  setShowAddContentModal(true)
                                  fetchUserUploads()
                                }}
                              >
                                <Plus className="w-6 h-6 text-zinc-500 mb-1" />
                                <p className="text-xs text-zinc-500 text-center px-1">Add Content</p>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <div className="text-4xl mb-2">📹</div>
                              <p className="text-sm text-zinc-500">No content added yet</p>
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-3 border-zinc-700 text-zinc-300 bg-transparent"
                                onClick={() => {
                                  setCurrentBundleId(productBox.id)
                                  setShowAddContentModal(true)
                                  fetchUserUploads()
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

                    {/* Add Content Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-4 border-zinc-700 text-zinc-300 hover:bg-zinc-800 bg-transparent"
                      onClick={() => {
                        setCurrentBundleId(productBox.id)
                        setShowAddContentModal(true)
                        fetchUserUploads()
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Content
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
