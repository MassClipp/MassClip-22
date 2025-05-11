"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Search, Menu, X, Crown, User, ChevronDown } from "lucide-react"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import Logo from "@/components/logo"
import { Button } from "@/components/ui/button"
import { useMobile } from "@/hooks/use-mobile"

export default function DashboardHeader({ initialSearchQuery = "" }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery)
  const [isScrolled, setIsScrolled] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const isMobile = useMobile()

  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      localStorage.setItem("lastSearchQuery", searchQuery.trim())
      router.push(`/dashboard?search=${encodeURIComponent(searchQuery.trim())}`)
      setIsMenuOpen(false)
    }
  }

  // Handle scroll detection for header styling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut(auth)
      router.push("/login")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const userMenu = document.getElementById("user-menu")
      if (userMenu && !userMenu.contains(event.target as Node) && isUserMenuOpen) {
        setIsUserMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isUserMenuOpen])

  // Restore search query from localStorage
  useEffect(() => {
    const savedQuery = localStorage.getItem("lastSearchQuery")
    if (savedQuery && pathname === "/dashboard") {
      setSearchQuery(savedQuery)
    } else {
      setSearchQuery("")
    }
  }, [pathname])

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-200 ${
        isScrolled ? "bg-black/80 backdrop-blur-md shadow-md" : "bg-black"
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Desktop Navigation */}
          <div className="flex items-center">
            <Logo href="/dashboard" size="md" />

            {/* Simple Navigation Links */}
            <div className="hidden md:flex ml-6 space-x-6">
              <Link
                href="/dashboard"
                className={`text-sm font-medium transition-colors hover:text-white ${
                  pathname === "/dashboard" ? "text-white" : "text-zinc-400"
                }`}
              >
                Homepage
              </Link>
              <Link
                href="/dashboard/categories"
                className={`text-sm font-medium transition-colors hover:text-white ${
                  pathname === "/dashboard/categories" ? "text-white" : "text-zinc-400"
                }`}
              >
                Categories
              </Link>
              <Link
                href="/dashboard/favorites"
                className={`text-sm font-medium transition-colors hover:text-white ${
                  pathname === "/dashboard/favorites" ? "text-white" : "text-zinc-400"
                }`}
              >
                Favorites
              </Link>
            </div>
          </div>

          {/* Search Bar - Desktop */}
          <div className="hidden md:block flex-1 max-w-md mx-4">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                placeholder="Search clips..."
                className="w-full py-1.5 pl-9 pr-4 bg-zinc-800/50 border border-zinc-700/50 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-crimson focus:border-crimson"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500" size={16} />
            </form>
          </div>

          {/* Desktop Right Navigation */}
          <div className="hidden md:flex items-center space-x-2">
            {/* Upgrade Button */}
            <Link href="/pricing">
              <Button
                variant="outline"
                size="sm"
                className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10 text-xs px-3"
              >
                <Crown size={14} className="mr-1.5" />
                Upgrade
              </Button>
            </Link>

            {/* User Dropdown */}
            <div className="relative" id="user-menu">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-1 p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
              >
                <User size={18} />
                <ChevronDown size={14} className={`transition-transform ${isUserMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-zinc-900 border border-zinc-800 rounded-md shadow-lg py-1 z-50">
                  <Link
                    href="/dashboard/user"
                    className="block px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    Your Account
                  </Link>
                  <Link
                    href="/dashboard/history"
                    className="block px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    History
                  </Link>
                  <div className="border-t border-zinc-800 my-1"></div>
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false)
                      handleSignOut()
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-crimson hover:bg-zinc-800"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-zinc-400 hover:text-white rounded-md"
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-zinc-800">
            {/* Mobile Search */}
            <form onSubmit={handleSearch} className="relative mb-4">
              <input
                type="text"
                placeholder="Search clips..."
                className="w-full py-2 pl-10 pr-4 bg-zinc-800/50 border border-zinc-700/50 rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-crimson focus:border-crimson"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500" size={18} />
            </form>

            {/* Mobile Navigation Links */}
            <nav className="space-y-1">
              <Link
                href="/dashboard"
                className="block px-3 py-2 text-white hover:bg-zinc-800 rounded-md"
                onClick={() => setIsMenuOpen(false)}
              >
                Homepage
              </Link>
              <Link
                href="/dashboard/categories"
                className="block px-3 py-2 text-white hover:bg-zinc-800 rounded-md"
                onClick={() => setIsMenuOpen(false)}
              >
                Categories
              </Link>
              <Link
                href="/dashboard/favorites"
                className="block px-3 py-2 text-white hover:bg-zinc-800 rounded-md"
                onClick={() => setIsMenuOpen(false)}
              >
                Favorites
              </Link>
              <Link
                href="/dashboard/history"
                className="block px-3 py-2 text-white hover:bg-zinc-800 rounded-md"
                onClick={() => setIsMenuOpen(false)}
              >
                History
              </Link>
              <Link
                href="/dashboard/user"
                className="block px-3 py-2 text-white hover:bg-zinc-800 rounded-md"
                onClick={() => setIsMenuOpen(false)}
              >
                Your Account
              </Link>
              <Link
                href="/pricing"
                className="block px-3 py-2 text-amber-400 hover:bg-zinc-800 rounded-md flex items-center"
                onClick={() => setIsMenuOpen(false)}
              >
                <Crown size={16} className="mr-2" />
                Upgrade Membership
              </Link>
              <div className="pt-2 mt-2 border-t border-zinc-800">
                <button
                  onClick={handleSignOut}
                  className="block w-full text-left px-3 py-2 text-crimson hover:bg-zinc-800 rounded-md"
                >
                  Sign Out
                </button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
