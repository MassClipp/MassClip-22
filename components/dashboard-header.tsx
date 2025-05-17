"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  User,
  LogOut,
  X,
  Search,
  Download,
  Home,
  Grid,
  Heart,
  Menu,
  ChevronRight,
  DollarSign,
  Infinity,
  Video,
} from "lucide-react"
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
import Logo from "@/components/logo"
import UserDownloadInfo from "@/components/user-download-info"
import { useUserPlan } from "@/hooks/use-user-plan"
import { useDownloadLimit } from "@/contexts/download-limit-context"
import { useMobile } from "@/hooks/use-mobile"
import { useScrollLock } from "@/hooks/use-scroll-lock"

export default function DashboardHeader({ initialSearchQuery = "" }) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const { user, signOut } = useAuth()
  const { isProUser, loading } = useUserPlan()
  const { remainingDownloads, hasReachedLimit } = useDownloadLimit()
  const router = useRouter()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const isMobile = useMobile()
  const [creatorUsername, setCreatorUsername] = useState<string | undefined>(undefined)

  // Lock scroll when mobile menu is open
  useScrollLock(isMobileMenuOpen)

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

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false)
      }
    }

    if (isMobileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isMobileMenuOpen])

  useEffect(() => {
    const fetchCreatorProfile = async () => {
      if (!user) return

      try {
        const response = await fetch(`/api/creator-profile?userId=${user.uid}`)
        if (response.ok) {
          const data = await response.json()
          if (data.profile && data.profile.username) {
            setCreatorUsername(data.profile.username)
          }
        }
      } catch (error) {
        console.error("Error fetching creator profile:", error)
      }
    }

    fetchCreatorProfile()
  }, [user])

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      await signOut()
      // The redirect is handled in the auth context
    } catch (error) {
      console.error("Error during logout:", error)
      // Fallback redirect
      router.push("/login")
    } finally {
      setIsLoggingOut(false)
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
    { name: "Creator", href: "/dashboard/creator", icon: <Video className="h-4 w-4" /> },
    { name: "Pricing", href: "/membership-plans", icon: <DollarSign className="h-4 w-4" /> },
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
              {[navigationItems[0], navigationItems[1], navigationItems[2], navigationItems[4]].map((item) => (
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

            {/* Downloads Counter - Show for both pro and free users */}
            {!loading && (
              <>
                {isProUser ? (
                  <div className="flex items-center bg-zinc-900/80 border border-zinc-800 rounded-full px-3 py-1">
                    <Download className="h-4 w-4 mr-1 text-green-500" />
                    <span className="text-sm font-medium text-green-500 mr-1">Unlimited</span>
                    <Infinity className="h-3 w-3 text-green-500" />
                  </div>
                ) : (
                  <div className="flex items-center bg-zinc-900/80 border border-zinc-800 rounded-full px-3 py-1">
                    <Download className={`h-4 w-4 mr-1 ${hasReachedLimit ? "text-amber-500" : "text-crimson"}`} />
                    <span className={`text-sm font-medium ${hasReachedLimit ? "text-amber-500" : "text-white"}`}>
                      {remainingDownloads} left
                    </span>
                  </div>
                )}
              </>
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
                  {creatorUsername && (
                    <>
                      <div className="px-2 py-2">
                        <p className="text-xs text-zinc-500 mb-1">Creator Profile</p>
                        <p className="text-sm text-white">@{creatorUsername}</p>
                      </div>
                      <DropdownMenuItem
                        className="hover:bg-zinc-800 focus:bg-zinc-800"
                        onClick={() => router.push("/dashboard/creator")}
                      >
                        <Video className="h-4 w-4 mr-2" />
                        Creator Dashboard
                      </DropdownMenuItem>
                    </>
                  )}
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
                  <DropdownMenuItem
                    className="hover:bg-zinc-800 focus:bg-zinc-800"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    {isLoggingOut ? "Logging out..." : "Log out"}
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

            {/* Mobile Download Counter - Show for both pro and free users */}
            {!loading && (
              <>
                {isProUser ? (
                  <div className="flex items-center bg-zinc-900/80 border border-zinc-800 rounded-full px-2 py-0.5">
                    <Download className="h-3 w-3 mr-1 text-green-500" />
                    <Infinity className="h-3 w-3 text-green-500" />
                  </div>
                ) : (
                  <div className="flex items-center bg-zinc-900/80 border border-zinc-800 rounded-full px-2 py-0.5">
                    <Download className={`h-3 w-3 mr-1 ${hasReachedLimit ? "text-amber-500" : "text-crimson"}`} />
                    <span className={`text-xs font-medium ${hasReachedLimit ? "text-amber-500" : "text-white"}`}>
                      {remainingDownloads}
                    </span>
                  </div>
                )}
              </>
            )}

            {/* Mobile Menu Button */}
            <button
              className="flex items-center justify-center w-10 h-10 text-white bg-zinc-900/50 rounded-full border border-zinc-800/50 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
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

      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu - Side Drawer */}
      <div
        ref={mobileMenuRef}
        className={`md:hidden fixed inset-y-0 right-0 w-[280px] bg-black shadow-2xl transition-all duration-300 ease-in-out z-50 ${
          isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{
          boxShadow: "-5px 0 25px rgba(0, 0, 0, 0.5)",
          borderLeft: "1px solid rgba(255, 255, 255, 0.05)",
        }}
      >
        <div className="flex flex-col h-full">
          {/* Menu Header */}
          <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-black">
            <Logo href="/dashboard" size="sm" />
            <button
              className="flex items-center justify-center w-8 h-8 text-white/80 hover:text-white bg-zinc-800/50 rounded-full"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label="Close menu"
            >
              <X size={16} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto py-6 px-5 bg-black">
            <div className="space-y-1">
              {navigationItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center justify-between py-3 px-4 text-white/90 hover:text-white hover:bg-white/5 rounded-lg transition-colors group"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <div className="flex items-center">
                    <span className="mr-3">{item.icon}</span>
                    <span className="text-sm font-light tracking-wide">{item.name}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-zinc-500 group-hover:text-white/70 transition-colors" />
                </Link>
              ))}
            </div>

            {/* User Section */}
            <div className="mt-8 pt-6 border-t border-zinc-800/50 bg-black">
              <p className="text-xs text-zinc-500 font-light px-4 mb-4">Account</p>
              <Link
                href="/dashboard/user"
                className="flex items-center justify-between py-3 px-4 text-white/90 hover:text-white hover:bg-white/5 rounded-lg transition-colors group"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-3" />
                  <span className="text-sm font-light">Dashboard</span>
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-500 group-hover:text-white/70 transition-colors" />
              </Link>
              <Link
                href="/dashboard/profile"
                className="flex items-center justify-between py-3 px-4 text-white/90 hover:text-white hover:bg-white/5 rounded-lg transition-colors group"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-3" />
                  <span className="text-sm font-light">Profile</span>
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-500 group-hover:text-white/70 transition-colors" />
              </Link>
              {creatorUsername && (
                <Link
                  href="/dashboard/creator"
                  className="flex items-center justify-between py-3 px-4 text-white/90 hover:text-white hover:bg-white/5 rounded-lg transition-colors group"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <div className="flex items-center">
                    <Video className="h-4 w-4 mr-3" />
                    <span className="text-sm font-light">Creator Dashboard</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-zinc-500 group-hover:text-white/70 transition-colors" />
                </Link>
              )}
            </div>
          </nav>

          {/* Action Buttons */}
          <div className="p-5 border-t border-zinc-800/50 space-y-3 bg-black">
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center justify-center w-full py-2.5 text-sm text-white/90 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
            >
              <LogOut className="h-4 w-4 mr-2" />
              {isLoggingOut ? "Logging out..." : "Log out"}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
