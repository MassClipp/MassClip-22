"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Home, Grid, Heart, Clock, DollarSign, User, Settings, LogOut, ChevronDown, Globe, Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import Logo from "@/components/logo"
import { useAuth } from "@/contexts/auth-context"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useMobile } from "@/hooks/use-mobile"

export function SidebarNavigation() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const [username, setUsername] = useState<string | null>(null)
  const [isAccountOpen, setIsAccountOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const isMobile = useMobile()

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            setUsername(userData.username || null)
          }
        } catch (error) {
          console.error("Error fetching user data:", error)
        }
      }
    }

    fetchUserData()
  }, [user])

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error("Error during logout:", error)
    }
  }

  const navigationItems = [
    { name: "Home", href: "/dashboard", icon: <Home className="h-5 w-5" /> },
    { name: "Categories", href: "/dashboard/categories", icon: <Grid className="h-5 w-5" /> },
    { name: "Favorites", href: "/dashboard/favorites", icon: <Heart className="h-5 w-5" /> },
    { name: "History", href: "/dashboard/history", icon: <Clock className="h-5 w-5" /> },
    { name: "Pricing", href: "/membership-plans", icon: <DollarSign className="h-5 w-5" /> },
  ]

  const accountItems = [
    { name: "Account Settings", href: "/dashboard/user", icon: <Settings className="h-5 w-5" /> },
    ...(username
      ? [{ name: "Public Profile", href: `/creator/${username}`, icon: <Globe className="h-5 w-5" /> }]
      : []),
  ]

  const sidebarContent = (
    <>
      <div className="px-3 py-4">
        <Logo href="/dashboard" />
        <div className="mt-8 space-y-1">
          {navigationItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-md group transition-colors",
                pathname === item.href ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-800",
              )}
              onClick={() => isMobile && setIsMobileMenuOpen(false)}
            >
              <span className="mr-3 text-zinc-500 group-hover:text-zinc-400">{item.icon}</span>
              {item.name}
            </Link>
          ))}
        </div>

        <div className="mt-8">
          <button
            className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
            onClick={() => setIsAccountOpen(!isAccountOpen)}
          >
            <div className="flex items-center">
              <span className="mr-3 text-zinc-500">
                <User className="h-5 w-5" />
              </span>
              Account
            </div>
            <ChevronDown className={cn("h-4 w-4 transition-transform", isAccountOpen ? "transform rotate-180" : "")} />
          </button>

          <AnimatePresence>
            {isAccountOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="pl-10 pr-3 py-2 space-y-1">
                  {accountItems.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "flex items-center px-3 py-2 text-sm font-medium rounded-md group transition-colors",
                        pathname === item.href
                          ? "bg-zinc-800 text-white"
                          : "text-zinc-400 hover:text-white hover:bg-zinc-800",
                      )}
                      onClick={() => isMobile && setIsMobileMenuOpen(false)}
                    >
                      <span className="mr-3 text-zinc-500 group-hover:text-zinc-400">{item.icon}</span>
                      {item.name}
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {user && (
        <div className="px-3 py-4 mt-auto border-t border-zinc-800">
          <div className="flex items-center px-3 py-2">
            <div className="flex-shrink-0">
              {user.photoURL ? (
                <img
                  src={user.photoURL || "/placeholder.svg"}
                  alt={user.displayName || "User"}
                  className="h-8 w-8 rounded-full"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-white">
                  {(user.displayName || user.email || "U").charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.displayName || user.email}</p>
              <p className="text-xs text-zinc-400 truncate">{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="ml-2 flex-shrink-0 p-1 rounded-full text-zinc-400 hover:text-white"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </>
  )

  return (
    <>
      {/* Mobile menu button */}
      {isMobile && (
        <button
          className="fixed top-4 left-4 z-50 p-2 rounded-md bg-zinc-900 text-white"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      )}

      {/* Mobile sidebar */}
      {isMobile && (
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black z-40"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25 }}
                className="fixed inset-y-0 left-0 w-64 bg-zinc-900 z-50 flex flex-col overflow-y-auto"
              >
                {sidebarContent}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      )}

      {/* Desktop sidebar */}
      {!isMobile && (
        <div className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 bg-zinc-900 border-r border-zinc-800">
          {sidebarContent}
        </div>
      )}
    </>
  )
}
