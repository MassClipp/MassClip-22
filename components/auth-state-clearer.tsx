"use client"

import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { useState } from "react"
import { auth } from "@/lib/firebase-safe"
import { signOut } from "firebase/auth"

export function AuthStateClearer() {
  const [isClearing, setIsClearing] = useState(false)

  const clearAuthState = async () => {
    setIsClearing(true)
    try {
      // Clear Firebase auth state
      if (auth) {
        await signOut(auth)
      }

      // Clear session cookie
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      })

      // Clear localStorage and sessionStorage
      localStorage.clear()
      sessionStorage.clear()

      // Show success message
      alert("Auth state cleared successfully. Refreshing page...")

      // Force reload the page
      window.location.href = "/login?cleared=true"
    } catch (error) {
      console.error("Force logout error:", error)
      alert("Failed to clear auth state. Try clearing browser cookies manually.")
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={clearAuthState}
      disabled={isClearing}
      className="flex items-center gap-2"
    >
      <LogOut className="h-4 w-4" />
      {isClearing ? "Clearing..." : "Clear Auth State"}
    </Button>
  )
}
