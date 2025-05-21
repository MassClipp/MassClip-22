"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useAuth } from "@/contexts/auth-context"
import CreatorProfile from "@/components/creator-profile"
import { Button } from "@/components/ui/button"
import {
  Home,
  User,
  Video,
  ShoppingBag,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Compass,
  Sparkles,
} from "lucide-react"
import { useMediaQuery } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"
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
  const { user, signOut } = useAuth()
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
      await signOut()
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
      // Dashboard button removed as requested
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
    <div className="min-h-screen bg-black text-white flex">
      {/* Mobile menu button - only visible on mobile */}
      {!isDesktop && (
        <div className="fixed top-4 left-4 z-50">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleSidebar}
            className="bg-zinc-900/80 backdrop-blur-sm border-zinc-800 hover:bg-zinc-800"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      )}

      {/* Sleek Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 transition-all duration-300 ease-in-out",
          "bg-zinc-950 border-r border-zinc-800/30",
          {
            "translate-x-0": sidebarOpen,
            "-translate-x-full": !sidebarOpen,
            "w-60": !sidebarCollapsed,
            "w-16": sidebarCollapsed && isDesktop,
          },
        )}
      >
        {/* Collapse toggle button - only visible on desktop */}
        {isDesktop && sidebarOpen && (
          <button
            onClick={toggleCollapse}
            className={cn(
              "absolute -right-2.5 top-20 z-50",
              "bg-zinc-900 text-white rounded-full p-1",
              "shadow-md border border-zinc-800",
              "transition-all duration-200 hover:border-red-500/50",
              "focus:outline-none focus:ring-1 focus:ring-red-500",
            )}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
          </button>
        )}

        <div className="flex flex-col h-full">
          {/* Logo area */}
          <div
            className={cn(
              "flex items-center py-6 border-b border-zinc-800/30",
              sidebarCollapsed && isDesktop ? "justify-center px-0" : "px-6",
            )}
          >
            <Link
              href="/"
              className={cn(
                "font-bold transition-all duration-200",
                "text-red-500",
                sidebarCollapsed && isDesktop ? "text-xl" : "text-2xl",
              )}
            >
              {sidebarCollapsed && isDesktop ? "MC" : "MassClip"}
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-6 overflow-y-auto scrollbar-hide px-3">
            {navigationItems.map((group, groupIndex) => (
              <div key={group.group} className="mb-6">
                {/* Group label */}
                {(!sidebarCollapsed || !isDesktop) && (
                  <div className="px-3 py-2 text-xs font-medium text-zinc-500 tracking-wider">{group.group}</div>
                )}
                {sidebarCollapsed && isDesktop && groupIndex > 0 && (
                  <div className="h-px mx-2 my-4 bg-zinc-800/50"></div>
                )}

                {/* Group items */}
                <div className="space-y-1 mt-1">
                  {group.items.map((item) => {
                    const isActive = activeItem === item.href
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => {
                          setActiveItem(item.href)
                          if (!isDesktop) setSidebarOpen(false)
                        }}
                        className={cn(
                          "flex items-center rounded-md transition-all duration-200",
                          "relative group",
                          sidebarCollapsed && isDesktop ? "justify-center py-3 px-2" : "py-2 px-3",
                          isActive
                            ? "text-white bg-zinc-900 font-medium"
                            : "text-zinc-400 hover:text-white hover:bg-zinc-900/50",
                        )}
                        title={item.name}
                      >
                        {/* Active indicator */}
                        {isActive && (
                          <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-red-500 rounded-r"></span>
                        )}

                        {/* Icon */}
                        <div className={cn("relative", isActive && "text-red-500")}>
                          <item.icon
                            className={cn("h-5 w-5 transition-all", sidebarCollapsed && isDesktop ? "" : "mr-3")}
                          />
                        </div>

                        {/* Text */}
                        {(!sidebarCollapsed || !isDesktop) && <span>{item.name}</span>}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* User section */}
          {isOwner && (
            <div
              className={cn(
                "border-t border-zinc-800/30 py-4 mt-auto",
                sidebarCollapsed && isDesktop ? "px-2" : "px-4",
              )}
            >
              {/* User info - only show when expanded */}
              {!sidebarCollapsed && isDesktop && (
                <div className="flex items-center mb-4 px-2">
                  <div className="relative w-8 h-8 rounded-full overflow-hidden border border-zinc-800">
                    {creator.profilePic ? (
                      <Image
                        src={creator.profilePic || "/placeholder.svg"}
                        alt={creator.displayName}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                        <span className="text-sm font-medium text-white">{creator.displayName.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                  <div className="ml-3 overflow-hidden">
                    <p className="text-sm font-medium text-white truncate">{creator.displayName}</p>
                    <p className="text-xs text-zinc-400 truncate">@{creator.username}</p>
                  </div>
                </div>
              )}

              {/* Logout button */}
              <Button
                variant="ghost"
                className={cn(
                  "w-full transition-all duration-200",
                  "text-zinc-400 hover:text-white hover:bg-zinc-800/50",
                  sidebarCollapsed && isDesktop ? "justify-center p-2" : "justify-start px-3 py-2",
                )}
                onClick={handleLogout}
                title="Log out"
              >
                <LogOut className={cn("h-5 w-5", sidebarCollapsed && isDesktop ? "" : "mr-3")} />
                {(!sidebarCollapsed || !isDesktop) && <span>Log out</span>}
              </Button>
            </div>
          )}

          {/* Pro badge */}
          {isOwner && (
            <div className={cn("pb-4 flex justify-center", sidebarCollapsed && isDesktop ? "px-2" : "px-4")}>
              <div
                className={cn(
                  "text-xs font-medium",
                  "flex items-center gap-1.5 text-amber-500",
                  sidebarCollapsed && isDesktop ? "justify-center" : "",
                )}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {(!sidebarCollapsed || !isDesktop) && "Creator Pro"}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Overlay for mobile */}
      {!isDesktop && sidebarOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-30" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div
        className={cn(
          "flex-1 transition-all duration-300",
          sidebarOpen ? (sidebarCollapsed ? "ml-16" : "ml-60") : "ml-0",
        )}
      >
        <CreatorProfile creator={creator} />
      </div>
    </div>
  )
}
