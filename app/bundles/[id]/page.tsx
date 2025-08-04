import { notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Package, User, DollarSign, Eye, Download, Calendar, HardDrive, Play } from "lucide-react"

interface BundleData {
  id: string
  title: string
  description: string
  price: number
  creatorId: string
  creatorName: string
  fileSize: string
  fileSizeBytes: number | null
  thumbnailUrl: string | null
  quality: string | null
  views: number
  downloads: number
  tags: string[]
  createdAt: string | null
  downloadUrl?: string
  fileType?: string
  currency?: string
  isPublic?: boolean
}

async function getBundleData(id: string): Promise<BundleData | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL || "http://localhost:3000"
    const url = `${baseUrl}/api/bundles/${id}`

    console.log(`🔍 [Bundle Page] Fetching bundle from: ${url}`)

    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      console.error(`❌ [Bundle Page] API error: ${response.status}`)
      if (response.status === 404) {
        return null
      }
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    console.log("✅ [Bundle Page] Bundle data received:", data)
    return data
  } catch (error) {
    console.error("❌ [Bundle Page] Error fetching bundle:", error)
    return null
  }
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "Unknown"
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  } catch {
    return "Invalid date"
  }
}

function formatPrice(price: number | undefined): string {
  if (typeof price !== "number" || isNaN(price)) {
    return "$0.00"
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price)
}

function safeNumber(value: any, defaultValue = 0): number {
  if (typeof value === "number" && !isNaN(value)) {
    return value
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10)
    return isNaN(parsed) ? defaultValue : parsed
  }
  return defaultValue
}

function safeString(value: any, defaultValue = ""): string {
  if (typeof value === "string") {
    return value
  }
  return defaultValue
}

function safeArray(value: any): string[] {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === "string")
  }
  return []
}

export default async function BundlePage({ params }: { params: { id: string } }) {
  let bundle: BundleData | null = null

  try {
    bundle = await getBundleData(params.id)
  } catch (error) {
    console.error("❌ [Bundle Page] Error in getBundleData:", error)
    // Don't throw here, just set bundle to null and handle below
  }

  if (!bundle) {
    notFound()
  }

  // Safely extract all properties with defaults
  const {
    id = params.id,
    title = "Untitled Bundle",
    description = "No description available",
    price = 0,
    creatorId = "",
    creatorName = "Unknown Creator",
    fileSize = "Unknown",
    fileSizeBytes = null,
    thumbnailUrl = null,
    quality = null,
    views = 0,
    downloads = 0,
    tags = [],
    createdAt = null,
    downloadUrl = "",
    fileType = "",
    currency = "USD",
    isPublic = true,
  } = bundle

  // Additional safety checks
  const safeViews = safeNumber(views)
  const safeDownloads = safeNumber(downloads)
  const safePrice = safeNumber(price)
  const safeTags = safeArray(tags)
  const safeTitle = safeString(title, "Untitled Bundle")
  const safeDescription = safeString(description, "No description available")
  const safeCreatorName = safeString(creatorName, "Unknown Creator")
  const safeFileSize = safeString(fileSize, "Unknown")

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-2xl">{safeTitle}</CardTitle>
                  <CardDescription className="text-base">{safeDescription}</CardDescription>
                </div>
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  {formatPrice(safePrice)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Creator Info */}
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{safeCreatorName}</p>
                    {creatorId && <p className="text-sm text-muted-foreground">@{creatorId}</p>}
                  </div>
                </div>

                <Separator />

                {/* Bundle Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{safeViews.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Views</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Download className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{safeDownloads.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Downloads</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{safeFileSize}</p>
                      <p className="text-xs text-muted-foreground">File Size</p>
                    </div>
                  </div>
                  {createdAt && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{formatDate(createdAt)}</p>
                        <p className="text-xs text-muted-foreground">Created</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {safeTags.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium mb-2">Tags</p>
                      <div className="flex flex-wrap gap-2">
                        {safeTags.map((tag, index) => (
                          <Badge key={index} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* File Type and Quality */}
                {(fileType || quality) && (
                  <>
                    <Separator />
                    <div className="flex gap-4">
                      {fileType && (
                        <div>
                          <p className="text-sm font-medium">File Type</p>
                          <p className="text-sm text-muted-foreground">{fileType}</p>
                        </div>
                      )}
                      {quality && (
                        <div>
                          <p className="text-sm font-medium">Quality</p>
                          <p className="text-sm text-muted-foreground">{quality}</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Bundle Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {thumbnailUrl ? (
                  <div className="relative">
                    <img
                      src={thumbnailUrl || "/placeholder.svg"}
                      alt={safeTitle}
                      className="w-full h-48 object-cover rounded-lg border"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = "/placeholder.svg?height=200&width=300&text=No+Preview"
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg opacity-0 hover:opacity-100 transition-opacity">
                      <Play className="h-12 w-12 text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-48 bg-muted rounded-lg border flex items-center justify-center">
                    <div className="text-center">
                      <Package className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No preview available</p>
                    </div>
                  </div>
                )}

                {quality && (
                  <div className="flex justify-center">
                    <Badge variant="secondary">{quality}</Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Purchase Options */}
          <Card>
            <CardHeader>
              <CardTitle>Get This Bundle</CardTitle>
              <CardDescription>Access all content in this bundle</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-3xl font-bold">{formatPrice(safePrice)}</p>
                <p className="text-sm text-muted-foreground">One-time purchase</p>
              </div>

              <Button className="w-full" size="lg">
                <DollarSign className="h-4 w-4 mr-2" />
                Purchase Bundle
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Instant access • Download anytime • 30-day guarantee
              </p>
            </CardContent>
          </Card>

          {/* Bundle Info */}
          <Card>
            <CardHeader>
              <CardTitle>Bundle Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Bundle ID:</span>
                <span className="font-mono text-xs">{id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">File Size:</span>
                <span>{safeFileSize}</span>
              </div>
              {fileSizeBytes && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Size (bytes):</span>
                  <span>{fileSizeBytes.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Downloads:</span>
                <span>{safeDownloads.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Views:</span>
                <span>{safeViews.toLocaleString()}</span>
              </div>
              {createdAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Created:</span>
                  <span>{formatDate(createdAt)}</span>
                </div>
              )}
              {downloadUrl && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Has Download:</span>
                  <span>✅ Available</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Public:</span>
                <span>{isPublic ? "✅ Yes" : "❌ No"}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
