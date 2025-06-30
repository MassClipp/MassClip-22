"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Search, Upload, User, LogOut, Settings, Bell } from "lucide-react"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import DashboardSidebar from "./sidebar"

export default function DashboardHeader() {
  const router = useRouter()
  const { user, signOut } = useAuth()
  const [userProfile, setUserProfile] = useState<any>(null)

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (userDoc.exists()) {
          setUserProfile(userDoc.data())
        }
      } catch (error) {
        console.error("Error fetching user profile:", error)
      }
    }

    fetchUserProfile()
  }, [user])

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push("/login")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <DashboardSidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Top header */}
        <header className="h-16 border-b border-zinc-800/50 bg-zinc-900/95 backdrop-blur-sm flex items-center justify-between px-6">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 h-4 w-4" />
              <Input
                placeholder="Search content..."
                className="pl-10 bg-zinc-800/50 border-zinc-700 text-white placeholder-zinc-400"
              />
            </div>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-4">
            {/* Upload button */}
            <Button onClick={() => router.push("/dashboard/upload")} className="bg-red-600 hover:bg-red-700 text-white">
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>

            {/* Notifications */}
            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
              <Bell className="h-5 w-5" />
            </Button>

            {/* User dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={userProfile?.profilePicture || "/placeholder.svg"}
                      alt={userProfile?.displayName || "User"}
                    />
                    <AvatarFallback className="bg-red-600 text-white">
                      {userProfile?.displayName?.charAt(0) || user?.email?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-zinc-900 border-zinc-800" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none text-white">{userProfile?.displayName || "User"}</p>
                    <p className="text-xs leading-none text-zinc-400">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-zinc-800" />
                <DropdownMenuItem
                  className="text-zinc-300 hover:text-white hover:bg-zinc-800"
                  onClick={() => router.push("/dashboard/profile")}
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-zinc-300 hover:text-white hover:bg-zinc-800"
                  onClick={() => router.push("/dashboard/settings")}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-zinc-800" />
                <DropdownMenuItem className="text-zinc-300 hover:text-white hover:bg-zinc-800" onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
      </div>
    </div>
  )
}
