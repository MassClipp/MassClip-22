"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Search,
  Upload,
  FileVideo,
  Gift,
  Tags,
  DollarSign,
  Package,
  Box,
  Settings,
  User,
  CreditCard,
  Lock,
  Crown,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface NavItem {
  title: string
  href?: string
  icon: React.ComponentType<{ className?: string }>
  children?: NavItem[]
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Explore",
    icon: Search,
    children: [
      { title: "Browse All", href: "/category/browse-all", icon: Search },
      { title: "Recently Added", href: "/category/recently-added", icon: Search },
      { title: "Cinema", href: "/category/cinema", icon: Search },
      { title: "Hustle Mentality", href: "/category/hustle-mentality", icon: Search },
      { title: "Introspection", href: "/category/introspection", icon: Search },
    ],
  },
  {
    title: "Content Management",
    icon: FileVideo,
    children: [
      { title: "Upload", href: "/dashboard/upload", icon: Upload },
      { title: "My Uploads", href: "/dashboard/uploads", icon: FileVideo },
      { title: "Free Content", href: "/dashboard/free-content", icon: Gift },
      { title: "Categories", href: "/dashboard/categories", icon: Tags },
    ],
  },
  {
    title: "Business",
    icon: DollarSign,
    children: [
      { title: "Earnings", href: "/dashboard/earnings", icon: DollarSign },
      { title: "Bundles", href: "/dashboard/bundles", icon: Package },
      { title: "Product Boxes", href: "/dashboard/product-boxes", icon: Box },
    ],
  },
  {
    title: "Settings",
    icon: Settings,
    children: [
      { title: "Profile", href: "/dashboard/profile", icon: User },
      { title: "Stripe", href: "/dashboard/settings/stripe", icon: CreditCard },
      { title: "Password", href: "/dashboard/password", icon: Lock },
      { title: "Membership", href: "/dashboard/membership", icon: Crown },
    ],
  },
]

export function Sidebar() {
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
              "flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors",
              isActive ? "bg-red-600 text-white" : "text-zinc-300 hover:text-white hover:bg-zinc-800",
            )}
          >
            <item.icon className="h-4 w-4" />
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
            <span className="flex items-center gap-3">
              <item.icon className="h-4 w-4" />
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

  return (
    <div className="flex flex-col h-full">
      <nav className="flex-1 space-y-1 p-4">{navItems.map((item) => renderNavItem(item))}</nav>
    </div>
  )
}
