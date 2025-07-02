"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import {
  Plus,
  Settings,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Edit,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { VideoThumbnail916 } from "@/components/video-thumbnail-916"
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

export default function BundlesPage() {
  const { user } = useAuth()
  const [productBoxes, setProductBoxes] = useState<ProductBox[]>([])
  const [contentItems, setContentItems] = useState<{ [key: string]: ContentItem[] }>({})
  const [loading, setLoading] = useState(true)
  const [contentLoading, setContentLoading] = useState<{ [key: string]: boolean }>({})
  const [showContent, setShowContent] = useState<{ [key: string]: boolean }>({})
  const [showAllContent, setShowAllContent] = useState<{ [key: string]: boolean }>({})
  const [error, setError] = useState<string | null>(null)
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null)
  const [editMode, setEditMode] = useState<{ [key: string]: boolean }>({})
  const { toast } = useToast()

  // Refs to track video elements for single playback
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement }>({})

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
      const initialShowAllState: { [key: string]: boolean } = {}

      boxes.forEach((box: ProductBox) => {
        initialShowState[box.id] = true // Show content by default
        initialShowAllState[box.id] = false // Show limited content initially
        setupContentListener(box)
      })

      setShowContent(initialShowState)
      setShowAllContent(initialShowAllState)
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
        description: `Product box ${newActiveStatus ? "activated" : "deactivated"}`,
      })
    } catch (error) {
      console.error("Error toggling active status:", error)
      toast({
        title: "Error",
        description: "Failed to update product box status",
        variant: "destructive",
      })
    }
  }

  // Delete product box
  const handleDelete = async (productBoxId: string) => {
    if (!confirm("Are you sure you want to delete this product box?")) return

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
        description: "Product box deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting product box:", error)
      toast({
        title: "Error",
        description: "Failed to delete product box",
        variant: "destructive",
      })
    }
  }

  // Toggle content visibility
  const toggleContentVisibility = (productBoxId: string) => {
    setShowContent((prev) => ({ ...prev, [productBoxId]: !prev[productBoxId] }))
  }

  // Toggle show all content
  const toggleShowAllContent = (productBoxId: string) => {
    setShowAllContent((prev) => ({ ...prev, [productBoxId]: !prev[productBoxId] }))
  }

  // Toggle edit mode for a product box
  const toggleEditMode = (productBoxId: string) => {
    setEditMode((prev) => ({ ...prev, [productBoxId]: !prev[productBoxId] }))
  }

  // Remove content item from product box
  const handleRemoveContent = async (productBoxId: string, contentItemId: string) => {
    if (!confirm("Are you sure you want to remove this content from the bundle?")) return

    try {
      const productBox = productBoxes.find((box) => box.id === productBoxId)
      if (!productBox) return

      // Remove from contentItems array
      const updatedContentItems = productBox.contentItems.filter((id) => id !== contentItemId)

      // Update in Firestore
      await updateDoc(doc(db, "productBoxes", productBoxId), {
        contentItems: updatedContentItems,
        updatedAt: new Date(),
      })

      // Update local state
      setProductBoxes((prev) =>
        prev.map((box) => (box.id === productBoxId ? { ...box, contentItems: updatedContentItems } : box)),
      )

      // Remove from content items display
      setContentItems((prev) => ({
        ...prev,
        [productBoxId]: prev[productBoxId]?.filter((item) => item.id !== contentItemId) || [],
      }))

      toast({
        title: "Success",
        description: "Content removed from bundle",
      })
    } catch (error) {
      console.error("Error removing content:", error)
      toast({
        title: "Error",
        description: "Failed to remove content from bundle",
        variant: "destructive",
      })
    }
  }

  // Handle content item click with single video playback
  const handleContentClick = (item: ContentItem) => {
    if (item.contentType === "video") {
      // Pause currently playing video if different
      if (currentlyPlaying && currentlyPlaying !== item.id) {
        const currentVideo = videoRefs.current[currentlyPlaying]
        if (currentVideo) {
          currentVideo.pause()
        }
      }

      // Set new playing video
      setCurrentlyPlaying(item.id)

      // Store video ref for future control
      const videoElement = document.querySelector(`video[data-video-id="${item.id}"]`) as HTMLVideoElement
      if (videoElement) {
        videoRefs.current[item.id] = videoElement
        videoElement.play()
      }
    } else {
      // For non-video content, open in new tab
      window.open(item.fileUrl, "_blank")
    }
  }

  // Handle video pause
  const handleVideoPause = (itemId: string) => {
    if (currentlyPlaying === itemId) {
      setCurrentlyPlaying(null)
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Bundles</h1>
          <p className="text-zinc-400">Create and manage premium content packages for your audience</p>
        </div>
        <Button className="bg-red-600 hover:bg-red-700">
          <Plus className="h-4 w-4 mr-2" />
          Create Bundle
        </Button>
      </div>

      {/* Product Boxes */}
      {productBoxes.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-xl font-medium text-white mb-2">No Bundles Yet</h3>
          <p className="text-zinc-400 mb-4">Create your first premium content bundle to get started</p>
          <Button className="bg-red-600 hover:bg-red-700">
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
            const showAll = showAllContent[productBox.id] || false
            const isEditMode = editMode[productBox.id] || false

            // Limit to 5 items unless "Show All" is enabled
            const displayedContent = showAll ? boxContent : boxContent.slice(0, 5)
            const hasMoreContent = boxContent.length > 5

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
                          {isEditMode && (
                            <Badge variant="outline" className="border-blue-500 text-blue-400">
                              Edit Mode
                            </Badge>
                          )}
                        </div>
                        <p className="text-zinc-400 mb-3">{productBox.description}</p>
                        <div className="flex items-center gap-4">
                          <span className="text-2xl font-bold text-green-400">${productBox.price.toFixed(2)}</span>
                          <span className="text-sm text-zinc-500">
                            {boxContent.length} content item
                            {boxContent.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch checked={productBox.active} onCheckedChange={() => handleToggleActive(productBox.id)} />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleEditMode(productBox.id)}
                          className={isEditMode ? "bg-blue-600 hover:bg-blue-700 text-white" : "hover:bg-zinc-800"}
                          title={isEditMode ? "Exit edit mode" : "Edit bundle"}
                        >
                          {isEditMode ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="hover:bg-zinc-800">
                          <Settings className="h-4 w-4" />
                        </Button>
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

                    {/* Content Grid - 9:16 Format */}
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
                        ) : displayedContent.length > 0 ? (
                          <>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                              {displayedContent.map((item) => (
                                <VideoThumbnail916
                                  key={item.id}
                                  title={item.title}
                                  videoUrl={item.fileUrl}
                                  thumbnailUrl={item.thumbnailUrl}
                                  fileSize={item.fileSize}
                                  duration={item.duration}
                                  contentType={item.contentType}
                                  onClick={() => handleContentClick(item)}
                                  onVideoPause={() => handleVideoPause(item.id)}
                                  isPlaying={currentlyPlaying === item.id}
                                  videoId={item.id}
                                  editMode={isEditMode}
                                  onRemove={() => handleRemoveContent(productBox.id, item.id)}
                                />
                              ))}

                              {/* Add Content Placeholder */}
                              <div className="aspect-[9/16] bg-zinc-800/50 rounded-lg border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center cursor-pointer hover:border-zinc-600 hover:bg-zinc-800/70 transition-all duration-200">
                                <Plus className="w-8 h-8 text-zinc-500 mb-2" />
                                <p className="text-xs text-zinc-500 text-center px-2">Add Content</p>
                              </div>
                            </div>

                            {/* Show More/Less Button */}
                            {hasMoreContent && (
                              <div className="flex justify-center mt-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toggleShowAllContent(productBox.id)}
                                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                                >
                                  {showAll ? (
                                    <>
                                      <ChevronUp className="h-4 w-4 mr-2" />
                                      Show Less
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="h-4 w-4 mr-2" />
                                      Show All ({boxContent.length})
                                    </>
                                  )}
                                </Button>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-center py-8">
                            <div className="text-4xl mb-2">📹</div>
                            <p className="text-sm text-zinc-500">No content added yet</p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-3 border-zinc-700 text-zinc-300 bg-transparent"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Content
                            </Button>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* Add Content Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-4 border-zinc-700 text-zinc-300 hover:bg-zinc-800 bg-transparent"
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
