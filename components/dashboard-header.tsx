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
  Clock,
  Menu,
  ChevronRight,
  DollarSign,
  Infinity,
  Globe,
  Upload,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import Logo from "@/components/logo"
import UserDownloadInfo from "@/components/user-download-info"
import { useUserPlan } from "@/hooks/use-user-plan"
import { useDownloadLimit } from "@/contexts/download-limit-context"
import { useMobile } from "@/hooks/use-mobile"
import { useScrollLock } from "@/hooks/use-scroll-lock"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function DashboardHeader({ initialSearchQuery = "" }) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [username, setUsername] = useState<string | null>(null)
  const { user, signOut } = useAuth()
  const { isProUser, loading } = useUserPlan()
  const { remainingDownloads, hasReachedLimit } = useDownloadLimit()
  const router = useRouter()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const isMobile = useMobile()

  // Lock scroll when mobile menu is open
  useScrollLock(isMobileMenuOpen)

  // Fetch username for profile redirect
  useEffect(() => {
    const fetchUsername = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            setUsername(userData.username || null)
          }
        } catch (error) {
          console.error("Error fetching username:", error)
        }
      }
    }

    fetchUsername()
  }, [user])

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

  const handleProfileClick = () => {
    if (username) {
      router.push(`/creator/${username}`)
    }
  }

  // Navigation items for both desktop and mobile
  const navigationItems = [
    { name: "Home", href: "/dashboard", icon: <Home className="h-4 w-4" /> },
    { name: "Categories", href: "/dashboard/categories", icon: <Grid className="h-4 w-4" /> },
    { name: "Favorites", href: "/dashboard/favorites", icon: <Heart className="h-4 w-4" /> },
    { name: "History", href: "/dashboard/history", icon: <Clock className="h-4 w-4" /> },
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

            {/* User Menu - Desktop: Hover for dropdown, click for profile */}
            {user && (
              <div className="relative group">
                {/* Profile Icon Button - Clickable */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full"
                  onClick={handleProfileClick}
                  aria-label="Go to profile"
                >
                  <User className="h-5 w-5" />
                </Button>

                {/* Dropdown Menu - Appears on Hover with buffer zone */}
                <div className="absolute right-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
                  {/* This invisible element creates a "buffer zone" between the icon and dropdown */}
                  <div className="absolute -top-2 left-0 right-0 h-2 bg-transparent"></div>

                  <div className="bg-zinc-900/95 backdrop-blur-sm border border-zinc-800 rounded-md shadow-lg overflow-hidden w-56">
                    <div className="px-4 py-3">
                      <p className="text-sm font-light text-white">
                        {user.displayName ? user.displayName : "My Account"}
                      </p>
                    </div>

                    <UserDownloadInfo />

                    <div className="border-t border-zinc-800"></div>

                    <div className="py-1">
                      {username && (
                        <Link
                          href={`/creator/${username}`}
                          className="flex items-center px-4 py-2 text-sm text-white hover:bg-zinc-800"
                        >
                          <Globe className="h-4 w-4 mr-2" />
                          Public Profile
                        </Link>
                      )}

                      <Link
                        href="/dashboard/user"
                        className="flex items-center px-4 py-2 text-sm text-white hover:bg-zinc-800"
                      >
                        <User className="h-4 w-4 mr-2" />
                        Dashboard
                      </Link>

                      <Link
                        href="/dashboard/profile"
                        className="flex items-center px-4 py-2 text-sm text-white hover:bg-zinc-800"
                      >
                        <User className="h-4 w-4 mr-2" />
                        Profile
                      </Link>
                    </div>

                    <div className="border-t border-zinc-800"></div>

                    <div className="py-1">
                      <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="flex w-full items-center px-4 py-2 text-sm text-red-500 hover:bg-zinc-800 disabled:opacity-50"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        {isLoggingOut ? "Logging out..." : "Log out"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
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
              <Link
                href="/dashboard/upload"
                className="flex items-center justify-between py-3 px-4 text-white/90 hover:text-white hover:bg-white/5 rounded-lg transition-colors group"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <div className="flex items-center">
                  <Upload className="h-4 w-4 mr-3" />
                  <span className="text-sm font-light tracking-wide">Upload Video</span>
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-500 group-hover:text-white/70 transition-colors" />
              </Link>
            </div>

            {/* User Section */}
            <div className="mt-8 pt-6 border-t border-zinc-800/50 bg-black">
              <p className="text-xs text-zinc-500 font-light px-4 mb-4">Account</p>

              {username && (
                <Link
                  href={`/creator/${username}`}
                  className="flex items-center justify-between py-3 px-4 text-white/90 hover:text-white hover:bg-white/5 rounded-lg transition-colors group"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <div className="flex items-center">
                    <Globe className="h-4 w-4 mr-3" />
                    <span className="text-sm font-light">Public Profile</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-zinc-500 group-hover:text-white/70 transition-colors" />
                </Link>
              )}

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
