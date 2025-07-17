"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search, Upload, Bell, User, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/auth-context"
import { NavDropdown } from "./nav-dropdown"

export default function DashboardHeader() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      router.push("/login")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  const handleViewProfile = () => {
    if (user?.username) {
      router.push(`/creator/${user.username}`)
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Left side - Logo and Navigation */}
        <div className="flex items-center gap-4">
          {/* Mobile Navigation Trigger */}
          <div className="md:hidden">
            <NavDropdown />
          </div>

          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="text-xl font-bold text-white">
              <span className="text-red-500">Mass</span>Clip
            </div>
          </Link>
        </div>

        {/* Center - Search */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <form onSubmit={handleSearch} className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              type="search"
              placeholder="Search content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-400 focus:border-red-500"
            />
          </form>
        </div>

        {/* Right side - Actions and User */}
        <div className="flex items-center gap-2">
          {/* Upload Button */}
          <Button asChild className="bg-red-600 hover:bg-red-700 text-white border-0 hidden sm:flex">
            <Link href="/dashboard/upload">
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Link>
          </Button>

          {/* View Profile Button */}
          <Button
            variant="outline"
            onClick={handleViewProfile}
            className="bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800 hidden sm:flex"
          >
            View Profile
          </Button>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
            <Bell className="h-5 w-5" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.profilePic || "/placeholder.svg"} alt={user?.displayName || "User"} />
                  <AvatarFallback className="bg-zinc-800 text-white">
                    {user?.displayName?.charAt(0) || user?.email?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-zinc-900 border-zinc-800" align="end" forceMount>
              <div className="flex flex-col space-y-1 p-2">
                <p className="text-sm font-medium text-white">{user?.displayName || "User"}</p>
                <p className="text-xs text-zinc-400">{user?.email}</p>
              </div>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem
                onClick={handleViewProfile}
                className="text-zinc-300 hover:text-white hover:bg-zinc-800 cursor-pointer"
              >
                <User className="mr-2 h-4 w-4" />
                View Profile
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href="/dashboard/profile"
                  className="text-zinc-300 hover:text-white hover:bg-zinc-800 cursor-pointer"
                >
                  <User className="mr-2 h-4 w-4" />
                  Edit Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-400 hover:text-red-300 hover:bg-zinc-800 cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Search */}
      <div className="md:hidden border-t border-zinc-800 p-4">
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            type="search"
            placeholder="Search content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-400 focus:border-red-500"
          />
        </form>
      </div>
    </header>
  )
}
