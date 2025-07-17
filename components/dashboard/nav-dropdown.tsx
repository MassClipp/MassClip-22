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

interface NavItem {
  title: string
  href?: string
  icon?: React.ComponentType<{ className?: string }>
  children?: NavItem[]
}

interface NavDropdownProps {
  item: NavItem
  level?: number
}

/* -------------------------------------------------------------------------- */
/*                              NAV DATA (static)                             */
/* -------------------------------------------------------------------------- */

const NAV: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: () => <LayoutDashboard className="h-4 w-4 mr-2" />,
  },
  {
    title: "Explore",
    icon: () => <Compass className="h-4 w-4 mr-2" />,
    children: [
      {
        title: "Discover Content",
        href: "/dashboard/explore",
        icon: () => <Compass className="h-4 w-4 mr-2" />,
      },
      {
        title: "My Purchases",
        href: "/dashboard/purchases",
        icon: () => <ShoppingBag className="h-4 w-4 mr-2" />,
      },
      {
        title: "Favorites",
        href: "/dashboard/favorites",
        icon: () => <Heart className="h-4 w-4 mr-2" />,
      },
      {
        title: "Memberships",
        href: "/dashboard/membership",
        icon: () => <Crown className="h-4 w-4 mr-2" />,
      },
    ],
  },
  {
    title: "Content Management",
    icon: () => <Film className="h-4 w-4 mr-2" />,
    children: [
      {
        title: "Free Content",
        href: "/dashboard/free-content",
        icon: () => <Film className="h-4 w-4 mr-2" />,
      },
      {
        title: "Upload Content",
        href: "/dashboard/upload",
        icon: () => <Upload className="h-4 w-4 mr-2" />,
      },
      {
        title: "Bundles",
        href: "/dashboard/bundles",
        icon: () => <Package className="h-4 w-4 mr-2" />,
      },
    ],
  },
  {
    title: "Business",
    icon: () => <DollarSign className="h-4 w-4 mr-2" />,
    children: [
      {
        title: "Earnings",
        href: "/dashboard/earnings",
        icon: () => <DollarSign className="h-4 w-4 mr-2" />,
      },
    ],
  },
  {
    title: "Settings",
    icon: () => <User className="h-4 w-4 mr-2" />,
    children: [
      {
        title: "Profile Settings",
        href: "/dashboard/profile",
        icon: () => <User className="h-4 w-4 mr-2" />,
      },
    ],
  },
]

/* -------------------------------------------------------------------------- */
/*                                COMPONENT                                   */
/* -------------------------------------------------------------------------- */

function NavDropdown({ item, level = 0 }: NavDropdownProps) {
  const pathname = usePathname()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800"
        >
          {item.icon && <item.icon className="h-4 w-4 text-zinc-400" />}
          <span className="sr-only">Navigation</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className="w-72 bg-zinc-900/95 backdrop-blur-md border border-zinc-800 shadow-xl rounded-xl p-2"
      >
        {item.children ? (
          <>
            <DropdownMenuLabel className="px-2 py-1.5 text-xs font-normal text-zinc-500">
              {item.title}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-zinc-800" />
            {item.children.map((child, index) => (
              <NavDropdown key={index} item={child} level={level + 1} />
            ))}
          </>
        ) : (
          <DropdownMenuItem className={cn(level === 0 && pathname === item.href && "bg-zinc-800 text-zinc-50")}>
            {item.icon && <item.icon className="h-4 w-4 mr-2" />}
            <Link href={item.href || "#"}>{item.title}</Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default NavDropdown

// NEW: also export it as a named export for consumers using
// `import { NavDropdown } from "@/components/dashboard/nav-dropdown"`
export { NavDropdown }
