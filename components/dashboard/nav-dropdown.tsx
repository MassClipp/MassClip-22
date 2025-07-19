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
  FolderOpen,
  Package,
  ShoppingCart,
  Heart,
  History,
  DollarSign,
  Crown,
  CreditCard,
  User,
  Shield,
  ChevronDown,
  Menu,
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

const navigationSections: NavSection[] = [
  {
    title: "Main",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: Home },
      { title: "Explore", href: "/dashboard/explore", icon: Search },
    ],
  },
  {
    title: "Content",
    items: [
      { title: "Free Content", href: "/dashboard/free-content", icon: Video },
      { title: "Upload", href: "/dashboard/upload", icon: Upload },
      { title: "My Uploads", href: "/dashboard/uploads", icon: FolderOpen },
      { title: "Bundles", href: "/dashboard/bundles", icon: Package },
    ],
  },
  {
    title: "Activity",
    items: [
      { title: "My Purchases", href: "/dashboard/purchases", icon: ShoppingCart },
      { title: "Favorites", href: "/dashboard/favorites", icon: Heart },
      { title: "History", href: "/dashboard/history", icon: History },
    ],
  },
  {
    title: "Business",
    items: [
      { title: "Earnings", href: "/dashboard/earnings", icon: DollarSign },
      { title: "Membership", href: "/dashboard/membership", icon: Crown },
      { title: "Connect Stripe", href: "/dashboard/connect-stripe", icon: CreditCard },
    ],
  },
  {
    title: "Settings",
    items: [
      { title: "Profile", href: "/dashboard/profile", icon: User },
      { title: "Security", href: "/dashboard/security", icon: Shield },
    ],
  },
]

export function NavDropdown() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Menu className="h-4 w-4" />
          Menu
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 p-0" align="start">
        <ScrollArea className="max-h-[400px]">
          <div className="p-2">
            {navigationSections.map((section, sectionIndex) => (
              <div key={section.title}>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {section.title}
                </div>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-3 px-2 py-2 text-sm rounded-md transition-colors hover:bg-accent hover:text-accent-foreground ${
                          isActive ? "bg-accent text-accent-foreground font-medium" : ""
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {item.title}
                      </Link>
                    )
                  })}
                </div>
                {sectionIndex < navigationSections.length - 1 && <Separator className="my-2" />}
              </div>
            ))}
          </div>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default NavDropdown
