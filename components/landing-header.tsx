"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, X, ChevronRight, Instagram } from "lucide-react"
import Logo from "@/components/logo"
import { useScrollLock } from "@/hooks/use-scroll-lock"

export default function LandingHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)

  // Enhanced scroll lock
  useScrollLock(isMenuOpen)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Handle animation states
  useEffect(() => {
    if (isMenuOpen) {
      setIsAnimating(true)
      // Ensure backdrop is visible before animating menu
      setTimeout(() => {
        if (mobileMenuRef.current) {
          mobileMenuRef.current.style.transform = "translateX(0)"
        }
      }, 10)
    } else if (mobileMenuRef.current) {
      mobileMenuRef.current.style.transform = "translateX(100%)"
      // Wait for animation to complete before hiding completely
      setTimeout(() => {
        setIsAnimating(false)
      }, 300) // Match the transition duration
    }
  }, [isMenuOpen])

  // Improved outside click detection
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isMenuOpen &&
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node) &&
        event.target !== document.querySelector('button[aria-label="Toggle mobile menu"]')
      ) {
        setIsMenuOpen(false)
      }
    }

    // Use capture phase to ensure we get the event before it's stopped
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside, true)
      document.addEventListener("touchstart", handleClickOutside, true)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true)
      document.removeEventListener("touchstart", handleClickOutside, true)
    }
  }, [isMenuOpen])

  // Handle escape key
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isMenuOpen) {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener("keydown", handleEscKey)
    return () => document.removeEventListener("keydown", handleEscKey)
  }, [isMenuOpen])

  const navigationItems = [
    { name: "HOME", href: "/" },
    { name: "EXPLORE", href: "/dashboard" },
    { name: "PRICING", href: "/membership-plans" },
    { name: "CATEGORIES", href: "/dashboard/categories" },
  ]

  const toggleMenu = () => {
    setIsMenuOpen((prev) => !prev)
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-white/10 ${
        scrolled ? "py-3 bg-black/80 backdrop-blur-md" : "py-5"
      }`}
    >
      <div className="container mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center">
          <Logo href="/" size="md" />

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center ml-10 space-x-8">
            {navigationItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-sm text-white/80 hover:text-white transition-colors"
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>

        {/* BETA Tag - Centered (hidden on mobile) */}
        <div className="absolute left-1/2 transform -translate-x-1/2 hidden md:flex items-center">
          <Link
            href="/beta-notice"
            className="text-amber-400 text-xs font-extralight tracking-widest hover:text-amber-300 transition-colors"
          >
            READ BETA NOTICE
          </Link>
        </div>

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

        {/* Mobile Menu Button - Improved touch target */}
        <button
          className="md:hidden flex items-center justify-center w-12 h-12 text-white bg-zinc-900/50 rounded-full border border-zinc-800/50 backdrop-blur-sm touch-manipulation"
          onClick={toggleMenu}
          aria-label="Toggle mobile menu"
          aria-expanded={isMenuOpen}
          aria-controls="mobile-menu"
        >
          {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile Menu Backdrop - Improved with opacity transition */}
      {(isMenuOpen || isAnimating) && (
        <div
          ref={backdropRef}
          className={`md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${
            isMenuOpen ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden="true"
        />
      )}

      {/* Mobile Menu - Improved animation and rendering */}
      {(isMenuOpen || isAnimating) && (
        <div
          id="mobile-menu"
          ref={mobileMenuRef}
          className="md:hidden fixed inset-y-0 right-0 w-[280px] bg-gradient-to-b from-zinc-900/95 to-black/95 backdrop-blur-md border-l border-zinc-800/50 shadow-2xl z-50 transition-transform duration-300 ease-out transform translate-x-full"
          style={{
            boxShadow: "-5px 0 25px rgba(0, 0, 0, 0.5)",
            willChange: "transform",
            overscrollBehavior: "contain",
          }}
        >
          <div className="flex flex-col h-full">
            {/* Menu Header */}
            <div className="flex items-center justify-between p-5 border-b border-zinc-800/50">
              <Logo href="/" size="sm" />
              <button
                className="flex items-center justify-center w-10 h-10 text-white/80 hover:text-white bg-zinc-800/50 rounded-full touch-manipulation"
                onClick={() => setIsMenuOpen(false)}
                aria-label="Close menu"
              >
                <X size={16} />
              </button>
            </div>

            {/* Navigation Links - Improved touch targets */}
            <nav className="flex-1 overflow-y-auto py-6 px-5 overscroll-contain">
              <div className="space-y-1">
                {navigationItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="flex items-center justify-between py-4 px-4 text-white/90 hover:text-white hover:bg-white/5 rounded-lg transition-colors group touch-manipulation"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <span className="text-sm font-light tracking-wide">{item.name}</span>
                    <ChevronRight className="h-4 w-4 text-zinc-500 group-hover:text-white/70 transition-colors" />
                  </Link>
                ))}

                {/* Beta Notice Link in Mobile Menu */}
                <Link
                  href="/beta-notice"
                  className="flex items-center justify-between py-4 px-4 text-amber-400 hover:text-amber-300 hover:bg-white/5 rounded-lg transition-colors group touch-manipulation"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className="text-sm font-light tracking-wide">BETA NOTICE</span>
                  <ChevronRight className="h-4 w-4 text-zinc-500 group-hover:text-amber-300 transition-colors" />
                </Link>
              </div>

              {/* Social Links */}
              <div className="mt-8 pt-6 border-t border-zinc-800/50">
                <p className="text-xs text-zinc-500 font-light px-4 mb-4">FOLLOW US</p>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center py-4 px-4 text-white/90 hover:text-white hover:bg-white/5 rounded-lg transition-colors touch-manipulation"
                >
                  <Instagram className="h-4 w-4 mr-3" />
                  <span className="text-sm font-light">Instagram</span>
                </a>
              </div>
            </nav>

            {/* Auth Buttons - Improved touch targets */}
            <div className="p-5 border-t border-zinc-800/50 space-y-3">
              <Link
                href="/login"
                className="flex items-center justify-center w-full py-3 text-sm text-white/90 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors touch-manipulation"
                onClick={() => setIsMenuOpen(false)}
              >
                LOG IN
              </Link>
              <Link
                href="/signup"
                className="flex items-center justify-center w-full py-3 text-sm text-white bg-crimson hover:bg-crimson-dark rounded-lg transition-colors touch-manipulation"
                onClick={() => setIsMenuOpen(false)}
              >
                SIGN UP
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
