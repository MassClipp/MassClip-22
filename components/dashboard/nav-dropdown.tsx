"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Home,
  Search,
  Video,
  Upload,
  Package,
  ShoppingCart,
  Heart,
  DollarSign,
  Crown,
  User,
  Shield,
  ChevronDown,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useUserPlan } from "@/hooks/use-user-plan"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

interface NavSection {
  title: string
  items: NavItem[]
}

// Ensure all sections (including Business and Settings) are present
const navigationSections: NavSection[] = [
  {
    title: "Main",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: Home },
      { title: "Explore", href: "/dashboard/explore", icon: Search },
      { title: "Upgrade", href: "/dashboard/upgrade", icon: Crown },
    ],
  },
  {
    title: "Content",
    items: [
      { title: "Free Content", href: "/dashboard/free-content", icon: Video },
      { title: "Upload", href: "/dashboard/upload", icon: Upload },
      { title: "Bundles", href: "/dashboard/bundles", icon: Package },
    ],
  },
  {
    title: "Activity",
    items: [
      { title: "My Purchases", href: "/dashboard/purchases", icon: ShoppingCart },
      { title: "Favorites", href: "/dashboard/favorites", icon: Heart },
    ],
  },
  {
    title: "Business",
    items: [{ title: "Earnings", href: "/dashboard/earnings", icon: DollarSign }],
  },
  {
    title: "Settings",
    items: [
      { title: "Profile", href: "/dashboard/profile", icon: User },
      { title: "Security", href: "/dashboard/security", icon: Shield },
    ],
  },
]

// Custom hamburger menu icon component
const HamburgerIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
)

export function NavDropdown() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const { user } = useAuth()
  const { isProUser } = useUserPlan()
  const [username, setUsername] = useState<string | null>(null)

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

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 hover:bg-zinc-800/50 transition-colors duration-200">
          <HamburgerIcon className="h-4 w-4" />
          <ChevronDown className="h-3 w-3 opacity-70" />
          <span className="sr-only">Open navigation</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-56 p-0 bg-zinc-900/95 backdrop-blur-sm border-zinc-800/50 shadow-2xl overflow-y-auto z-50"
        align="start"
      >
        <ScrollArea className="max-h-[70vh]">
          <div className="p-2">
            <div className="mb-3 space-y-2">
              {isProUser && (
                <div className="flex items-center justify-center py-2">
                  <div className="relative">
                    <div className="flex items-center justify-center px-3 py-1.5 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 rounded-full shadow-lg border border-blue-400/30">
                      <span className="text-xs font-bold text-white tracking-wide">PRO</span>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>
              )}

              {username && (
                <Link
                  href={`/creator/${username}`}
                  target="_blank"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-2 py-2 text-sm rounded-lg transition-all duration-200 hover:bg-zinc-800/50 hover:text-white text-zinc-300 border border-zinc-700/50 hover:border-zinc-600/50"
                >
                  <User className="h-4 w-4" />
                  View Profile
                </Link>
              )}
            </div>

            {isProUser || username ? <Separator className="mb-3 bg-zinc-800/50" /> : null}

            {navigationSections.map((section, sectionIndex) => (
              <div key={section.title} aria-label={section.title}>
                <div className="px-2 py-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  {section.title}
                </div>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href
                    const isMembership = item.title === "Upgrade"

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-3 px-2 py-2 text-sm rounded-lg transition-all duration-200 hover:bg-zinc-800/50 hover:text-white ${
                          isActive
                            ? "bg-zinc-800/80 text-white font-medium shadow-sm"
                            : isMembership
                              ? "text-cyan-300 hover:text-cyan-200 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20"
                              : "text-zinc-300 hover:text-white"
                        }`}
                      >
                        <Icon className={`h-4 w-4 ${isMembership ? "text-cyan-300" : ""}`} />
                        {item.title}
                      </Link>
                    )
                  })}
                </div>
                {sectionIndex < navigationSections.length - 1 && <Separator className="my-2 bg-zinc-800/50" />}
              </div>
            ))}
          </div>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default NavDropdown
