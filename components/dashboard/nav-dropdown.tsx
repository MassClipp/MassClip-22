"use client"

import type React from "react"

import { useState } from "react"
import { ChevronDown, DollarSign, Settings, User, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const businessItems: NavItem[] = [
  {
    label: "Earnings",
    href: "/dashboard/earnings",
    icon: DollarSign,
  },
]

const settingsItems: NavItem[] = [
  {
    label: "Profile",
    href: "/dashboard/profile",
    icon: User,
  },
  {
    label: "Account Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
]

export default function NavDropdown() {
  const { user, logout } = useAuth()
  const [isBusinessOpen, setIsBusinessOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  return (
    <div className="flex items-center gap-4">
      {/* Business Dropdown */}
      <DropdownMenu open={isBusinessOpen} onOpenChange={setIsBusinessOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 text-zinc-300 hover:text-white">
            Business
            <ChevronDown className={`h-4 w-4 transition-transform ${isBusinessOpen ? "rotate-180" : ""}`} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48 bg-zinc-900 border-zinc-800">
          <DropdownMenuLabel className="text-zinc-400">Business Tools</DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-zinc-800" />
          {businessItems.map((item) => (
            <DropdownMenuItem key={item.href} asChild>
              <Link
                href={item.href}
                className="flex items-center gap-2 text-zinc-300 hover:text-white hover:bg-zinc-800"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Settings Dropdown */}
      <DropdownMenu open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 text-zinc-300 hover:text-white">
            Settings
            <ChevronDown className={`h-4 w-4 transition-transform ${isSettingsOpen ? "rotate-180" : ""}`} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48 bg-zinc-900 border-zinc-800">
          <DropdownMenuLabel className="text-zinc-400">Account</DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-zinc-800" />
          {settingsItems.map((item) => (
            <DropdownMenuItem key={item.href} asChild>
              <Link
                href={item.href}
                className="flex items-center gap-2 text-zinc-300 hover:text-white hover:bg-zinc-800"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator className="bg-zinc-800" />
          <DropdownMenuItem
            onClick={handleLogout}
            className="flex items-center gap-2 text-red-400 hover:text-red-300 hover:bg-zinc-800"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
