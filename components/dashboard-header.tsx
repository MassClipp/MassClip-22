"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { User, LogOut, Menu, X, Search, Download } from "lucide-react"
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

export default function DashboardHeader({ initialSearchQuery = "" }) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const { user, logOut } = useAuth()
  const { isProUser } = useUserPlan()
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
    { name: "Home", href: "/dashboard", current: true },
    { name: "Categories", href: "/dashboard/categories", current: false },
    { name: "Favorites", href: "/dashboard/favorites", current: false },
    { name: "History", href: "/dashboard/history", current: false },
    { name: "Membership", href: "/membership-plans", current: false },
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

          {/* Downloads Counter (Pro users) */}
          {isProUser && (
            <div className="flex items-center text-zinc-400 text-sm">
              <Download className="h-4 w-4 mr-1" />
              <span className="font-light">Unlimited</span>
            </div>
          )}

          {/* Pro Badge */}
          {user && <UserPlanBadge className="mr-2" />}

          {/* Upgrade Button (non-Pro users) */}
          {!isProUser && <UpgradeButton className="hidden md:flex">Upgrade</UpgradeButton>}

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

          {user && <UserPlanBadge className="mr-2" />}
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
          className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Dropdown Menu */}
      <div
        ref={mobileMenuRef}
        className={`md:hidden fixed inset-y-0 right-0 w-64 bg-zinc-900/95 backdrop-blur-md border-l border-zinc-800 shadow-xl transition-all duration-300 ease-in-out z-50 ${
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex justify-end p-4">
            <Button
              variant="ghost"
              size="icon"
              className="text-zinc-400 hover:text-white hover:bg-transparent"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="px-4 py-2">
            {user && (
              <div className="flex items-center space-x-3 mb-6">
                <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center">
                  <User className="h-5 w-5 text-zinc-400" />
                </div>
                <div>
                  <p className="text-white font-light">{user.displayName || user.email}</p>
                  <UserPlanBadge showTooltip={false} />
                </div>
              </div>
            )}
          </div>

          <nav className="flex-1 px-4 py-2">
            {navigationItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="block py-3 text-zinc-300 hover:text-white transition-colors text-sm font-light tracking-wide"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t border-zinc-800">
            {!isProUser && (
              <UpgradeButton onClick={handleUpgradeClick} className="w-full mb-4">
                Upgrade to Pro
              </UpgradeButton>
            )}

            <Button
              variant="ghost"
              className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-800"
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
