"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { User, LogOut, X, Search, Download, Home, Grid, Heart, Clock, Crown, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import UpgradeButton from "@/components/upgrade-button"
import Logo from "@/components/logo"
import UserDownloadInfo from "@/components/user-download-info"
import { useUserPlan } from "@/hooks/use-user-plan"
import { useDownloadLimit } from "@/contexts/download-limit-context"
import { useMobile } from "@/hooks/use-mobile"

export default function DashboardHeader({ initialSearchQuery = "" }) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const { user, logOut } = useAuth()
  const { isProUser } = useUserPlan()
  const { remainingDownloads, hasReachedLimit } = useDownloadLimit()
  const router = useRouter()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const isMobile = useMobile()

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true)
      } else {
        setIsScrolled(false)
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Focus search input when search is opened
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isSearchOpen])

  const handleLogout = async () => {
    const result = await logOut()
    if (result.success) {
      router.push("/login")
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // Save the search query to localStorage for potential use in other components
      localStorage.setItem("lastSearchQuery", searchQuery)
      router.push(`/dashboard?search=${encodeURIComponent(searchQuery)}`)
      setIsSearchOpen(false)
    }
  }

  // Navigation items for both desktop and mobile
  const navigationItems = [
    { name: "Home", href: "/dashboard", icon: <Home className="h-4 w-4" /> },
    { name: "Categories", href: "/dashboard/categories", icon: <Grid className="h-4 w-4" /> },
    { name: "Favorites", href: "/dashboard/favorites", icon: <Heart className="h-4 w-4" /> },
    { name: "History", href: "/dashboard/history", icon: <Clock className="h-4 w-4" /> },
    { name: "Upload Content", href: "/dashboard/upload", icon: <Upload className="h-4 w-4" /> },
    { name: "Membership", href: "/membership-plans", icon: <Crown className="h-4 w-4" /> },
  ]

  return (
    <>
      <header
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          isScrolled ? "bg-black/90 backdrop-blur-sm border-b border-zinc-900" : "bg-transparent"
        }`}
      >
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Logo href="/dashboard" />

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              {navigationItems.slice(0, 4).map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`${
                    item.current ? "text-white" : "text-zinc-400"
                  } hover:text-white transition-colors text-sm font-light tracking-wide`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>

          {/* BETA Tag - Now visible on all screen sizes */}
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <span className="text-xs font-extralight tracking-widest text-amber-400">BETA</span>
          </div>

          {/* Desktop Action Buttons */}
          <div className="hidden md:flex items-center gap-4">
            {/* Search Button */}
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="text-zinc-400 hover:text-white transition-colors p-2"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </button>

            {/* Downloads Counter */}
            {isProUser ? (
              <div className="flex items-center text-zinc-400 text-sm">
                <Download className="h-4 w-4 mr-1" />
                <span className="font-light">Unlimited</span>
              </div>
            ) : (
              <div className="flex items-center bg-zinc-900/80 border border-zinc-800 rounded-full px-3 py-1">
                <Download className={`h-4 w-4 mr-1 ${hasReachedLimit ? "text-amber-500" : "text-crimson"}`} />
                <span className={`text-sm font-medium ${hasReachedLimit ? "text-amber-500" : "text-white"}`}>
                  {remainingDownloads} left
                </span>
              </div>
            )}

            {/* Upgrade Button (non-Pro users) */}
            {!isProUser && (
              <UpgradeButton navigateOnly={true} className="hidden md:flex">
                Upgrade
              </UpgradeButton>
            )}

            {/* User Menu */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full"
                  >
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-zinc-900/95 backdrop-blur-sm border-zinc-800 text-white">
                  <DropdownMenuLabel className="font-light">
                    {user.displayName ? user.displayName : "My Account"}
                  </DropdownMenuLabel>
                  <UserDownloadInfo />
                  <DropdownMenuSeparator className="bg-zinc-800" />
                  <DropdownMenuItem
                    className="hover:bg-zinc-800 focus:bg-zinc-800"
                    onClick={() => router.push("/dashboard/user")}
                  >
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="hover:bg-zinc-800 focus:bg-zinc-800"
                    onClick={() => router.push("/dashboard/profile")}
                  >
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-zinc-800" />
                  <DropdownMenuItem className="hover:bg-zinc-800 focus:bg-zinc-800" onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Mobile Header Actions */}
          <div className="flex md:hidden items-center gap-2">
            {/* Mobile Search Button */}
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="text-zinc-400 hover:text-white transition-colors p-2"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </button>

            {/* Mobile Download Counter for Free Users */}
            {!isProUser && (
              <div className="flex items-center bg-zinc-900/80 border border-zinc-800 rounded-full px-2 py-0.5">
                <Download className={`h-3 w-3 mr-1 ${hasReachedLimit ? "text-amber-500" : "text-crimson"}`} />
                <span className={`text-xs font-medium ${hasReachedLimit ? "text-amber-500" : "text-white"}`}>
                  {remainingDownloads}
                </span>
              </div>
            )}

            {/* User Profile Button */}
            <Button
              variant="ghost"
              size="icon"
              className="text-zinc-400 hover:text-white hover:bg-transparent"
              onClick={() => router.push("/dashboard/user")}
              aria-label="User profile"
            >
              <User className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Search Overlay */}
        {isSearchOpen && (
          <div className="absolute top-16 left-0 right-0 bg-black/95 backdrop-blur-md border-b border-zinc-900 p-4 z-50">
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for clips..."
                  className="w-full bg-zinc-900/50 border border-zinc-800 text-white px-4 py-2 pl-10 rounded-md focus:outline-none focus:ring-1 focus:ring-crimson"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(false)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-500 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        )}
      </header>

      {/* Mobile Bottom Navigation Bar */}
      {isMobile && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-md border-t border-zinc-800 z-50">
          <div className="flex justify-around items-center h-16">
            {navigationItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex flex-col items-center justify-center w-full h-full text-zinc-400 hover:text-white transition-colors"
              >
                <div className="flex items-center justify-center">{item.icon}</div>
                <span className="text-xs mt-1">{item.name}</span>
              </Link>
            ))}
          </div>
        </nav>
      )}
    </>
  )
}
