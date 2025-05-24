"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import CreatorProfile from "@/components/creator-profile"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { Home, User, Video, ShoppingBag, Settings, Compass, Upload } from "lucide-react"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useRouter } from "next/navigation"

interface Creator {
  uid: string
  username: string
  displayName: string
  bio: string
  profilePic: string
  freeClips: any[]
  paidClips: any[]
  createdAt: string
  socialLinks?: {
    instagram?: string
    twitter?: string
    website?: string
  }
}

export default function CreatorProfileWithSidebar({ creator }: { creator: Creator }) {
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeItem, setActiveItem] = useState<string>(`/creator/${creator.username}`)
  const isDesktop = useMediaQuery("(min-width: 1024px)")
  const isOwner = user && user.uid === creator.uid
  const router = useRouter()

  // Initialize sidebar state based on screen size
  useEffect(() => {
    if (isDesktop) {
      // On desktop, start with sidebar open but collapsed
      setSidebarOpen(true)
      setSidebarCollapsed(true)
    } else {
      // On mobile, start with sidebar closed
      setSidebarOpen(false)
      setSidebarCollapsed(false)
    }
  }, [isDesktop])

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const toggleCollapse = () => {
    setSidebarCollapsed(!sidebarCollapsed)
  }

  // Handle logout with proper error handling
  const handleLogout = async () => {
    try {
      router.push("/login")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  // Navigation items with grouping
  const navigationItems = [
    {
      group: "MAIN",
      items: [
        {
          name: "Home",
          href: "/",
          icon: Home,
        },
        {
          name: "Profile",
          href: `/creator/${creator.username}`,
          icon: User,
        },
        {
          name: "Explore",
          href: "/dashboard", // Map Explore to Dashboard
          icon: Compass,
        },
      ],
    },
    {
      group: "CONTENT",
      items: [
        {
          name: "Free Clips",
          href: `/creator/${creator.username}?tab=free`,
          icon: Video,
        },
        {
          name: "Premium Clips",
          href: `/creator/${creator.username}?tab=premium`,
          icon: ShoppingBag,
        },
      ],
    },
  ]

  // Creator tools only shown to profile owner
  const creatorTools = {
    group: "CREATOR TOOLS",
    items: [
      {
        name: "Upload Content",
        href: "/dashboard/upload",
        icon: Upload,
      },
      {
        name: "Edit Profile",
        href: "/dashboard/profile/edit",
        icon: Settings,
      },
    ],
  }

  if (isOwner) {
    navigationItems.push(creatorTools)
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Top navigation button - only for profile owner */}
      {isOwner && (
        <div className="fixed top-4 left-4 z-50">
          <Link href="/dashboard">
            <Button
              variant="outline"
              size="sm"
              className="bg-zinc-900/80 backdrop-blur-sm border-zinc-800 hover:bg-zinc-800 text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>
      )}

      {/* Main content */}
      <div className="w-full">
        <CreatorProfile creator={creator} />
      </div>
    </div>
  )
}
