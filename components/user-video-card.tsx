"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Play, Lock } from "lucide-react"
import { motion } from "framer-motion"
import type { UserVideo } from "@/lib/types"

interface UserVideoCardProps {
  video: UserVideo
  priority?: boolean
}

export default function UserVideoCard({ video, priority = false }: UserVideoCardProps) {
  const router = useRouter()
  const [isHovering, setIsHovering] = useState(false)

  // Handle click to navigate to video page
  const handleClick = () => {
    router.push(`/video/${video.id}`)
  }

  return (
    <motion.div
      className="relative aspect-video rounded-lg overflow-hidden cursor-pointer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      onClick={handleClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Video Thumbnail */}
      <div className="h-full w-full bg-zinc-800">
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl || "/placeholder.svg"}
            alt={video.title}
            className="h-full w-full object-cover"
            loading={priority ? "eager" : "lazy"}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <div className="text-zinc-600 font-medium">{video.title}</div>
          </div>
        )}
      </div>

      {/* Overlay on hover */}
      <div
        className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
          isHovering ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="rounded-full bg-crimson/80 p-3">
          <Play className="h-6 w-6 text-white" />
        </div>
      </div>

      {/* Title overlay at the bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
        <h3 className="text-white font-medium text-sm line-clamp-1">{video.title}</h3>
        <div className="flex items-center justify-between mt-1">
          <div className="text-xs text-zinc-300">{video.category}</div>
          {!video.isPublic && (
            <div className="flex items-center text-xs text-zinc-300">
              <Lock className="h-3 w-3 mr-1" />
              <span>Private</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
