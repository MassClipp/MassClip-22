"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { UserDropdown } from "@/components/user-dropdown"
import { Home, Heart, Clock, Grid3X3, Menu, X, Upload, Settings } from "lucide-react"

export default function DashboardHeader() {
  const { user } = useAuth()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: <Home className="h-5 w-5" />,
      active: pathname === "/dashboard",
    },
    {
      name: "Favorites",
      href: "/dashboard/favorites",
      icon: <Heart className="h-5 w-5" />,
      active: pathname === "/dashboard/favorites",
    },
    {
      name: "History",
      href: "/dashboard/history",
      icon: <Clock className="h-5 w-5" />,
      active: pathname === "/dashboard/history",
    },
    {
      name: "Categories",
      href: "/dashboard/categories",
      icon: <Grid3X3 className="h-5 w-5" />,
      active: pathname === "/dashboard/categories",
    },
    {
      name: "Upload",
      href: "/dashboard/upload",
      icon: <Upload className="h-5 w-5" />,
      active: pathname === "/dashboard/upload",
    },
    {
      name: "Settings",
      href: "/dashboard/settings/stripe",
      icon: <Settings className="h-5 w-5" />,
      active: pathname?.includes("/dashboard/settings"),
    },
  ]

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/60">
      <div className="container flex h-16 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold text-xl">MassClip</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center transition-colors hover:text-white",
                  item.active ? "text-white" : "text-zinc-400",
                )}
              >
                {item.icon}
                <span className="ml-2">{item.name}</span>
              </Link>
            ))}
          </nav>
        </div>

        <Button
          className="flex items-center space-x-2 md:hidden"
          variant="ghost"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          <span className="font-bold">Menu</span>
        </Button>

        <div className="flex flex-1 items-center justify-end space-x-4">
          <UserDropdown />
        </div>
      </div>

      {/* Mobile navigation */}
      {mobileMenuOpen && (
        <div className="border-b border-zinc-800 bg-black md:hidden">
          <nav className="grid grid-cols-2 gap-2 p-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center rounded-md px-3 py-2 text-sm font-medium",
                  item.active ? "bg-zinc-800 text-white" : "text-zinc-400 hover:bg-zinc-800 hover:text-white",
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.icon}
                <span className="ml-2">{item.name}</span>
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}
