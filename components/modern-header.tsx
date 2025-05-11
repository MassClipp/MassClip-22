"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Menu, X, Search, User, ChevronDown, LogOut, Heart, Clock, Settings, Upload } from "lucide-react"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useMobile } from "@/hooks/use-mobile"

export default function ModernHeader({ initialSearchQuery = "" }) {
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

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.classList.add("menu-open")
    } else {
      document.body.classList.remove("menu-open")
    }
    return () => {
      document.body.classList.remove("menu-open")
    }
  }, [isMenuOpen])

  const navigationItems = [
    { name: "Home", href: "/dashboard" },
    { name: "Categories", href: "/dashboard/categories" },
    { name: "Favorites", href: "/dashboard/favorites" },
    { name: "History", href: "/dashboard/history" },
  ]

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled ? "py-3 bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800/50" : "py-5 bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center">
            <span className="text-xl font-bold tracking-tight">
              <span className="text-inspire-500">MASS</span>
              <span className="text-white">CLIP</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navigationItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`nav-link text-sm font-medium ${pathname === item.href ? "nav-link-active" : ""}`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Desktop Search and Actions */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                placeholder="Search clips..."
                className="w-60 py-2 pl-10 pr-4 bg-zinc-800/50 border border-zinc-700/30 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-inspire-500 focus:border-inspire-500 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500" size={16} />
            </form>

            {/* Upload Button */}
            <Link href="/dashboard/upload">
              <Button className="btn-primary flex items-center space-x-2">
                <Upload size={16} />
                <span>Upload</span>
              </Button>
            </Link>

            {/* User Menu */}
            <div className="relative" id="user-menu">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-2 p-2 text-zinc-300 hover:text-white rounded-lg transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                  <User size={16} />
                </div>
                <ChevronDown
                  size={16}
                  className={`text-zinc-500 transition-transform duration-200 ${isUserMenuOpen ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {isUserMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-2 w-56 card-glass shadow-xl py-1 z-50"
                  >
                    <div className="px-4 py-3 border-b border-zinc-800/50">
                      <p className="text-sm font-medium text-white">My Account</p>
                      <p className="text-xs text-zinc-400 truncate">user@example.com</p>
                    </div>
                    <div className="py-1">
                      <Link
                        href="/dashboard/user"
                        className="flex items-center px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800/50"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <User size={16} className="mr-3 text-zinc-400" />
                        Profile
                      </Link>
                      <Link
                        href="/dashboard/favorites"
                        className="flex items-center px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800/50"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <Heart size={16} className="mr-3 text-zinc-400" />
                        Favorites
                      </Link>
                      <Link
                        href="/dashboard/history"
                        className="flex items-center px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800/50"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <Clock size={16} className="mr-3 text-zinc-400" />
                        History
                      </Link>
                      <Link
                        href="/dashboard/settings"
                        className="flex items-center px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800/50"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <Settings size={16} className="mr-3 text-zinc-400" />
                        Settings
                      </Link>
                    </div>
                    <div className="py-1 border-t border-zinc-800/50">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false)
                          handleSignOut()
                        }}
                        className="flex w-full items-center px-4 py-2 text-sm text-energy-400 hover:bg-zinc-800/50"
                      >
                        <LogOut size={16} className="mr-3" />
                        Sign out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-zinc-300 hover:text-white rounded-lg"
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mobile-menu"
          >
            <div className="container mx-auto px-4 py-6">
              {/* Mobile Header */}
              <div className="flex items-center justify-between mb-8">
                <Link href="/dashboard" className="flex items-center" onClick={() => setIsMenuOpen(false)}>
                  <span className="text-xl font-bold tracking-tight">
                    <span className="text-inspire-500">MASS</span>
                    <span className="text-white">CLIP</span>
                  </span>
                </Link>
                <button onClick={() => setIsMenuOpen(false)} className="p-2 text-zinc-300 hover:text-white rounded-lg">
                  <X size={24} />
                </button>
              </div>

              {/* Mobile Search */}
              <form onSubmit={handleSearch} className="relative mb-8">
                <input
                  type="text"
                  placeholder="Search clips..."
                  className="w-full py-3 pl-12 pr-4 bg-zinc-800/50 border border-zinc-700/30 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-inspire-500 focus:border-inspire-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-500" size={20} />
              </form>

              {/* Mobile Navigation */}
              <nav className="space-y-1 mb-8">
                {navigationItems.map((item, index) => (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      href={item.href}
                      className={`flex items-center py-3 px-4 text-lg font-medium rounded-lg transition-colors ${
                        pathname === item.href
                          ? "text-white bg-zinc-800/50"
                          : "text-zinc-400 hover:text-white hover:bg-zinc-800/30"
                      }`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  </motion.div>
                ))}
              </nav>

              {/* Mobile Actions */}
              <div className="space-y-4">
                <Link
                  href="/dashboard/upload"
                  className="btn-primary flex items-center justify-center w-full py-3"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Upload size={18} className="mr-2" />
                  Upload New Video
                </Link>

                <Link
                  href="/dashboard/user"
                  className="flex items-center py-3 px-4 text-zinc-300 hover:text-white hover:bg-zinc-800/30 rounded-lg"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <User size={18} className="mr-3 text-zinc-400" />
                  My Profile
                </Link>

                <Link
                  href="/dashboard/settings"
                  className="flex items-center py-3 px-4 text-zinc-300 hover:text-white hover:bg-zinc-800/30 rounded-lg"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Settings size={18} className="mr-3 text-zinc-400" />
                  Settings
                </Link>

                <button
                  onClick={handleSignOut}
                  className="flex items-center py-3 px-4 text-energy-400 hover:text-energy-300 hover:bg-zinc-800/30 rounded-lg w-full"
                >
                  <LogOut size={18} className="mr-3" />
                  Sign out
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
