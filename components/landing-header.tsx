"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import Logo from "@/components/logo"
import { Menu, X } from "lucide-react"

export default function LandingHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="w-full z-50 bg-transparent">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <Logo size="md" />

          {/* Desktop Navigation - Moved closer to logo */}
          <nav className="hidden md:flex items-center ml-8 space-x-6">
            <Link href="/" className="text-white hover:text-gray-200 transition-colors">
              Home
            </Link>
            <Link href="/dashboard" className="text-white hover:text-gray-200 transition-colors">
              Explore Clips
            </Link>
            <Link href="/membership-plans" className="text-white hover:text-gray-200 transition-colors">
              Pricing
            </Link>
            <Link href="/dashboard/categories" className="text-white hover:text-gray-200 transition-colors">
              Categories
            </Link>
            <Link href="/dashboard" className="text-white hover:text-gray-200 transition-colors">
              Trending
            </Link>
          </nav>
        </div>

        {/* Mobile Menu Button */}
        <button className="md:hidden text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Login/Signup Buttons - Hidden on Mobile */}
        <div className="hidden md:flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost" className="text-white hover:text-white hover:bg-white/10">
              Log in
            </Button>
          </Link>
          <Link href="/signup">
            <Button className="bg-red-600 hover:bg-red-700 text-white">Sign up</Button>
          </Link>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-black/90 backdrop-blur-menu">
          <div className="container mx-auto px-4 py-4 flex flex-col space-y-4">
            <Link href="/" className="text-white py-2 mobile-menu-link">
              Home
            </Link>
            <Link href="/dashboard" className="text-white py-2 mobile-menu-link">
              Explore Clips
            </Link>
            <Link href="/membership-plans" className="text-white py-2 mobile-menu-link">
              Pricing
            </Link>
            <Link href="/dashboard/categories" className="text-white py-2 mobile-menu-link">
              Categories
            </Link>
            <Link href="/dashboard" className="text-white py-2 mobile-menu-link">
              Trending
            </Link>
            <div className="flex flex-col pt-4 border-t border-white/10">
              <Link href="/login" className="text-white py-2 mobile-menu-link">
                Log in
              </Link>
              <Link href="/signup" className="text-white py-2 mobile-menu-link">
                Sign up
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
