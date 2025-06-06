"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Lock, Download, Play, FileText, ImageIcon, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"

interface ContentItem {
  id: string
  title: string
  type: string
  url: string
  thumbnailUrl?: string
  description?: string
  fileSize?: number
  duration?: number
}

interface ProductBoxContent {
  id: string
  title: string
  description: string
  contentItems: ContentItem[]
  hasAccess: boolean
}

export default function ProductBoxContentPage() {
  const params = useParams()
  const productBoxId = params.id as string

  const [content, setContent] = useState<ProductBoxContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadingItems, setDownloadingItems] = useState<{ [key: string]: boolean }>({})

  useEffect(() => {
    const fetchContent = async () => {
      try {
        console.log("🔍 [Content Access] Fetching content for:", productBoxId)

        const response = await fetch(`/api/product-box/${productBoxId}/content`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
          throw new Error(errorData.error || "Failed to load content")
        }

        const data = await response.json()
        setContent(data.content)
        console.log("✅ [Content Access] Content loaded:", data.content)
      } catch (error) {
        console.error("❌ [Content Access] Error:", error)
        setError(error instanceof Error ? error.message : "Failed to load content")
      } finally {
        setLoading(false)
      }
    }

    if (productBoxId) {
      fetchContent()
    }
  }, [productBoxId])

  const handleDownload = async (item: ContentItem) => {
    try {
      setDownloadingItems((prev) => ({ ...prev, [item.id]: true }))

      // Create a temporary link to download the file
      const link = document.createElement("a")
      link.href = item.url
      link.download = `${item.title}.${item.type}`
      link.target = "_blank"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error("Download error:", error)
    } finally {
      setDownloadingItems((prev) => ({ ...prev, [item.id]: false }))
    }
  }

  const getFileIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "video":
      case "mp4":
      case "mov":
      case "avi":
        return <Play className="h-5 w-5" />
      case "image":
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return <ImageIcon className="h-5 w-5" />
      default:
        return <FileText className="h-5 w-5" />
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown size"
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i]
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-amber-500 animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-light text-white mb-2">Loading your content...</h2>
          <p className="text-zinc-400">Please wait while we prepare your premium content</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Card className="w-full max-w-md bg-zinc-900/90 border-zinc-800">
          <CardHeader className="text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-white">Access Denied</CardTitle>
            <CardDescription className="text-zinc-400">{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!content?.hasAccess) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Card className="w-full max-w-md bg-zinc-900/90 border-zinc-800">
          <CardHeader className="text-center">
            <Lock className="h-16 w-16 text-amber-500 mx-auto mb-4" />
            <CardTitle className="text-white">Premium Content</CardTitle>
            <CardDescription className="text-zinc-400">You need to purchase this content to access it.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-light text-white mb-2">{content.title}</h1>
          {content.description && <p className="text-zinc-400 text-lg leading-relaxed">{content.description}</p>}
          <Badge className="mt-4 bg-green-500/20 text-green-400 border-green-500/30">Premium Content Unlocked</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {content.contentItems.map((item) => (
            <Card key={item.id} className="bg-zinc-900/90 border-zinc-800 hover:border-zinc-700 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {getFileIcon(item.type)}
                    <div>
                      <CardTitle className="text-lg text-white">{item.title}</CardTitle>
                      <CardDescription className="text-zinc-400">
                        {item.type.toUpperCase()} • {formatFileSize(item.fileSize)}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>

              {item.thumbnailUrl && (
                <div className="px-6 pb-4">
                  <div className="aspect-video bg-zinc-800 rounded-lg overflow-hidden">
                    <Image
                      src={item.thumbnailUrl || "/placeholder.svg"}
                      alt={item.title}
                      width={400}
                      height={225}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              <CardContent>
                {item.description && <p className="text-zinc-400 text-sm mb-4 leading-relaxed">{item.description}</p>}

                <Button
                  onClick={() => handleDownload(item)}
                  disabled={downloadingItems[item.id]}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black"
                >
                  {downloadingItems[item.id] ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
