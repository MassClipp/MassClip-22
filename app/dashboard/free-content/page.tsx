"use client"

import { useState, useEffect } from "react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { Button } from "@/components/ui/button"
import {
  Loader2,
  Trash2,
  RefreshCw,
  Search,
  PlusCircle,
  Copy,
  MoreVertical,
  Film,
  Music,
  ImageIcon,
  File,
  Video,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import UploadSelector from "@/components/upload-selector"
import FolderSelector from "@/components/folder-selector"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { VideoPreviewPlayer } from "@/components/video-preview-player"
import { motion, AnimatePresence } from "framer-motion"
import { safelyConvertToDate, safelyFormatRelativeTime } from "@/lib/date-utils"

interface FreeContentItem {
  id: string
  title: string
  fileUrl: string
  type: string
  size?: number
  addedAt: any // Can be various date formats
}

const FILE_TYPE_ICONS = {
  video: Film,
  audio: Music,
  image: ImageIcon,
  document: File,
  other: File,
}

const FILE_TYPE_COLORS = {
  video: "text-white",
  audio: "text-white",
  image: "text-white",
  document: "text-white",
  other: "text-white",
}

export default function FreeContentPage() {
  const { user, loading: authLoading } = useFirebaseAuth()
  const { toast } = useToast()
  const [freeContent, setFreeContent] = useState<FreeContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showAddContentDialog, setShowAddContentDialog] = useState(false)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)

  // Fetch free content
  const fetchFreeContent = async () => {
    if (!user) return

    try {
      setLoading(true)
      const token = await user.getIdToken()

      const response = await fetch("/api/free-content", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch free content")
      }

      const data = await response.json()

      // Add logging after API response
      console.log("✅ [Free Content] Raw API Response:", data)
      console.log("✅ [Free Content] Free content array:", data.freeContent)

      // Safely process the data with proper date handling
      const processedContent = (data.freeContent || []).map((item: any) => ({
        ...item,
        addedAt: safelyConvertToDate(item.addedAt), // Convert to safe Date object
      }))

      // Add logging before setting the state
      console.log(`✅ [Free Content] Setting ${processedContent.length} items to state`)
      setFreeContent(processedContent)
    } catch (error) {
      console.error("Error fetching free content:", error)
      toast({
        title: "Error",
        description: "Failed to load free content",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchFreeContent()
    }
  }, [user])

  // Remove from free content
  const removeFromFreeContent = async (id: string) => {
    if (!user) return

    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/free-content/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to remove from free content")
      }

      toast({
        title: "Success",
        description: "Item removed from free content",
      })

      // Update the list
      setFreeContent(freeContent.filter((item) => item.id !== id))
    } catch (error) {
      console.error("Error removing from free content:", error)
      toast({
        title: "Error",
        description: "Failed to remove item from free content",
        variant: "destructive",
      })
    }
  }

  // Add selected content to free content
  const handleAddSelectedContent = async (uploadIds: string[]) => {
    if (!user || uploadIds.length === 0) return

    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/free-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ uploadIds }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to add content")
      }

      toast({
        title: "Success!",
        description: `${uploadIds.length} item(s) added to free content`,
      })

      setShowAddContentDialog(false)
      fetchFreeContent() // Refresh the list
    } catch (error) {
      console.error("Error adding content:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add content",
        variant: "destructive",
      })
    }
  }

  // Copy URL to clipboard
  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      toast({
        title: "Copied!",
        description: "File URL copied to clipboard",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy URL",
        variant: "destructive",
      })
    }
  }

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown size"
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i]
  }

  // Filter content based on search term
  const filteredContent = freeContent.filter((item) => item.title.toLowerCase().includes(searchTerm.toLowerCase()))

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 text-zinc-500 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Authentication Required</h2>
          <p className="text-zinc-400">Please sign in to access your free content.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6 border-b border-zinc-800/50">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-white tracking-tight">Content Library</h1>
          <p className="text-zinc-400 text-sm">
            Manage and organize content that appears in the public section of your creator profile
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={fetchFreeContent}
            className="border-zinc-700/50 bg-zinc-900/50 hover:bg-zinc-800/50 text-zinc-300"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>

          <Button
            onClick={() => setShowAddContentDialog(true)}
            className="bg-white text-black hover:bg-zinc-100 font-medium px-6"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Content
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-zinc-900/30 border border-zinc-800/30 rounded-lg p-4">
          <div className="text-2xl font-semibold text-white mb-1">{freeContent.length}</div>
          <div className="text-xs text-white uppercase tracking-wide">Total Items</div>
        </div>
        <div className="bg-zinc-900/30 border border-zinc-800/30 rounded-lg p-4">
          <div className="text-2xl font-semibold text-white mb-1">
            {freeContent.filter((item) => item.type === "video").length}
          </div>
          <div className="text-xs text-white uppercase tracking-wide">Videos</div>
        </div>
        <div className="bg-zinc-900/30 border border-zinc-800/30 rounded-lg p-4">
          <div className="text-2xl font-semibold text-white mb-1">
            {freeContent.filter((item) => item.type === "image").length}
          </div>
          <div className="text-xs text-white uppercase tracking-wide">Images</div>
        </div>
      </div>

      <div className="relative w-full md:w-96">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500 h-4 w-4" />
        <Input
          placeholder="Search content..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-zinc-900/30 border-zinc-800/30 text-white placeholder:text-zinc-500"
        />
      </div>

      {/* Content Grid */}
      {filteredContent.length === 0 ? (
        <div className="bg-zinc-900/20 border border-zinc-800/30 rounded-lg">
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-16 h-16 bg-zinc-800/50 rounded-lg flex items-center justify-center mb-6">
              <Video className="h-8 w-8 text-zinc-500" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">
              {searchTerm ? "No matching content" : "No content available"}
            </h3>
            <p className="text-zinc-400 text-center mb-8 max-w-md text-sm">
              {searchTerm
                ? "No items match your search criteria. Try adjusting your search terms."
                : "Add content from your uploads to showcase in the public section of your creator profile."}
            </p>
            <Button
              onClick={() => setShowAddContentDialog(true)}
              className="bg-white text-black hover:bg-zinc-100 font-medium px-6"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Content
            </Button>
          </div>
        </div>
      ) : (
        <AnimatePresence>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5 gap-4">
            {filteredContent.map((item, index) => {
              const IconComponent = FILE_TYPE_ICONS[item.type as keyof typeof FILE_TYPE_ICONS] || File
              const colorClass = FILE_TYPE_COLORS[item.type as keyof typeof FILE_TYPE_COLORS] || "text-white"

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                >
                  <div className="bg-zinc-900/30 border border-zinc-800/30 rounded-lg hover:border-zinc-700/50 transition-all duration-200 group">
                    <div className="p-3">
                      <div className="mb-3 relative">
                        {item.type === "video" ? (
                          <div className="aspect-[9/16]">
                            <VideoPreviewPlayer videoUrl={item.fileUrl} title={item.title} />
                          </div>
                        ) : item.type === "image" ? (
                          <div className="aspect-[9/16] bg-zinc-800/50 rounded-md flex items-center justify-center relative overflow-hidden">
                            <img
                              src={item.fileUrl || "/placeholder.svg"}
                              alt={item.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = "none"
                                target.nextElementSibling?.classList.remove("hidden")
                              }}
                            />
                            <div className="hidden w-full h-full flex items-center justify-center absolute inset-0 bg-zinc-800/50">
                              <IconComponent className={`h-8 w-8 ${colorClass}`} />
                            </div>
                          </div>
                        ) : (
                          <div className="aspect-[9/16] bg-zinc-800/50 rounded-md flex items-center justify-center">
                            <IconComponent className={`h-8 w-8 ${colorClass}`} />
                          </div>
                        )}

                        {/* Action buttons overlay - only show for non-video types */}
                        {item.type !== "video" && (
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={(e) => {
                                e.stopPropagation()
                                window.open(item.fileUrl, "_blank")
                              }}
                              className="bg-white/20 hover:bg-white/30 text-white border-white/20"
                            >
                              <Search className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={(e) => e.stopPropagation()}
                                  className="bg-white/20 hover:bg-white/30 text-white border-white/20"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="bg-zinc-900 border-zinc-800">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    copyToClipboard(item.fileUrl)
                                  }}
                                >
                                  <Copy className="h-4 w-4 mr-2" />
                                  Copy URL
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    removeFromFreeContent(item.id)
                                  }}
                                  className="text-red-400"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Remove
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-white text-sm truncate">{item.title}</h3>
                          <Badge variant="outline" className="text-xs border-zinc-700/50 text-zinc-300 bg-zinc-800/30">
                            {item.type}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between text-xs text-zinc-400">
                          <span>{formatFileSize(item.size)}</span>
                          <span>{safelyFormatRelativeTime(item.addedAt)}</span>
                        </div>

                        {/* Action buttons for videos - show below the video */}
                        {item.type === "video" && (
                          <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 bg-zinc-800/50 border-zinc-700/50 text-zinc-300 hover:bg-zinc-700/50 hover:text-white text-xs"
                              onClick={(e) => {
                                e.stopPropagation()
                                copyToClipboard(item.fileUrl)
                              }}
                            >
                              <Copy className="h-3 w-3 mr-1" /> Copy URL
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="px-2 bg-zinc-800/50 border-zinc-700/50 text-zinc-300 hover:bg-zinc-700/50 hover:text-white"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="bg-zinc-900 border-zinc-800">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    removeFromFreeContent(item.id)
                                  }}
                                  className="text-red-400"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Remove
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </AnimatePresence>
      )}

      {/* Add Content Dialog */}
      <Dialog open={showAddContentDialog} onOpenChange={setShowAddContentDialog}>
        <DialogContent className="bg-zinc-900/95 backdrop-blur-xl border-zinc-800/50 max-w-5xl max-h-[90vh] overflow-hidden">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-white text-xl font-semibold">Add Content to Library</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Select uploads to add to your public content library. These will be visible to all visitors on your
              profile.
            </DialogDescription>
          </DialogHeader>

          {/* Upload Location section */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-white mb-3">Upload Location</h3>
            <FolderSelector
              selectedFolderId={selectedFolderId}
              onFolderSelect={setSelectedFolderId}
              className="w-full"
            />
          </div>

          <div className="flex-1 overflow-hidden">
            <UploadSelector
              excludeIds={freeContent.map((item) => item.id)}
              onSelect={handleAddSelectedContent}
              onCancel={() => setShowAddContentDialog(false)}
              loading={false}
              aspectRatio="portrait"
              selectedFolderId={selectedFolderId}
              showSelectionControls={true}
              selectButtonText="Add to Library"
              cancelButtonText="Cancel"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
