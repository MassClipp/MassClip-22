import { notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Download, Play, FileText, ImageIcon, Music, Video, Calendar, User, Package } from "lucide-react"

interface BundleContent {
  id: string
  title: string
  fileUrl: string
  mimeType: string
  fileSize: number
  contentType: "video" | "audio" | "image" | "document"
  displayTitle: string
  displaySize: string
  displayDuration?: string
  thumbnailUrl?: string
}

interface BundleData {
  id: string
  title: string
  description: string
  creatorName: string
  createdAt: string
  contents: BundleContent[]
  totalSize: number
  contentCount: number
}

async function getBundleContent(id: string): Promise<BundleData | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL || "http://localhost:3000"
    const url = `${baseUrl}/api/bundles/${id}/content`

    console.log(`🔍 [Bundle Content] Fetching from: ${url}`)

    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      console.error(`❌ [Bundle Content] API error: ${response.status}`)
      if (response.status === 404) {
        return null
      }
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    console.log("✅ [Bundle Content] Data received:", data)
    return data
  } catch (error) {
    console.error("❌ [Bundle Content] Error fetching bundle content:", error)
    return null
  }
}

function getContentIcon(contentType: string) {
  switch (contentType) {
    case "video":
      return <Video className="h-5 w-5" />
    case "audio":
      return <Music className="h-5 w-5" />
    case "image":
      return <ImageIcon className="h-5 w-5" />
    default:
      return <FileText className="h-5 w-5" />
  }
}

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  } catch {
    return "Unknown date"
  }
}

export default async function BundleContentPage({ params }: { params: { id: string } }) {
  const bundle = await getBundleContent(params.id)

  if (!bundle) {
    notFound()
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Package className="h-6 w-6 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Bundle Content</span>
        </div>
        <h1 className="text-4xl font-bold mb-2">{bundle.title}</h1>
        {bundle.description && <p className="text-xl text-muted-foreground">{bundle.description}</p>}
      </div>

      {/* Bundle Info */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Bundle Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{bundle.creatorName}</p>
                <p className="text-sm text-muted-foreground">Creator</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{formatDate(bundle.createdAt)}</p>
                <p className="text-sm text-muted-foreground">Created</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{bundle.contentCount} items</p>
                <p className="text-sm text-muted-foreground">Total content</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content List */}
      <Card>
        <CardHeader>
          <CardTitle>Content ({bundle.contents.length})</CardTitle>
          <CardDescription>All files included in this bundle</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {bundle.contents.map((content, index) => (
              <div key={content.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Thumbnail or Icon */}
                    <div className="flex-shrink-0">
                      {content.thumbnailUrl ? (
                        <img
                          src={content.thumbnailUrl || "/placeholder.svg"}
                          alt={content.displayTitle}
                          className="w-12 h-12 rounded object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                          {getContentIcon(content.contentType)}
                        </div>
                      )}
                    </div>

                    {/* Content Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{content.displayTitle}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {content.contentType.toUpperCase()}
                        </Badge>
                        <span>{content.displaySize}</span>
                        {content.displayDuration && <span>{content.displayDuration}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {content.contentType === "video" && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={content.fileUrl} target="_blank" rel="noopener noreferrer">
                          <Play className="h-4 w-4 mr-2" />
                          Play
                        </a>
                      </Button>
                    )}
                    <Button variant="outline" size="sm" asChild>
                      <a href={content.fileUrl} download={content.displayTitle}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {bundle.contents.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No content available</h3>
              <p className="text-muted-foreground">This bundle doesn't contain any accessible content yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
