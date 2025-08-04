"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/firebase/config"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Download, Play, Loader2 } from "lucide-react"
import Image from "next/image"

interface BundleContent {
  id: string
  title: string
  description: string
  type: string
  fileType: string
  size: number
  duration: number
  thumbnailUrl: string
  downloadUrl: string
  videoUrl: string
  createdAt: string
  metadata: any
}

interface Bundle {
  id: string
  title: string
  description: string
  creatorId: string
  creatorUsername: string
  thumbnailUrl: string
  price: number
  currency: string
}

interface BundleData {
  bundle: Bundle
  contents: BundleContent[]
  purchaseInfo: any
  hasAccess: boolean
}

export default function BundleContentPage({ params }: { params: { id: string } }) {
  const [user, loading] = useAuthState(auth)
  const [bundleData, setBundleData] = useState<BundleData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.push("/login")
      return
    }

    fetchBundleContent()
  }, [user, loading, router, params.id])

  const fetchBundleContent = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const token = await user?.getIdToken()

      const response = await fetch(`/api/bundles/${params.id}/content`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch bundle content")
      }

      const data = await response.json()
      setBundleData(data)
    } catch (error: any) {
      console.error("Error fetching bundle content:", error)
      setError(error.message || "Failed to load bundle content")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = (content: BundleContent) => {
    if (content.downloadUrl) {
      window.open(content.downloadUrl, "_blank")
    }
  }

  const handlePlay = (content: BundleContent) => {
    if (content.videoUrl) {
      window.open(content.videoUrl, "_blank")
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "Unknown size"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const formatDuration = (seconds: number) => {
    if (!seconds) return "Unknown duration"
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  if (loading || isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 30%, #262626 50%, #1a1a1a 70%, #0d0d0d 100%)",
        }}
      >
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 30%, #262626 50%, #1a1a1a 70%, #0d0d0d 100%)",
        }}
      >
        <div className="text-center max-w-md">
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-6 mb-6">
            <p className="text-red-400 mb-4">{error}</p>
            <Button onClick={fetchBundleContent} variant="outline" className="mr-4 bg-transparent">
              Try Again
            </Button>
            <Button onClick={() => router.push("/dashboard/purchases")} variant="outline">
              Back to Purchases
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!bundleData) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 30%, #262626 50%, #1a1a1a 70%, #0d0d0d 100%)",
        }}
      >
        <p className="text-gray-400">No bundle data found</p>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background: "linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 30%, #262626 50%, #1a1a1a 70%, #0d0d0d 100%)",
      }}
    >
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            onClick={() => router.push("/dashboard/purchases")}
            variant="outline"
            size="sm"
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Purchases
          </Button>
        </div>

        {/* Bundle Info */}
        <div className="mb-8">
          <div className="flex items-start gap-6">
            {bundleData.bundle.thumbnailUrl && (
              <div className="flex-shrink-0">
                <Image
                  src={bundleData.bundle.thumbnailUrl || "/placeholder.svg"}
                  alt={bundleData.bundle.title}
                  width={120}
                  height={120}
                  className="rounded-lg object-cover"
                />
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">{bundleData.bundle.title}</h1>
              <p className="text-gray-400 mb-4">{bundleData.bundle.description}</p>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>BY {bundleData.bundle.creatorUsername?.toUpperCase()}</span>
                <span>${(bundleData.bundle.price / 100).toFixed(2)}</span>
                <span>{bundleData.contents.length} ITEMS</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid gap-6">
          <h2 className="text-2xl font-semibold text-white">Bundle Contents</h2>

          {bundleData.contents.length === 0 ? (
            <Card className="bg-gray-900/50 border-gray-700">
              <CardContent className="p-8 text-center">
                <p className="text-gray-400">No content available in this bundle</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {bundleData.contents.map((content) => (
                <Card
                  key={content.id}
                  className="bg-gradient-to-r from-[#0d0d0d] via-[#1a1a1a] to-[#0d0d0d] border-white/20 hover:border-white/40 transition-all duration-300 rounded-lg"
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-6">
                      {/* Thumbnail */}
                      <div className="flex-shrink-0">
                        <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-800">
                          {content.thumbnailUrl ? (
                            <Image
                              src={content.thumbnailUrl || "/placeholder.svg"}
                              alt={content.title}
                              width={80}
                              height={80}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Play className="w-6 h-6 text-gray-500" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Content Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-white mb-1 truncate">{content.title}</h3>
                        {content.description && (
                          <p className="text-gray-400 text-sm mb-2 line-clamp-2">{content.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{content.type?.toUpperCase() || "VIDEO"}</span>
                          <span>{formatFileSize(content.size)}</span>
                          {content.duration > 0 && <span>{formatDuration(content.duration)}</span>}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0 flex gap-2">
                        {content.videoUrl && (
                          <Button
                            onClick={() => handlePlay(content)}
                            size="sm"
                            className="bg-white text-black hover:bg-gray-200"
                          >
                            <Play className="w-4 h-4 mr-1" />
                            Play
                          </Button>
                        )}
                        {content.downloadUrl && (
                          <Button
                            onClick={() => handleDownload(content)}
                            size="sm"
                            variant="outline"
                            className="border-gray-600 text-gray-300 hover:bg-gray-800"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Download
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
