"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Download, FileText, ImageIcon, Music, Video, AlertCircle, Eye, EyeOff } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "@/hooks/use-toast"

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
  const [showDebug, setShowDebug] = useState(false)
  const [debugData, setDebugData] = useState<any>(null)

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
      setDebugData(data)

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

  const handleDownloadItem = async (item: BundleContent) => {
    try {
      if (item.downloadUrl) {
        const a = document.createElement("a")
        a.href = item.downloadUrl
        a.download = item.title
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      } else {
        throw new Error("Download URL not available")
      }

      toast({
        title: "Download started",
        description: `${item.title} is being downloaded.`,
      })
    } catch (err) {
      console.error("Download error:", err)
      toast({
        title: "Download failed",
        description: "Failed to download the item. Please try again.",
        variant: "destructive",
      })
    }
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("video/")) return <Video className="h-5 w-5" />
    if (fileType.startsWith("audio/")) return <Music className="h-5 w-5" />
    if (fileType.startsWith("image/")) return <ImageIcon className="h-5 w-5" />
    return <FileText className="h-5 w-5" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const formatDuration = (seconds: number) => {
    if (!seconds) return ""
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-8 w-48 mb-6 bg-gray-800" />
          <div className="mb-8">
            <Skeleton className="h-12 w-64 mb-4 bg-gray-800" />
            <Skeleton className="h-6 w-32 mb-2 bg-gray-800" />
            <Skeleton className="h-10 w-48 bg-gray-800" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-64 bg-gray-800 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-6xl mx-auto">
          <Button onClick={() => router.back()} variant="ghost" className="mb-6 text-gray-400 hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Purchases
          </Button>
          <Alert variant="destructive" className="bg-red-900/20 border-red-800">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchBundleContent} className="mt-4 bg-red-600 hover:bg-red-700">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        <Button onClick={() => router.back()} variant="ghost" className="mb-6 text-gray-400 hover:text-white">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Purchases
        </Button>

        {/* Bundle Header */}
        <div className="mb-8">
          <div className="flex items-start gap-6 mb-6">
            {bundle?.thumbnailUrl && (
              <img
                src={bundle.thumbnailUrl || "/placeholder.svg"}
                alt={bundle.title}
                className="w-32 h-32 object-cover rounded-lg bg-gray-800"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = "none"
                }}
              />
            )}
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2">{bundle?.title}</h1>
              {bundle?.description && <p className="text-gray-400 mb-4">{bundle.description}</p>}
              <div className="flex items-center gap-4 mb-4">
                <span className="text-sm text-gray-400">{contents.length} items</span>
                <span className="text-sm text-gray-400">•</span>
                <span className="text-sm text-gray-400">by {bundle?.creatorUsername}</span>
              </div>
              <Button onClick={handleDownloadAll} className="bg-red-600 hover:bg-red-700">
                <Download className="h-4 w-4 mr-2" />
                Download All Content
              </Button>
            </div>
          </div>

          {/* Debug Toggle */}
          <Button onClick={() => setShowDebug(!showDebug)} variant="outline" size="sm" className="mb-4">
            {showDebug ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {showDebug ? "Hide Debug" : "Show Debug"}
          </Button>

          {/* Debug Info */}
          {showDebug && debugData && (
            <Card className="bg-gray-900 border-gray-700 mb-6">
              <CardHeader>
                <CardTitle className="text-white">Debug Information</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs text-gray-300 overflow-auto max-h-96">{JSON.stringify(debugData, null, 2)}</pre>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Bundle Contents */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Bundle Contents</h2>
          <p className="text-gray-400 mb-6">All items included in this bundle</p>

          {contents.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No content available</h3>
              <p className="text-gray-400">This bundle doesn't have any content items yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {contents.map((item) => (
                <Card key={item.id} className="bg-gray-900 border-gray-700 hover:bg-gray-800 transition-colors">
                  <CardContent className="p-4">
                    {/* Thumbnail */}
                    <div className="w-full h-32 bg-gray-800 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                      {item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl || "/placeholder.svg"}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = "none"
                            const parent = target.parentElement
                            if (parent) {
                              parent.innerHTML = `
                                <div class="flex items-center justify-center w-full h-full">
                                  ${getFileIcon(item.fileType).props.children}
                                </div>
                              `
                            }
                          }}
                        />
                      ) : (
                        <div className="text-gray-400">{getFileIcon(item.fileType)}</div>
                      )}
                    </div>

                    {/* Content Info */}
                    <h3 className="font-semibold text-white mb-2 truncate">{item.title}</h3>
                    {item.description && <p className="text-gray-400 text-sm mb-3 line-clamp-2">{item.description}</p>}

                    {/* Metadata */}
                    <div className="flex items-center gap-2 mb-4 text-xs text-gray-500">
                      <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                        {item.type}
                      </Badge>
                      {item.size > 0 && <span>{formatFileSize(item.size)}</span>}
                      {item.duration && <span>{formatDuration(item.duration)}</span>}
                    </div>

                    {/* Download Button */}
                    <Button
                      onClick={() => handleDownloadItem(item)}
                      variant="outline"
                      size="sm"
                      className="w-full border-gray-600 hover:bg-gray-700"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
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
