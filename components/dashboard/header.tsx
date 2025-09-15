"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Search, User, Upload, ExternalLink, Diamond } from "lucide-react"
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

export default function DashboardHeader() {
  const router = useRouter()
  const { user, signOut } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [userData, setUserData] = useState<any>(null)
  const [isProUser, setIsProUser] = useState(false)

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return

      try {
        const [userDoc, membershipResponse] = await Promise.all([
          getDoc(doc(db, "users", user.uid)),
          fetch("/api/membership-status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: user.uid }),
          }).catch(() => null),
        ])

        if (userDoc.exists()) {
          setUserData(userDoc.data())
        }

        let isPro = false
        if (membershipResponse?.ok) {
          const membershipData = await membershipResponse.json()
          isPro = membershipData.isActive
        }

        setIsProUser(isPro)
      } catch (error) {
        console.error("Error fetching user data:", error)
        setIsProUser(false)
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

  return (
    <header className="sticky top-0 z-30 w-full border-b border-zinc-800/50 bg-black/80 backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <NavDropdown />
          <div className="flex items-center gap-2">
            <Logo href="/dashboard" size="sm" />
            {isProUser && (
              <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 rounded-full">
                <Diamond className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                <span className="text-xs font-medium text-yellow-400">PRO</span>
              </div>
            )}
          </div>
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
            className="hidden md:flex bg-white text-black hover:bg-zinc-100 font-medium"
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
