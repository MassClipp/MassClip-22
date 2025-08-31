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
import type { Notification } from "@/lib/types"

export default function DashboardHeader() {
  const router = useRouter()
  const { user, signOut } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [userData, setUserData] = useState<any>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  // Fetch user data
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

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) return

      try {
        console.log(`[v0] Fetching notifications for user: ${user.uid}`)

        const token = await user.getIdToken()
        const response = await fetch("/api/notifications", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          console.log(`[v0] Notifications response:`, data)

          setNotifications(data.notifications || [])
          setUnreadCount(data.unreadCount || 0)

          console.log(`[v0] Set ${data.notifications?.length || 0} notifications, ${data.unreadCount || 0} unread`)
        } else {
          console.error(`[v0] Failed to fetch notifications:`, response.status, response.statusText)
        }
      } catch (error) {
        console.error("[v0] Error fetching notifications:", error)
      }
    }

    fetchNotifications()

    const interval = setInterval(fetchNotifications, 10000)
    return () => clearInterval(interval)
  }, [user])

  const markNotificationAsRead = async (notificationId: string) => {
    if (!user) return

    try {
      const token = await user.getIdToken()
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notificationId }),
      })

      // Update local state
      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const markAllAsRead = async () => {
    if (!user) return

    try {
      const token = await user.getIdToken()
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ markAllAsRead: true }),
      })

      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
    }
  }

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/dashboard/explore?search=${encodeURIComponent(searchQuery)}`)
    }
  }

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut()
      router.push("/login")
    } catch (error) {
      console.error("Error signing out:", error)
    }
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
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 bg-zinc-900 border-zinc-800">
              <div className="flex items-center justify-between px-3 py-2">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs text-zinc-400 hover:text-white"
                  >
                    Mark all read
                  </Button>
                )}
              </div>
              <DropdownMenuSeparator className="bg-zinc-800" />
              {notifications.length > 0 ? (
                <div className="max-h-96 overflow-y-auto">
                  {notifications.slice(0, 10).map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className={`flex flex-col items-start p-3 cursor-pointer ${
                        !notification.read ? "bg-zinc-800/50" : ""
                      }`}
                      onClick={() => !notification.read && markNotificationAsRead(notification.id)}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-medium text-sm">{notification.title}</span>
                        {!notification.read && <span className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0"></span>}
                      </div>
                      <span className="text-xs text-zinc-400 mt-1">{notification.message}</span>
                      <span className="text-xs text-zinc-500 mt-1">
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center text-sm text-zinc-500">No new notifications</div>
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
