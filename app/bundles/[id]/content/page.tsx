"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Download, Play, Lock, AlertCircle, Package } from 'lucide-react'
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "@/hooks/use-toast"
import { motion, AnimatePresence } from "framer-motion"
import { useDownloadLimit } from "@/contexts/download-limit-context"

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

interface BundleData {
  id: string
  title: string
  description: string
  price: number
  currency: string
  thumbnailUrl?: string
  coverImage?: string
  contentCount: number
  creator: {
    id: string
    username: string
    displayName?: string
  }
  contentItems: ContentItem[]
}

export default function BundleContentPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useFirebaseAuth()
  const { canDownload, recordDownload, downloadsRemaining } = useDownloadLimit()
  
  const [bundle, setBundle] = useState<BundleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadingItems, setDownloadingItems] = useState<Set<string>>(new Set())

  const bundleId = params.id as string

  useEffect(() => {
    if (user && bundleId) {
      fetchBundleContent()
    }
  }, [user, bundleId])

  const fetchBundleContent = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = await user?.getIdToken()
      const response = await fetch(`/api/bundles/${bundleId}/content`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("You don't have access to this bundle. Please purchase it first.")
        }
        throw new Error(`Failed to fetch bundle content: ${response.status}`)
      }

      const data = await response.json()
      
      // Get purchase data to get the thumbnail
      const purchaseResponse = await fetch("/api/user/unified-purchases", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      let bundleThumbnail = null
      if (purchaseResponse.ok) {
        const purchaseData = await purchaseResponse.json()
        const purchase = purchaseData.purchases?.find((p: any) => p.bundleId === bundleId)
        if (purchase) {
          bundleThumbnail = purchase.thumbnailUrl || purchase.metadata?.bundleThumbnail
          console.log(`🖼️ [Bundle Content] Found thumbnail from purchase: ${bundleThumbnail}`)
        }
      }

      setBundle({
        id: bundleId,
        title: data.bundle?.title || "Untitled Bundle",
        description: data.bundle?.description || "",
        price: data.bundle?.price || 0,
        currency: data.bundle?.currency || "usd",
        thumbnailUrl: bundleThumbnail || data.bundle?.thumbnailUrl || data.bundle?.coverImage,
        coverImage: bundleThumbnail || data.bundle?.coverImage || data.bundle?.thumbnailUrl,
        contentCount: data.contentItems?.length || 0,
        creator: data.bundle?.creator || { id: "", username: "Unknown Creator" },
        contentItems: data.contentItems || [],
      })

      console.log(`✅ [Bundle Content] Loaded bundle with thumbnail: ${bundleThumbnail}`)
    } catch (err) {
      console.error("Error fetching bundle content:", err)
      setError(err instanceof Error ? err.message : "Failed to load bundle content")
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (item: ContentItem) => {
    if (!canDownload()) {
      toast({
        title: "Download limit reached",
        description: `You've reached your monthly download limit. Upgrade to Creator Pro for unlimited downloads.`,
        variant: "destructive",
      })
      return
    }

    try {
      setDownloadingItems(prev => new Set(prev).add(item.id))

      console.log(`🔽 [Bundle Content] Starting download for: ${item.title}`)

      const token = await user?.getIdToken()
      const response = await fetch(item.fileUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      
      const a = document.createElement("a")
      a.href = url
      a.download = item.filename || `${item.title}.${item.mimeType.split("/")[1] || "file"}`
      document.body.appendChild(a)
      a.click()
      
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      // Record the download
      await recordDownload()

      toast({
        title: "Download started",
        description: `${item.title} is being downloaded.`,
      })

      console.log(`✅ [Bundle Content] Download completed for: ${item.title}`)
    } catch (error) {
      console.error("Download error:", error)
      toast({
        title: "Download failed",
        description: "Failed to download the file. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDownloadingItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(item.id)
        return newSet
      })
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

  const formatDuration = (seconds: number): string => {
    if (!seconds || seconds <= 0) return "0:00"
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-6 w-32 mb-8 bg-gray-800/50" />
          <div className="flex items-start gap-8 mb-8">
            <Skeleton className="w-32 h-32 bg-gray-800/50 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-8 w-64 mb-4 bg-gray-800/50" />
              <Skeleton className="h-4 w-32 mb-2 bg-gray-800/50" />
              <Skeleton className="h-4 w-24 bg-gray-800/50" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="aspect-[9/16] bg-gray-800/50 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-7xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-8 text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Purchases
          </Button>
          
          <Alert variant="destructive" className="bg-red-900/20 border-red-800">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  if (!bundle) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-7xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-8 text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Purchases
          </Button>
          
          <div className="text-center py-12">
            <Package className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-medium text-white mb-2">Bundle not found</h3>
            <p className="text-gray-400">This bundle may have been removed or you don't have access to it.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-8 text-gray-400 hover:text-white hover:bg-gray-800"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Purchases
        </Button>

        {/* Bundle Header */}
        <div className="flex items-start gap-8 mb-8">
          {/* Bundle Thumbnail */}
          <div className="w-32 h-32 bg-gray-900 border border-gray-700 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
            {bundle.thumbnailUrl || bundle.coverImage ? (
              <img
                src={bundle.thumbnailUrl || bundle.coverImage || "/placeholder.svg"}
                alt={bundle.title}
                className="w-full h-full object-cover rounded-lg"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = "none"
                  const parent = target.parentElement
                  if (parent) {
                    parent.innerHTML = `
                      <div class="w-full h-full flex items-center justify-center bg-gray-900 rounded-lg">
                        <svg class="h-12 w-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                        </svg>
                      </div>
                    `
                  }
                }}
              />
            ) : (
              <Package className="h-12 w-12 text-gray-500" />
            )}
          </div>

          {/* Bundle Info */}
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-2">{bundle.title}</h1>
            <p className="text-gray-400 mb-2">
              {bundle.contentCount} video{bundle.contentCount !== 1 ? "s" : ""} • by {bundle.creator.username}
            </p>
            {bundle.description && (
              <p className="text-gray-300 mb-4">{bundle.description}</p>
            )}
          </div>
        </div>

        {/* Download Limit Warning */}
        {!canDownload() && (
          <Alert className="mb-6 bg-amber-900/20 border-amber-700">
            <Lock className="h-4 w-4" />
            <AlertDescription>
              You've reached your monthly download limit of 15 files. Upgrade to Creator Pro for unlimited downloads.
            </AlertDescription>
          </Alert>
        )}

        {/* Content Grid */}
        {bundle.contentItems.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-medium text-white mb-2">No content available</h3>
            <p className="text-gray-400">This bundle doesn't contain any content items yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence>
              {bundle.contentItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Card className="bg-gray-900/50 border-gray-800 overflow-hidden group hover:border-gray-700 transition-all duration-300">
                    <div className="relative aspect-[9/16] bg-gray-900">
                      {/* Content Preview */}
                      {item.contentType === "video" ? (
                        <video
                          src={item.fileUrl}
                          className="w-full h-full object-cover"
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
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-800">
                          <div className="text-center">
                            <div className="text-4xl mb-2">
                              {item.contentType === "audio" ? "🎵" : 
                               item.contentType === "image" ? "🖼️" : "📄"}
                            </div>
                            <p className="text-xs text-gray-400">{item.contentType.toUpperCase()}</p>
                          </div>
                        </div>
                      )}

                      {/* Download Button */}
                      <div className="absolute bottom-3 right-3">
                        <Button
                          size="sm"
                          onClick={() => handleDownload(item)}
                          disabled={downloadingItems.has(item.id) || !canDownload()}
                          className={`
                            ${!canDownload() 
                              ? "bg-gray-700 text-gray-400 cursor-not-allowed" 
                              : "bg-black/70 hover:bg-black/90 text-white"
                            } 
                            backdrop-blur-sm border-0 transition-all duration-200
                          `}
                        >
                          {!canDownload() ? (
                            <Lock className="h-4 w-4" />
                          ) : downloadingItems.has(item.id) ? (
                            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                      </div>

                      {/* Play Overlay for Videos */}
                      {item.contentType === "video" && (
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
                          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                            <Play className="h-6 w-6 text-white ml-1" />
                          </div>
                        </div>
                      )}
                    </div>

                    <CardContent className="p-4">
                      <h3 className="font-medium text-white mb-2 truncate">{item.title}</h3>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{formatFileSize(item.fileSize)}</span>
                        {item.duration && (
                          <Badge variant="secondary" className="bg-gray-800 text-gray-300 text-xs">
                            {formatDuration(item.duration)}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Download Limit Info */}
        {canDownload() && (
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Downloads remaining this month: {downloadsRemaining}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
