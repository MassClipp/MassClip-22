"use client"

import { Play, FileText, Music, Image, X } from "lucide-react"

import { Button } from "@/components/ui/button"

interface VideoThumbnail916Props {
  src: string
  title: string
  variant?: "video" | "audio" | "image" | "document"
  isProcessing?: boolean
  editMode?: boolean
  onRemove?: () => void
}

export function VideoThumbnail916({
  src,
  title,
  variant = "video",
  isProcessing = false,
  editMode = false,
  onRemove,
}: VideoThumbnail916Props) {
  let icon = <Play className="h-4 w-4" />
  if (variant === "audio") {
    icon = <Music className="h-4 w-4" />
  } else if (variant === "image") {
    icon = <Image className="h-4 w-4" />
  } else if (variant === "document") {
    icon = <FileText className="h-4 w-4" />
  }

  return (
    <div
      className={`group relative aspect-[9/16] bg-zinc-900 rounded-lg overflow-hidden cursor-pointer transition-all duration-200 hover:ring-2 hover:ring-zinc-600 ${
        editMode ? "ring-2 ring-blue-500/50" : ""
      }`}
    >
      <img src={src || "/placeholder.svg"} alt={title} className="object-cover absolute inset-0 w-full h-full" />
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/50 to-transparent" />
      <div className="absolute bottom-4 left-4 text-sm text-zinc-100 flex items-center gap-2">
        {icon}
        {title}
      </div>

      {isProcessing && (
        <div className="absolute inset-0 grid place-items-center bg-zinc-900/70">
          <div className="w-12 h-12 rounded-full border-4 border-dashed border-zinc-300 animate-spin" />
        </div>
      )}

      {/* Remove button overlay for edit mode */}
      {editMode && onRemove && (
        <div className="absolute -top-2 -right-2 z-20">
          <Button
            size="icon"
            variant="destructive"
            className="h-6 w-6 rounded-full bg-red-600 hover:bg-red-700 border-2 border-white"
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  )
}
