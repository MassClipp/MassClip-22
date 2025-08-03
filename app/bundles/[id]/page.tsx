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
      return null
    }

    const data = await response.json()
    console.log("✅ [Bundle Page] Bundle data received:", data)
    return data
  } catch (error) {
    console.error("❌ [Bundle Page] Error fetching bundle:", error)
    return null
  }
}

function formatDate(dateString: string | null): string {
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

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price)
}

export default async function BundlePage({ params }: { params: { id: string } }) {
  const bundle = await getBundleData(params.id)

  if (!bundle) {
    notFound()
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-2xl">{bundle.title}</CardTitle>
                  <CardDescription className="text-base">{bundle.description}</CardDescription>
                </div>
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  {formatPrice(bundle.price)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Creator Info */}
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{bundle.creatorName}</p>
                    {bundle.creatorId && <p className="text-sm text-muted-foreground">@{bundle.creatorId}</p>}
                  </div>
                </div>

                <Separator />

                {/* Bundle Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{bundle.views.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Views</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Download className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{bundle.downloads.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Downloads</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{bundle.fileSize}</p>
                      <p className="text-xs text-muted-foreground">File Size</p>
                    </div>
                  </div>
                  {bundle.createdAt && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{formatDate(bundle.createdAt)}</p>
                        <p className="text-xs text-muted-foreground">Created</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {bundle.tags.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium mb-2">Tags</p>
                      <div className="flex flex-wrap gap-2">
                        {bundle.tags.map((tag, index) => (
                          <Badge key={index} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
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
                {bundle.thumbnailUrl ? (
                  <div className="relative">
                    <img
                      src={bundle.thumbnailUrl || "/placeholder.svg"}
                      alt={bundle.title}
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

                {bundle.quality && (
                  <div className="flex justify-center">
                    <Badge variant="secondary">{bundle.quality}</Badge>
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
                <p className="text-3xl font-bold">{formatPrice(bundle.price)}</p>
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
                <span className="font-mono text-xs">{bundle.id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">File Size:</span>
                <span>{bundle.fileSize}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Downloads:</span>
                <span>{bundle.downloads.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Views:</span>
                <span>{bundle.views.toLocaleString()}</span>
              </div>
              {bundle.createdAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Created:</span>
                  <span>{formatDate(bundle.createdAt)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
