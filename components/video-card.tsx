"use client"

import Image from "next/image"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { formatDuration } from "@/lib/format-utils"
import { useState } from "react"

interface VideoCardProps {
  id: string
  title: string
  thumbnailUrl: string
  fileUrl: string
  duration?: number
  type?: string
}

export function VideoCard({ id, title, thumbnailUrl, fileUrl, duration, type }: VideoCardProps) {
  const [thumbnailError, setThumbnailError] = useState(false)

  const handleThumbnailError = () => {
    setThumbnailError(true)
  }

  return (
    <Link href={`/video/${id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <CardContent className="p-0">
          <div className="relative aspect-video">
            <Image
              src={
                thumbnailError
                  ? `/placeholder.svg?height=200&width=300&query=${encodeURIComponent(title)}`
                  : thumbnailUrl || "/placeholder.svg?height=200&width=300"
              }
              alt={title}
              fill
              className="object-cover"
              onError={handleThumbnailError}
            />
            {duration && (
              <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                {formatDuration(duration)}
              </div>
            )}
          </div>
          <div className="p-3">
            <h3 className="font-medium text-sm line-clamp-2">{title}</h3>
            {type && <p className="text-xs text-muted-foreground mt-1 capitalize">{type}</p>}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
