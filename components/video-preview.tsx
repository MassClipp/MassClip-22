"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Play, Download, X } from "lucide-react"

interface VideoPreviewProps {
  videoUrl: string
  thumbnailUrl?: string
}

export default function VideoPreview({ videoUrl, thumbnailUrl }: VideoPreviewProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
        >
          <Play className="h-4 w-4 mr-1" />
          Preview
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-3xl border-gray-800 bg-black/95 backdrop-blur-sm p-0">
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10 text-white bg-black/50 hover:bg-black/70"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>

          <div className="aspect-video w-full">
            <video src={videoUrl} poster={thumbnailUrl} controls className="w-full h-full" autoPlay />
          </div>

          <div className="p-4 flex justify-between items-center">
            <DialogTitle className="text-white">Video Preview</DialogTitle>

            <a
              href={videoUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
