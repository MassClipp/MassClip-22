"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Download, Play, Clock, HardDrive, Package } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"

interface ContentItem {
  id: string
  title: string
  displayTitle: string
  description: string
  fileUrl: string
  downloadUrl: string
  thumbnailUrl: string
  filename: string
  mimeType: string
  fileSize: number
  displaySize: string
  duration: number
  durationFormatted: string
  contentType: string
  format: string
  quality: string
  tags: string[]
}

interface BundleData {
  id: string
  title: string
  description: string
  thumbnailUrl: string
  coverImageUrl: string
  customPreviewThumbnail: string
  price: number
  currency: string
  creatorUsername: string
  creatorDisplayName: string
  contentCount: number
  totalSize: number
  totalSizeFormatted: string
  contentItems: ContentItem[]
}

export default function BundleContentPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [bundleData, setBundleData] = useState<BundleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloadingItems, setDownloadingItems] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchBundleContent()
  }, [params.id])

  const fetchBundleContent = async () => {
    try {
      const response = await fetch(`/api/bundles/${params.id}/content`)
      if (!response.ok) {
        throw new Error("Failed to fetch bundle content")
      }
      const data = await response.json()
      setBundleData(data)
    } catch (error) {
      console.error("Error fetching bundle content:", error)
      toast({
        title: "Error",
        description: "Failed to load bundle content",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (item: ContentItem) => {
    if (!item.downloadUrl && !item.fileUrl) {
      toast({
        title: "Download Error",
        description: "No download URL available for this item",
        variant: "destructive",
      })
      return
    }

    setDownloadingItems((prev) => new Set(prev).add(item.id))

    try {
      const downloadUrl = item.downloadUrl || item.fileUrl

      // Create a temporary link element to trigger download
      const link = document.createElement("a")
      link.href = downloadUrl
      link.download = item.filename || `${item.title}.${item.format || "mp4"}`
      link.target = "_blank"
      link.rel = "noopener noreferrer"

      // Append to body, click, and remove
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Download Started",
        description: `Downloading ${item.title}`,
      })
    } catch (error) {
      console.error("Download error:", error)
      toast({
        title: "Download Failed",
        description: "Failed to start download",
        variant: "destructive",
      })
    } finally {
      // Remove from downloading set after a delay
      setTimeout(() => {
        setDownloadingItems((prev) => {
          const newSet = new Set(prev)
          newSet.delete(item.id)
          return newSet
        })
      }, 2000)
    }
  }

  const getBundleThumbnail = () => {
    if (!bundleData) return "/placeholder.svg?height=200&width=200"
    return (
      bundleData.thumbnailUrl ||
      bundleData.coverImageUrl ||
      bundleData.customPreviewThumbnail ||
      "/placeholder.svg?height=200&width=200"
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-48 mb-6"></div>
            <div className="flex justify-between items-start mb-8">
              <div>
                <div className="h-10 bg-gray-700 rounded w-64 mb-4"></div>
                <div className="h-4 bg-gray-700 rounded w-32"></div>
              </div>
              <div className="w-32 h-32 bg-gray-700 rounded-lg"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gray-800 rounded-lg p-4">
                  <div className="aspect-video bg-gray-700 rounded mb-4"></div>
                  <div className="h-6 bg-gray-700 rounded mb-2"></div>
                  <div className="h-4 bg-gray-700 rounded w-24"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!bundleData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Bundle Not Found</h1>
          <p className="text-gray-400 mb-6">The requested bundle could not be found or you don't have access to it.</p>
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <Button onClick={() => router.back()} variant="ghost" className="text-gray-400 hover:text-white mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Purchases
        </Button>

        {/* Bundle Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start mb-8 gap-6">
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-white mb-2">{bundleData.title}</h1>
            <p className="text-gray-400 mb-4">
              {bundleData.contentCount} video{bundleData.contentCount !== 1 ? "s" : ""} • by{" "}
              {bundleData.creatorDisplayName}
            </p>
            {bundleData.description && <p className="text-gray-300 mb-4">{bundleData.description}</p>}
            <div className="flex flex-wrap gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-1">
                <Package className="w-4 h-4" />
                {bundleData.contentCount} items
              </div>
              <div className="flex items-center gap-1">
                <HardDrive className="w-4 h-4" />
                {bundleData.totalSizeFormatted}
              </div>
            </div>
          </div>

          {/* Bundle Thumbnail */}
          <div className="flex-shrink-0">
            <div className="w-32 h-32 lg:w-48 lg:h-48 rounded-lg overflow-hidden bg-gray-800 border border-gray-700">
              <Image
                src={getBundleThumbnail() || "/placeholder.svg"}
                alt={bundleData.title}
                width={192}
                height={192}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = "/placeholder.svg?height=192&width=192"
                }}
              />
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {bundleData.contentItems.map((item) => (
            <Card key={item.id} className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors group">
              <CardContent className="p-0">
                {/* Video Thumbnail */}
                <div className="relative aspect-video bg-gray-900 rounded-t-lg overflow-hidden">
                  {item.thumbnailUrl ? (
                    <Image
                      src={item.thumbnailUrl || "/placeholder.svg"}
                      alt={item.title}
                      fill
                      className="object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = "/placeholder.svg?height=200&width=300&text=Video"
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="w-12 h-12 text-gray-600" />
                    </div>
                  )}

                  {/* Duration Badge */}
                  {item.duration > 0 && (
                    <Badge variant="secondary" className="absolute bottom-2 right-2 bg-black/70 text-white border-0">
                      <Clock className="w-3 h-3 mr-1" />
                      {item.durationFormatted}
                    </Badge>
                  )}

                  {/* Download Button - Appears on Hover */}
                  <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      onClick={() => handleDownload(item)}
                      disabled={downloadingItems.has(item.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white border-0"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      {downloadingItems.has(item.id) ? "Downloading..." : "Download"}
                    </Button>
                  </div>
                </div>

                {/* Content Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-white mb-2 line-clamp-2">{item.displayTitle}</h3>

                  <div className="flex justify-between items-center text-sm text-gray-400 mb-3">
                    <span>{item.displaySize}</span>
                    <Badge variant="outline" className="text-xs">
                      {item.quality}
                    </Badge>
                  </div>

                  {item.description && <p className="text-sm text-gray-500 line-clamp-2 mb-3">{item.description}</p>}

                  {/* Tags */}
                  {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {item.tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{item.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {bundleData.contentItems.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Content Available</h3>
            <p className="text-gray-400">This bundle doesn't contain any content items yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}
