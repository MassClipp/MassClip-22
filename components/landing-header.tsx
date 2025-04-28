"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"

export default function LandingHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "py-3 bg-black/80 backdrop-blur-md border-b border-white/5" : "py-5"
      }`}
    >
      <div className="container mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center">
          <Link href="/" className="text-2xl font-medium tracking-tighter">
            <span className="text-crimson">MASS</span>
            <span className="text-white">CLIP</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          <Link href="/" className="text-sm text-white/80 hover:text-white transition-colors">
            HOME
          </Link>
          <Link href="/dashboard" className="text-sm text-white/80 hover:text-white transition-colors">
            EXPLORE
          </Link>
          <Link href="/membership-plans" className="text-sm text-white/80 hover:text-white transition-colors">
            PRICING
          </Link>
          <Link href="/dashboard/categories" className="text-sm text-white/80 hover:text-white transition-colors">
            CATEGORIES
          </Link>
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-6">
          <Link href="/login" className="text-sm text-white/80 hover:text-white transition-colors">
            LOG IN
          </Link>
          <Link href="/signup">
            <Button className="bg-crimson hover:bg-crimson-dark text-white text-sm px-6 py-2 rounded-none">
              SIGN UP
            </Button>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button className="md:hidden text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden mobile-menu fixed inset-0 z-40 pt-20">
          <div className="container mx-auto px-4 py-8 flex flex-col space-y-6">
            <Link
              href="/"
              className="text-2xl font-light text-white py-2 border-b border-white/10"
              onClick={() => setIsMenuOpen(false)}
            >
              HOME
            </Link>
            <Link
              href="/dashboard"
              className="text-2xl font-light text-white py-2 border-b border-white/10"
              onClick={() => setIsMenuOpen(false)}
            >
              EXPLORE
            </Link>
            <Link
              href="/membership-plans"
              className="text-2xl font-light text-white py-2 border-b border-white/10"
              onClick={() => setIsMenuOpen(false)}
            >
              PRICING
            </Link>
            <Link
              href="/dashboard/categories"
              className="text-2xl font-light text-white py-2 border-b border-white/10"
              onClick={() => setIsMenuOpen(false)}
            >
              CATEGORIES
            </Link>
            <div className="flex flex-col pt-6 space-y-4">
              <Link
                href="/login"
                className="text-xl font-light text-white/80 hover:text-white"
                onClick={() => setIsMenuOpen(false)}
              >
                LOG IN
              </Link>
              <Link href="/signup" onClick={() => setIsMenuOpen(false)}>
                <Button className="w-full bg-crimson hover:bg-crimson-dark text-white text-lg py-6 rounded-none">
                  SIGN UP
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
