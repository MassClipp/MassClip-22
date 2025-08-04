"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertCircle,
  Download,
  FileText,
  ImageIcon,
  Video,
  Music,
  Archive,
  ArrowLeft,
  ExternalLink,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { toast } from "@/hooks/use-toast"

interface BundleContent {
  id: string
  title: string
  description?: string
  type: string
  size?: number
  url?: string
  thumbnailUrl?: string
  createdAt?: any
  metadata?: any
  originalData?: any
}

interface Bundle {
  id: string
  title: string
  description?: string
  price: number
  creatorId: string
  creatorName?: string
  thumbnailUrl?: string
  contents: BundleContent[]
  totalSize?: number
  contentCount: number
  purchaseId?: string
  purchaseData?: any
}

export default function BundleContentPage() {
  const params = useParams()
  const bundleId = params.id as string
  const { user, loading: authLoading } = useFirebaseAuth()
  const [bundle, setBundle] = useState<Bundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [debugMode, setDebugMode] = useState(false)

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
      console.log("Bundle data received:", data)
      setBundle(data.bundle)
    } catch (err) {
      console.error("Error fetching bundle content:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch bundle content")
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (contentId?: string) => {
    try {
      const token = await user.getIdToken()
      const endpoint = contentId
        ? `/api/bundles/${bundleId}/content/${contentId}/download`
        : `/api/bundles/${bundleId}/download`

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to download content")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = contentId ? `${contentId}.zip` : `${bundle?.title || "bundle"}.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Download started",
        description: contentId ? "Content item is being downloaded." : "Bundle is being downloaded.",
      })
    } catch (err) {
      console.error("Download error:", err)
      toast({
        title: "Download failed",
        description: "Failed to download the content. Please try again.",
        variant: "destructive",
      })
    }
  }

  const getFileIcon = (type: string) => {
    const iconClass = "h-5 w-5"
    switch (type.toLowerCase()) {
      case "video":
      case "mp4":
      case "mov":
      case "avi":
      case "webm":
        return <Video className={`${iconClass} text-blue-500`} />
      case "image":
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
      case "webp":
        return <ImageIcon className={`${iconClass} text-green-500`} />
      case "audio":
      case "mp3":
      case "wav":
      case "flac":
      case "m4a":
        return <Music className={`${iconClass} text-purple-500`} />
      case "document":
      case "pdf":
      case "doc":
      case "docx":
      case "txt":
        return <FileText className={`${iconClass} text-orange-500`} />
      case "archive":
      case "zip":
      case "rar":
      case "7z":
        return <Archive className={`${iconClass} text-gray-500`} />
      default:
        return <FileText className={`${iconClass} text-gray-400`} />
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return "Unknown size"
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i]
  }

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-8 w-32 mb-6" />
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-8 w-64 mb-2" />
                <Skeleton className="h-4 w-96" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                      <Skeleton className="h-10 w-10" />
                      <div className="flex-1">
                        <Skeleton className="h-5 w-48 mb-2" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                      <Skeleton className="h-9 w-24" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" asChild className="mb-6">
            <Link href="/dashboard/purchases">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Purchases
            </Link>
          </Button>

          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>

          <div className="mt-6 space-x-4">
            <Button onClick={fetchBundleContent} variant="outline">
              Try Again
            </Button>
            <Button asChild>
              <Link href="/dashboard/purchases">Back to Purchases</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!bundle) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" asChild className="mb-6">
            <Link href="/dashboard/purchases">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Purchases
            </Link>
          </Button>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Bundle not found.</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/dashboard/purchases">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Purchases
          </Link>
        </Button>

        <div className="grid gap-6">
          {/* Bundle Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-2xl mb-2">{bundle.title}</CardTitle>
                  {bundle.description && (
                    <CardDescription className="text-base mb-4">{bundle.description}</CardDescription>
                  )}
                  <div className="flex items-center gap-4 flex-wrap">
                    <Badge variant="secondary">{bundle.contentCount} items</Badge>
                    {bundle.totalSize && bundle.totalSize > 0 && (
                      <Badge variant="outline">{formatFileSize(bundle.totalSize)}</Badge>
                    )}
                    {bundle.creatorName && (
                      <span className="text-sm text-muted-foreground">by {bundle.creatorName}</span>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => setDebugMode(!debugMode)} className="text-xs">
                      {debugMode ? "Hide Debug" : "Show Debug"}
                    </Button>
                  </div>
                </div>
                {bundle.thumbnailUrl && (
                  <img
                    src={bundle.thumbnailUrl || "/placeholder.svg"}
                    alt={bundle.title}
                    className="w-24 h-24 object-cover rounded-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = "none"
                    }}
                  />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Button onClick={() => handleDownload()} className="w-full sm:w-auto">
                <Download className="h-4 w-4 mr-2" />
                Download All Content
              </Button>
            </CardContent>
          </Card>

          {/* Debug Information */}
          {debugMode && bundle.purchaseData && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="text-lg text-yellow-800">Debug Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  <div>
                    <strong>Purchase ID:</strong> {bundle.purchaseId}
                  </div>
                  <div>
                    <strong>Available Purchase Data Fields:</strong>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {Object.keys(bundle.purchaseData).map((key) => (
                        <Badge key={key} variant="outline" className="text-xs">
                          {key}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <strong>Raw Purchase Data:</strong>
                    <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                      {JSON.stringify(bundle.purchaseData, null, 2)}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Content List */}
          <Card>
            <CardHeader>
              <CardTitle>Bundle Contents</CardTitle>
              <CardDescription>All items included in this bundle</CardDescription>
            </CardHeader>
            <CardContent>
              {bundle.contents && bundle.contents.length > 0 ? (
                <div className="space-y-4">
                  {bundle.contents.map((content, index) => (
                    <div
                      key={content.id || index}
                      className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-shrink-0 w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                        {content.thumbnailUrl ? (
                          <img
                            src={content.thumbnailUrl || "/placeholder.svg"}
                            alt={content.title}
                            className="w-full h-full object-cover rounded-lg"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = "none"
                              const parent = target.parentElement
                              if (parent) {
                                parent.innerHTML = `<div class="w-full h-full flex items-center justify-center">${getFileIcon(content.type).props.children}</div>`
                              }
                            }}
                          />
                        ) : (
                          getFileIcon(content.type)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{content.title}</h4>
                        {content.description && (
                          <p className="text-sm text-muted-foreground truncate">{content.description}</p>
                        )}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Badge variant="outline" className="text-xs">
                            {content.type}
                          </Badge>
                          {content.size && content.size > 0 && <span>{formatFileSize(content.size)}</span>}
                        </div>
                        {debugMode && (
                          <div className="mt-2 text-xs text-gray-500">
                            <strong>ID:</strong> {content.id} | <strong>URL:</strong> {content.url ? "✓" : "✗"}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {content.url && (
                          <Button variant="outline" size="sm" onClick={() => window.open(content.url, "_blank")}>
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => handleDownload(content.id)}>
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No content available</h3>
                  <p className="text-muted-foreground mb-4">This bundle doesn't have any content items yet.</p>
                  {debugMode && (
                    <div className="text-sm text-gray-500">
                      <p>Debug: Bundle object keys: {bundle ? Object.keys(bundle).join(", ") : "none"}</p>
                      <p>Contents array length: {bundle?.contents?.length || 0}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
