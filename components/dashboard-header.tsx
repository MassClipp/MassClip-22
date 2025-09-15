"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Menu, X, Heart, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import UserDropdown from "@/components/user-dropdown"
import Logo from "@/components/logo"
import { useAuth } from "@/contexts/auth-context"
import { useUserPlan } from "@/hooks/use-user-plan"

interface DashboardHeaderProps {
  initialSearchQuery?: string
}

export default function DashboardHeader({ initialSearchQuery = "" }: DashboardHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()
  const { isProUser } = useUserPlan()

  // Only show search on explore page
  const showSearch = pathname === "/dashboard/explore"

  const [searchQuery, setSearchQuery] = useState(initialSearchQuery)

  useEffect(() => {
    setSearchQuery(initialSearchQuery)
  }, [initialSearchQuery])

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
      {isProUser && (
        <div className="absolute top-2 left-4 z-50">
          <div className="relative">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 transform rotate-45 shadow-lg border border-blue-300/50"></div>
            <div className="absolute top-1 left-1 w-4 h-4 bg-gradient-to-br from-blue-300 to-blue-500 transform rotate-45"></div>
            {/* Sparkle effect */}
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full opacity-80 animate-pulse"></div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-4">
            {isProUser && (
              <div className="relative">
                <div className="absolute -top-2 -left-2 z-10">
                  <div className="relative">
                    <div className="w-6 h-6 bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 transform rotate-45 shadow-lg border border-blue-300/50"></div>
                    <div className="absolute top-1 left-1 w-4 h-4 bg-gradient-to-br from-blue-300 to-blue-500 transform rotate-45"></div>
                    {/* Sparkle effect */}
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full opacity-80 animate-pulse"></div>
                  </div>
                </div>
              </div>
            )}
            <Logo href="/dashboard" size="sm" />
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
          <div className="flex items-center gap-4">
            {/* User Dropdown - Desktop */}
            <div className="hidden md:block">
              <UserDropdown />
            </div>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
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
