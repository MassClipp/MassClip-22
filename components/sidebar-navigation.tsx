"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Home, Grid, Heart, Clock, Settings, User, Menu, X, DollarSign } from "lucide-react"
import Logo from "@/components/logo"
import { useAuth } from "@/contexts/auth-context"
import { useUserPlan } from "@/hooks/use-user-plan"
import { cn } from "@/lib/utils"

interface NavItemProps {
  href: string
  icon: React.ReactNode
  label: string
  isActive: boolean
  isPro?: boolean
  isUserPro?: boolean
}

const NavItem = ({ href, icon, label, isActive, isPro = false, isUserPro = true }: NavItemProps) => {
  // If it's a pro feature and user is not pro, show locked state
  const isLocked = isPro && !isUserPro

  return (
    <Link
      href={isLocked ? "/pricing" : href}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
        isActive ? "bg-zinc-800/50 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-800/30",
      )}
    >
      <span className="text-zinc-500">{icon}</span>
      <span className="font-light">{label}</span>
      {isPro && !isUserPro && (
        <span className="ml-auto text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">PRO</span>
      )}
    </Link>
  )
}

export function SidebarNavigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const { user } = useAuth()
  const { isProUser } = useUserPlan()

  // Close mobile menu when path changes
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsMobileMenuOpen(false)
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const navItems = [
    { href: "/dashboard", icon: <Home size={18} />, label: "Home" },
    { href: "/dashboard/categories", icon: <Grid size={18} />, label: "Categories" },
    { href: "/dashboard/favorites", icon: <Heart size={18} />, label: "Favorites" },
    { href: "/category/recently-added", icon: <Clock size={18} />, label: "Recent", isPro: true },
    { href: "/pricing", icon: <DollarSign size={18} />, label: "Pricing" },
  ]

  const accountItems = [
    {
      href: user?.username ? `/creator/${user.username}` : "/dashboard",
      icon: <User size={18} />,
      label: "My Profile",
    },
    { href: "/dashboard/user", icon: <Settings size={18} />, label: "Settings" },
  ]

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-full bg-zinc-900/80 backdrop-blur-sm border border-zinc-800/50"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={cn(
          "fixed top-0 left-0 h-full w-64 bg-zinc-900/80 backdrop-blur-md border-r border-zinc-800/50 z-40 flex flex-col",
          "transform transition-transform duration-300 ease-in-out",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        {/* Logo */}
        <div className="p-4 border-b border-zinc-800/50">
          <Logo href="/dashboard" size="sm" />
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <div className="mb-6">
            {navItems.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                isActive={pathname === item.href}
                isPro={item.isPro}
                isUserPro={isProUser}
              />
            ))}
          </div>

          {/* Account Section */}
          <div className="pt-4 border-t border-zinc-800/50">
            <div className="px-4 mb-2">
              <h3 className="text-xs uppercase text-zinc-500 font-medium tracking-wider">Account</h3>
            </div>
            {accountItems.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                isActive={pathname === item.href}
              />
            ))}
          </div>
        </div>

        {/* User Info */}
        {user && (
          <div className="p-4 border-t border-zinc-800/50 flex items-center">
            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-white">
              {user.displayName?.[0] || user.email?.[0] || "U"}
            </div>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user.displayName || user.email?.split("@")[0]}</p>
              <p className="text-xs text-zinc-400 truncate">{isProUser ? "Pro Member" : "Free Account"}</p>
            </div>
          </div>
        )}
      </motion.aside>
    </>
  )
}
