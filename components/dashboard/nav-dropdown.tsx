"use client"

import type React from "react"
import { useState } from "react"
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
      { title: "Membership", href: "/dashboard/membership", icon: Crown },
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

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 hover:bg-zinc-800/50 transition-colors duration-200">
          <HamburgerIcon className="h-4 w-4" />
          <ChevronDown className="h-3 w-3 opacity-70" />
          <span className="sr-only">Open navigation</span>
        </Button>
      </DropdownMenuTrigger>

      {/* Increase z-index and allow vertical overflow so lower sections are reachable */}
      <DropdownMenuContent
        className="w-56 p-0 bg-zinc-900/95 backdrop-blur-sm border-zinc-800/50 shadow-2xl overflow-y-auto z-50"
        align="start"
      >
        {/* Increase the scrollable area height so Business/Settings are visible without clipping */}
        <ScrollArea className="max-h-[70vh]">
          <div className="p-2">
            {navigationSections.map((section, sectionIndex) => (
              <div key={section.title} aria-label={section.title}>
                <div className="px-2 py-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  {section.title}
                </div>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href
                    const isMembership = item.title === "Membership"

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
