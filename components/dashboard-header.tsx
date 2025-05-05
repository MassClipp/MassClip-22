"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { User, LogOut, Menu, X, Search, Download, ChevronRight, Home, Grid, Heart, Clock, Crown } from "lucide-react"
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
import { useScrollLock } from "@/hooks/use-scroll-lock"
import Logo from "@/components/logo"
import UserPlanBadge from "@/components/user-plan-badge"
import UserDownloadInfo from "@/components/user-download-info"
import { useUserPlan } from "@/hooks/use-user-plan"
import { useDownloadLimit } from "@/contexts/download-limit-context"

export default function DashboardHeader({ initialSearchQuery = "" }) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const { user, logOut } = useAuth()
  const { isProUser } = useUserPlan()
  const { remainingDownloads, hasReachedLimit } = useDownloadLimit()
  const router = useRouter()
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useScrollLock(mobileMenuOpen)

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

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false)
      }
    }

    if (mobileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [mobileMenuOpen])

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
    { name: "Membership", href: "/membership-plans", icon: <Crown className="h-4 w-4" /> },
  ]

  // Handle upgrade button click
  const handleUpgradeClick = () => {
    router.push("/membership-plans")
    setMobileMenuOpen(false)
  }

  return (
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
            {navigationItems.slice(0, 3).map((item) => (
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

          {/* Pro Badge */}
          {/* Pro badge only shown in dropdown menu */}

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

        {/* Mobile Menu Button */}
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

          {/* Pro badge only shown in dropdown menu */}
          <Button
            variant="ghost"
            size="icon"
            className="text-zinc-400 hover:text-white hover:bg-transparent"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
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

      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/90 backdrop-blur-sm z-40"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Dropdown Menu - COMPLETELY REVAMPED */}
      <div
        ref={mobileMenuRef}
        className={`md:hidden fixed inset-y-0 right-0 w-72 bg-black z-50 transform transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{
          boxShadow: "-5px 0 25px rgba(0, 0, 0, 0.5)",
          borderLeft: "1px solid rgba(255, 255, 255, 0.05)",
        }}
      >
        {/* Header with logo and close button */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <Logo href="/dashboard" className="h-6" />
          <Button
            variant="ghost"
            size="icon"
            className="text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex flex-col h-[calc(100%-64px)] overflow-hidden">
          {/* User profile section */}
          {user && (
            <div className="p-5 border-b border-zinc-800">
              <div
                className="flex items-center space-x-3 cursor-pointer"
                onClick={() => {
                  router.push("/dashboard/user")
                  setMobileMenuOpen(false)
                }}
              >
                <div className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                  <User className="h-6 w-6 text-zinc-400" />
                </div>
                <div>
                  <p className="text-white font-light text-base">{user.displayName || user.email}</p>
                  <UserPlanBadge showTooltip={false} className="mt-1" />
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-500 ml-auto" />
              </div>
            </div>
          )}

          {/* Download counter for free users */}
          {!isProUser && (
            <div className="px-5 py-4">
              <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Download className={`h-4 w-4 mr-2 ${hasReachedLimit ? "text-amber-500" : "text-crimson"}`} />
                    <span className="text-white font-medium text-sm">Downloads</span>
                  </div>
                  <span
                    className={`text-sm font-medium px-3 py-1 rounded-full ${
                      hasReachedLimit
                        ? "bg-amber-500/20 text-amber-500 border border-amber-500/30"
                        : "bg-crimson/20 text-white border border-crimson/30"
                    }`}
                  >
                    {remainingDownloads} left
                  </span>
                </div>
                {hasReachedLimit && (
                  <p className="text-xs text-amber-400 mt-2">You've reached your download limit for this month</p>
                )}
              </div>
            </div>
          )}

          {/* Navigation menu */}
          <nav className="flex-1 px-5 py-2 overflow-y-auto">
            <div className="space-y-1">
              {navigationItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center justify-between py-3.5 px-3 rounded-lg text-zinc-200 hover:text-white hover:bg-zinc-800/70 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <div className="flex items-center">
                    <span className="mr-3 text-zinc-400">{item.icon}</span>
                    <span className="text-sm font-light">{item.name}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-zinc-500" />
                </Link>
              ))}
            </div>

            <div className="h-px bg-zinc-800 my-4"></div>

            <div className="space-y-1">
              <Link
                href="/dashboard/profile"
                className="flex items-center justify-between py-3.5 px-3 rounded-lg text-zinc-200 hover:text-white hover:bg-zinc-800/70 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <div className="flex items-center">
                  <span className="mr-3 text-zinc-400">
                    <User className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-light">Profile</span>
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-500" />
              </Link>
            </div>
          </nav>

          {/* Footer actions */}
          <div className="p-5 border-t border-zinc-800 mt-auto">
            {!isProUser && (
              <UpgradeButton
                navigateOnly={true}
                onClick={handleUpgradeClick}
                className="w-full mb-4 py-2.5 bg-crimson hover:bg-crimson-dark border-none"
              >
                Upgrade to Creator Pro
              </UpgradeButton>
            )}

            <Button
              variant="outline"
              className="w-full justify-center text-zinc-300 hover:text-white border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600"
              onClick={() => {
                handleLogout()
                setMobileMenuOpen(false)
              }}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Log out
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
