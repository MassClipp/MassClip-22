"use client"

import { useState } from "react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import CreatorProfile from "@/components/creator-profile"
import { Button } from "@/components/ui/button"
import { Home, User, Video, ShoppingBag, Settings, Menu, X, LogOut, ChevronRight } from "lucide-react"
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
  const isDesktop = useMediaQuery("(min-width: 1024px)")
  const isOwner = user && user.uid === creator.uid

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row">
      {/* Mobile menu button */}
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
          "fixed inset-y-0 left-0 z-40 w-64 bg-zinc-900/95 backdrop-blur-md border-r border-zinc-800/50 transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0",
          {
            "translate-x-0": sidebarOpen || isDesktop,
            "-translate-x-full": !sidebarOpen && !isDesktop,
          },
        )}
      >
        <div className="flex flex-col h-full p-4">
          <div className="flex items-center justify-center py-6 border-b border-zinc-800/50 mb-6">
            <Link href="/" className="text-xl font-bold text-crimson">
              MassClip
            </Link>
          </div>

          <nav className="flex-1 space-y-1">
            <Link
              href="/"
              className="flex items-center px-4 py-3 text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-md transition-colors"
            >
              <Home className="mr-3 h-5 w-5" />
              <span>Home</span>
            </Link>

            <Link
              href={`/creator/${creator.username}`}
              className="flex items-center px-4 py-3 bg-zinc-800/50 text-white rounded-md transition-colors"
            >
              <User className="mr-3 h-5 w-5" />
              <span>Profile</span>
            </Link>

            <div className="px-4 py-2 text-xs text-zinc-500 uppercase mt-6">Content</div>

            <Link
              href={`/creator/${creator.username}?tab=free`}
              className="flex items-center px-4 py-3 text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-md transition-colors"
            >
              <Video className="mr-3 h-5 w-5" />
              <span>Free Clips</span>
            </Link>

            <Link
              href={`/creator/${creator.username}?tab=premium`}
              className="flex items-center px-4 py-3 text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-md transition-colors"
            >
              <ShoppingBag className="mr-3 h-5 w-5" />
              <span>Premium Clips</span>
            </Link>

            {isOwner && (
              <>
                <div className="px-4 py-2 text-xs text-zinc-500 uppercase mt-6">Creator Tools</div>

                <Link
                  href="/dashboard"
                  className="flex items-center px-4 py-3 text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-md transition-colors"
                >
                  <ChevronRight className="mr-3 h-5 w-5" />
                  <span>Dashboard</span>
                </Link>

                <Link
                  href="/dashboard/profile/edit"
                  className="flex items-center px-4 py-3 text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-md transition-colors"
                >
                  <Settings className="mr-3 h-5 w-5" />
                  <span>Edit Profile</span>
                </Link>
              </>
            )}
          </nav>

          {isOwner && (
            <div className="border-t border-zinc-800/50 pt-4 mt-6">
              <Button
                variant="ghost"
                className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                onClick={() => logOut()}
              >
                <LogOut className="mr-3 h-5 w-5" />
                <span>Log out</span>
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
      <div className="flex-1 lg:ml-64">
        <CreatorProfile creator={creator} />
      </div>
    </div>
  )
}
