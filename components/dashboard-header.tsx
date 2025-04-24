"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { User, LogOut, Menu, X } from "lucide-react"
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

export default function DashboardHeader() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, logOut } = useAuth()
  const router = useRouter()
  const mobileMenuRef = useRef<HTMLDivElement>(null)

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

  const handleLogout = async () => {
    const result = await logOut()
    if (result.success) {
      router.push("/login")
    }
  }

  // Navigation items for both desktop and mobile
  const navigationItems = [
    { name: "Home", href: "/dashboard", current: true },
    { name: "Categories", href: "/dashboard/categories", current: false },
    { name: "Pricing", href: "/pricing", current: false },
  ]

  return (
    <header
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled ? "bg-black/90 backdrop-blur-sm border-b border-gray-800" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Logo href="/dashboard" />

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {navigationItems.slice(0, 5).map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`${item.current ? "text-white" : "text-gray-400 hover:text-white"} transition-colors`}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>

        {/* Desktop Action Buttons */}
        <div className="hidden md:flex items-center gap-4">
          {user && <UserPlanBadge className="mr-2" />}
          <UpgradeButton className="hidden md:flex">Upgrade</UpgradeButton>

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-gray-400">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-gray-900 border-gray-800 text-white">
                <DropdownMenuLabel>{user.displayName ? user.displayName : "My Account"}</DropdownMenuLabel>
                <UserDownloadInfo />
                <DropdownMenuSeparator className="bg-gray-800" />
                <DropdownMenuItem className="hover:bg-gray-800" onClick={() => router.push("/dashboard/user")}>
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem className="hover:bg-gray-800" onClick={() => router.push("/dashboard/profile")}>
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gray-800" />
                <DropdownMenuItem className="hover:bg-gray-800" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden">
          {user && <UserPlanBadge className="mr-2" />}
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Mobile Dropdown Menu */}
      <div
        ref={mobileMenuRef}
        className={`md:hidden absolute w-full bg-black/95 backdrop-blur-sm border-b border-gray-800 shadow-lg transition-all duration-300 ease-in-out overflow-hidden z-50 ${
          mobileMenuOpen ? "max-h-[80vh] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="container mx-auto px-4 py-4 space-y-4">
          {/* Navigation Links */}
          <nav className="flex flex-col space-y-3">
            {navigationItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`${
                  item.current ? "text-white" : "text-gray-300"
                } hover:text-white text-base font-light tracking-wide py-2 transition-colors`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="h-px bg-gray-800 my-4"></div>

          {/* Action Buttons */}
          <div className="flex flex-col space-y-3">
            <div
              className="flex items-center space-x-2 text-gray-300 hover:text-white py-2"
              onClick={() => {
                router.push("/dashboard/user")
                setMobileMenuOpen(false)
              }}
            >
              <User className="h-5 w-5" />
              <span>Profile</span>
            </div>
          </div>

          <div className="h-px bg-gray-800 my-4"></div>

          {/* Upgrade Button */}
          <div className="flex justify-center py-2">
            <UpgradeButton onClick={() => setMobileMenuOpen(false)}>Upgrade to Pro</UpgradeButton>
          </div>

          {/* Logout Button */}
          {user && (
            <div
              className="flex items-center space-x-2 text-gray-300 hover:text-white py-2 cursor-pointer"
              onClick={() => {
                handleLogout()
                setMobileMenuOpen(false)
              }}
            >
              <LogOut className="h-5 w-5" />
              <span>Log out</span>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
