"use client"

import { useEffect, useState } from "react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Download, FileText, Video, Music, ImageIcon, Archive, AlertCircle, Calendar, DollarSign } from "lucide-react"
import { format } from "date-fns"

interface ContentItem {
  id: string
  title: string
  fileType?: string
  fileSize?: number
  duration?: number
  downloadUrl?: string
  thumbnailUrl?: string
}

interface Purchase {
  id: string
  bundleId: string
  bundleTitle: string
  bundleDescription?: string
  bundleThumbnail?: string
  creatorId: string
  creatorUsername?: string
  amount: number
  currency: string
  status: string
  purchaseDate: any
  contentItems?: ContentItem[]
  stripeSessionId?: string
}

function getContentTypeFromFileType(fileType?: string): string {
  if (!fileType || typeof fileType !== "string") return "file"

  const type = fileType.toLowerCase()
  if (type.includes("video") || type.includes("mp4") || type.includes("mov") || type.includes("avi")) {
    return "video"
  }
  if (type.includes("audio") || type.includes("mp3") || type.includes("wav") || type.includes("m4a")) {
    return "audio"
  }
  if (type.includes("image") || type.includes("jpg") || type.includes("png") || type.includes("gif")) {
    return "image"
  }
  if (type.includes("zip") || type.includes("rar") || type.includes("archive")) {
    return "archive"
  }
  return "file"
}

function getFileTypeIcon(fileType?: string) {
  const contentType = getContentTypeFromFileType(fileType)

  switch (contentType) {
    case "video":
      return <Video className="h-4 w-4" />
    case "audio":
      return <Music className="h-4 w-4" />
    case "image":
      return <ImageIcon className="h-4 w-4" />
    case "archive":
      return <Archive className="h-4 w-4" />
    default:
      return <FileText className="h-4 w-4" />
  }
}

function formatFileSize(bytes?: number): string {
  if (!bytes || typeof bytes !== "number") return "Unknown size"

  const sizes = ["Bytes", "KB", "MB", "GB"]
  if (bytes === 0) return "0 Bytes"

  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i]
}

function formatDuration(seconds?: number): string {
  if (!seconds || typeof seconds !== "number") return ""

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
}

function formatCurrency(amount: number, currency = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100) // Stripe amounts are in cents
}

export default function PurchasesPage() {
  const { user, loading: authLoading } = useFirebaseAuth()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      setError("Please log in to view your purchases")
      setLoading(false)
      return
    }

    fetchPurchases()
  }, [user, authLoading])

  const fetchPurchases = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/user/purchases")

      if (!response.ok) {
        throw new Error(`Failed to fetch purchases: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      setPurchases(data.purchases || [])
    } catch (error: any) {
      console.error("Error fetching purchases:", error)
      setError(error.message || "Failed to load purchases")
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (contentItem: ContentItem) => {
    if (!contentItem.downloadUrl) {
      alert("Download URL not available")
      return
    }

    try {
      // Use the proxy download endpoint to handle authentication
      const response = await fetch("/api/download-proxy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: contentItem.downloadUrl,
          filename: contentItem.title || "download",
        }),
      })

      if (!response.ok) {
        throw new Error("Download failed")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = contentItem.title || "download"
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Download error:", error)
      alert("Failed to download file")
    }
  }

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-64" />
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={fetchPurchases} className="mt-4">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Purchases</h1>
        <p className="text-muted-foreground">Access and download your purchased content bundles</p>
      </div>

      {purchases.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">No purchases yet</h3>
              <p className="text-muted-foreground mb-4">When you purchase content bundles, they'll appear here</p>
              <Button onClick={() => (window.location.href = "/dashboard/explore")}>Explore Content</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {purchases.map((purchase) => (
            <Card key={purchase.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">{purchase.bundleTitle}</CardTitle>
                    <CardDescription className="mb-3">{purchase.bundleDescription}</CardDescription>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {purchase.purchaseDate?.toDate
                          ? format(purchase.purchaseDate.toDate(), "MMM d, yyyy")
                          : "Unknown date"}
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        {formatCurrency(purchase.amount, purchase.currency)}
                      </div>
                      {purchase.creatorUsername && <div>by @{purchase.creatorUsername}</div>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={purchase.status === "completed" ? "default" : "secondary"}>{purchase.status}</Badge>
                    {purchase.bundleThumbnail && (
                      <img
                        src={purchase.bundleThumbnail || "/placeholder.svg"}
                        alt={purchase.bundleTitle}
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}
                  </div>
                </div>
              </CardHeader>

              {purchase.contentItems && purchase.contentItems.length > 0 && (
                <CardContent>
                  <h4 className="font-semibold mb-3">Content ({purchase.contentItems.length} items)</h4>
                  <div className="grid gap-3">
                    {purchase.contentItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          {getFileTypeIcon(item.fileType)}
                          <div>
                            <div className="font-medium">{item.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {formatFileSize(item.fileSize)}
                              {item.duration && ` • ${formatDuration(item.duration)}`}
                            </div>
                          </div>
                        </div>

                        {item.downloadUrl && (
                          <Button size="sm" onClick={() => handleDownload(item)} className="flex items-center gap-2">
                            <Download className="h-4 w-4" />
                            Download
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
