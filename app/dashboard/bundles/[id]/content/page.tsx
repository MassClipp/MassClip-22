"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { ArrowLeft, X, Loader2, Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ContentItem {
  id: string
  title: string
  fileUrl: string
  thumbnailUrl?: string
  contentType: "video" | "audio" | "image" | "other"
  createdAt: string
}

interface ProductBox {
  id: string
  title: string
  description: string
  price: number
  thumbnailUrl?: string
}

export default function BundleContentManagePage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()

  const [bundle, setBundle] = useState<ProductBox | null>(null)
  const [content, setContent] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [removeLoading, setRemoveLoading] = useState<string | null>(null)

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
      const response = await fetch(`/api/creator/bundles/${bundleId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch bundle content")
      }

      const data = await response.json()
      setBundle(data.productBox)
      setContent(data.productBox.detailedContentItems || [])
    } catch (err) {
      console.error("Error fetching bundle content:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch bundle content")
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveContent = async (contentId: string) => {
    try {
      setRemoveLoading(contentId)

      const token = await user.getIdToken()
      const response = await fetch(`/api/creator/bundles/${bundleId}/add-content`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ contentIds: [contentId] }),
      })

      if (!response.ok) {
        throw new Error("Failed to remove content")
      }

      setContent((prev) => prev.filter((item) => item.id !== contentId))
      toast({
        title: "Content removed",
        description: "Content has been removed from the bundle",
      })
    } catch (err) {
      console.error("Error removing content:", err)
      toast({
        title: "Error",
        description: "Failed to remove content from bundle",
        variant: "destructive",
      })
    } finally {
      setRemoveLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
            <span className="ml-2 text-zinc-400">Loading bundle content...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-7xl mx-auto">
          <Button onClick={() => router.back()} variant="ghost" className="mb-6 text-zinc-400 hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Bundles
          </Button>
          <div className="text-center py-12">
            <p className="text-red-400 mb-4">{error}</p>
            <Button onClick={fetchBundleContent} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button onClick={() => router.back()} variant="ghost" className="text-zinc-400 hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Bundles
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{bundle?.title}</h1>
              <p className="text-zinc-400 text-sm">{content.length} items in this bundle</p>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        {content.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📹</div>
            <h3 className="text-xl font-semibold mb-2">No content in this bundle</h3>
            <p className="text-zinc-400 mb-6">Add some content to get started</p>
            <Button onClick={() => router.back()} className="bg-red-600 hover:bg-red-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Content
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {content.map((item) => (
              <div key={item.id} className="group relative">
                <div className="relative aspect-[9/16] bg-zinc-900 rounded-lg overflow-hidden shadow-md border border-transparent hover:border-white/20 transition-all duration-300">
                  <button
                    onClick={() => handleRemoveContent(item.id)}
                    disabled={removeLoading === item.id}
                    className="absolute top-2 right-2 z-30 w-6 h-6 bg-black/80 hover:bg-black rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg disabled:opacity-50"
                    title="Remove from bundle"
                  >
                    {removeLoading === item.id ? (
                      <Loader2 className="w-3 h-3 text-white animate-spin" />
                    ) : (
                      <X className="w-3 h-3 text-white" />
                    )}
                  </button>

                  {item.contentType === "video" ? (
                    <video
                      src={item.fileUrl}
                      className="w-full h-full object-cover cursor-pointer"
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
                      onClick={() => window.open(item.fileUrl, "_blank")}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center cursor-pointer bg-zinc-800">
                      <div className="text-center">
                        <div className="text-2xl mb-1">
                          {item.contentType === "audio" ? "🎵" : item.contentType === "image" ? "🖼️" : "📄"}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Play overlay for videos */}
                  {item.contentType === "video" && (
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                  )}
                </div>

                {/* File info */}
                <div className="mt-2">
                  <p className="text-xs text-zinc-300 truncate font-light">{item.title}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
