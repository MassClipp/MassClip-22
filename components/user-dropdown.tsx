"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { User, Globe, Settings, LogOut, Heart } from "lucide-react"

export default function UserDropdown() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [username, setUsername] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            setUsername(userData.username || null)
          }
        } catch (error) {
          console.error("Error fetching user data:", error)
        } finally {
          setLoading(false)
        }
      }
    }

    fetchUserData()
  }, [user])

  const handleLogout = async () => {
    if (isLoggingOut) return

    try {
      setIsLoggingOut(true)
      await signOut()
      // The signOut function handles the redirect
    } catch (error) {
      console.error("Logout error:", error)
      // Force redirect on error
      window.location.href = "/login"
    } finally {
      setIsLoggingOut(false)
    }
  }

  if (!user) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.photoURL || ""} alt={user.displayName || "User"} />
            <AvatarFallback>{user.displayName?.charAt(0) || user.email?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.displayName || user.email}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {username && (
          <DropdownMenuItem asChild>
            <Link href={`/creator/${username}`} className="cursor-pointer flex items-center">
              <Globe className="mr-2 h-4 w-4" />
              <span>Public Profile</span>
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuItem asChild>
          <Link href="/dashboard/favorites" className="cursor-pointer flex items-center">
            <Heart className="mr-2 h-4 w-4" />
            <span>Favorites</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href="/dashboard/user" className="cursor-pointer flex items-center">
            <User className="mr-2 h-4 w-4" />
            <span>Account</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings" className="cursor-pointer flex items-center">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer flex items-center text-red-500"
          disabled={isLoggingOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>{isLoggingOut ? "Signing out..." : "Log out"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
