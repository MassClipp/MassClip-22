"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import CreatorProfile from "@/components/creator-profile"
import { Button } from "@/components/ui/button"
import { Home, User, Video, ShoppingBag, Settings, Menu, X, LogOut, ChevronRight, ChevronLeft } from "lucide-react"
import { useMediaQuery } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"

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
  const { user, logOut } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const isDesktop = useMediaQuery("(min-width: 1024px)")
  const isOwner = user && user.uid === creator.uid

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

  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row">
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

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 bg-zinc-900/95 backdrop-blur-md border-r border-zinc-800/50 transition-all duration-300 ease-in-out lg:relative",
          {
            "translate-x-0": sidebarOpen,
            "-translate-x-full": !sidebarOpen,
            "w-64": !sidebarCollapsed,
            "w-16": sidebarCollapsed && isDesktop,
          },
        )}
      >
        {/* Collapse toggle button - only visible on desktop */}
        {isDesktop && sidebarOpen && (
          <button
            onClick={toggleCollapse}
            className="absolute -right-3 top-20 bg-zinc-800 text-white rounded-full p-1 shadow-md border border-zinc-700 z-50"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        )}

        <div className="flex flex-col h-full">
          <div
            className={cn(
              "flex items-center justify-center py-6 border-b border-zinc-800/50",
              sidebarCollapsed && isDesktop ? "px-0" : "px-4",
            )}
          >
            <Link
              href="/"
              className={cn(
                "font-bold text-crimson transition-all duration-300",
                sidebarCollapsed && isDesktop ? "text-base" : "text-xl",
              )}
            >
              {sidebarCollapsed && isDesktop ? "MC" : "MassClip"}
            </Link>
          </div>

          <nav className="flex-1 py-6 overflow-y-auto scrollbar-hide">
            <div className="space-y-1 px-2">
              <Link
                href="/"
                className={cn(
                  "flex items-center text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-md transition-colors",
                  sidebarCollapsed && isDesktop ? "justify-center py-3 px-2" : "py-2.5 px-3",
                )}
                title="Home"
              >
                <Home className={cn("h-5 w-5", sidebarCollapsed && isDesktop ? "" : "mr-3")} />
                {(!sidebarCollapsed || !isDesktop) && <span>Home</span>}
              </Link>

              <Link
                href={`/creator/${creator.username}`}
                className={cn(
                  "flex items-center bg-zinc-800/50 text-white rounded-md transition-colors",
                  sidebarCollapsed && isDesktop ? "justify-center py-3 px-2" : "py-2.5 px-3",
                )}
                title="Profile"
              >
                <User className={cn("h-5 w-5", sidebarCollapsed && isDesktop ? "" : "mr-3")} />
                {(!sidebarCollapsed || !isDesktop) && <span>Profile</span>}
              </Link>
            </div>

            {(!sidebarCollapsed || !isDesktop) && (
              <div className="px-4 py-2 text-xs text-zinc-500 uppercase mt-6">Content</div>
            )}
            {sidebarCollapsed && isDesktop && <div className="h-px bg-zinc-800/50 my-4 mx-2"></div>}

            <div className="space-y-1 px-2">
              <Link
                href={`/creator/${creator.username}?tab=free`}
                className={cn(
                  "flex items-center text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-md transition-colors",
                  sidebarCollapsed && isDesktop ? "justify-center py-3 px-2" : "py-2.5 px-3",
                )}
                title="Free Clips"
              >
                <Video className={cn("h-5 w-5", sidebarCollapsed && isDesktop ? "" : "mr-3")} />
                {(!sidebarCollapsed || !isDesktop) && <span>Free Clips</span>}
              </Link>

              <Link
                href={`/creator/${creator.username}?tab=premium`}
                className={cn(
                  "flex items-center text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-md transition-colors",
                  sidebarCollapsed && isDesktop ? "justify-center py-3 px-2" : "py-2.5 px-3",
                )}
                title="Premium Clips"
              >
                <ShoppingBag className={cn("h-5 w-5", sidebarCollapsed && isDesktop ? "" : "mr-3")} />
                {(!sidebarCollapsed || !isDesktop) && <span>Premium Clips</span>}
              </Link>
            </div>

            {isOwner && (
              <>
                {(!sidebarCollapsed || !isDesktop) && (
                  <div className="px-4 py-2 text-xs text-zinc-500 uppercase mt-6">Creator Tools</div>
                )}
                {sidebarCollapsed && isDesktop && <div className="h-px bg-zinc-800/50 my-4 mx-2"></div>}

                <div className="space-y-1 px-2">
                  <Link
                    href="/dashboard"
                    className={cn(
                      "flex items-center text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-md transition-colors",
                      sidebarCollapsed && isDesktop ? "justify-center py-3 px-2" : "py-2.5 px-3",
                    )}
                    title="Dashboard"
                  >
                    <ChevronRight className={cn("h-5 w-5", sidebarCollapsed && isDesktop ? "" : "mr-3")} />
                    {(!sidebarCollapsed || !isDesktop) && <span>Dashboard</span>}
                  </Link>

                  <Link
                    href="/dashboard/profile/edit"
                    className={cn(
                      "flex items-center text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-md transition-colors",
                      sidebarCollapsed && isDesktop ? "justify-center py-3 px-2" : "py-2.5 px-3",
                    )}
                    title="Edit Profile"
                  >
                    <Settings className={cn("h-5 w-5", sidebarCollapsed && isDesktop ? "" : "mr-3")} />
                    {(!sidebarCollapsed || !isDesktop) && <span>Edit Profile</span>}
                  </Link>
                </div>
              </>
            )}
          </nav>

          {isOwner && (
            <div className={cn("border-t border-zinc-800/50 py-4", sidebarCollapsed && isDesktop ? "px-2" : "px-4")}>
              <Button
                variant="ghost"
                className={cn(
                  "text-zinc-400 hover:text-white hover:bg-zinc-800/50",
                  sidebarCollapsed && isDesktop ? "w-full justify-center p-2" : "w-full justify-start",
                )}
                onClick={() => logOut()}
                title="Log out"
              >
                <LogOut className={cn("h-5 w-5", sidebarCollapsed && isDesktop ? "" : "mr-3")} />
                {(!sidebarCollapsed || !isDesktop) && <span>Log out</span>}
              </Button>
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
          isDesktop && sidebarOpen && sidebarCollapsed
            ? "lg:ml-16"
            : isDesktop && sidebarOpen && !sidebarCollapsed
              ? "lg:ml-64"
              : "",
        )}
      >
        <CreatorProfile creator={creator} />
      </div>
    </div>
  )
}
