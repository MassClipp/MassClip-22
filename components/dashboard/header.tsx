"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Bell, Search, User, Upload, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import Logo from "@/components/logo"
import NavDropdown from "@/components/dashboard/nav-dropdown"
import { useNotifications } from "@/hooks/use-notifications"

export default function DashboardHeader() {
  const router = useRouter()
  const { user, signOut } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [userData, setUserData] = useState<any>(null)
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (userDoc.exists()) {
          setUserData(userDoc.data())
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
      }
    }

    fetchUserData()
  }, [user])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/dashboard/explore?search=${encodeURIComponent(searchQuery)}`)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push("/login")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const handleNotificationClick = async (notificationId: string) => {
    await markAsRead(notificationId)
  }

  const formatNotificationTime = (timestamp: any) => {
    if (!timestamp) return ""
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return "Just now"
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  return (
    <header className="sticky top-0 z-30 w-full border-b border-zinc-800/50 bg-black/80 backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <NavDropdown />
          <Logo href="/dashboard" size="sm" />
        </div>

        <div className="flex items-center gap-3">
          <form onSubmit={handleSearch} className="relative hidden md:block">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
            <Input
              type="search"
              placeholder="Search content..."
              className="w-full max-w-[240px] bg-zinc-900/50 border-zinc-800 pl-9 focus-visible:ring-red-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>

          <Button
            onClick={() => router.push("/dashboard/upload")}
            className="hidden md:flex bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 border-none"
            size="sm"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>

          {!userData && user && <div className="hidden md:flex h-8 w-24 bg-zinc-800 animate-pulse rounded"></div>}

          {userData?.username && (
            <Button
              variant="outline"
              onClick={() => window.open(`/creator/${userData.username}`, "_blank")}
              className="hidden md:flex border-zinc-700 hover:bg-zinc-800"
              size="sm"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Profile
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5 text-zinc-400" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-96 bg-zinc-900 border-zinc-800 max-h-96 overflow-y-auto">
              <div className="flex items-center justify-between p-3">
                <DropdownMenuLabel className="text-base font-semibold">Notifications</DropdownMenuLabel>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs text-zinc-400 hover:text-white h-auto p-1"
                  >
                    Mark all read
                  </Button>
                )}
              </div>
              <DropdownMenuSeparator className="bg-zinc-800" />
              {notifications.length > 0 ? (
                <div className="max-h-80 overflow-y-auto">
                  {notifications.map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className={`p-4 cursor-pointer hover:bg-zinc-800 focus:bg-zinc-800 ${
                        !notification.read ? "bg-zinc-800/50" : ""
                      }`}
                      onClick={() => handleNotificationClick(notification.id)}
                    >
                      <div className="flex flex-col gap-1 w-full">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-white leading-tight">{notification.title}</p>
                          {!notification.read && (
                            <div className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0 mt-1"></div>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed">{notification.message}</p>
                        <p className="text-xs text-zinc-500 mt-1">{formatNotificationTime(notification.createdAt)}</p>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <Bell className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
                  <p className="text-sm text-zinc-500">No notifications yet</p>
                  <p className="text-xs text-zinc-600 mt-1">You'll see updates about your content here</p>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                {userData?.profilePic ? (
                  <img
                    src={userData.profilePic || "/placeholder.svg"}
                    alt={userData.displayName || "User"}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center">
                    <User className="h-4 w-4 text-zinc-400" />
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
              <DropdownMenuLabel>{userData?.displayName || user?.displayName || "User"}</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem onClick={() => router.push("/dashboard/profile")}>Profile Settings</DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/dashboard/earnings")}>Earnings</DropdownMenuItem>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem onClick={handleSignOut}>Sign Out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
