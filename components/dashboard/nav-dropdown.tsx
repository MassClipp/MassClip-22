"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Menu,
  ChevronDown,
  LayoutDashboard,
  Compass,
  ShoppingBag,
  Heart,
  Film,
  Upload,
  Package,
  DollarSign,
  User,
  Crown,
  CreditCard,
  KeyRound,
} from "lucide-react"
import { cn } from "@/lib/utils"

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu"

/**
 * Streamlined navigation structure for the MassClip dashboard
 */
const navigationSections = [
  {
    label: "Main",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Explore", href: "/dashboard/explore", icon: Compass },
    ],
  },
  {
    label: "Content",
    items: [
      { label: "Free Content", href: "/dashboard/free-content", icon: Film },
      { label: "Upload", href: "/dashboard/upload", icon: Upload },
      { label: "Bundles", href: "/dashboard/bundles", icon: Package },
    ],
  },
  {
    label: "Activity",
    items: [
      { label: "Purchases", href: "/dashboard/purchases", icon: ShoppingBag },
      { label: "Favorites", href: "/dashboard/favorites", icon: Heart },
    ],
  },
  {
    label: "Business",
    items: [
      { label: "Earnings", href: "/dashboard/earnings", icon: DollarSign },
      { label: "Membership", href: "/dashboard/membership", icon: Crown },
      { label: "Connect Stripe", href: "/dashboard/connect-stripe", icon: CreditCard },
    ],
  },
  {
    label: "Settings",
    items: [
      { label: "Profile", href: "/dashboard/profile", icon: User },
      { label: "Security", href: "/dashboard/security", icon: KeyRound },
    ],
  },
] as const

export function NavDropdown() {
  const pathname = usePathname()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
        aria-label="Open navigation menu"
      >
        <Menu className="h-4 w-4" />
        <span className="hidden sm:inline">Menu</span>
        <ChevronDown className="h-3 w-3" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-56 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
      >
        {navigationSections.map((section, sectionIndex) => (
          <div key={section.label}>
            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5">
              {section.label}
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              {section.items.map(({ label, href, icon: Icon }) => (
                <DropdownMenuItem key={href} asChild>
                  <Link
                    href={href}
                    className={cn(
                      "flex w-full items-center gap-3 px-2 py-2 text-sm",
                      pathname === href && "bg-accent text-accent-foreground font-medium",
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{label}</span>
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            {sectionIndex < navigationSections.length - 1 && <DropdownMenuSeparator className="my-1" />}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/* Default export for compatibility */
export default NavDropdown
