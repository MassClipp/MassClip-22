"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, Download, ArrowLeft, Play, FileText, ImageIcon, Music, Video } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { toast } from "@/hooks/use-toast"

interface BundleContent {
  id: string
  title: string
  description?: string
  thumbnailUrl?: string
  creatorId: string
  creatorUsername: string
  items: Array<{
    id: string
    title: string
    type: string
    size?: number
    url?: string
    thumbnailUrl?: string
  }>
  totalItems: number
  totalSize: number
  price: number
  currency: string
}

export default function BundleContentPage() {
  const params = useParams()
  const bundleId = params.id as string
  const { user, loading: authLoading } = useFirebaseAuth()
  const [bundle, setBundle] = useState<BundleContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasAccess, setHasAccess] = useState(false)

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
      setBundle(data.bundle)
      setHasAccess(true)
    } catch (err) {
      console.error("Error fetching bundle content:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch bundle content")
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadBundle = async () => {
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
        description: `${bundle?.title} is being downloaded.`,
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

  const getFileIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "video":
      case "mp4":
      case "mov":
      case "avi":
        return <Video className="h-5 w-5 text-blue-400" />
      case "audio":
      case "mp3":
      case "wav":
        return <Music className="h-5 w-5 text-green-400" />
      case "image":
      case "jpg":
      case "png":
      case "gif":
        return <ImageIcon className="h-5 w-5 text-purple-400" />
      default:
        return <FileText className="h-5 w-5 text-gray-400" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
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
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                      <Skeleton className="h-12 w-12" />
                      <div className="flex-1">
                        <Skeleton className="h-5 w-48 mb-2" />
                        <Skeleton className="h-4 w-24" />
                      </div>
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

          <div className="mt-6 flex gap-4">
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

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl mb-2">{bundle.title}</CardTitle>
                <CardDescription className="text-base">
                  By {bundle.creatorUsername} • {bundle.totalItems} items • {formatFileSize(bundle.totalSize)}
                </CardDescription>
              </div>
              <Button onClick={handleDownloadBundle} className="bg-blue-600 hover:bg-blue-700">
                <Download className="h-4 w-4 mr-2" />
                Download All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Bundle Contents</h3>
              {bundle.items.map((item, index) => (
                <div key={item.id || index} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex-shrink-0">{getFileIcon(item.type)}</div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{item.title}</h4>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <Badge variant="secondary" className="text-xs">
                        {item.type.toUpperCase()}
                      </Badge>
                      {item.size && <span>{formatFileSize(item.size)}</span>}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Play className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
