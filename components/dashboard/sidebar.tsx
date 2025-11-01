"use client"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Upload,
  FileText,
  Package,
  DollarSign,
  Settings,
  User,
  CreditCard,
  Lock,
  Crown,
  Compass,
  Grid3X3,
  FolderOpen,
  Tags,
  Store,
  Heart,
} from "lucide-react"
import { SidebarNavItem } from "./sidebar-nav-item"
import Logo from "@/components/logo"

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Explore",
    icon: Compass,
    children: [
      {
        title: "Browse All",
        href: "/category/browse-all",
        icon: Grid3X3,
      },
      {
        title: "Recently Added",
        href: "/category/recently-added",
        icon: FileText,
      },
      {
        title: "Cinema",
        href: "/category/cinema",
        icon: FileText,
      },
      {
        title: "Hustle Mentality",
        href: "/category/hustle-mentality",
        icon: FileText,
      },
      {
        title: "Introspection",
        href: "/category/introspection",
        icon: FileText,
      },
    ],
  },
  {
    title: "Content Management",
    icon: FolderOpen,
    children: [
      {
        title: "Upload",
        href: "/dashboard/upload",
        icon: Upload,
      },
      {
        title: "My Uploads",
        href: "/dashboard/uploads",
        icon: FileText,
      },
      {
        title: "Free Content",
        href: "/dashboard/free-content",
        icon: FileText,
      },
      {
        title: "Categories",
        href: "/dashboard/categories",
        icon: Tags,
      },
    ],
  },
  {
    title: "Business",
    icon: DollarSign,
    children: [
      {
        title: "Earnings",
        href: "/dashboard/earnings",
        icon: DollarSign,
      },
      {
        title: "Bundles",
        href: "/dashboard/bundles",
        icon: Package,
      },
      {
        title: "View Storefront",
        href: "/dashboard/view-storefront",
        icon: Store,
      },
    ],
  },
  {
    title: "Favorites",
    href: "/dashboard/favorites",
    icon: Heart,
  },
  {
    title: "Upgrade",
    href: "/dashboard/upgrade",
    icon: Crown,
  },
  {
    title: "My Purchases",
    href: "/dashboard/purchases",
    icon: CreditCard,
  },
  {
    title: "Settings",
    icon: Settings,
    children: [
      {
        title: "Profile",
        href: "/dashboard/profile",
        icon: User,
      },
      {
        title: "Stripe",
        href: "/dashboard/connect-stripe",
        icon: CreditCard,
      },
      {
        title: "Password",
        href: "/dashboard/password",
        icon: Lock,
      },
    ],
  },
]

export function DashboardSidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-64 flex-col bg-zinc-900 border-r border-zinc-800">
      <div className="flex h-14 items-center border-b border-zinc-800 px-4">
        <Logo href="/dashboard" size="sm" />
      </div>
      <div className="flex-1 overflow-auto py-2">
        <nav className="grid items-start px-2 text-sm font-medium">
          <div className="space-y-1">
            {navItems.map((item, index) => (
              <SidebarNavItem key={index} item={item} />
            ))}
          </div>
        </nav>
      </div>
    </div>
  )
}
