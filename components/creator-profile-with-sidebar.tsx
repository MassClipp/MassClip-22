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
            className="bg-gray-900 border-gray-700 hover:bg-gray-800"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-gray-900 border-r border-gray-800 transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0",
          {
            "translate-x-0": sidebarOpen || isDesktop,
            "-translate-x-full": !sidebarOpen && !isDesktop,
          },
        )}
      >
        <div className="flex flex-col h-full p-4">
          <div className="flex items-center justify-center py-6 border-b border-gray-800 mb-6">
            <Link href="/" className="text-xl font-bold text-red-500">
              MassClip
            </Link>
          </div>

          <nav className="flex-1 space-y-1">
            <Link
              href="/"
              className="flex items-center px-4 py-3 text-gray-300 hover:bg-gray-800 rounded-md transition-colors"
            >
              <Home className="mr-3 h-5 w-5" />
              <span>Home</span>
            </Link>

            <Link
              href={`/creator/${creator.username}`}
              className="flex items-center px-4 py-3 bg-gray-800 text-white rounded-md transition-colors"
            >
              <User className="mr-3 h-5 w-5" />
              <span>Profile</span>
            </Link>

            <div className="px-4 py-2 text-xs text-gray-500 uppercase mt-6">Content</div>

            <Link
              href={`/creator/${creator.username}?tab=free`}
              className="flex items-center px-4 py-3 text-gray-300 hover:bg-gray-800 rounded-md transition-colors"
            >
              <Video className="mr-3 h-5 w-5" />
              <span>Free Clips</span>
            </Link>

            <Link
              href={`/creator/${creator.username}?tab=premium`}
              className="flex items-center px-4 py-3 text-gray-300 hover:bg-gray-800 rounded-md transition-colors"
            >
              <ShoppingBag className="mr-3 h-5 w-5" />
              <span>Premium Clips</span>
            </Link>

            {isOwner && (
              <>
                <div className="px-4 py-2 text-xs text-gray-500 uppercase mt-6">Creator Tools</div>

                <Link
                  href="/dashboard"
                  className="flex items-center px-4 py-3 text-gray-300 hover:bg-gray-800 rounded-md transition-colors"
                >
                  <ChevronRight className="mr-3 h-5 w-5" />
                  <span>Dashboard</span>
                </Link>

                <Link
                  href="/dashboard/profile/edit"
                  className="flex items-center px-4 py-3 text-gray-300 hover:bg-gray-800 rounded-md transition-colors"
                >
                  <Settings className="mr-3 h-5 w-5" />
                  <span>Edit Profile</span>
                </Link>
              </>
            )}
          </nav>

          {isOwner && (
            <div className="border-t border-gray-800 pt-4 mt-6">
              <Button
                variant="ghost"
                className="w-full justify-start text-gray-400 hover:text-white hover:bg-gray-800"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 z-30" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-64">
        <CreatorProfile creator={creator} />
      </div>
    </div>
  )
}
