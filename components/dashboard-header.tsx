"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, User, Settings, LogOut, ChevronDown, Copy } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Logo } from "@/components/logo"
import { useToast } from "@/hooks/use-toast"

export default function DashboardHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [username, setUsername] = useState<string | null>(null)
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    // Close mobile menu when route changes
    setIsMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    // Fetch the user's creator profile username if they have one
    async function fetchCreatorUsername() {
      if (!user?.uid) return

      try {
        const response = await fetch(`/api/creator-profile?userId=${user.uid}`)
        const data = await response.json()

        if (data.profile && data.profile.username) {
          setUsername(data.profile.username)
        }
      } catch (error) {
        console.error("Error fetching creator profile:", error)
      }
    }

    fetchCreatorUsername()
  }, [user?.uid])

  const handleCopyProfileLink = () => {
    if (!username) return

    const profileUrl = `${window.location.origin}/creator/${username}`
    navigator.clipboard.writeText(profileUrl)

    toast({
      title: "Profile link copied!",
      description: "Your creator profile link has been copied to clipboard.",
    })

    setIsDropdownOpen(false)
  }

  return (
    <header className="bg-black text-white border-b border-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Logo className="h-8 w-auto" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link
              href="/dashboard"
              className={`hover:text-red-500 transition-colors ${pathname === "/dashboard" ? "text-red-500" : ""}`}
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard/categories"
              className={`hover:text-red-500 transition-colors ${
                pathname === "/dashboard/categories" ? "text-red-500" : ""
              }`}
            >
              Categories
            </Link>
            <Link
              href="/dashboard/favorites"
              className={`hover:text-red-500 transition-colors ${
                pathname === "/dashboard/favorites" ? "text-red-500" : ""
              }`}
            >
              Favorites
            </Link>
            <Link
              href="/dashboard/history"
              className={`hover:text-red-500 transition-colors ${
                pathname === "/dashboard/history" ? "text-red-500" : ""
              }`}
            >
              History
            </Link>
            <Link
              href="/dashboard/creator-hub"
              className={`hover:text-red-500 transition-colors ${
                pathname.startsWith("/dashboard/creator-hub") ? "text-red-500" : ""
              }`}
            >
              Creator Hub
            </Link>
          </nav>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-2 hover:text-red-500 transition-colors"
            >
              <span className="hidden md:inline-block">{user?.displayName || user?.email}</span>
              <ChevronDown className="h-4 w-4" />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-900 rounded-md shadow-lg py-1 z-50">
                <Link
                  href="/dashboard/profile"
                  className="block px-4 py-2 text-sm hover:bg-gray-800 hover:text-red-500"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <User className="inline-block mr-2 h-4 w-4" />
                  Profile
                </Link>

                {username && (
                  <>
                    <Link
                      href={`/creator/${username}`}
                      className="block px-4 py-2 text-sm hover:bg-gray-800 hover:text-red-500"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <User className="inline-block mr-2 h-4 w-4" />
                      Public Profile
                    </Link>
                    <button
                      onClick={handleCopyProfileLink}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-800 hover:text-red-500"
                    >
                      <Copy className="inline-block mr-2 h-4 w-4" />
                      Copy Profile Link
                    </button>
                  </>
                )}

                <Link
                  href="/dashboard/password"
                  className="block px-4 py-2 text-sm hover:bg-gray-800 hover:text-red-500"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <Settings className="inline-block mr-2 h-4 w-4" />
                  Change Password
                </Link>
                <button
                  onClick={() => {
                    signOut()
                    setIsDropdownOpen(false)
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-800 hover:text-red-500"
                >
                  <LogOut className="inline-block mr-2 h-4 w-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <nav className="md:hidden bg-gray-900 py-4">
          <div className="container mx-auto px-4 space-y-2">
            <Link
              href="/dashboard"
              className={`block py-2 hover:text-red-500 transition-colors ${
                pathname === "/dashboard" ? "text-red-500" : ""
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard/categories"
              className={`block py-2 hover:text-red-500 transition-colors ${
                pathname === "/dashboard/categories" ? "text-red-500" : ""
              }`}
            >
              Categories
            </Link>
            <Link
              href="/dashboard/favorites"
              className={`block py-2 hover:text-red-500 transition-colors ${
                pathname === "/dashboard/favorites" ? "text-red-500" : ""
              }`}
            >
              Favorites
            </Link>
            <Link
              href="/dashboard/history"
              className={`block py-2 hover:text-red-500 transition-colors ${
                pathname === "/dashboard/history" ? "text-red-500" : ""
              }`}
            >
              History
            </Link>
            <Link
              href="/dashboard/creator-hub"
              className={`block py-2 hover:text-red-500 transition-colors ${
                pathname.startsWith("/dashboard/creator-hub") ? "text-red-500" : ""
              }`}
            >
              Creator Hub
            </Link>

            {username && (
              <>
                <Link href={`/creator/${username}`} className={`block py-2 hover:text-red-500 transition-colors`}>
                  Public Profile
                </Link>
                <button
                  onClick={handleCopyProfileLink}
                  className="w-full text-left py-2 hover:text-red-500 transition-colors"
                >
                  Copy Profile Link
                </button>
              </>
            )}

            <Link
              href="/dashboard/profile"
              className={`block py-2 hover:text-red-500 transition-colors ${
                pathname === "/dashboard/profile" ? "text-red-500" : ""
              }`}
            >
              Profile
            </Link>
            <Link
              href="/dashboard/password"
              className={`block py-2 hover:text-red-500 transition-colors ${
                pathname === "/dashboard/password" ? "text-red-500" : ""
              }`}
            >
              Change Password
            </Link>
            <button onClick={signOut} className="block w-full text-left py-2 hover:text-red-500 transition-colors">
              Sign Out
            </button>
          </div>
        </nav>
      )}
    </header>
  )
}
