"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Menu, X, Heart, Search, Upload, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import UserDropdown from "@/components/user-dropdown"
import Logo from "@/components/logo"
import { useAuth } from "@/contexts/auth-context"
import { useUserPlan } from "@/hooks/use-user-plan"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface DashboardHeaderProps {
  initialSearchQuery?: string
}

export default function DashboardHeader({ initialSearchQuery = "" }: DashboardHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()
  const { isProUser } = useUserPlan()
  const [username, setUsername] = useState<string | null>(null)

  // Only show search on explore page
  const showSearch = pathname === "/dashboard/explore"

  const [searchQuery, setSearchQuery] = useState(initialSearchQuery)

  useEffect(() => {
    setSearchQuery(initialSearchQuery)
  }, [initialSearchQuery])

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            setUsername(userData.username || null)
          }
        } catch (error) {
          console.error("Error fetching user data:", error)
        }
      }
    }

    fetchUserData()
  }, [user])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      localStorage.setItem("lastSearchQuery", searchQuery.trim())
      router.push(`/dashboard/explore?search=${encodeURIComponent(searchQuery.trim())}`)
    } else {
      router.push("/dashboard/explore")
    }
  }

  const clearSearch = () => {
    setSearchQuery("")
    localStorage.removeItem("lastSearchQuery")
    router.push("/dashboard/explore")
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800/50 bg-black/80 backdrop-blur-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Left Section - Logo without PRO badge */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>

            <div className="flex items-center gap-2">
              <Logo href="/dashboard" size="sm" className="scale-75 md:scale-100" />
            </div>
          </div>

          {/* Search Bar - Desktop (only on explore page) */}
          {showSearch && (
            <div className="hidden md:block flex-1 max-w-xl mx-8">
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={20} />
                <input
                  type="text"
                  placeholder="Search videos..."
                  className="w-full py-2 pl-10 pr-4 bg-zinc-900/60 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                )}
              </form>
            </div>
          )}

          {/* Favorites Button - only on explore page */}
          {showSearch && (
            <div className="hidden md:block">
              <Button
                onClick={() => router.push("/dashboard/favorites")}
                variant="ghost"
                className="text-zinc-400 hover:text-white hover:bg-zinc-900/50 rounded-lg px-4 py-2 transition-all duration-300 flex items-center gap-2"
              >
                <Heart className="h-4 w-4" />
                Favorites
              </Button>
            </div>
          )}

          {/* Right Section */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 md:hidden">
              <Button
                onClick={() => router.push("/dashboard/upload")}
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-900/50"
                title="Upload"
              >
                <Upload className="h-4 w-4" />
              </Button>

              {username && (
                <Button
                  onClick={() => window.open(`/creator/${username}`, "_blank")}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-900/50"
                  title="View Profile"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Desktop buttons */}
            <div className="hidden md:flex items-center gap-3">
              <Button
                onClick={() => router.push("/dashboard/upload")}
                className="bg-white text-black hover:bg-zinc-100 font-medium"
                size="sm"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>

              {username && (
                <Button
                  variant="outline"
                  onClick={() => window.open(`/creator/${username}`, "_blank")}
                  className="border-zinc-700 hover:bg-zinc-800"
                  size="sm"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Profile
                </Button>
              )}
            </div>

            {/* User Dropdown */}
            <div className="hidden md:block">
              <UserDropdown />
            </div>

            {/* Mobile user avatar */}
            <div className="md:hidden">
              <UserDropdown />
            </div>
          </div>
        </div>

        {/* Mobile Search (only on explore page) */}
        {showSearch && (
          <div className="md:hidden pb-4">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={20} />
              <input
                type="text"
                placeholder="Search videos..."
                className="w-full py-2 pl-10 pr-4 bg-zinc-900/60 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              )}
            </form>
          </div>
        )}

        {/* Mobile Favorites Button (only on explore page) */}
        {showSearch && (
          <div className="md:hidden pb-2">
            <Button
              onClick={() => router.push("/dashboard/favorites")}
              variant="ghost"
              className="w-full text-zinc-400 hover:text-white hover:bg-zinc-900/50 rounded-lg px-4 py-2 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Heart className="h-4 w-4" />
              Favorites
            </Button>
          </div>
        )}
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-800/50">
          <div className="container mx-auto px-4 py-4">
            <UserDropdown />
          </div>
        </div>
      )}
    </header>
  )
}

// Named export for compatibility
export { DashboardHeader }
