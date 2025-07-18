"use client"

import type * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Compass,
  ShoppingBag,
  Heart,
  Crown,
  Film,
  Upload,
  Package,
  DollarSign,
  User,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */
export interface NavItem {
  title: string
  href?: string
  icon?: React.ComponentType<{ className?: string }>
  children?: NavItem[]
}

export interface NavDropdownProps {
  item?: NavItem
  level?: number
}

/* -------------------------------------------------------------------------- */
/*                              NAV DATA (static)                             */
/* -------------------------------------------------------------------------- */
export const NAV: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Explore",
    icon: Compass,
    children: [
      { title: "Discover Content", href: "/dashboard/explore", icon: Compass },
      { title: "My Purchases", href: "/dashboard/purchases", icon: ShoppingBag },
      { title: "Favorites", href: "/dashboard/favorites", icon: Heart },
      { title: "Memberships", href: "/dashboard/membership", icon: Crown },
    ],
  },
  {
    title: "Content Management",
    icon: Film,
    children: [
      { title: "Free Content", href: "/dashboard/free-content", icon: Film },
      { title: "Upload Content", href: "/dashboard/upload", icon: Upload },
      { title: "Bundles", href: "/dashboard/bundles", icon: Package },
    ],
  },
  {
    title: "Business",
    icon: DollarSign,
    children: [{ title: "Earnings", href: "/dashboard/earnings", icon: DollarSign }],
  },
  {
    title: "Settings",
    icon: User,
    children: [{ title: "Profile Settings", href: "/dashboard/profile", icon: User }],
  },
]

/* -------------------------------------------------------------------------- */
/*                                COMPONENT                                   */
/* -------------------------------------------------------------------------- */
function InternalNavDropdown({ item, level = 0 }: NavDropdownProps) {
  const pathname = usePathname()

  // GUARD: Return null if item is undefined or null
  if (!item) {
    return null
  }

  // GUARD: Ensure we have a valid icon, fallback to LayoutDashboard
  const Icon = item.icon || LayoutDashboard

  // GUARD: Ensure we have a valid title
  const title = item.title || "Untitled"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800"
        >
          <Icon className="h-4 w-4 text-zinc-400" />
          <span className="sr-only">{title}</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className="w-72 bg-zinc-900/95 backdrop-blur-md border border-zinc-800 shadow-xl rounded-xl p-2"
      >
        {item.children && Array.isArray(item.children) ? (
          <>
            <DropdownMenuLabel className="px-2 py-1.5 text-xs font-normal text-zinc-500">{title}</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-zinc-800" />
            {item.children.map((child, idx) => {
              // GUARD: Only render valid children
              if (!child) return null
              return <InternalNavDropdown key={`${child.title || idx}`} item={child} level={level + 1} />
            })}
          </>
        ) : (
          <DropdownMenuItem className={cn(level === 0 && pathname === item.href && "bg-zinc-800 text-zinc-50")}>
            <Icon className="h-4 w-4 mr-2" />
            {item.href ? <Link href={item.href}>{title}</Link> : <span>{title}</span>}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Root component: renders the full navigation bar (all top-level items).
 * This is kept as the default export because most code imports it as
 *   `import NavDropdown from ".../nav-dropdown"`
 */
export default function NavDropdownBar() {
  return (
    <div className="flex items-center gap-2">
      {NAV.filter(Boolean).map((item, idx) => {
        // GUARD: Only render valid items
        if (!item) return null
        return <InternalNavDropdown key={`${item.title || idx}`} item={item} />
      })}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                        NAMED EXPORT FOR LEGACY IMPORTS                     */
/* -------------------------------------------------------------------------- */
export const NavDropdown = InternalNavDropdown
