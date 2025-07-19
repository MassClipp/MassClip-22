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
  Crown,
  Film,
  Upload,
  Package,
  DollarSign,
  User,
  Settings,
  History,
  FileText,
  CreditCard,
  Wrench,
  Search,
  Play,
  BarChart3,
  Shield,
  Database,
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
 * Complete navigation structure for the MassClip dashboard
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
      { label: "Upload Content", href: "/dashboard/upload", icon: Upload },
      { label: "My Uploads", href: "/dashboard/uploads", icon: FileText },
      { label: "Bundles", href: "/dashboard/bundles", icon: Package },
      { label: "Categories", href: "/dashboard/categories", icon: Search },
    ],
  },
  {
    label: "Purchases & Activity",
    items: [
      { label: "My Purchases", href: "/dashboard/purchases", icon: ShoppingBag },
      { label: "Favorites", href: "/dashboard/favorites", icon: Heart },
      { label: "History", href: "/dashboard/history", icon: History },
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
    label: "Profile & Settings",
    items: [
      { label: "Profile", href: "/dashboard/profile", icon: User },
      { label: "Edit Profile", href: "/dashboard/profile/edit", icon: Settings },
      { label: "Password", href: "/dashboard/password", icon: Shield },
    ],
  },
  {
    label: "Tools & Diagnostics",
    items: [
      { label: "Thumbnails", href: "/dashboard/thumbnails", icon: Play },
      { label: "Setup Indexes", href: "/dashboard/setup-indexes", icon: Database },
      { label: "Diagnostics", href: "/dashboard/diagnostics", icon: Wrench },
      { label: "Stripe Diagnostics", href: "/dashboard/stripe-diagnostics", icon: BarChart3 },
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

      <DropdownMenuContent align="end" className="w-64 max-h-[80vh] overflow-y-auto">
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
