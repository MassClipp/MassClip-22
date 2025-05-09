"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ArrowLeft, Upload, FileVideo, Clock, Filter, Search, Plus, ExternalLink, Trash2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, query, orderBy, getDocs, doc, deleteDoc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { formatDistanceToNow } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { DeleteConfirmationModal } from "@/components/delete-confirmation-modal"

interface UploadType {
  id: string
  title: string
  description: string
  fileName: string
  fileSize: number
  status: string
  createdAt: any
  category: string
  tags: string[]
  isPremium: boolean
  visibility: string
  vimeoId: string | null
  vimeoLink: string | null
  thumbnail: string | null
  duration: number | null
}

export default function UploadsPage() {
  const [uploads, setUploads] = useState<UploadType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [uploadToDelete, setUploadToDelete] = useState<UploadType | null>(null)
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const fetchUploads = async () => {
      if (!user) {
        setIsLoading(false)
        return
      }

      try {
        const uploadsRef = collection(db, `users/${user.uid}/uploads`)
        const q = query(uploadsRef, orderBy("createdAt", "desc"))
        const querySnapshot = await getDocs(q)

        const uploadData: UploadType[] = []
        querySnapshot.forEach((doc) => {
          const data = doc.data()
          uploadData.push({
            id: doc.id,
            title: data.title || "Untitled",
            description: data.description || "",
            fileName: data.fileName || "",
            fileSize: data.fileSize || 0,
            status: data.status || "processing",
            createdAt: data.createdAt,
            category: data.category || "uncategorized",
            tags: data.tags || [],
            isPremium: data.isPremium || false,
            visibility: data.visibility || "public",
            vimeoId: data.vimeoId || null,
            vimeoLink: data.vimeoLink || null,
            thumbnail: data.thumbnail || null,
            duration: data.duration || null,
          })
        })

        setUploads(uploadData)
      } catch (error) {
        console.error("Error fetching uploads:", error)
        toast({
          title: "Error",
          description: "Failed to load your uploads. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchUploads()
  }, [user, toast])

  // Filter uploads based on search query and status filter
  const filteredUploads = uploads.filter((upload) => {
    const matchesSearch =
      upload.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      upload.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      upload.fileName.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === "all" || upload.status === statusFilter

    return matchesSearch && matchesStatus
  })

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  // Format date
  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Unknown"

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return formatDistanceToNow(date, { addSuffix: true })
    } catch (error) {
      return "Invalid date"
    }
  }

  // Format duration
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "Unknown"

    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)

    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "processing":
        return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30"
      case "ready":
        return "bg-green-500/20 text-green-500 border-green-500/30"
      case "failed":
        return "bg-red-500/20 text-red-500 border-red-500/30"
      default:
        return "bg-zinc-500/20 text-zinc-500 border-zinc-500/30"
    }
  }

  // Handle delete button click
  const handleDeleteClick = (upload: UploadType) => {
    setUploadToDelete(upload)
    setDeleteModalOpen(true)
  }

  // Handle delete confirmation
  const handleDeleteConfirm = async (deleteFromVimeo: boolean) => {
    if (!user || !uploadToDelete) return

    try {
      // Delete from Firestore
      await deleteDoc(doc(db, `users/${user.uid}/uploads`, uploadToDelete.id))

      // If requested and we have a Vimeo ID, also delete from Vimeo
      if (deleteFromVimeo && uploadToDelete.vimeoId) {
        try {
          const response = await fetch(`/api/vimeo/delete-video?videoId=${uploadToDelete.vimeoId}`, {
            method: "DELETE",
          })

          if (!response.ok) {
            const errorData = await response.json()
            console.error("Error deleting from Vimeo:", errorData)

            // Show a warning but don't fail the whole operation
            toast({
              title: "Partial success",
              description: "Video removed from your uploads but could not be deleted from Vimeo.",
              variant: "default",
            })
          }
        } catch (vimeoError) {
          console.error("Error deleting from Vimeo:", vimeoError)
          // Show a warning but don't fail the whole operation
          toast({
            title: "Partial success",
            description: "Video removed from your uploads but could not be deleted from Vimeo.",
            variant: "default",
          })
        }
      }

      // Update local state
      setUploads(uploads.filter((upload) => upload.id !== uploadToDelete.id))

      toast({
        title: "Video deleted",
        description: deleteFromVimeo
          ? "The video has been removed from your uploads and Vimeo."
          : "The video has been removed from your uploads.",
      })
    } catch (error) {
      console.error("Error deleting upload:", error)
      toast({
        title: "Error",
        description: "Failed to delete the video. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Authentication Required</h1>
          <p className="text-zinc-400 mb-6">Please log in to view your uploads</p>
          <Button onClick={() => router.push("/login")}>Log In</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Video"
        description={`Are you sure you want to delete "${uploadToDelete?.title}"? This action cannot be undone.`}
        showVimeoOption={!!uploadToDelete?.vimeoId}
      />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-zinc-800/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Dashboard</span>
          </Link>

          <div className="flex items-center gap-4">
            <Button
              onClick={() => router.push("/dashboard/upload")}
              className="bg-gradient-to-r from-crimson to-crimson-dark text-white hover:from-crimson-dark hover:to-crimson transition-all duration-300 shadow-lg shadow-crimson/20 hover:shadow-crimson/30"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Upload
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-24 pb-16 max-w-6xl">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">My Uploads</h1>
          <p className="text-zinc-400 mb-8">Manage your uploaded content</p>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500 w-4 h-4" />
            <input
              type="text"
              placeholder="Search uploads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-crimson/50 focus:border-transparent"
            />
          </div>

          <div className="flex gap-2">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500 w-4 h-4" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-zinc-900/50 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-crimson/50 focus:border-transparent appearance-none"
              >
                <option value="all">All Status</option>
                <option value="processing">Processing</option>
                <option value="ready">Ready</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            <Button
              variant="outline"
              className="border-zinc-800 bg-zinc-900/50 text-white hover:bg-zinc-800"
              onClick={() => {
                setSearchQuery("")
                setStatusFilter("all")
              }}
            >
              Reset
            </Button>
          </div>
        </div>

        {/* Uploads List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-crimson"></div>
          </div>
        ) : filteredUploads.length === 0 ? (
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-12 text-center">
            <FileVideo className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <h3 className="text-xl font-medium mb-2">No uploads found</h3>
            <p className="text-zinc-400 mb-6">
              {uploads.length === 0
                ? "You haven't uploaded any content yet."
                : "No uploads match your search criteria."}
            </p>
            <Button
              onClick={() => router.push("/dashboard/upload")}
              className="bg-gradient-to-r from-crimson to-crimson-dark text-white hover:from-crimson-dark hover:to-crimson"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Content
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredUploads.map((upload) => (
              <div
                key={upload.id}
                className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-4 md:p-6 hover:bg-zinc-900/50 transition-colors"
              >
                <div className="flex flex-col md:flex-row gap-4 md:items-center">
                  <div className="w-full md:w-auto md:flex-shrink-0">
                    <div className="aspect-video w-full md:w-48 bg-black rounded-lg flex items-center justify-center overflow-hidden relative">
                      {upload.thumbnail ? (
                        <Image
                          src={upload.thumbnail || "/placeholder.svg"}
                          alt={upload.title}
                          width={192}
                          height={108}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FileVideo className="w-8 h-8 text-zinc-700" />
                      )}

                      {upload.duration && (
                        <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                          {formatDuration(upload.duration)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                      <h3 className="text-lg font-medium">{upload.title}</h3>
                      <div
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border ${getStatusColor(upload.status)}`}
                      >
                        {upload.status.charAt(0).toUpperCase() + upload.status.slice(1)}
                      </div>
                    </div>

                    <p className="text-sm text-zinc-400 line-clamp-2 mb-3">{upload.description || "No description"}</p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-zinc-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Uploaded {formatDate(upload.createdAt)}</span>
                      </div>
                      <div>File: {upload.fileName}</div>
                      <div>Size: {formatFileSize(upload.fileSize)}</div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3">
                      {upload.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-zinc-800 text-zinc-300"
                        >
                          #{tag}
                        </span>
                      ))}

                      {upload.isPremium && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-amber-500/20 text-amber-500 border border-amber-500/30">
                          Premium
                        </span>
                      )}

                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-zinc-800 text-zinc-300">
                        {upload.visibility}
                      </span>
                    </div>
                  </div>

                  <div className="flex md:flex-col gap-2 mt-4 md:mt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-zinc-800 bg-zinc-900/50 text-white hover:bg-zinc-800"
                      onClick={() => router.push(`/dashboard/uploads/${upload.id}`)}
                    >
                      View Details
                    </Button>

                    {upload.status === "ready" && upload.vimeoLink && (
                      <a
                        href={upload.vimeoLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-zinc-800 bg-zinc-900/50 text-white hover:bg-zinc-800 h-9 px-3"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View on Vimeo
                      </a>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-900/30 bg-red-950/20 text-red-500 hover:bg-red-950/50 hover:text-red-400"
                      onClick={() => handleDeleteClick(upload)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
