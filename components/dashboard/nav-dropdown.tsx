"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { User, Settings, LogOut, Upload, BarChart3, CreditCard, Heart, History } from "lucide-react"

export function NavDropdown() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  const handleNavigation = (path: string) => {
    router.push(path)
    setIsOpen(false)
  }

  const handleLogout = async () => {
    try {
      await logout()
      router.push("/login")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 text-white hover:bg-zinc-800 border-zinc-700"
        >
          <div className="flex flex-col gap-1">
            <div className="w-4 h-0.5 bg-current rounded-full"></div>
            <div className="w-4 h-0.5 bg-current rounded-full"></div>
            <div className="w-4 h-0.5 bg-current rounded-full"></div>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 bg-zinc-900 border-zinc-800 text-white">
        <DropdownMenuLabel className="text-zinc-300">{user?.displayName || user?.email || "User"}</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-zinc-800" />

        <DropdownMenuItem onClick={() => handleNavigation("/dashboard")} className="hover:bg-zinc-800 cursor-pointer">
          <BarChart3 className="mr-2 h-4 w-4" />
          Dashboard
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleNavigation("/dashboard/upload")}
          className="hover:bg-zinc-800 cursor-pointer"
        >
          <Upload className="mr-2 h-4 w-4" />
          Upload Content
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleNavigation("/dashboard/earnings")}
          className="hover:bg-zinc-800 cursor-pointer"
        >
          <CreditCard className="mr-2 h-4 w-4" />
          Earnings
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleNavigation("/dashboard/purchases")}
          className="hover:bg-zinc-800 cursor-pointer"
        >
          <History className="mr-2 h-4 w-4" />
          Purchase History
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleNavigation("/dashboard/favorites")}
          className="hover:bg-zinc-800 cursor-pointer"
        >
          <Heart className="mr-2 h-4 w-4" />
          Favorites
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-zinc-800" />

        <DropdownMenuItem
          onClick={() => handleNavigation("/dashboard/profile")}
          className="hover:bg-zinc-800 cursor-pointer"
        >
          <User className="mr-2 h-4 w-4" />
          Profile Settings
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleNavigation("/dashboard/settings")}
          className="hover:bg-zinc-800 cursor-pointer"
        >
          <Settings className="mr-2 h-4 w-4" />
          Account Settings
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-zinc-800" />

        <DropdownMenuItem
          onClick={handleLogout}
          className="hover:bg-zinc-800 cursor-pointer text-red-400 hover:text-red-300"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
