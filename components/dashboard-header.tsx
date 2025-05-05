"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, User, LogOut, Settings, Home, History, Heart, Grid, Crown } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/contexts/auth-context"
import { useMobile } from "@/hooks/use-mobile"
import { Logo } from "./logo"
import UpgradeButton from "./upgrade-button"
import { useUserPlan } from "@/hooks/use-user-plan"
import UserPlanBadge from "./user-plan-badge"

export default function DashboardHeader() {
  const [isOpen, setIsOpen] = useState(false)
  const { user, signOut } = useAuth()
  const { isProUser } = useUserPlan()
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
            <Link
              href="/dashboard"
              className="text-zinc-300 hover:text-white transition-colors duration-200 flex items-center"
            >
              <Home size={16} className="mr-1" />
              <span>Home</span>
            </Link>
            <Link href="/category/browse-all" className="text-zinc-300 hover:text-white transition-colors duration-200">
              Browse
            </Link>
            <Link
              href="/dashboard/favorites"
              className="text-zinc-300 hover:text-white transition-colors duration-200 flex items-center"
            >
              <Heart size={16} className="mr-1" />
              <span>Favorites</span>
            </Link>
            <Link
              href="/dashboard/history"
              className="text-zinc-300 hover:text-white transition-colors duration-200 flex items-center"
            >
              <History size={16} className="mr-1" />
              <span>History</span>
            </Link>

            <div className="relative group">
              <button className="text-zinc-300 hover:text-white transition-colors duration-200 flex items-center">
                <User size={16} className="mr-1" />
                <span>Account</span>
              </button>
              <div className="absolute right-0 mt-2 w-48 bg-zinc-900 rounded-md shadow-lg py-1 z-50 hidden group-hover:block border border-zinc-800">
                <div className="px-4 py-2 border-b border-zinc-800">
                  <p className="text-sm text-zinc-400">Signed in as</p>
                  <p className="text-sm font-medium truncate">{user?.email}</p>
                </div>
                <Link
                  href="/dashboard/user"
                  className="block px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
                >
                  <div className="flex items-center">
                    <User size={14} className="mr-2" />
                    <span>Profile</span>
                  </div>
                </Link>
                <Link
                  href="/membership-plans"
                  className="block px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
                >
                  <div className="flex items-center">
                    <Crown size={14} className="mr-2" />
                    <span>Membership</span>
                  </div>
                </Link>
                <Link
                  href="/dashboard/settings"
                  className="block px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
                >
                  <div className="flex items-center">
                    <Settings size={14} className="mr-2" />
                    <span>Settings</span>
                  </div>
                </Link>
                <button
                  onClick={signOut}
                  className="block w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
                >
                  <div className="flex items-center">
                    <LogOut size={14} className="mr-2" />
                    <span>Sign out</span>
                  </div>
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <UserPlanBadge />
              {!isProUser && (
                // Use navigateOnly prop to make the button go to membership page
                <UpgradeButton navigateOnly={true} className="ml-2">
                  Upgrade
                </UpgradeButton>
              )}
            </div>
          </nav>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <UserPlanBadge className="mr-4" />
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
                  href="/dashboard"
                  className="block text-zinc-300 hover:text-white transition-colors duration-200 py-2 flex items-center"
                  onClick={() => setIsOpen(false)}
                >
                  <Home size={18} className="mr-2" />
                  <span>Home</span>
                </Link>
              </motion.div>
              <motion.div variants={itemVariants}>
                <Link
                  href="/category/browse-all"
                  className="block text-zinc-300 hover:text-white transition-colors duration-200 py-2 flex items-center"
                  onClick={() => setIsOpen(false)}
                >
                  <Grid size={18} className="mr-2" />
                  <span>Browse</span>
                </Link>
              </motion.div>
              <motion.div variants={itemVariants}>
                <Link
                  href="/dashboard/favorites"
                  className="block text-zinc-300 hover:text-white transition-colors duration-200 py-2 flex items-center"
                  onClick={() => setIsOpen(false)}
                >
                  <Heart size={18} className="mr-2" />
                  <span>Favorites</span>
                </Link>
              </motion.div>
              <motion.div variants={itemVariants}>
                <Link
                  href="/dashboard/history"
                  className="block text-zinc-300 hover:text-white transition-colors duration-200 py-2 flex items-center"
                  onClick={() => setIsOpen(false)}
                >
                  <History size={18} className="mr-2" />
                  <span>History</span>
                </Link>
              </motion.div>
              <motion.div variants={itemVariants}>
                <Link
                  href="/dashboard/user"
                  className="block text-zinc-300 hover:text-white transition-colors duration-200 py-2 flex items-center"
                  onClick={() => setIsOpen(false)}
                >
                  <User size={18} className="mr-2" />
                  <span>Profile</span>
                </Link>
              </motion.div>
              <motion.div variants={itemVariants}>
                <Link
                  href="/membership-plans"
                  className="block text-zinc-300 hover:text-white transition-colors duration-200 py-2 flex items-center"
                  onClick={() => setIsOpen(false)}
                >
                  <Crown size={18} className="mr-2" />
                  <span>Membership</span>
                </Link>
              </motion.div>
              <motion.div variants={itemVariants}>
                <Link
                  href="/dashboard/settings"
                  className="block text-zinc-300 hover:text-white transition-colors duration-200 py-2 flex items-center"
                  onClick={() => setIsOpen(false)}
                >
                  <Settings size={18} className="mr-2" />
                  <span>Settings</span>
                </Link>
              </motion.div>
              <motion.div variants={itemVariants}>
                <button
                  onClick={() => {
                    signOut()
                    setIsOpen(false)
                  }}
                  className="block w-full text-left text-zinc-300 hover:text-white transition-colors duration-200 py-2 flex items-center"
                >
                  <LogOut size={18} className="mr-2" />
                  <span>Sign out</span>
                </button>
              </motion.div>
              {!isProUser && (
                <motion.div variants={itemVariants} className="pt-2">
                  {/* Use navigateOnly prop to make the button go to membership page */}
                  <UpgradeButton navigateOnly={true} className="w-full text-center" onClick={() => setIsOpen(false)}>
                    Upgrade
                  </UpgradeButton>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
