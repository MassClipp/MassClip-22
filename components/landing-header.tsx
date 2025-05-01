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
  const mobileMenuRef = useRef<HTMLDivElement>(null)

  // Lock scroll when menu is open
  useScrollLock(isMenuOpen)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isMenuOpen])

  const navigationItems = [
    { name: "HOME", href: "/" },
    { name: "EXPLORE", href: "/dashboard" },
    { name: "PRICING", href: "/membership-plans" },
    { name: "CATEGORIES", href: "/dashboard/categories" },
  ]

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

        {/* BETA Tag - Centered */}
        <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center">
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

        {/* Mobile Menu Button */}
        <button
          className="md:hidden flex items-center justify-center w-10 h-10 text-white bg-zinc-900/50 rounded-full border border-zinc-800/50 backdrop-blur-sm"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
        >
          {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile Menu Backdrop */}
      {isMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Mobile Menu */}
      <div
        ref={mobileMenuRef}
        className={`md:hidden fixed inset-y-0 right-0 w-[280px] bg-gradient-to-b from-zinc-900/95 to-black/95 backdrop-blur-md border-l border-zinc-800/50 shadow-2xl transition-all duration-300 ease-in-out z-50 ${
          isMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Menu Header */}
          <div className="flex items-center justify-between p-5 border-b border-zinc-800/50">
            <Logo href="/" size="sm" />
            <button
              className="flex items-center justify-center w-8 h-8 text-white/80 hover:text-white bg-zinc-800/50 rounded-full"
              onClick={() => setIsMenuOpen(false)}
              aria-label="Close menu"
            >
              <X size={16} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto py-6 px-5">
            <div className="space-y-1">
              {navigationItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center justify-between py-3 px-4 text-white/90 hover:text-white hover:bg-white/5 rounded-lg transition-colors group"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className="text-sm font-light tracking-wide">{item.name}</span>
                  <ChevronRight className="h-4 w-4 text-zinc-500 group-hover:text-white/70 transition-colors" />
                </Link>
              ))}

              {/* Beta Notice Link in Mobile Menu */}
              <Link
                href="/beta-notice"
                className="flex items-center justify-between py-3 px-4 text-amber-400 hover:text-amber-300 hover:bg-white/5 rounded-lg transition-colors group"
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
                className="flex items-center py-3 px-4 text-white/90 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <Instagram className="h-4 w-4 mr-3" />
                <span className="text-sm font-light">Instagram</span>
              </a>
            </div>
          </nav>

          {/* Auth Buttons */}
          <div className="p-5 border-t border-zinc-800/50 space-y-3">
            <Link
              href="/login"
              className="flex items-center justify-center w-full py-2.5 text-sm text-white/90 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              LOG IN
            </Link>
            <Link
              href="/signup"
              className="flex items-center justify-center w-full py-2.5 text-sm text-white bg-crimson hover:bg-crimson-dark rounded-lg transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              SIGN UP
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
