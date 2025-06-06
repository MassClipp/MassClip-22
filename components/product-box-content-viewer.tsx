"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { File, ImageIcon, Video, Music, FileText, Download, Eye, Loader2, FolderOpen } from "lucide-react"
import { motion } from "framer-motion"

interface ContentItem {
  id: string
  fileName: string
  originalFileName: string
  fileType: string
  fileSize: number
  category: string
  publicUrl: string
  uploadedAt: string
}

interface ProductBoxContentViewerProps {
  productBoxId: string
  isOwner?: boolean
}

const CATEGORY_ICONS = {
  document: FileText,
  image: ImageIcon,
  video: Video,
  audio: Music,
}

const CATEGORY_COLORS = {
  document: "bg-blue-100 text-blue-700",
  image: "bg-green-100 text-green-700",
  video: "bg-purple-100 text-purple-700",
  audio: "bg-orange-100 text-orange-700",
}

export default function ProductBoxContentViewer({ productBoxId, isOwner = false }: ProductBoxContentViewerProps) {
  const [content, setContent] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const fetchContent = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/product-box/${productBoxId}/content`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to fetch content")
      }

      const data = await response.json()
      setContent(data.content || [])
    } catch (error) {
      console.error("Error fetching content:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load content",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContent()
  }, [productBoxId])

  const handleDownload = async (item: ContentItem) => {
    try {
      const response = await fetch(item.publicUrl)
      const blob = await response.blob()

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = item.originalFileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Download Started",
        description: `Downloading ${item.originalFileName}`,
      })
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download file",
        variant: "destructive",
      })
    }
  }

  const handleView = (item: ContentItem) => {
    window.open(item.publicUrl, "_blank")
  }

  const groupedContent = content.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = []
      }
      acc[item.category].push(item)
      return acc
    },
    {} as Record<string, ContentItem[]>,
  )

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </CardContent>
      </Card>
    )
  }

  if (content.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <FolderOpen className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Content Yet</h3>
          <p className="text-gray-500 text-center">
            {isOwner
              ? "Upload files to add content to this product box"
              : "The creator hasn't added any content files yet"}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedContent).map(([category, items]) => {
        const IconComponent = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] || File
        const colorClass = CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || "bg-gray-100 text-gray-700"

        return (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 capitalize">
                <IconComponent className="h-5 w-5" />
                {category} Files ({items.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <IconComponent className="h-8 w-8 text-gray-600" />
                      <Badge className={`text-xs ${colorClass}`}>{category.toUpperCase()}</Badge>
                    </div>

                    <h4 className="font-medium text-sm mb-1 truncate" title={item.originalFileName}>
                      {item.originalFileName}
                    </h4>

                    <div className="text-xs text-gray-500 mb-3 space-y-1">
                      <div>{formatFileSize(item.fileSize)}</div>
                      <div>{formatDate(item.uploadedAt)}</div>
                    </div>

                    {/* Audio player for audio files */}
                    {item.category === "audio" && (
                      <div className="mb-3">
                        <audio controls className="w-full" preload="metadata">
                          <source src={item.publicUrl} type={item.fileType || "audio/mpeg"} />
                          Your browser does not support the audio element.
                        </audio>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {item.category === "audio" ? (
                        <Button size="sm" variant="outline" onClick={() => handleView(item)} className="flex-1">
                          <Music className="h-3 w-3 mr-1" />
                          Play
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => handleView(item)} className="flex-1">
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => handleDownload(item)} className="flex-1">
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
