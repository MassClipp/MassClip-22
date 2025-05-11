"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { useUserPlan } from "@/hooks/use-user-plan"
import UpgradeButton from "@/components/upgrade-button"

export default function LandingHeader() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { user } = useAuth()
  const { isProUser, loading } = useUserPlan()
  const router = useRouter()

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

  const handleDashboardClick = () => {
    router.push("/dashboard")
  }

  const handleLoginClick = () => {
    router.push("/login")
  }

  const handleSignupClick = () => {
    router.push("/signup")
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-black/90 backdrop-blur-sm border-b border-zinc-900" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="text-xl font-medium tracking-tighter">
          <span className="text-crimson">MASS</span>
          <span className="text-white">CLIP</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/pricing" className="text-zinc-400 hover:text-white transition-colors text-sm font-light">
            PRICING
          </Link>
          <Link
            href="/dashboard/categories"
            className="text-zinc-400 hover:text-white transition-colors text-sm font-light"
          >
            CATEGORIES
          </Link>
        </nav>

        {/* Desktop Action Buttons */}
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <>
              {!loading && !isProUser && (
                <UpgradeButton navigateOnly={true} className="bg-crimson hover:bg-crimson-dark text-white">
                  Upgrade
                </UpgradeButton>
              )}
              <Button onClick={handleDashboardClick} variant="ghost" className="text-white hover:bg-white/10">
                Dashboard
              </Button>
            </>
          ) : (
            <>
              <Button onClick={handleLoginClick} variant="ghost" className="text-white hover:bg-white/10">
                Log in
              </Button>
              <Button onClick={handleSignupClick} className="bg-crimson hover:bg-crimson-dark text-white">
                Sign up
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center gap-4">
          {user ? (
            <>
              {!loading && !isProUser && (
                <UpgradeButton
                  navigateOnly={true}
                  className="text-xs px-2 py-1 bg-crimson hover:bg-crimson-dark text-white"
                >
                  Upgrade
                </UpgradeButton>
              )}
            </>
          ) : null}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-white hover:text-crimson transition-colors"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-black/95 backdrop-blur-md border-b border-zinc-900">
          <div className="container mx-auto px-4 py-4">
            <nav className="flex flex-col gap-4">
              <Link
                href="/pricing"
                className="text-zinc-400 hover:text-white transition-colors text-sm font-light py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                PRICING
              </Link>
              <Link
                href="/dashboard/categories"
                className="text-zinc-400 hover:text-white transition-colors text-sm font-light py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                CATEGORIES
              </Link>
              <div className="border-t border-zinc-800 my-2"></div>
              {user ? (
                <Button
                  onClick={() => {
                    handleDashboardClick()
                    setIsMobileMenuOpen(false)
                  }}
                  variant="ghost"
                  className="justify-start p-0 text-white hover:bg-transparent hover:text-crimson"
                >
                  Dashboard
                </Button>
              ) : (
                <>
                  <Button
                    onClick={() => {
                      handleLoginClick()
                      setIsMobileMenuOpen(false)
                    }}
                    variant="ghost"
                    className="justify-start p-0 text-white hover:bg-transparent hover:text-crimson"
                  >
                    Log in
                  </Button>
                  <Button
                    onClick={() => {
                      handleSignupClick()
                      setIsMobileMenuOpen(false)
                    }}
                    className="bg-crimson hover:bg-crimson-dark text-white mt-2"
                  >
                    Sign up
                  </Button>
                </>
              )}
            </nav>
          </div>
        </div>
      )}
    </header>
  )
}
