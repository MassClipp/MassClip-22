"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Download, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "@/hooks/use-toast"
import EnhancedVideoCard from "@/components/enhanced-video-card"

interface BundleContent {
  id: string
  title: string
  description?: string
  type: string
  fileType: string
  size: number
  duration?: number
  thumbnailUrl?: string
  downloadUrl?: string
  createdAt: string
  metadata?: any
}

interface BundleInfo {
  id: string
  title: string
  description?: string
  creatorId: string
  creatorUsername: string
  thumbnailUrl?: string
  price: number
  currency: string
}

interface PurchaseInfo {
  purchaseId: string
  purchaseDate: string
  status: string
}

export default function BundleContentPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useFirebaseAuth()
  const [bundle, setBundle] = useState<BundleInfo | null>(null)
  const [contents, setContents] = useState<BundleContent[]>([])
  const [purchaseInfo, setPurchaseInfo] = useState<PurchaseInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
          throw new Error("You don't have access to this bundle")
        }
        throw new Error(`Failed to fetch bundle content: ${response.status}`)
      }

      const data = await response.json()
      console.log("Bundle content data:", data)

      setBundle(data.bundle)
      setContents(data.contents || [])
      setPurchaseInfo(data.purchaseInfo)
    } catch (err) {
      console.error("Error fetching bundle content:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch bundle content")
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadAll = async () => {
    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/bundles/${bundleId}/download`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to download bundle")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${bundle?.title || "bundle"}.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Download started",
        description: "Your bundle is being downloaded.",
      })
    } catch (err) {
      console.error("Download error:", err)
      toast({
        title: "Download failed",
        description: "Failed to download the bundle. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-8 w-48 mb-6 bg-gray-800" />

          {/* Header skeleton */}
          <div className="flex items-center gap-6 mb-8 pb-6">
            <Skeleton className="w-20 h-20 bg-gray-800 rounded-lg flex-shrink-0" />
            <div className="flex-1">
              <Skeleton className="h-8 w-64 mb-2 bg-gray-800" />
              <Skeleton className="h-4 w-32 mb-4 bg-gray-800" />
              <Skeleton className="h-10 w-48 bg-gray-800" />
            </div>
          </div>

          {/* Border line */}
          <div className="border-t border-white/10 mb-8"></div>

          {/* Video grid skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="w-full aspect-[9/16] bg-gray-800 rounded-lg" />
                <Skeleton className="h-4 w-full bg-gray-800" />
              </div>
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
          <Button onClick={() => router.back()} variant="ghost" className="mb-6 text-gray-400 hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Purchases
          </Button>
          <Alert variant="destructive" className="bg-red-900/20 border-red-800">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchBundleContent} className="mt-4 bg-white text-black hover:bg-gray-200">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <Button onClick={() => router.back()} variant="ghost" className="mb-6 text-gray-400 hover:text-white">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Purchases
        </Button>

        {/* Bundle Header - Thumbnail top left, title next to it */}
        <div className="flex items-center gap-6 mb-8 pb-6">
          {/* 1:1 Thumbnail */}
          <div className="w-20 h-20 bg-gray-800 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
            {bundle?.thumbnailUrl ? (
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
                      <div class="w-full h-full flex items-center justify-center bg-gray-800 rounded-lg">
                        <svg class="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                        </svg>
                      </div>
                    `
                  }
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-800 rounded-lg">
                <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  ></path>
                </svg>
              </div>
            )}
          </div>

          {/* Title and Info */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{bundle?.title}</h1>
            <div className="flex items-center gap-4 text-gray-400 text-sm mb-4">
              <span>{contents.length} videos</span>
              <span>•</span>
              <span>by {bundle?.creatorUsername}</span>
            </div>
            <Button onClick={handleDownloadAll} className="bg-white text-black hover:bg-gray-200">
              <Download className="h-4 w-4 mr-2" />
              Download All
            </Button>
          </div>
        </div>

        {/* Thin border line underneath */}
        <div className="border-t border-white/10 mb-8"></div>

        {/* Content Grid - 9:16 videos like creator uploads */}
        {contents.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No content available</h3>
            <p className="text-gray-400">This bundle doesn't have any content items yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {contents.map((content) => (
              <div key={content.id} className="space-y-2">
                <EnhancedVideoCard
                  id={content.id}
                  title={content.title}
                  fileUrl={content.downloadUrl || ""}
                  thumbnailUrl={content.thumbnailUrl}
                  fileSize={content.size}
                  mimeType={content.fileType}
                  aspectRatio="video"
                  showControls={true}
                  className="w-full"
                />
                <div className="px-1">
                  <h3 className="text-sm font-medium text-white truncate">{content.title}</h3>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
