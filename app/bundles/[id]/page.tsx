import { notFound } from "next/navigation"
import { adminDb } from "@/lib/firebase-admin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Download, Eye, Calendar, DollarSign, User, Package } from "lucide-react"
import Image from "next/image"

interface BundlePageProps {
  params: {
    id: string
  }
}

// Helper function to safely format dates
function formatDate(date: any): string {
  try {
    if (!date) return "Unknown"

    // Handle Firestore Timestamp
    if (date && typeof date === "object" && date.toDate) {
      return date.toDate().toLocaleDateString()
    }

    // Handle regular Date object
    if (date instanceof Date) {
      return date.toLocaleDateString()
    }

    // Handle string dates
    if (typeof date === "string") {
      const parsedDate = new Date(date)
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toLocaleDateString()
      }
    }

    return "Unknown"
  } catch (error) {
    console.error("Error formatting date:", error)
    return "Unknown"
  }
}

// Helper function to format file size
function formatFileSize(size: any): string {
  if (!size || size === 0) return "Unknown"

  if (typeof size === "string") return size

  if (typeof size === "number") {
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`
    return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }

  return "Unknown"
}

async function getBundleData(bundleId: string) {
  try {
    console.log(`🔍 [Bundle Page] Fetching bundle: ${bundleId}`)

    const bundleDoc = await adminDb.collection("bundles").doc(bundleId).get()

    if (!bundleDoc.exists) {
      console.log(`❌ [Bundle Page] Bundle not found: ${bundleId}`)
      return null
    }

    const bundleData = bundleDoc.data()
    console.log(`📦 [Bundle Page] Raw bundle data:`, bundleData)

    if (!bundleData) {
      return null
    }

    // Enhanced field extraction
    const extractField = (data: any, fieldNames: string[], defaultValue: any = null) => {
      for (const fieldName of fieldNames) {
        if (data[fieldName] !== undefined && data[fieldName] !== null) {
          return data[fieldName]
        }
      }
      return defaultValue
    }

    // Extract all bundle fields
    const title = extractField(bundleData, ["title", "name", "bundleName"], "Untitled Bundle")
    const description = extractField(bundleData, ["description", "desc", "summary"], "")
    const creatorId = extractField(bundleData, ["creatorId", "userId", "ownerId"])
    const creatorUsername = extractField(bundleData, ["creatorUsername", "username", "creatorName"])
    const price = extractField(bundleData, ["price", "cost", "amount"], 0)
    const fileSize = extractField(bundleData, ["fileSize", "size", "fileSizeBytes", "totalSize"])
    const thumbnailUrl = extractField(bundleData, ["thumbnailUrl", "thumbnail", "previewUrl", "customPreviewThumbnail"])
    const contentItems = bundleData.contentItems || bundleData.items || bundleData.files || []
    const tags = extractField(bundleData, ["tags", "categories", "labels"], [])
    const quality = extractField(bundleData, ["quality", "videoQuality", "resolution"])
    const viewCount = extractField(bundleData, ["viewCount", "views", "totalViews"], 0)
    const uploadedAt = extractField(bundleData, ["uploadedAt", "createdAt", "dateCreated"])

    return {
      id: bundleId,
      title,
      description,
      creatorId,
      creatorUsername,
      price,
      fileSize,
      thumbnailUrl,
      contentItems: Array.isArray(contentItems) ? contentItems : [],
      tags: Array.isArray(tags) ? tags : [],
      quality,
      viewCount,
      uploadedAt,
      ...bundleData, // Include all original data
    }
  } catch (error) {
    console.error(`❌ [Bundle Page] Error fetching bundle:`, error)
    return null
  }
}

export default async function BundlePage({ params }: BundlePageProps) {
  const bundle = await getBundleData(params.id)

  if (!bundle) {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold mb-2">{bundle.title}</h1>
            {bundle.description && <p className="text-muted-foreground text-lg">{bundle.description}</p>}
          </div>

          {/* Tags */}
          {bundle.tags && bundle.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {bundle.tags.map((tag: string, index: number) => (
                <Badge key={index} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Bundle Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Bundle Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{bundle.viewCount || 0} views</span>
                </div>

                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{bundle.contentItems.length} items</span>
                </div>

                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{formatFileSize(bundle.fileSize)}</span>
                </div>

                {bundle.quality && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{bundle.quality}</Badge>
                  </div>
                )}
              </div>

              {bundle.uploadedAt && (
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Uploaded {formatDate(bundle.uploadedAt)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Content Items */}
          {bundle.contentItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Content Items ({bundle.contentItems.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {bundle.contentItems.map((item: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">{item.title || item.name || `Item ${index + 1}`}</p>
                        {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                      </div>
                      {item.fileSize && <Badge variant="outline">{formatFileSize(item.fileSize)}</Badge>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Thumbnail */}
          {bundle.thumbnailUrl && (
            <Card>
              <CardContent className="p-0">
                <div className="aspect-video relative overflow-hidden rounded-lg">
                  <Image
                    src={bundle.thumbnailUrl || "/placeholder.svg"}
                    alt={bundle.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Creator Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Creator
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="font-medium">{bundle.creatorUsername || "Unknown Creator"}</p>
                {bundle.creatorId && <p className="text-sm text-muted-foreground">ID: {bundle.creatorId}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Price
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bundle.price === 0 ? "Free" : `$${bundle.price}`}</div>
              <Button className="w-full mt-4" size="lg">
                {bundle.price === 0 ? "Download Free" : "Purchase Bundle"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
