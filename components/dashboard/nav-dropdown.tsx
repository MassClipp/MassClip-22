"use client"

import Link from "next/link"
import { Menu, ChevronDown, LayoutDashboard, PackageSearch } from "lucide-react"

import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"

/**
 * Basic navigation items shown inside the dashboard top-bar dropdown.
 * Extend or modify this list as your app grows.
 */
const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Bundles", href: "/dashboard/bundles", icon: PackageSearch },
] as const

export function NavDropdown() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium hover:bg-muted"
        aria-label="Open navigation menu"
      >
        <Menu className="h-4 w-4" />
        <ChevronDown className="h-3 w-3" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        {navItems.map(({ label, href, icon: Icon }) => (
          <DropdownMenuItem key={href} asChild>
            <Link href={href} className="flex w-full items-center gap-2">
              <Icon className="h-4 w-4" />
              <span className="truncate">{label}</span>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/* Optional default export so older imports still work */
export default NavDropdown
