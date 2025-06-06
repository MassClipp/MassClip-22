"use client"
import { useAuth } from "@/contexts/auth-context"
import CreatorProfile from "@/components/creator-profile"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useRouter } from "next/navigation"

interface Creator {
  uid: string
  username: string
  displayName: string
  bio: string
  profilePic: string
  createdAt: string
  isPro?: boolean
  socialLinks?: {
    instagram?: string
    twitter?: string
    website?: string
  }
}

export default function CreatorProfileWithSidebar({ creator }: { creator: Creator }) {
  const { user } = useAuth()
  const isDesktop = useMediaQuery("(min-width: 1024px)")
  const isOwner = user && user.uid === creator.uid
  const router = useRouter()

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Main content */}
      <div className="w-full">
        <CreatorProfile creator={creator} />
      </div>
    </div>
  )
}
