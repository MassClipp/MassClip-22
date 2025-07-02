"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface NavItem {
  title: string
  href?: string
  icon?: React.ComponentType<{ className?: string }>
  children?: NavItem[]
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
  },
  {
    title: "Explore",
    children: [
      { title: "Browse All", href: "/category/browse-all" },
      { title: "Recently Added", href: "/category/recently-added" },
      { title: "Cinema", href: "/category/cinema" },
      { title: "Hustle Mentality", href: "/category/hustle-mentality" },
      { title: "Introspection", href: "/category/introspection" },
    ],
  },
  {
    title: "Content Management",
    children: [
      { title: "Upload", href: "/dashboard/upload" },
      { title: "My Uploads", href: "/dashboard/uploads" },
      { title: "Free Content", href: "/dashboard/free-content" },
      { title: "Categories", href: "/dashboard/categories" },
    ],
  },
  {
    title: "Business",
    children: [
      { title: "Earnings", href: "/dashboard/earnings" },
      { title: "Bundles", href: "/dashboard/bundles" },
      { title: "Product Boxes", href: "/dashboard/product-boxes" },
    ],
  },
  {
    title: "Settings",
    children: [
      { title: "Profile", href: "/dashboard/profile" },
      { title: "Stripe", href: "/dashboard/settings/stripe" },
      { title: "Password", href: "/dashboard/password" },
      { title: "Membership", href: "/dashboard/membership" },
    ],
  },
]

export function NavDropdown() {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  const toggleExpanded = (title: string) => {
    setExpandedItems((prev) => (prev.includes(title) ? prev.filter((item) => item !== title) : [...prev, title]))
  }

  const renderNavItem = (item: NavItem, level = 0) => {
    const isExpanded = expandedItems.includes(item.title)
    const hasChildren = item.children && item.children.length > 0
    const isActive = item.href === pathname

    return (
      <div key={item.title} className={cn("", level > 0 && "ml-4")}>
        {item.href ? (
          <Link
            href={item.href}
            className={cn(
              "flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
              isActive ? "bg-red-600 text-white" : "text-zinc-300 hover:text-white hover:bg-zinc-800",
            )}
          >
            {item.icon && <item.icon className="h-4 w-4" />}
            {item.title}
          </Link>
        ) : (
          <Button
            variant="ghost"
            onClick={() => toggleExpanded(item.title)}
            className={cn(
              "w-full justify-between px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800",
              level === 0 && "font-medium",
            )}
          >
            <span className="flex items-center gap-2">
              {item.icon && <item.icon className="h-4 w-4" />}
              {item.title}
            </span>
            {hasChildren && (isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}
          </Button>
        )}

        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-1">{item.children!.map((child) => renderNavItem(child, level + 1))}</div>
        )}
      </div>
    )
  }

  return <nav className="space-y-1">{navItems.map((item) => renderNavItem(item))}</nav>
}
