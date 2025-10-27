"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Play, Lock, Eye } from "lucide-react"

interface ContentItem {
  id: string
  title: string
  description?: string
  thumbnail?: string
  type: string
  duration?: string
  views?: number
  price?: number
  createdAt: string
  isLocked?: boolean
}

interface FilteredContentDisplayProps {
  creatorId: string
  contentType: "free" | "premium"
  selectedType: string
  onContentTypeDetection: (types: string[]) => void
}

export default function FilteredContentDisplay({
  creatorId,
  contentType,
  selectedType,
  onContentTypeDetection,
}: FilteredContentDisplayProps) {
  const [content, setContent] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true)
        setError(null)

        console.log(`🔍 [FilteredContentDisplay] Fetching ${contentType} content for creator:`, creatorId)

        // Simulate API call - replace with actual API endpoint
        const response = await fetch(`/api/creator/${creatorId}/${contentType}-content`)

        if (!response.ok) {
          if (response.status === 404) {
            setContent([])
            onContentTypeDetection([])
            return
          }
          throw new Error(`Failed to fetch content: ${response.statusText}`)
        }

        const data = await response.json()
        const contentItems = data.content || []

        setContent(contentItems)

        // Extract unique content types
        const types = [...new Set(contentItems.map((item: ContentItem) => item.type))]
        onContentTypeDetection(types)

        console.log(`✅ [FilteredContentDisplay] Loaded ${contentItems.length} ${contentType} items`)
      } catch (error) {
        console.error(`❌ [FilteredContentDisplay] Error fetching ${contentType} content:`, error)
        setError(error instanceof Error ? error.message : "Failed to load content")
        setContent([])
        onContentTypeDetection([])
      } finally {
        setLoading(false)
      }
    }

    if (creatorId) {
      fetchContent()
    }
  }, [creatorId, contentType, onContentTypeDetection])

  // Filter content by selected type
  const filteredContent = selectedType === "all" ? content : content.filter((item) => item.type === selectedType)

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="bg-zinc-900 border-zinc-800 animate-pulse">
            <CardContent className="p-4">
              <div className="aspect-video bg-zinc-800 rounded-lg mb-4"></div>
              <div className="h-4 bg-zinc-800 rounded mb-2"></div>
              <div className="h-3 bg-zinc-800 rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-8 text-center">
          <div className="text-red-400 mb-2">⚠️ Error Loading Content</div>
          <p className="text-zinc-400 text-sm">{error}</p>
          <Button
            variant="outline"
            className="mt-4 border-zinc-700 hover:bg-zinc-800 bg-transparent"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (filteredContent.length === 0) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-8 text-center">
          <div className="text-zinc-400 mb-2">
            {contentType === "free" ? "📹" : "🔒"} No {contentType} content available
          </div>
          <p className="text-zinc-500 text-sm">
            {contentType === "free"
              ? "This creator hasn't uploaded any free content yet."
              : "This creator hasn't created any premium content yet."}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredContent.map((item) => (
        <Card key={item.id} className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
          <CardContent className="p-4">
            {/* Thumbnail */}
            <div className="relative aspect-video bg-zinc-800 rounded-lg mb-4 overflow-hidden">
              {item.thumbnail ? (
                <img
                  src={item.thumbnail || "/placeholder.svg"}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Play className="w-12 h-12 text-zinc-600" />
                </div>
              )}

              {/* Overlay */}
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                {item.isLocked ? <Lock className="w-8 h-8 text-white" /> : <Play className="w-8 h-8 text-white" />}
              </div>

              {/* Duration badge */}
              {item.duration && (
                <Badge className="absolute bottom-2 right-2 bg-black/80 text-white text-xs">{item.duration}</Badge>
              )}

              {/* Type badge */}
              <Badge className="absolute top-2 left-2 bg-red-600 text-white text-xs">{item.type}</Badge>
            </div>

            {/* Content Info */}
            <div className="space-y-2">
              <h3 className="font-semibold text-white line-clamp-2">{item.title}</h3>

              {item.description && <p className="text-zinc-400 text-sm line-clamp-2">{item.description}</p>}

              {/* Stats */}
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <div className="flex items-center gap-4">
                  {item.views !== undefined && (
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {item.views.toLocaleString()}
                    </span>
                  )}
                  <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>

                {item.price && (
                  <Badge variant="outline" className="border-green-600 text-green-400">
                    ${item.price}
                  </Badge>
                )}
              </div>

              {/* Action Button */}
              <Button className="w-full mt-3" variant={item.isLocked ? "outline" : "default"} size="sm">
                {item.isLocked ? (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Purchase ${item.price}
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Watch Now
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
