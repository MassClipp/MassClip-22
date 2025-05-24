"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Lock, Play } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface PremiumVideoCardProps {
  video: {
    id: string
    title: string
    thumbnailUrl: string
    url: string
    type: string
    uid: string
    username: string
    price?: number
  }
  onClick?: () => void
  className?: string
}

export default function PremiumVideoCard({ video, onClick, className = "" }: PremiumVideoCardProps) {
  const { user } = useAuth()
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const router = useRouter()

  const handleClick = async () => {
    if (onClick) {
      onClick()
      return
    }

    // If we haven't checked access yet, check it now
    if (hasAccess === null && user) {
      setIsChecking(true)
      try {
        const accessRef = doc(db, "userAccess", user.uid, "videos", video.id)
        const accessDoc = await getDoc(accessRef)
        const hasAccess = accessDoc.exists()
        setHasAccess(hasAccess)

        if (hasAccess) {
          // User has access, navigate to video page
          router.push(`/video/${video.id}`)
        } else {
          // User doesn't have access, navigate to purchase page
          router.push(`/video/${video.id}/purchase`)
        }
      } catch (error) {
        console.error("Error checking video access:", error)
        // Default to purchase page on error
        router.push(`/video/${video.id}/purchase`)
      } finally {
        setIsChecking(false)
      }
    } else if (!user) {
      // Not logged in, redirect to login
      router.push(`/login?redirect=/video/${video.id}`)
    } else if (hasAccess) {
      // Already know user has access
      router.push(`/video/${video.id}`)
    } else {
      // Already know user doesn't have access
      router.push(`/video/${video.id}/purchase`)
    }
  }

  return (
    <div className={`relative group overflow-hidden rounded-lg cursor-pointer ${className}`} onClick={handleClick}>
      <div className="aspect-[9/16] bg-black relative overflow-hidden rounded-lg ring-0 group-hover:ring-1 ring-white/30 transition-all duration-300">
        <img
          src={video.thumbnailUrl || "/placeholder.svg?height=480&width=270&query=video"}
          alt={video.title}
          className="w-full h-full object-cover opacity-70 group-hover:opacity-50 transition-opacity duration-300"
        />

        {/* Premium overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
          <div className="bg-black/40 p-3 rounded-full mb-3">
            <Lock className="h-6 w-6 text-amber-500" />
          </div>
          <h3 className="text-white font-medium text-center px-4 mb-2">{video.title}</h3>
          <div className="bg-amber-500/10 text-amber-400 px-3 py-1 rounded-full text-sm border border-amber-500/20">
            Premium Content
          </div>
        </div>

        {/* Play button overlay on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <Play className="h-8 w-8 text-white ml-1" />
          </div>
        </div>
      </div>
    </div>
  )
}
