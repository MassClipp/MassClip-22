"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore"
import { db } from "@/firebase/firebase"
import CreatorProfile from "@/components/CreatorProfile"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ChevronDown, Play, Download, FileText, ImageIcon, Video } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import Link from "next/link"
import { notFound } from "next/navigation"

interface Creator {
  id: string
  username: string
  displayName?: string
  bio?: string
  profilePic?: string
  instagramHandle?: string
  xHandle?: string
  tiktokHandle?: string
  memberSince?: string
  freeContentCount?: number
  premiumContentCount?: number
}

interface Upload {
  id: string
  title: string
  description?: string
  thumbnailUrl?: string
  downloadUrl?: string
  fileType?: string
  mimeType?: string
  createdAt: any
  isFree?: boolean
  price?: number
  tags?: string[]
  category?: string
}

interface ProductBox {
  id: string
  title: string
  description?: string
  price: number
  thumbnailUrl?: string
  contentItems?: string[]
  createdAt: any
}

type ContentType = "all" | "videos" | "images" | "files"

const getContentType = (upload: Upload): ContentType => {
  const mimeType = upload.mimeType?.toLowerCase() || ""
  const fileType = upload.fileType?.toLowerCase() || ""

  if (mimeType.startsWith("video/") || fileType === "video") {
    return "videos"
  } else if (mimeType.startsWith("image/") || fileType === "image") {
    return "images"
  } else {
    return "files"
  }
}

const getContentTypeIcon = (type: ContentType) => {
  switch (type) {
    case "videos":
      return <Video className="w-4 h-4" />
    case "images":
      return <ImageIcon className="w-4 h-4" />
    case "files":
      return <FileText className="w-4 h-4" />
    default:
      return null
  }
}

const getContentTypeLabel = (type: ContentType) => {
  switch (type) {
    case "videos":
      return "Videos"
    case "images":
      return "Images"
    case "files":
      return "Files"
    default:
      return "All Content"
  }
}

