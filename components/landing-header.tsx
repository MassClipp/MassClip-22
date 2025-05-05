"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, Instagram } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/contexts/auth-context"
import { useMobile } from "@/hooks/use-mobile"
import UpgradeButton from "./upgrade-button"
import { Logo } from "./logo"

export default function LandingHeader() {
  const [isOpen, setIsOpen] = useState(false)
  const { user } = useAuth()
  const isMobile = useMobile()
  const pathname = usePathname()

  // Close mobile menu when path changes
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Prevent scrolling when mobile menu is open
  useEffect(() => {
    if (isMobile && isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "auto"
    }

    return () => {
      document.body.style.overflow = "auto"
    }
  }, [isOpen, isMobile])

  const menuVariants = {
    closed: {
      opacity: 0,
      y: -20,
      transition: {
        duration: 0.2,
      },
    },
    open: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    closed: { opacity: 0, y: -10 },
    open: { opacity: 1, y: 0 },
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-zinc-800/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <Logo className="h-8 w-auto" />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/category/browse-all" className="text-zinc-300 hover:text-white transition-colors duration-200">
              Browse
            </Link>
            <Link
              href="/category/recently-added"
              className="text-zinc-300 hover:text-white transition-colors duration-200"
            >
              New Clips
            </Link>
            <Link
              href="https://www.instagram.com/massclip.pro"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-300 hover:text-white transition-colors duration-200 flex items-center"
            >
              <Instagram size={18} className="mr-1" />
              <span>Instagram</span>
            </Link>
            {user ? (
              <Link href="/dashboard" className="text-zinc-300 hover:text-white transition-colors duration-200">
                Dashboard
              </Link>
            ) : (
              <Link href="/login" className="text-zinc-300 hover:text-white transition-colors duration-200">
                Login
              </Link>
            )}
            {/* Use navigateOnly prop to make the button go to membership page */}
            <UpgradeButton navigateOnly={true} className="ml-2">
              Upgrade
            </UpgradeButton>
          </nav>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-zinc-300 hover:text-white focus:outline-none"
              aria-label={isOpen ? "Close menu" : "Open menu"}
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial="closed"
            animate="open"
            exit="closed"
            variants={menuVariants}
            className="md:hidden bg-black/95 backdrop-blur-lg absolute w-full border-b border-zinc-800/50"
          >
            <div className="px-4 py-6 space-y-4">
              <motion.div variants={itemVariants}>
                <Link
                  href="/category/browse-all"
                  className="block text-zinc-300 hover:text-white transition-colors duration-200 py-2"
                  onClick={() => setIsOpen(false)}
                >
                  Browse
                </Link>
              </motion.div>
              <motion.div variants={itemVariants}>
                <Link
                  href="/category/recently-added"
                  className="block text-zinc-300 hover:text-white transition-colors duration-200 py-2"
                  onClick={() => setIsOpen(false)}
                >
                  New Clips
                </Link>
              </motion.div>
              <motion.div variants={itemVariants}>
                <Link
                  href="https://www.instagram.com/massclip.pro"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-zinc-300 hover:text-white transition-colors duration-200 py-2 flex items-center"
                  onClick={() => setIsOpen(false)}
                >
                  <Instagram size={18} className="mr-2" />
                  <span>Instagram</span>
                </Link>
              </motion.div>
              <motion.div variants={itemVariants}>
                {user ? (
                  <Link
                    href="/dashboard"
                    className="block text-zinc-300 hover:text-white transition-colors duration-200 py-2"
                    onClick={() => setIsOpen(false)}
                  >
                    Dashboard
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    className="block text-zinc-300 hover:text-white transition-colors duration-200 py-2"
                    onClick={() => setIsOpen(false)}
                  >
                    Login
                  </Link>
                )}
              </motion.div>
              <motion.div variants={itemVariants} className="pt-2">
                {/* Use navigateOnly prop to make the button go to membership page */}
                <UpgradeButton navigateOnly={true} className="w-full text-center" onClick={() => setIsOpen(false)}>
                  Upgrade
                </UpgradeButton>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
