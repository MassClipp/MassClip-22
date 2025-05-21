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
  BarChart3,
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
      group: "Main",
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
          href: "/explore",
          icon: Compass,
        },
      ],
    },
    {
      group: "Content",
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
    group: "Creator Tools",
    items: [
      {
        name: "Dashboard",
        href: "/dashboard",
        icon: BarChart3,
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
    <div className="min-h-screen bg-black text-white flex">
      {/* Mobile menu button - only visible on mobile */}
      {!isDesktop && (
        <div className="fixed top-4 left-4 z-50">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleSidebar}
            className="bg-zinc-900/80 backdrop-blur-sm border-zinc-800 hover:bg-zinc-800 shadow-lg shadow-black/20"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      )}

      {/* Premium Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 transition-all duration-300 ease-in-out",
          "bg-gradient-to-b from-zinc-900/95 via-zinc-900/95 to-zinc-900/90",
          "backdrop-blur-md border-r border-zinc-800/30",
          "shadow-xl shadow-black/20",
          {
            "translate-x-0": sidebarOpen,
            "-translate-x-full": !sidebarOpen,
            "w-72": !sidebarCollapsed,
            "w-20": sidebarCollapsed && isDesktop,
          },
        )}
      >
        {/* Subtle animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-purple-500/5 pointer-events-none" />

        {/* Subtle animated dot pattern */}
        <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(circle,_#fff_1px,_transparent_1px)] bg-[length:24px_24px]" />

        {/* Collapse toggle button - only visible on desktop */}
        {isDesktop && sidebarOpen && (
          <button
            onClick={toggleCollapse}
            className={cn(
              "absolute -right-3 top-20 z-50",
              "bg-gradient-to-br from-zinc-800 to-zinc-900",
              "text-white rounded-full p-1.5",
              "shadow-lg shadow-black/30 border border-zinc-700/50",
              "transition-all duration-300 hover:scale-105",
              "focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:ring-offset-2 focus:ring-offset-zinc-900",
            )}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>
        )}

        <div className="flex flex-col h-full">
          {/* Logo area */}
          <div
            className={cn(
              "flex items-center justify-center py-8 border-b border-zinc-800/30",
              "bg-gradient-to-r from-zinc-900/0 via-zinc-800/20 to-zinc-900/0",
              sidebarCollapsed && isDesktop ? "px-0" : "px-6",
            )}
          >
            <Link
              href="/"
              className={cn(
                "font-bold transition-all duration-300 relative group",
                "text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-600",
                sidebarCollapsed && isDesktop ? "text-xl" : "text-2xl",
              )}
            >
              {sidebarCollapsed && isDesktop ? "MC" : "MassClip"}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-red-500 to-red-600 transition-all duration-300 group-hover:w-full"></span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-6 overflow-y-auto scrollbar-hide px-3">
            {navigationItems.map((group, groupIndex) => (
              <div key={group.group} className="mb-6">
                {/* Group label */}
                {(!sidebarCollapsed || !isDesktop) && (
                  <div className="px-4 py-2 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    {group.group}
                  </div>
                )}
                {sidebarCollapsed && isDesktop && groupIndex > 0 && (
                  <div className="h-px mx-2 my-4 bg-gradient-to-r from-zinc-800/0 via-zinc-800/50 to-zinc-800/0"></div>
                )}

                {/* Group items */}
                <div className="space-y-1 mt-2">
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
                          "flex items-center rounded-lg transition-all duration-200",
                          "relative overflow-hidden group",
                          sidebarCollapsed && isDesktop ? "justify-center py-3 px-2" : "py-2.5 px-4",
                          isActive
                            ? "text-white bg-gradient-to-r from-red-500/10 to-red-600/5 font-medium"
                            : "text-zinc-400 hover:text-white hover:bg-zinc-800/30",
                        )}
                        title={item.name}
                      >
                        {/* Active indicator */}
                        {isActive && (
                          <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-red-500 to-red-600 rounded-r"></span>
                        )}

                        {/* Icon with subtle glow for active state */}
                        <div className={cn("relative", isActive && "text-red-500")}>
                          <item.icon
                            className={cn(
                              "h-5 w-5 transition-all",
                              sidebarCollapsed && isDesktop ? "" : "mr-3",
                              isActive && "drop-shadow-[0_0_3px_rgba(239,68,68,0.3)]",
                            )}
                          />
                        </div>

                        {/* Text with gradient hover effect */}
                        {(!sidebarCollapsed || !isDesktop) && (
                          <span
                            className={cn(
                              "relative",
                              "after:absolute after:bottom-0 after:left-0 after:h-[1px] after:bg-red-500/70",
                              "after:w-0 after:transition-all after:duration-300",
                              "group-hover:after:w-full",
                              isActive && "after:w-full",
                            )}
                          >
                            {item.name}
                          </span>
                        )}
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
                "bg-gradient-to-t from-zinc-900/50 to-transparent",
                sidebarCollapsed && isDesktop ? "px-2" : "px-4",
              )}
            >
              {/* User info - only show when expanded */}
              {!sidebarCollapsed && isDesktop && (
                <div className="flex items-center mb-4 px-2">
                  <div className="relative w-10 h-10 rounded-full overflow-hidden border border-zinc-700/50 shadow-md">
                    {creator.profilePic ? (
                      <Image
                        src={creator.profilePic || "/placeholder.svg"}
                        alt={creator.displayName}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-red-500/20 to-red-600/20 flex items-center justify-center">
                        <span className="text-lg font-medium text-white">{creator.displayName.charAt(0)}</span>
                      </div>
                    )}
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-zinc-900"></div>
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
                  "bg-gradient-to-r hover:from-red-950/30 hover:to-red-900/20",
                  "text-zinc-400 hover:text-white border border-transparent",
                  "hover:border-red-900/30 hover:shadow-inner",
                  sidebarCollapsed && isDesktop ? "justify-center p-2" : "justify-start px-4 py-2",
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
                  "bg-gradient-to-r from-amber-200 to-yellow-400 bg-clip-text text-transparent",
                  "flex items-center gap-1.5",
                  sidebarCollapsed && isDesktop ? "justify-center" : "",
                )}
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
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

      {/* Main content - fixed the black gap by using proper margin */}
      <div
        className={cn(
          "flex-1 transition-all duration-300",
          sidebarOpen ? (sidebarCollapsed ? "ml-20" : "ml-72") : "ml-0",
        )}
      >
        <CreatorProfile creator={creator} />
      </div>
    </div>
  )
}
