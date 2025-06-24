"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, X, ChevronRight, Instagram } from "lucide-react"
import Logo from "@/components/logo"
import { useScrollLock } from "@/hooks/use-scroll-lock"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function LandingHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const [showBetaModal, setShowBetaModal] = useState(false)

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
    { name: "Home", href: "/" },
    { name: "Explore", href: "/dashboard/explore" },
    { name: "Pricing", href: "/dashboard/membership" },
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

        {/* Beta Tag - Centered */}
        <div className="hidden md:flex absolute left-1/2 transform -translate-x-1/2">
          <button
            onClick={() => setShowBetaModal(true)}
            className="px-1.5 py-0.5 text-[10px] font-semibold bg-gradient-to-r from-yellow-400 to-yellow-600 text-black rounded-full hover:from-yellow-300 hover:to-yellow-500 transition-all duration-200 transform hover:scale-105"
          >
            BETA
          </button>
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-6">
          <Link href="/login" className="text-sm text-white/80 hover:text-white transition-colors">
            Log in
          </Link>
          <Link href="/signup">
            <Button className="bg-crimson hover:bg-crimson-dark text-white text-sm px-6 py-2 rounded-none">
              Sign up
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
          className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Mobile Menu - UPDATED with solid background */}
      <div
        ref={mobileMenuRef}
        className={`md:hidden fixed inset-y-0 right-0 w-[280px] bg-black shadow-2xl transition-all duration-300 ease-in-out z-50 ${
          isMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{
          boxShadow: "-5px 0 25px rgba(0, 0, 0, 0.5)",
          borderLeft: "1px solid rgba(255, 255, 255, 0.05)",
        }}
      >
        <div className="flex flex-col h-full">
          {/* Menu Header */}
          <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-black">
            <div className="flex items-center gap-2">
              <Logo href="/" size="sm" />
              {/* Beta Tag for Mobile */}
              <button
                onClick={() => setShowBetaModal(true)}
                className="px-1.5 py-0.5 text-[10px] font-semibold bg-gradient-to-r from-yellow-400 to-yellow-600 text-black rounded-full hover:from-yellow-300 hover:to-yellow-500 transition-all duration-200"
              >
                BETA
              </button>
            </div>
            <button
              className="flex items-center justify-center w-8 h-8 text-white/80 hover:text-white bg-zinc-800/50 rounded-full"
              onClick={() => setIsMenuOpen(false)}
              aria-label="Close menu"
            >
              <X size={16} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto py-6 px-5 bg-black">
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
            </div>

            {/* Social Links */}
            <div className="mt-8 pt-6 border-t border-zinc-800/50 bg-black">
              <p className="text-xs text-zinc-500 font-light px-4 mb-4">Follow Us</p>
              <a
                href="https://www.instagram.com/massclip.official"
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
          <div className="p-5 border-t border-zinc-800/50 space-y-3 bg-black">
            <Link
              href="/login"
              className="flex items-center justify-center w-full py-2.5 text-sm text-white/90 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="flex items-center justify-center w-full py-2.5 text-sm text-white bg-crimson hover:bg-crimson-dark rounded-lg transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>

      {/* Beta Modal */}
      <Dialog open={showBetaModal} onOpenChange={setShowBetaModal}>
        <DialogContent className="sm:max-w-md bg-black border border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white text-center">🚀 Welcome to MassClip Beta</DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <p className="text-white/80 mb-4">
              We're in beta! Thank you for your patience as this platform grows and evolves.
            </p>
            <p className="text-white/60 text-sm">
              Your feedback helps us build something amazing.
              <br />
              Reach out to us at{" "}
              <a href="mailto:john@massclip.pro" className="text-crimson hover:text-crimson-light transition-colors">
                john@massclip.pro
              </a>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  )
}
