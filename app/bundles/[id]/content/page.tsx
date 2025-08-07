"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { useDownloadLimit } from "@/contexts/download-limit-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Download, Play, Lock, Package } from 'lucide-react'
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { toast } from "@/hooks/use-toast"
import { motion, AnimatePresence } from "framer-motion"

interface BundleContent {
  id: string
  title: string
  description?: string
  thumbnailUrl?: string
  videoUrl?: string
  downloadUrl?: string
  duration?: string
  size?: string
  type?: string
}

interface BundleData {
  id: string
  title: string
  description?: string
  thumbnailUrl?: string
  creatorId: string
  creatorUsername: string
  contentCount: number
  contents: BundleContent[]
  price?: number
  bundlePrice?: number
  purchaseAmount?: number
}

export default function BundleContentPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useFirebaseAuth()
  const { canDownload, recordDownload, downloadCount, downloadLimit } = useDownloadLimit()
  
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

      const token = await user.getIdToken()
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
      console.log("📦 [Bundle Content] Received data:", data)

      // Get bundle thumbnail from multiple sources with priority
      let bundleThumbnailUrl = null
      
      // Priority 1: bundleThumbnail from purchase record
      if (data.bundleThumbnail) {
        bundleThumbnailUrl = data.bundleThumbnail
        console.log("🖼️ [Bundle Content] Using bundleThumbnail from purchase:", bundleThumbnailUrl)
      }
      // Priority 2: thumbnailUrl from bundle data
      else if (data.bundle?.thumbnailUrl) {
        bundleThumbnailUrl = data.bundle.thumbnailUrl
        console.log("🖼️ [Bundle Content] Using thumbnailUrl from bundle:", bundleThumbnailUrl)
      }
      // Priority 3: bundleThumbnailUrl from bundle data
      else if (data.bundle?.bundleThumbnailUrl) {
        bundleThumbnailUrl = data.bundle.bundleThumbnailUrl
        console.log("🖼️ [Bundle Content] Using bundleThumbnailUrl from bundle:", bundleThumbnailUrl)
      }
      // Priority 4: First content item thumbnail
      else if (data.contents && data.contents.length > 0 && data.contents[0].thumbnailUrl) {
        bundleThumbnailUrl = data.contents[0].thumbnailUrl
        console.log("🖼️ [Bundle Content] Using first content thumbnail:", bundleThumbnailUrl)
      }

      // Calculate price from multiple sources
      let bundlePrice = 0
      if (data.bundlePrice !== undefined && data.bundlePrice !== null) {
        bundlePrice = Number(data.bundlePrice)
        console.log("💰 [Bundle Content] Using bundlePrice:", bundlePrice)
      } else if (data.purchaseAmount !== undefined && data.purchaseAmount !== null) {
        bundlePrice = Number(data.purchaseAmount) / 100
        console.log("💰 [Bundle Content] Using purchaseAmount converted:", bundlePrice)
      } else if (data.bundle?.price !== undefined && data.bundle?.price !== null) {
        bundlePrice = Number(data.bundle.price)
        console.log("💰 [Bundle Content] Using bundle price:", bundlePrice)
      }

      const bundleData: BundleData = {
        id: bundleId,
        title: data.bundle?.title || data.bundleTitle || "Untitled Bundle",
        description: data.bundle?.description || data.description || "",
        thumbnailUrl: bundleThumbnailUrl,
        creatorId: data.bundle?.creatorId || data.creatorId || "",
        creatorUsername: data.bundle?.creatorUsername || data.creatorUsername || "Unknown Creator",
        contentCount: data.contents?.length || 0,
        contents: data.contents || [],
        price: bundlePrice,
        bundlePrice: data.bundlePrice,
        purchaseAmount: data.purchaseAmount,
      }

      setBundle(bundleData)
      console.log("✅ [Bundle Content] Bundle data set:", bundleData)
    } catch (err) {
      console.error("❌ [Bundle Content] Error fetching bundle:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch bundle content")
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (content: BundleContent) => {
    if (!canDownload) {
      toast({
        title: "Download limit reached",
        description: `You've reached your monthly download limit of ${downloadLimit}. Upgrade to Creator Pro for unlimited downloads.`,
        variant: "destructive",
      })
      return
    }

    try {
      setDownloadingItems(prev => new Set(prev).add(content.id))

      const token = await user.getIdToken()
      const response = await fetch(`/api/direct-content/${content.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to download content")
      }

      // Record the download for free users
      await recordDownload()

      // Handle the download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${content.title || "content"}.mp4`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Download started",
        description: `${content.title} is being downloaded.`,
      })
    } catch (err) {
      console.error("Download error:", err)
      toast({
        title: "Download failed",
        description: "Failed to download the content. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDownloadingItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(content.id)
        return newSet
      })
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header Skeleton */}
          <div className="flex items-center gap-4 mb-8">
            <Skeleton className="h-10 w-10 bg-gray-800/50" />
            <Skeleton className="h-6 w-32 bg-gray-800/50" />
          </div>

          {/* Title and Thumbnail Skeleton */}
          <div className="flex items-start justify-between mb-8">
            <div className="flex-1">
              <Skeleton className="h-12 w-64 mb-4 bg-gray-800/50" />
              <Skeleton className="h-4 w-48 mb-2 bg-gray-800/50" />
              <Skeleton className="h-4 w-32 bg-gray-800/50" />
            </div>
            <Skeleton className="w-32 h-32 bg-gray-800/50 rounded-lg flex-shrink-0" />
          </div>

          {/* Content Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="bg-gray-900/50 border-gray-700">
                <CardContent className="p-0">
                  <Skeleton className="w-full h-48 bg-gray-800/50 rounded-t-lg" />
                  <div className="p-4">
                    <Skeleton className="h-6 w-full mb-2 bg-gray-800/50" />
                    <Skeleton className="h-4 w-24 bg-gray-800/50" />
                  </div>
                </CardContent>
              </Card>
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
            onClick={() => router.back()}
            variant="ghost"
            className="mb-8 text-gray-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Purchases
          </Button>

          <Alert variant="destructive" className="bg-red-900/20 border-red-800">
            <AlertDescription>{error}</AlertDescription>
          </Alert>

          <div className="mt-6 space-x-4">
            <Button onClick={fetchBundleContent} className="bg-white text-black hover:bg-gray-200">
              Try Again
            </Button>
            <Button asChild variant="outline" className="border-gray-600 hover:bg-gray-700">
              <Link href="/dashboard/purchases">Back to Purchases</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!bundle) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-7xl mx-auto">
          <Button
            onClick={() => router.back()}
            variant="ghost"
            className="mb-8 text-gray-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Purchases
          </Button>
          <div className="text-center py-12">
            <Package className="h-16 w-16 mx-auto mb-6 text-gray-400" />
            <h3 className="text-2xl font-semibold mb-4">Bundle not found</h3>
            <p className="text-gray-400 mb-8">The bundle you're looking for doesn't exist or you don't have access to it.</p>
            <Button asChild className="bg-white text-black hover:bg-gray-200">
              <Link href="/dashboard/purchases">Back to Purchases</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <Button
          onClick={() => router.back()}
          variant="ghost"
          className="mb-8 text-gray-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Purchases
        </Button>

        {/* Bundle Info Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-4">{bundle.title}</h1>
            <div className="flex items-center gap-4 text-gray-400 mb-2">
              <span>{bundle.contentCount} videos</span>
              <span>•</span>
              <span>by {bundle.creatorUsername}</span>
            </div>
            {bundle.description && (
              <p className="text-gray-300 text-lg mb-4 max-w-2xl">{bundle.description}</p>
            )}
            {bundle.price > 0 && (
              <Badge variant="secondary" className="bg-green-600/20 text-green-400 border-green-600/30">
                Purchased for ${bundle.price.toFixed(2)}
              </Badge>
            )}
          </div>

          {/* Bundle Thumbnail */}
          <div className="w-32 h-32 bg-gray-900 border border-gray-700 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 ml-8">
            {bundle.thumbnailUrl ? (
              <img
                src={bundle.thumbnailUrl || "/placeholder.svg"}
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
        </div>

        {/* Download Limit Info for Free Users */}
        {downloadLimit > 0 && (
          <div className="mb-6">
            <Alert className="bg-blue-900/20 border-blue-800">
              <AlertDescription>
                Downloads remaining: {downloadLimit - downloadCount} of {downloadLimit} this month.
                {downloadCount >= downloadLimit && (
                  <span className="text-red-400 ml-2">
                    Upgrade to Creator Pro for unlimited downloads.
                  </span>
                )}
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Content Grid */}
        <AnimatePresence>
          {bundle.contents.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <Package className="h-16 w-16 mx-auto mb-6 text-gray-400" />
              <h3 className="text-2xl font-semibold mb-4">No content available</h3>
              <p className="text-gray-400">This bundle doesn't contain any content yet.</p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {bundle.contents.map((content, index) => (
                <motion.div
                  key={content.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="bg-gray-900/50 border-gray-700 hover:border-gray-600 transition-all duration-300 group relative overflow-hidden">
                    <CardContent className="p-0">
                      {/* Video Thumbnail */}
                      <div className="relative aspect-video bg-gray-800 overflow-hidden">
                        {content.thumbnailUrl ? (
                          <img
                            src={content.thumbnailUrl || "/placeholder.svg"}
                            alt={content.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Play className="h-12 w-12 text-gray-500" />
                          </div>
                        )}

                        {/* Download Button Overlay */}
                        <div className="absolute bottom-2 right-2">
                          <Button
                            onClick={() => handleDownload(content)}
                            disabled={!canDownload || downloadingItems.has(content.id)}
                            size="sm"
                            className={`
                              ${!canDownload 
                                ? "bg-gray-600 hover:bg-gray-600 cursor-not-allowed" 
                                : "bg-black/70 hover:bg-black/90"
                              } 
                              text-white border-0 backdrop-blur-sm
                              ${downloadingItems.has(content.id) ? "animate-pulse" : ""}
                            `}
                          >
                            {!canDownload ? (
                              <Lock className="h-4 w-4" />
                            ) : downloadingItems.has(content.id) ? (
                              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>
                        </div>

                        {/* Duration Badge */}
                        {content.duration && (
                          <div className="absolute bottom-2 left-2">
                            <Badge variant="secondary" className="bg-black/70 text-white border-0 backdrop-blur-sm">
                              {content.duration}
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Content Info */}
                      <div className="p-4">
                        <h3 className="text-lg font-semibold text-white mb-1 truncate">
                          {content.title}
                        </h3>
                        {content.size && (
                          <p className="text-gray-400 text-sm">{content.size}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