export default function CreatorPage() {
  const params = useParams()
  const username = params.username as string

  const [creator, setCreator] = useState<Creator | null>(null)
  const [freeUploads, setFreeUploads] = useState<Upload[]>([])
  const [productBoxes, setProductBoxes] = useState<ProductBox[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"free" | "premium">("free")
  const [contentTypeFilter, setContentTypeFilter] = useState<ContentType>("all")
  const [availableContentTypes, setAvailableContentTypes] = useState<ContentType[]>([])

  useEffect(() => {
    if (username) {
      loadCreatorData()
    }
  }, [username])

  useEffect(() => {
    // Determine available content types from uploads
    const types = new Set<ContentType>()
    freeUploads.forEach((upload) => {
      types.add(getContentType(upload))
    })
    setAvailableContentTypes(Array.from(types))

    // Reset filter if current filter is not available
    if (contentTypeFilter !== "all" && !types.has(contentTypeFilter)) {
      setContentTypeFilter("all")
    }
  }, [freeUploads, contentTypeFilter])

  const loadCreatorData = async () => {
    try {
      setLoading(true)

      // Find creator by username
      const creatorsQuery = query(collection(db, "creators"), where("username", "==", username), limit(1))
      const creatorsSnapshot = await getDocs(creatorsQuery)

      if (creatorsSnapshot.empty) {
        notFound()
        return
      }

      const creatorDoc = creatorsSnapshot.docs[0]
      const creatorData = {
        id: creatorDoc.id,
        ...creatorDoc.data(),
      } as Creator

      setCreator(creatorData)

      // Load free uploads
      const uploadsQuery = query(
        collection(db, "uploads"),
        where("creatorId", "==", creatorDoc.id),
        where("isFree", "==", true),
        orderBy("createdAt", "desc"),
      )
      const uploadsSnapshot = await getDocs(uploadsQuery)
      const uploads = uploadsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Upload[]

      setFreeUploads(uploads)

      // Load product boxes (premium content)
      const productBoxQuery = query(
        collection(db, "productBoxes"),
        where("creatorId", "==", creatorDoc.id),
        orderBy("createdAt", "desc"),
      )
      const productBoxSnapshot = await getDocs(productBoxQuery)
      const boxes = productBoxSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ProductBox[]

      setProductBoxes(boxes)

      // Update creator stats
      setCreator((prev) =>
        prev
          ? {
              ...prev,
              freeContentCount: uploads.length,
              premiumContentCount: boxes.length,
            }
          : null,
      )
    } catch (error) {
      console.error("Error loading creator data:", error)
      toast.error("Failed to load creator profile")
    } finally {
      setLoading(false)
    }
  }

  const filteredUploads =
    contentTypeFilter === "all"
      ? freeUploads
      : freeUploads.filter((upload) => getContentType(upload) === contentTypeFilter)

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ""
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i]
  }

  const handleDownload = async (upload: Upload) => {
    if (!upload.downloadUrl) {
      toast.error("Download not available")
      return
    }

    try {
      const response = await fetch(upload.downloadUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.style.display = "none"
      a.href = url
      a.download = upload.title || "download"
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success("Download started")
    } catch (error) {
      console.error("Download error:", error)
      toast.error("Download failed")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-shrink-0">
              <div className="flex flex-col items-center lg:items-start space-y-4">
                <Skeleton className="w-32 h-32 rounded-full" />
                <div className="text-center lg:text-left space-y-2">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-16 w-64" />
              </div>
            </div>
            <div className="flex-1 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!creator) {
    notFound()
    return null
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <CreatorProfile creator={creator} onRefresh={loadCreatorData} />

        {/* Content Section */}
        <div className="mt-12">
          <div className="flex items-center gap-4 mb-6">
            {/* Content Type Filter Dropdown - only show if multiple types exist */}
            {availableContentTypes.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2 bg-transparent">
                    {getContentTypeIcon(contentTypeFilter)}
                    {getContentTypeLabel(contentTypeFilter)}
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => setContentTypeFilter("all")}>All Content</DropdownMenuItem>
                  {availableContentTypes.map((type) => (
                    <DropdownMenuItem
                      key={type}
                      onClick={() => setContentTypeFilter(type)}
                      className="flex items-center gap-2"
                    >
                      {getContentTypeIcon(type)}
                      {getContentTypeLabel(type)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Content Tabs */}
            <div className="flex border-b border-gray-700">
              <button
                onClick={() => setActiveTab("free")}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === "free"
                    ? "text-orange-500 border-b-2 border-orange-500"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Free Content
                {creator.freeContentCount !== undefined && (
                  <Badge variant="secondary" className="ml-2">
                    {filteredUploads.length}
                  </Badge>
                )}
              </button>
              <button
                onClick={() => setActiveTab("premium")}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === "premium"
                    ? "text-orange-500 border-b-2 border-orange-500"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Premium Content
                {creator.premiumContentCount !== undefined && (
                  <Badge variant="secondary" className="ml-2">
                    {creator.premiumContentCount}
                  </Badge>
                )}
              </button>
            </div>
          </div>

          {/* Content Grid */}
          {activeTab === "free" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredUploads.length > 0 ? (
                filteredUploads.map((upload) => {
                  const contentType = getContentType(upload)

                  return (
                    <Card
                      key={upload.id}
                      className="bg-gray-900 border-gray-700 overflow-hidden group hover:border-orange-500 transition-colors"
                    >
                      <div className="relative aspect-video bg-gray-800">
                        {upload.thumbnailUrl ? (
                          <img
                            src={upload.thumbnailUrl || "/placeholder.svg"}
                            alt={upload.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            {getContentTypeIcon(contentType)}
                          </div>
                        )}

                        {contentType === "videos" && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50">
                            <Play className="w-12 h-12 text-white" />
                          </div>
                        )}

                        <div className="absolute top-2 right-2">
                          <Badge variant="secondary" className="text-xs">
                            {getContentTypeLabel(contentType)}
                          </Badge>
                        </div>
                      </div>

                      <CardContent className="p-4">
                        <h3 className="font-semibold text-white mb-2 line-clamp-2">{upload.title}</h3>

                        {upload.description && (
                          <p className="text-gray-400 text-sm mb-3 line-clamp-2">{upload.description}</p>
                        )}

                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-green-500 border-green-500">
                            Free
                          </Badge>

                          <Button
                            onClick={() => handleDownload(upload)}
                            size="sm"
                            className="bg-orange-500 hover:bg-orange-600"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        </div>

                        {upload.tags && upload.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {upload.tags.slice(0, 3).map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })
              ) : (
                <div className="col-span-full text-center py-12">
                  <p className="text-gray-400 text-lg">
                    {contentTypeFilter === "all" ? "No free content available" : `No ${contentTypeFilter} available`}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {productBoxes.length > 0 ? (
                productBoxes.map((box) => (
                  <Link key={box.id} href={`/product-box/${box.id}/content`}>
                    <Card className="bg-gray-900 border-gray-700 overflow-hidden group hover:border-orange-500 transition-colors cursor-pointer">
                      <div className="relative aspect-video bg-gray-800">
                        {box.thumbnailUrl ? (
                          <img
                            src={box.thumbnailUrl || "/placeholder.svg"}
                            alt={box.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FileText className="w-12 h-12 text-gray-500" />
                          </div>
                        )}

                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
                            View Details
                          </Button>
                        </div>
                      </div>

                      <CardContent className="p-4">
                        <h3 className="font-semibold text-white mb-2 line-clamp-2">{box.title}</h3>

                        {box.description && (
                          <p className="text-gray-400 text-sm mb-3 line-clamp-2">{box.description}</p>
                        )}

                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-orange-500 border-orange-500">
                            ${box.price}
                          </Badge>

                          {box.contentItems && (
                            <span className="text-gray-400 text-sm">{box.contentItems.length} items</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <p className="text-gray-400 text-lg">No premium content available</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
